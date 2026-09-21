import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';

export const eventsRouter = express.Router();

const timeSchema = z.string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid event time')
  .refine((value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours <= 23 && minutes <= 59;
  }, 'Invalid event time');

const eventSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  dateMode: z.string().trim().default('single'),
  date: z.string().optional().nullable(),
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  startTime: timeSchema.optional().nullable(),
  endTime: timeSchema.optional().nullable(),
  spaces: z.array(z.any()).optional(),
  intervenants: z.array(z.any()).optional(),
  archived: z.boolean().optional()
});

function hasValidEventTimes(event) {
  const hasStart = Boolean(event.startTime);
  const hasEnd = Boolean(event.endTime);
  return hasStart === hasEnd && (!hasStart || event.startTime < event.endTime);
}

function mapEvent(row) {
  const toDateInput = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    dateMode: row.date_mode,
    date: toDateInput(row.date),
    dateFrom: toDateInput(row.date_from),
    dateTo: toDateInput(row.date_to),
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : '',
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : '',
    spaces: row.spaces || [],
    intervenants: row.intervenants || [],
    archived: row.archived,
    createdAt: row.created_at
  };
}

eventsRouter.use(requireAuth);

eventsRouter.get('/', async (_req, res, next) => {
  try {
    const result = await query('select * from events order by created_at desc');
    res.json({ events: result.rows.map(mapEvent) });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post('/', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const event = parsed.data;
    if (!hasValidEventTimes(event)) {
      res.status(400).json({ error: "L'heure de fin doit être après l'heure de début." });
      return;
    }
    const result = await query(
      `
        insert into events (title, description, date_mode, date, date_from, date_to, start_time, end_time, spaces, intervenants, archived)
        values ($1, $2, $3, $4, $5, $6, $7::time, $8::time, $9::jsonb, $10::jsonb, $11)
        returning *
      `,
      [
        event.title,
        event.description || '',
        event.dateMode,
        event.date || null,
        event.dateFrom || null,
        event.dateTo || null,
        event.startTime || null,
        event.endTime || null,
        JSON.stringify(event.spaces || []),
        JSON.stringify(event.intervenants || []),
        Boolean(event.archived)
      ]
    );

    const created = mapEvent(result.rows[0]);
    emitRealtimeChange({ entity: 'events', action: 'create', id: created.id });
    res.status(201).json({ event: created });
  } catch (error) {
    next(error);
  }
});

eventsRouter.patch('/:id', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = eventSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const current = await query('select * from events where id = $1', [req.params.id]);
    if (!current.rows[0]) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = { ...mapEvent(current.rows[0]), ...parsed.data };
    if (!hasValidEventTimes(event)) {
      res.status(400).json({ error: "L'heure de fin doit être après l'heure de début." });
      return;
    }
    const result = await query(
      `
        update events
        set title = $1, description = $2, date_mode = $3, date = $4, date_from = $5, date_to = $6,
            start_time = $7::time, end_time = $8::time, spaces = $9::jsonb, intervenants = $10::jsonb,
            archived = $11, updated_at = now()
        where id = $12
        returning *
      `,
      [
        event.title,
        event.description || '',
        event.dateMode,
        event.date || null,
        event.dateFrom || null,
        event.dateTo || null,
        event.startTime || null,
        event.endTime || null,
        JSON.stringify(event.spaces || []),
        JSON.stringify(event.intervenants || []),
        Boolean(event.archived),
        req.params.id
      ]
    );

    const updated = mapEvent(result.rows[0]);
    emitRealtimeChange({ entity: 'events', action: updated.archived ? 'archive' : 'update', id: updated.id });
    res.json({ event: updated });
  } catch (error) {
    next(error);
  }
});

eventsRouter.delete('/:id', requireRole('administrateur'), async (req, res, next) => {
  try {
    const result = await query('delete from events where id = $1 returning id', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    emitRealtimeChange({ entity: 'events', action: 'delete', id: result.rows[0].id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
