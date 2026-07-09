import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification, emitNotification, mapNotification } from '../services/notificationDelivery.js';

export const notificationsRouter = express.Router();

const notificationSchema = z.object({
  type: z.enum(['contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system', 'interaction_offer', 'interaction_approved']),
  recipientId: z.string().optional().nullable(),
  targetId: z.string().optional().nullable(),
  helpedUserId: z.string().optional().nullable(),
  interactionRequestId: z.string().optional().nullable(),
  interactionOfferId: z.string().optional().nullable(),
  interactionType: z.enum(['help', 'review']).optional().nullable(),
  projectId: z.string().optional().nullable(),
  projectTitle: z.string().optional().nullable(),
  requesterId: z.string().optional().nullable(),
  requesterName: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  machineName: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  payload: z.record(z.any()).optional()
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOrNull(value) {
  return UUID_RE.test(String(value || '')) ? value : null;
}

async function supervisorRecipients(client) {
  const result = await client.query(
    "select id from users where role in ('formateur', 'administrateur') and is_deactivated = false"
  );
  return result.rows.map((row) => row.id);
}

async function stagiaireRecipients(client, excludeUserId) {
  const result = await client.query(
    "select id from users where role = 'stagiaire' and is_deactivated = false and id <> $1",
    [excludeUserId]
  );
  return result.rows.map((row) => row.id);
}

async function projectAdminRecipients(client, projectId) {
  const project = await client.query('select owner_id from projects where id = $1', [projectId]);
  if (!project.rows[0]) return [];

  const admins = await client.query(
    `
      select user_id
      from project_contributors
      where project_id = $1
        and status = 'ACCEPTED'
        and (access_level = 'CO_FOUNDER' or is_admin = true)
    `,
    [projectId]
  );

  return [project.rows[0].owner_id, ...admins.rows.map((row) => row.user_id)];
}

async function resolveRecipients(client, data, senderId) {
  if (data.type === 'CONTACT_REQUEST') return [data.targetId || data.recipientId].filter(Boolean);
  if (data.type === 'project_invite') return [data.recipientId].filter(Boolean);
  if (data.type === 'help_request' || data.type === 'review_request') return stagiaireRecipients(client, senderId);
  if (data.type === 'help_feedback_request') return [data.helpedUserId || data.recipientId].filter(Boolean);
  if (data.type === 'contribution_request') return projectAdminRecipients(client, data.projectId);
  if (data.recipientId) return [data.recipientId];
  return [];
}

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `
        select *
        from notifications
        where recipient_id = $1
        order by created_at desc
      `,
      [req.user.id]
    );
    res.json({ notifications: result.rows.map(mapNotification) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = notificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const notifications = await withTransaction(async (client) => {
      const recipients = [...new Set((await resolveRecipients(client, parsed.data, req.user.id)).filter(Boolean))];
      const created = [];
      const { payload = {}, ...topLevel } = parsed.data;
      let interactionRequest = null;

      if (parsed.data.type === 'help_request' || parsed.data.type === 'review_request') {
        const interactionType = parsed.data.type === 'help_request' ? 'help' : 'review';
        const result = await client.query(
          `
            insert into interaction_requests (
              type, requester_id, project_id, project_title, machine_name, description
            )
            values ($1, $2, $3, $4, $5, $6)
            returning *
          `,
          [
            interactionType,
            req.user.id,
            uuidOrNull(parsed.data.projectId),
            parsed.data.projectTitle || null,
            interactionType === 'help' ? parsed.data.machineName || null : null,
            interactionType === 'help' ? parsed.data.description || parsed.data.message || null : null
          ]
        );
        interactionRequest = result.rows[0];
      }

      const finalPayload = {
        ...topLevel,
        ...payload,
        senderId: req.user.id,
        senderName: payload.senderName || `${req.user.prenom} ${req.user.nom}`.trim(),
        ...(interactionRequest ? {
          interactionRequestId: interactionRequest.id,
          interactionType: interactionRequest.type
        } : {})
      };

      for (const recipientId of recipients) {
        created.push(await createNotification(client, recipientId, req.user.id, parsed.data.type, finalPayload, finalPayload.status || 'unread'));
      }

      return created;
    });

    notifications.forEach((notification) => {
      emitNotification(notification);
    });
    res.status(201).json({ notifications });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const parsed = z.object({
      status: z.string().optional(),
      handled: z.boolean().optional(),
      approved: z.boolean().optional().nullable()
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const current = await query('select * from notifications where id = $1 and recipient_id = $2', [req.params.id, req.user.id]);
    if (!current.rows[0]) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const nextStatus = parsed.data.status ?? current.rows[0].status;
    const nextHandled = parsed.data.handled ?? current.rows[0].handled;
    const nextApproved = Object.prototype.hasOwnProperty.call(parsed.data, 'approved') ? parsed.data.approved : current.rows[0].approved;
    const result = await query(
      `
        update notifications
        set status = $1, handled = $2, approved = $3
        where id = $4 and recipient_id = $5
        returning *
      `,
      [nextStatus, nextHandled, nextApproved, req.params.id, req.user.id]
    );

    const notification = mapNotification(result.rows[0]);
    emitNotification(notification, 'update');
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});
