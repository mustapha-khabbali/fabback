import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';
import { config } from '../config.js';
import { getClientIp, isOnLabNetwork } from '../services/labNetwork.js';

export const attendanceRouter = express.Router();

const checkInSchema = z.object({
  qr: z.object({
    gate: z.enum(['GATE_IN', 'EVENT']),
    id: z.string().trim().min(1)
  }).optional(),
  objective: z.string().optional(),
  comment: z.string().optional(),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisorName: z.string().optional(),
  eventId: z.string().optional(),
  eventTitle: z.string().optional(),
  eventSpace: z.string().optional()
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
const MOROCCAN_HOLIDAYS_2026 = [
  { name: 'Nouvel An', date: '2026-01-01' },
  { name: "Manifeste de l'Indépendance", date: '2026-01-11' },
  { name: 'Fête du Travail', date: '2026-05-01' },
  { name: 'Fête du Trône', date: '2026-07-30' },
  { name: 'Oued Ed-Dahab', date: '2026-08-14' },
  { name: 'Révolution du Roi et du Peuple', date: '2026-08-20' },
  { name: 'Fête de la Jeunesse', date: '2026-08-21' },
  { name: 'Marche Verte', date: '2026-11-06' },
  { name: "Fête de l'Indépendance", date: '2026-11-18' },
  { name: 'Aïd al-Fitr (Est.)', date: '2026-03-20' },
  { name: 'Aïd al-Adha (Est.)', date: '2026-05-27' },
  { name: '1er Moharram (Est.)', date: '2026-06-16' }
];
const HOLIDAY_DATES = MOROCCAN_HOLIDAYS_2026.map((holiday) => holiday.date);

function toISODate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function holidayName(dateValue) {
  const date = toISODate(dateValue);
  return MOROCCAN_HOLIDAYS_2026.find((holiday) => holiday.date === date)?.name || '';
}

async function assertPermanentQr(gate, qr, res) {
  const column = gate === 'GATE_IN'
    ? 'permanent_gate_in_qr_id'
    : gate === 'EVENT'
      ? 'permanent_event_qr_id'
      : 'permanent_gate_out_qr_id';
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
    eventSpace: row.event_space || '',
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
        ((a.timestamp_in at time zone $2)::date = (now() at time zone $2)::date) as is_today,
        (now() >= (((a.timestamp_in at time zone $2)::date + $3::time) at time zone $2)) as is_expired
      from attendance a
      where a.user_id = $1 and a.timestamp_out is null
      order by a.timestamp_in desc
      limit 1
    `,
    [userId, LAB_TIME_ZONE, config.labCloseTime]
  );
  return result.rows[0] || null;
}

function isOpenAttendanceActive(row) {
  return isSameLabDay(row) && row?.is_expired !== true;
}

async function autoCloseAttendance(client, attendanceId) {
  const result = await client.query(
    `
      update attendance
      set
        timestamp_out = greatest(
          timestamp_in,
          ((timestamp_in at time zone $2)::date + $3::time) at time zone $2
        ),
        rating = null,
        feedback_comment = null,
        auto_closed = true
      where id = $1 and timestamp_out is null
      returning *
    `,
    [attendanceId, LAB_TIME_ZONE, config.labCloseTime]
  );
  return result.rows[0] || null;
}

async function autoCloseExpiredOpenAttendances(client) {
  const result = await client.query(
    `
      update attendance
      set
        timestamp_out = greatest(
          timestamp_in,
          ((timestamp_in at time zone $1)::date + $2::time) at time zone $1
        ),
        rating = null,
        feedback_comment = null,
        auto_closed = true
      where timestamp_out is null
        and now() >= (((timestamp_in at time zone $1)::date + $2::time) at time zone $1)
      returning id
    `,
    [LAB_TIME_ZONE, config.labCloseTime]
  );

  const joinedRows = [];
  for (const row of result.rows) {
    const joined = await joinAttendance(client, row.id);
    if (joined) joinedRows.push(joined);
  }
  return joinedRows;
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

function eventSpaceLabel(space) {
  if (typeof space === 'string') return space;
  if (!space || typeof space !== 'object') return '';
  return String(space.label || space.name || space.title || space.value || '');
}

function normalizeEventSpace(space) {
  return String(eventSpaceLabel(space) || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isFabLabSpace(space) {
  return normalizeEventSpace(space).includes('fablab');
}

function matchConfiguredEventSpace(spaces, selectedSpace) {
  const selected = normalizeEventSpace(selectedSpace);
  if (!selected) return '';
  return (Array.isArray(spaces) ? spaces : [])
    .map(eventSpaceLabel)
    .find((space) => normalizeEventSpace(space) === selected) || '';
}

async function resolveEventSpace(client, eventId, selectedSpace) {
  const trimmedSpace = typeof selectedSpace === 'string' ? selectedSpace.trim() : '';
  if (!trimmedSpace) return { label: null, isConfigured: true, isFabLab: false };

  const parsedEventId = uuidOrNull(eventId);
  if (!parsedEventId) return { label: trimmedSpace, isConfigured: false, isFabLab: false };

  const result = await client.query('select spaces from events where id = $1', [parsedEventId]);
  const matchedSpace = matchConfiguredEventSpace(result.rows[0]?.spaces || [], trimmedSpace);
  return {
    label: matchedSpace || trimmedSpace,
    isConfigured: Boolean(matchedSpace),
    isFabLab: isFabLabSpace(matchedSpace)
  };
}

async function readGateAvailability() {
  const result = await query(
    `
      with lab_now as (
        select
          coalesce($5::date, (now() at time zone $1)::date) as lab_date,
          (now() at time zone $1)::time as lab_time
      )
      select
        lab_date,
        extract(isodow from lab_date)::int in (6, 7) as is_weekend,
        lab_date = any($4::date[]) as is_holiday,
        lab_date = any($6::date[]) as is_open_override,
        (lab_time >= $2::time and lab_time < $3::time) as is_within_hours,
        (
          select c.label
          from lab_closures c
          where c.date = lab_date
            and (
              c.time_from is null
              or c.time_to is null
              or (lab_time >= c.time_from and lab_time < c.time_to)
            )
          order by c.time_from nulls first, c.created_at desc
          limit 1
        ) as closure_label
      from lab_now
    `,
    [
      LAB_TIME_ZONE,
      config.labOpenTime,
      config.labCloseTime,
      HOLIDAY_DATES,
      config.labDateOverride || null,
      config.labOpenOverrideDates
    ]
  );
  return result.rows[0] || {};
}

function refuseIfGateClosed(status, res) {
  if (status?.closure_label) {
    res.status(403).json({ error: `Le FabLab est fermé (${status.closure_label}).` });
    return true;
  }
  if (!status?.is_open_override && status?.is_weekend) {
    res.status(403).json({ error: 'Le FabLab est fermé le weekend.' });
    return true;
  }
  if (!status?.is_open_override && status?.is_holiday) {
    const name = holidayName(status.lab_date);
    res.status(403).json({ error: `Le FabLab est fermé${name ? ` (Férié: ${name})` : ' (jour férié)'}.` });
    return true;
  }
  if (!status?.is_within_hours) {
    res.status(403).json({ error: `Le FabLab est fermé (ouvert ${config.labOpenTime}–${config.labCloseTime}).` });
    return true;
  }
  return false;
}

attendanceRouter.use(requireAuth);

attendanceRouter.get('/open', async (req, res, next) => {
  try {
    const { attendance, autoClosed } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      if (!open) return { attendance: null, autoClosed: null };
      if (!isOpenAttendanceActive(open)) {
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
    const isEventCheckIn = data.qr?.gate === 'EVENT';
    // Presence: the gate QR is physically inside the lab; a check-in must come
    // from the school network, not from a photographed QR scanned at home.
    if (!isEventCheckIn && !isOnLabNetwork(req)) {
      console.warn(`[req ${req.id}] gate network refused check-in ip=${getClientIp(req)} allow=${config.gateAllowedIps.join(',') || '(off)'}`);
      res.status(403).json({ error: 'Vous devez être au FabLab pour scanner (réseau de l\'école requis).' });
      return;
    }
    if (!(await assertPermanentQr(data.qr?.gate || 'GATE_IN', data.qr, res))) return;
    const eventSpace = isEventCheckIn
      ? await resolveEventSpace({ query }, data.eventId, data.eventSpace)
      : { label: null, isConfigured: true, isFabLab: false };
    if (isEventCheckIn && data.eventSpace && !eventSpace.isConfigured) {
      res.status(400).json({ error: 'Espace événement invalide.' });
      return;
    }

    // Lab presence outside opening hours is refused: without this, an evening
    // scan creates a row that is born expired and auto-closes with zero
    // duration. Outside EVENT scans stay exempt; FabLab-space events count as
    // lab presence and therefore use the same availability rules.
    if (!isEventCheckIn || eventSpace.isFabLab) {
      const status = await readGateAvailability();
      if (refuseIfGateClosed(status, res)) return;
    }

    const { attendance, autoClosed, alreadyInside } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      const activeOpen = open && isOpenAttendanceActive(open);
      const eventOpensFabLabPresence = isEventCheckIn && eventSpace.isFabLab && !activeOpen;
      // Server-side guard: Gate-IN must not create a second open lab presence
      // row. EVENT scans are event records, except when the admin-configured
      // event space is FabLab and the user is not already marked inside.
      if (!isEventCheckIn && activeOpen) {
        return { attendance: null, autoClosed: null, alreadyInside: true };
      }
      const closed = open && !isOpenAttendanceActive(open) ? await autoCloseAttendance(client, open.id) : null;
      const result = await client.query(
        `
          insert into attendance (
            user_id, objective, comment, project_id, project_title,
            supervisor_id, supervisor_name, event_id, event_title, event_space, timestamp_out
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, case when $11::boolean then now() else null end)
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
          data.eventTitle || null,
          eventSpace.label,
          isEventCheckIn && !eventOpensFabLabPresence
        ]
      );

      return {
        attendance: await joinAttendance(client, result.rows[0].id),
        autoClosed: closed ? await joinAttendance(client, closed.id) : null
      };
    });

    if (alreadyInside) {
      res.status(409).json({ error: 'Vous êtes déjà enregistré dans le FabLab.' });
      return;
    }

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

    if (!isOnLabNetwork(req)) {
      console.warn(`[req ${req.id}] gate network refused check-out ip=${getClientIp(req)} allow=${config.gateAllowedIps.join(',') || '(off)'}`);
      res.status(403).json({ error: 'Vous devez être au FabLab pour scanner (réseau de l\'école requis).' });
      return;
    }
    if (!(await assertPermanentQr('GATE_OUT', parsed.data.qr, res))) return;

    const { openToday, staleClosed } = await withTransaction(async (client) => {
      const open = await findLatestOpenAttendance(client, req.user.id);
      if (!open) return { openToday: null, staleClosed: null };
      if (!isOpenAttendanceActive(open)) {
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

async function loadAttendanceForUser(userId) {
  const result = await query(
    `
      select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
      from attendance a
      left join users u on u.id = a.user_id
      where a.user_id = $1
      order by a.timestamp_in desc
    `,
    [userId]
  );

  return result.rows.map(mapAttendance);
}

attendanceRouter.get('/mine', async (req, res, next) => {
  try {
    res.json({ attendance: await loadAttendanceForUser(req.user.id) });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/user/:userId', async (req, res, next) => {
  try {
    res.json({ attendance: await loadAttendanceForUser(req.params.userId) });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/', requireRole('administrateur'), async (req, res, next) => {
  try {
    const { date_from: dateFrom, date_to: dateTo, role, event_id: eventId } = req.query;

    const { rows, autoClosedRows } = await withTransaction(async (client) => {
      const closedRows = await autoCloseExpiredOpenAttendances(client);
      const params = [];
      const where = [];

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

      const result = await client.query(
        `
          select a.*, u.prenom, u.nom, u.role, u.cin, u.tel, u.email
          from attendance a
          left join users u on u.id = a.user_id
          ${where.length ? `where ${where.join(' and ')}` : ''}
          order by a.timestamp_in desc
        `,
        params
      );

      return { rows: result.rows, autoClosedRows: closedRows };
    });

    autoClosedRows.forEach(emitAttendanceCheckOut);

    res.json({ attendance: rows.map(mapAttendance) });
  } catch (error) {
    next(error);
  }
});
