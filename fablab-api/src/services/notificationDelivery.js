import { emitRealtimeChange } from '../realtime/bus.js';

export function mapNotification(row) {
  const payload = row.payload || {};
  return {
    ...payload,
    id: row.id,
    recipientId: row.recipient_id,
    senderId: row.sender_id,
    type: row.type,
    status: row.status,
    handled: row.handled,
    approved: row.approved,
    createdAt: row.created_at,
    time: payload.time || 'À l\'instant'
  };
}

export async function createNotification(client, recipientId, senderId, type, payload = {}, status = 'unread') {
  const result = await client.query(
    `
      insert into notifications (recipient_id, sender_id, type, payload, status)
      values ($1, $2, $3, $4::jsonb, $5)
      returning *
    `,
    [recipientId, senderId, type, JSON.stringify(payload), status]
  );
  return mapNotification(result.rows[0]);
}

export function emitNotification(notification, action = 'create') {
  emitRealtimeChange({
    entity: 'notifications',
    action,
    id: notification.id,
    recipientId: notification.recipientId,
    notification
  });
}

export function emitInteractionChange(id, userIds = []) {
  emitRealtimeChange({ entity: 'interactions', action: 'update', id });
  userIds.filter(Boolean).forEach((userId) => {
    emitRealtimeChange({ entity: 'users', action: 'patch', id: userId });
  });
}
