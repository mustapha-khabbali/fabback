import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const eventsRouter = express.Router();

const eventSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  dateMode: z.string().trim().default('single'),
  date: z.string().optional().nullable(),
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  spaces: z.array(z.any()).optional(),
  intervenants: z.array(z.any()).optional(),
  archived: z.boolean().optional()
});

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
    const result = await query(
      `
        insert into events (title, description, date_mode, date, date_from, date_to, spaces, intervenants, archived)
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
        returning *
      `,
      [
        event.title,
        event.description || '',
        event.dateMode,
        event.date || null,
        event.dateFrom || null,
        event.dateTo || null,
        JSON.stringify(event.spaces || []),
        JSON.stringify(event.intervenants || []),
        Boolean(event.archived)
      ]
    );

    res.status(201).json({ event: mapEvent(result.rows[0]) });
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
    const result = await query(
      `
        update events
        set title = $1, description = $2, date_mode = $3, date = $4, date_from = $5, date_to = $6,
            spaces = $7::jsonb, intervenants = $8::jsonb, archived = $9, updated_at = now()
        where id = $10
        returning *
      `,
      [
        event.title,
        event.description || '',
        event.dateMode,
        event.date || null,
        event.dateFrom || null,
        event.dateTo || null,
        JSON.stringify(event.spaces || []),
        JSON.stringify(event.intervenants || []),
        Boolean(event.archived),
        req.params.id
      ]
    );

    res.json({ event: mapEvent(result.rows[0]) });
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
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
