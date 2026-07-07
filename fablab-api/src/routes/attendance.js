import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';

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

const LAB_TIME_ZONE = 'Africa/Casablanca';

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
    feedbackComment: row.feedback_comment,
    autoClosed: row.auto_closed || false
  };
}

function isSameLabDay(row) {
  return row?.is_today === true;
}

async function findLatestOpenAttendance(client, userId) {
  const result = await client.query(
    `
      select
        a.*,
        ((a.timestamp_in at time zone $2)::date = (now() at time zone $2)::date) as is_today
      from attendance a
      where a.user_id = $1 and a.timestamp_out is null
      order by a.timestamp_in desc
      limit 1
    `,
    [userId, LAB_TIME_ZONE]
  );
  return result.rows[0] || null;
}

async function autoCloseAttendance(client, attendanceId) {
  const result = await client.query(
    `
      update attendance
      set
        timestamp_out = (
          ((timestamp_in at time zone $2)::date + time '18:30') at time zone $2
        ),
        rating = null,
        feedback_comment = null,
        auto_closed = true
      where id = $1 and timestamp_out is null
      returning *
    `,
    [attendanceId, LAB_TIME_ZONE]
  );
  return result.rows[0] || null;
}

async function joinAttendance(client, attendanceId) {
  const result = await client.query(
    `
      select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
      from attendance a
      left join users u on u.id = a.user_id
      where a.id = $1
    `,
    [attendanceId]
  );
  return result.rows[0] || null;
}

function emitAttendanceCheckOut(row) {
  if (!row) return;
  const attendance = mapAttendance(row);
  emitRealtimeChange({ entity: 'attendance', action: 'check-out', id: attendance.id, recipientId: attendance.userId });
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
    const { attendance, autoClosed } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      if (!open) return { attendance: null, autoClosed: null };
      if (!isSameLabDay(open)) {
        const closed = await autoCloseAttendance(client, open.id);
        return { attendance: null, autoClosed: closed ? await joinAttendance(client, closed.id) : null };
      }

      return { attendance: await joinAttendance(client, open.id), autoClosed: null };
    });

    emitAttendanceCheckOut(autoClosed);
    res.json({ attendance: attendance ? mapAttendance(attendance) : null });
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

    const { attendance, autoClosed } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      const closed = open && !isSameLabDay(open) ? await autoCloseAttendance(client, open.id) : null;
      const result = await client.query(
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

      return {
        attendance: await joinAttendance(client, result.rows[0].id),
        autoClosed: closed ? await joinAttendance(client, closed.id) : null
      };
    });

    emitAttendanceCheckOut(autoClosed);
    const mappedAttendance = mapAttendance(attendance);
    emitRealtimeChange({ entity: 'attendance', action: 'check-in', id: mappedAttendance.id, recipientId: mappedAttendance.userId });
    res.status(201).json({ attendance: mappedAttendance });
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

    const { openToday, staleClosed } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      if (!open) return { openToday: null, staleClosed: null };
      if (!isSameLabDay(open)) {
        const closed = await autoCloseAttendance(client, open.id);
        return { openToday: null, staleClosed: closed ? await joinAttendance(client, closed.id) : null };
      }
      return { openToday: open, staleClosed: null };
    });

    if (staleClosed) {
      emitAttendanceCheckOut(staleClosed);
      res.status(404).json({ error: 'No open attendance entry' });
      return;
    }

    if (!openToday) {
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
      [parsed.data.rating, parsed.data.feedbackComment || null, openToday.id]
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

    const attendance = mapAttendance(joined.rows[0]);
    emitRealtimeChange({ entity: 'attendance', action: 'check-out', id: attendance.id, recipientId: attendance.userId });
    res.json({ attendance });
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
