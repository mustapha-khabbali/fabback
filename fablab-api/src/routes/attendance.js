import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const attendanceRouter = express.Router();

const checkInSchema = z.object({
  qr: z.object({
    gate: z.literal('GATE_IN'),
    id: z.string().trim().min(1)
  }).optional(),
  objective: z.string().optional(),
  comment: z.string().optional(),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisorName: z.string().optional(),
  eventId: z.string().optional(),
  eventTitle: z.string().optional()
});

const checkOutSchema = z.object({
  qr: z.object({
    gate: z.literal('GATE_OUT'),
    id: z.string().trim().min(1)
  }).optional(),
  rating: z.number().int().min(1).max(5),
  feedbackComment: z.string().optional()
});

async function assertPermanentQr(gate, qr, res) {
  const column = gate === 'GATE_IN' ? 'permanent_gate_in_qr_id' : 'permanent_gate_out_qr_id';
  const result = await query(`select ${column} as permanent_qr_id from gate_config where id = 1`);
  const permanentQrId = result.rows[0]?.permanent_qr_id;

  if (!permanentQrId || !qr?.id || qr.id !== permanentQrId) {
    res.status(403).json({ error: `Invalid ${gate} QR code` });
    return false;
  }

  return true;
}

function mapAttendance(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: `${row.prenom || ''} ${row.nom || ''}`.trim(),
    nom: row.nom || '',
    prenom: row.prenom || '',
    role: row.role || '',
    cin: row.cin || '',
    tel: row.tel || '',
    email: row.email || '',
    type: row.timestamp_out ? 'out' : 'in',
    objective: row.objective,
    comment: row.comment,
    projectId: row.project_id,
    projectTitle: row.project_title,
    supervisorId: row.supervisor_id,
    supervisorName: row.supervisor_name,
    eventId: row.event_id,
    eventTitle: row.event_title,
    timestamp: row.timestamp_in,
    timestampOut: row.timestamp_out,
    rating: row.rating,
    feedbackComment: row.feedback_comment
  };
}

function uuidOrNull(value) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

attendanceRouter.use(requireAuth);

attendanceRouter.get('/open', async (req, res, next) => {
  try {
    const result = await query(
      `
        select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
        from attendance a
        left join users u on u.id = a.user_id
        where a.user_id = $1 and a.timestamp_out is null
        order by a.timestamp_in desc
        limit 1
      `,
      [req.user.id]
    );
    res.json({ attendance: result.rows[0] ? mapAttendance(result.rows[0]) : null });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.post('/check-in', async (req, res, next) => {
  try {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    if (!(await assertPermanentQr('GATE_IN', data.qr, res))) return;

    const result = await query(
      `
        insert into attendance (
          user_id, objective, comment, project_id, project_title,
          supervisor_id, supervisor_name, event_id, event_title
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        req.user.id,
        data.objective || null,
        data.comment || null,
        uuidOrNull(data.projectId),
        data.projectTitle || null,
        data.supervisorId || null,
        data.supervisorName || null,
        uuidOrNull(data.eventId),
        data.eventTitle || null
      ]
    );

    const joined = await query(
      `
        select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
        from attendance a
        left join users u on u.id = a.user_id
        where a.id = $1
      `,
      [result.rows[0].id]
    );

    res.status(201).json({ attendance: mapAttendance(joined.rows[0]) });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.post('/check-out', async (req, res, next) => {
  try {
    const parsed = checkOutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    if (!(await assertPermanentQr('GATE_OUT', parsed.data.qr, res))) return;

    const open = await query(
      `
        select id
        from attendance
        where user_id = $1 and timestamp_out is null
        order by timestamp_in desc
        limit 1
      `,
      [req.user.id]
    );

    if (!open.rows[0]) {
      res.status(404).json({ error: 'No open attendance entry' });
      return;
    }

    const result = await query(
      `
        update attendance
        set timestamp_out = now(), rating = $1, feedback_comment = $2
        where id = $3
        returning *
      `,
      [parsed.data.rating, parsed.data.feedbackComment || null, open.rows[0].id]
    );

    const joined = await query(
      `
        select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
        from attendance a
        left join users u on u.id = a.user_id
        where a.id = $1
      `,
      [result.rows[0].id]
    );

    res.json({ attendance: mapAttendance(joined.rows[0]) });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/', requireRole('administrateur'), async (req, res, next) => {
  try {
    const params = [];
    const where = [];
    const { date_from: dateFrom, date_to: dateTo, role, event_id: eventId } = req.query;

    if (dateFrom) {
      params.push(dateFrom);
      where.push(`a.timestamp_in >= $${params.length}`);
    }
    if (dateTo) {
      params.push(`${dateTo} 23:59:59`);
      where.push(`a.timestamp_in <= $${params.length}`);
    }
    if (role) {
      params.push(String(role).toLowerCase());
      where.push(`u.role = $${params.length}`);
    }
    if (eventId) {
      params.push(eventId);
      where.push(`a.event_id = $${params.length}`);
    }

    const result = await query(
      `
        select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
        from attendance a
        left join users u on u.id = a.user_id
        ${where.length ? `where ${where.join(' and ')}` : ''}
        order by a.timestamp_in desc
      `,
      params
    );

    res.json({ attendance: result.rows.map(mapAttendance) });
  } catch (error) {
    next(error);
  }
});
