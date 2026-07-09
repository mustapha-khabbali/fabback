import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createNotification,
  emitInteractionChange,
  emitNotification,
  mapNotification
} from '../services/notificationDelivery.js';

export const reviewsRouter = express.Router();

const reviewSchema = z.object({
  projectId: z.string().uuid(),
  problemSolving: z.number().int().min(0).max(5),
  technicalExecution: z.number().int().min(0).max(5),
  functionality: z.number().int().min(0).max(5),
  innovation: z.number().int().min(0).max(5),
  feasibility: z.number().int().min(0).max(5),
  safetyCompliance: z.number().int().min(0).max(5),
  sdgAlignment: z.number().int().min(0).max(5),
  intuitionUsability: z.number().int().min(0).max(5),
  feedback: z.string().optional(),
  interactionOfferId: z.string().uuid().optional().nullable(),
  notificationId: z.string().uuid().optional().nullable()
});

function userName(user) {
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Un utilisateur';
}

async function markNotificationHandled(client, notificationId, recipientId) {
  if (!notificationId) return null;
  const result = await client.query(
    `
      update notifications
      set status = 'read', handled = true, approved = true
      where id = $1 and recipient_id = $2
      returning *
    `,
    [notificationId, recipientId]
  );
  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

reviewsRouter.use(requireAuth);

reviewsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const review = parsed.data;

    if (!review.interactionOfferId) {
      const result = await query(
        `
          insert into reviews (
            project_id, reviewer_id, problem_solving, technical_execution,
            functionality, innovation, feasibility, safety_compliance,
            sdg_alignment, intuition_usability, feedback
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          returning *
        `,
        [
          review.projectId,
          req.user.id,
          review.problemSolving,
          review.technicalExecution,
          review.functionality,
          review.innovation,
          review.feasibility,
          review.safetyCompliance,
          review.sdgAlignment,
          review.intuitionUsability,
          review.feedback || ''
        ]
      );

      res.status(201).json({ review: result.rows[0] });
      return;
    }

    const result = await withTransaction(async (client) => {
      const offerResult = await client.query(
        `
          select
            offers.*,
            requests.type,
            requests.requester_id,
            requests.project_id,
            requests.project_title,
            requests.machine_name,
            requests.description
          from interaction_offers offers
          join interaction_requests requests on requests.id = offers.request_id
          where offers.id = $1
          for update of offers, requests
        `,
        [review.interactionOfferId]
      );
      const offer = offerResult.rows[0];
      if (!offer) {
        const error = new Error('Interaction offer not found');
        error.status = 404;
        throw error;
      }
      if (offer.type !== 'review' || offer.responder_id !== req.user.id || offer.status !== 'approved') {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }

      const insertedReview = await client.query(
        `
          insert into reviews (
            project_id, reviewer_id, problem_solving, technical_execution,
            functionality, innovation, feasibility, safety_compliance,
            sdg_alignment, intuition_usability, feedback
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          returning *
        `,
        [
          offer.project_id || review.projectId,
          req.user.id,
          review.problemSolving,
          review.technicalExecution,
          review.functionality,
          review.innovation,
          review.feasibility,
          review.safetyCompliance,
          review.sdgAlignment,
          review.intuitionUsability,
          review.feedback || ''
        ]
      );

      const criteriaRatings = {
        problemSolving: review.problemSolving,
        technicalExecution: review.technicalExecution,
        functionality: review.functionality,
        innovation: review.innovation,
        feasibility: review.feasibility,
        safetyCompliance: review.safetyCompliance,
        sdgAlignment: review.sdgAlignment,
        intuitionUsability: review.intuitionUsability
      };

      await client.query(
        "update interaction_requests set status = 'completed', updated_at = now() where id = $1",
        [offer.request_id]
      );
      const completedOffer = await client.query(
        `
          update interaction_offers
          set status = 'completed',
              review_id = $1,
              review_ratings = $2::jsonb,
              review_feedback = $3,
              completed_at = now(),
              updated_at = now()
          where id = $4
          returning *
        `,
        [insertedReview.rows[0].id, JSON.stringify(criteriaRatings), review.feedback || '', offer.id]
      );
      const handledNotification = await markNotificationHandled(client, review.notificationId, req.user.id);
      const feedbackNotification = await createNotification(
        client,
        offer.requester_id,
        req.user.id,
        'help_feedback_request',
        {
          interactionRequestId: offer.request_id,
          interactionOfferId: offer.id,
          interactionType: 'review',
          requesterId: offer.requester_id,
          acceptedUserId: req.user.id,
          projectId: offer.project_id,
          projectTitle: offer.project_title,
          senderId: req.user.id,
          senderName: userName(req.user),
          title: 'Évaluer la review',
          message: `Évaluez la review de ${userName(req.user)}.`,
          time: 'À l\'instant',
          status: 'unread'
        }
      );

      return {
        review: insertedReview.rows[0],
        offer: completedOffer.rows[0],
        request: offer,
        handledNotification,
        feedbackNotification
      };
    });

    if (result.handledNotification) emitNotification(result.handledNotification, 'update');
    emitNotification(result.feedbackNotification);
    emitInteractionChange(result.request.request_id, [result.request.requester_id, result.request.responder_id]);
    res.status(201).json({ review: result.review, offer: result.offer });
  } catch (error) {
    next(error);
  }
});
