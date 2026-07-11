import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';
import { config } from '../config.js';

export const labClosuresRouter = express.Router();

const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.preprocess(
  (value) => value === '' ? null : value,
  z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional()
);

const closureSchema = z.object({
  label: z.string().trim().min(1),
  date: dateSchema,
  timeFrom: timeSchema,
  timeTo: timeSchema
}).superRefine((data, ctx) => {
  if (Boolean(data.timeFrom) !== Boolean(data.timeTo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['timeTo'],
      message: 'Both start and end times are required for a partial closure'
    });
  }
  if (data.timeFrom && data.timeTo && data.timeFrom >= data.timeTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['timeTo'],
      message: 'End time must be after start time'
    });
  }
});

function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toTimeInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 5);
  return String(value).slice(0, 5);
}

function mapClosure(row) {
  return {
    id: row.id,
    label: row.label,
    date: toDateInput(row.date),
    timeFrom: toTimeInput(row.time_from),
    timeTo: toTimeInput(row.time_to),
    isCustom: true,
    createdBy: row.created_by || '',
    createdAt: row.created_at
  };
}

labClosuresRouter.use(requireAuth);
labClosuresRouter.use(requireRole('administrateur'));

labClosuresRouter.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select *
        from lab_closures
        order by date desc, time_from nulls first, created_at desc
      `
    );
    res.json({
      closures: result.rows.map(mapClosure),
      openOverrideDates: config.labOpenOverrideDates
    });
  } catch (error) {
    next(error);
  }
});

labClosuresRouter.post('/', async (req, res, next) => {
  try {
    const parsed = closureSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const closure = parsed.data;
    const result = await query(
      `
        insert into lab_closures (label, date, time_from, time_to, created_by)
        values ($1, $2::date, $3::time, $4::time, $5)
        returning *
      `,
      [
        closure.label,
        closure.date,
        closure.timeFrom || null,
        closure.timeTo || null,
        req.user.id
      ]
    );

    const created = mapClosure(result.rows[0]);
    emitRealtimeChange({ entity: 'lab-closures', action: 'create', id: created.id });
    res.status(201).json({ closure: created });
  } catch (error) {
    next(error);
  }
});

labClosuresRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('delete from lab_closures where id = $1 returning id', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Closure not found' });
      return;
    }

    emitRealtimeChange({ entity: 'lab-closures', action: 'delete', id: result.rows[0].id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
