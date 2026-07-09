import express from 'express';
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createNotification,
  emitInteractionChange,
  emitNotification,
  mapNotification
} from '../services/notificationDelivery.js';

export const interactionsRouter = express.Router();

const actionSchema = z.object({
  notificationId: z.string().uuid().optional().nullable()
});

const rateSchema = actionSchema.extend({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable()
});

function userName(user) {
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Un utilisateur';
}

function requestTypeLabel(type) {
  return type === 'review' ? 'review' : 'aide';
}

function basePayload(request, offer, sender, extra = {}) {
  const requestId = request.request_id || request.id;
  return {
    interactionRequestId: requestId,
    interactionOfferId: offer.id,
    interactionType: request.type,
    requesterId: request.requester_id,
    acceptedUserId: offer.responder_id,
    projectId: request.project_id,
    projectTitle: request.project_title,
    machineName: request.machine_name,
    description: request.description,
    senderId: sender.id,
    senderName: userName(sender),
    time: 'À l\'instant',
    status: 'unread',
    ...extra
  };
}

async function markNotificationHandled(client, notificationId, recipientId, approved) {
  if (!notificationId) return null;

  const result = await client.query(
    `
      update notifications
      set status = 'read', handled = true, approved = $1
      where id = $2 and recipient_id = $3
      returning *
    `,
    [approved, notificationId, recipientId]
  );

  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

async function loadOfferForUpdate(client, offerId) {
  const result = await client.query(
    `
      select
        offers.*,
        requests.type,
        requests.requester_id,
        requests.project_id,
        requests.project_title,
        requests.machine_name,
        requests.description,
        requests.status as request_status
      from interaction_offers offers
      join interaction_requests requests on requests.id = offers.request_id
      where offers.id = $1
      for update of offers, requests
    `,
    [offerId]
  );
  return result.rows[0] || null;
}

async function loadUser(client, userId) {
  const result = await client.query('select * from users where id = $1', [userId]);
  return result.rows[0] || null;
}

interactionsRouter.use(requireAuth);

interactionsRouter.post('/requests/:id/offer', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        'select * from interaction_requests where id = $1 for update',
        [req.params.id]
      );
      const request = requestResult.rows[0];
      if (!request) {
        const error = new Error('Interaction request not found');
        error.status = 404;
        throw error;
      }
      if (request.requester_id === req.user.id) {
        const error = new Error('You cannot accept your own request');
        error.status = 400;
        throw error;
      }
      if (request.status !== 'open') {
        const error = new Error('This request is no longer open');
        error.status = 409;
        throw error;
      }

      const offerResult = await client.query(
        `
          insert into interaction_offers (request_id, responder_id)
          values ($1, $2)
          on conflict (request_id, responder_id)
          do update set status = 'offered', updated_at = now()
          returning *
        `,
        [request.id, req.user.id]
      );
      const offer = offerResult.rows[0];
      const requester = await loadUser(client, request.requester_id);
      const handledNotification = await markNotificationHandled(client, parsed.data.notificationId, req.user.id, true);
      const offerNotification = await createNotification(
        client,
        request.requester_id,
        req.user.id,
        'interaction_offer',
        basePayload(request, offer, req.user, {
          title: request.type === 'review' ? 'Offre de review' : "Offre d'aide",
          message: `${userName(req.user)} a accepté votre demande de ${requestTypeLabel(request.type)}.`
        })
      );

      return { request, offer, requester, handledNotification, offerNotification };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitNotification(result.offerNotification);
    emitInteractionChange(result.request.id, [result.request.requester_id, req.user.id]);
    res.status(201).json({ offer: result.offer });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post('/offers/:id/approve', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await withTransaction(async (client) => {
      const offer = await loadOfferForUpdate(client, req.params.id);
      if (!offer) {
        const error = new Error('Interaction offer not found');
        error.status = 404;
        throw error;
      }
      if (offer.requester_id !== req.user.id) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }
      if (offer.status !== 'offered') {
        const error = new Error('This offer was already handled');
        error.status = 409;
        throw error;
      }

      await client.query(
        `
          update interaction_requests
          set status = 'approved', approved_offer_id = $1, updated_at = now()
          where id = $2
        `,
        [offer.id, offer.request_id]
      );
      const approvedOffer = await client.query(
        `
          update interaction_offers
          set status = 'approved', approved_at = now(), updated_at = now()
          where id = $1
          returning *
        `,
        [offer.id]
      );
      await client.query(
        `
          update interaction_offers
          set status = 'rejected', updated_at = now()
          where request_id = $1 and id <> $2 and status = 'offered'
        `,
        [offer.request_id, offer.id]
      );
      const handledNotification = await markNotificationHandled(client, parsed.data.notificationId, req.user.id, true);
      const responder = await loadUser(client, offer.responder_id);
      const approvedNotification = await createNotification(
        client,
        offer.responder_id,
        req.user.id,
        'interaction_approved',
        basePayload(offer, approvedOffer.rows[0], req.user, {
          title: offer.type === 'review' ? 'Review approuvée' : 'Aide approuvée',
          message: `${userName(req.user)} a approuvé votre ${offer.type === 'review' ? 'review' : 'aide'}.`
        })
      );

      return { offer: approvedOffer.rows[0], request: offer, responder, handledNotification, approvedNotification };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitNotification(result.approvedNotification);
    emitInteractionChange(result.request.request_id, [result.request.requester_id, result.request.responder_id]);
    res.json({ offer: result.offer });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post('/offers/:id/reject', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await withTransaction(async (client) => {
      const offer = await loadOfferForUpdate(client, req.params.id);
      if (!offer) {
        const error = new Error('Interaction offer not found');
        error.status = 404;
        throw error;
      }
      if (offer.requester_id !== req.user.id) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }

      const rejected = await client.query(
        `
          update interaction_offers
          set status = 'rejected', updated_at = now()
          where id = $1
          returning *
        `,
        [offer.id]
      );
      const handledNotification = await markNotificationHandled(client, parsed.data.notificationId, req.user.id, false);
      return { offer: rejected.rows[0], request: offer, handledNotification };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitInteractionChange(result.request.request_id, [result.request.requester_id, result.request.responder_id]);
    res.json({ offer: result.offer });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post('/offers/:id/complete-help', async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await withTransaction(async (client) => {
      const offer = await loadOfferForUpdate(client, req.params.id);
      if (!offer) {
        const error = new Error('Interaction offer not found');
        error.status = 404;
        throw error;
      }
      if (offer.responder_id !== req.user.id || offer.type !== 'help') {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }
      if (offer.status !== 'approved') {
        const error = new Error('This interaction is not ready to complete');
        error.status = 409;
        throw error;
      }

      await client.query(
        "update interaction_requests set status = 'completed', updated_at = now() where id = $1",
        [offer.request_id]
      );
      const completed = await client.query(
        `
          update interaction_offers
          set status = 'completed', completed_at = now(), updated_at = now()
          where id = $1
          returning *
        `,
        [offer.id]
      );
      const handledNotification = await markNotificationHandled(client, parsed.data.notificationId, req.user.id, true);
      const feedbackNotification = await createNotification(
        client,
        offer.requester_id,
        req.user.id,
        'help_feedback_request',
        basePayload(offer, completed.rows[0], req.user, {
          title: "Évaluer l'aide",
          message: `Évaluez l'aide apportée par ${userName(req.user)}.`
        })
      );

      return { offer: completed.rows[0], request: offer, handledNotification, feedbackNotification };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitNotification(result.feedbackNotification);
    emitInteractionChange(result.request.request_id, [result.request.requester_id, result.request.responder_id]);
    res.json({ offer: result.offer });
  } catch (error) {
    next(error);
  }
});

interactionsRouter.post('/offers/:id/rate', async (req, res, next) => {
  try {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await withTransaction(async (client) => {
      const offer = await loadOfferForUpdate(client, req.params.id);
      if (!offer) {
        const error = new Error('Interaction offer not found');
        error.status = 404;
        throw error;
      }
      if (offer.requester_id !== req.user.id) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }
      if (offer.status !== 'completed') {
        const error = new Error('This interaction is not ready to rate');
        error.status = 409;
        throw error;
      }

      await client.query(
        "update interaction_requests set status = 'rated', updated_at = now() where id = $1",
        [offer.request_id]
      );
      const rated = await client.query(
        `
          update interaction_offers
          set status = 'rated',
              requester_rating = $1,
              requester_comment = $2,
              rated_at = now(),
              updated_at = now()
          where id = $3
          returning *
        `,
        [parsed.data.rating, parsed.data.comment || null, offer.id]
      );
      const handledNotification = await markNotificationHandled(client, parsed.data.notificationId, req.user.id, true);
      return { offer: rated.rows[0], request: offer, handledNotification };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitInteractionChange(result.request.request_id, [result.request.requester_id, result.request.responder_id]);
    res.json({ offer: result.offer });
  } catch (error) {
    next(error);
  }
});
