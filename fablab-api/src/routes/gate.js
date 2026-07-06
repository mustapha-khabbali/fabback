import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const gateRouter = express.Router();

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
    dateMode: row.date_mode,
    date: toDateInput(row.date),
    dateFrom: toDateInput(row.date_from),
    dateTo: toDateInput(row.date_to),
    spaces: row.spaces || [],
    intervenants: row.intervenants || [],
    archived: row.archived
  };
}

gateRouter.use(requireAuth);

gateRouter.get('/config', async (_req, res, next) => {
  try {
    const configResult = await query('select config from gate_config where id = 1');
    const eventsResult = await query(
      `
        select *
        from events
        where archived = false
          and coalesce(date_to, date) >= current_date
        order by coalesce(date, date_from), title
      `
    );

    res.json({
      config: configResult.rows[0]?.config || {},
      events: eventsResult.rows.map(mapEvent)
    });
  } catch (error) {
    next(error);
  }
});

gateRouter.put('/config', requireRole('administrateur'), async (req, res, next) => {
  try {
    const config = req.body?.config || req.body || {};
    const result = await query(
      `
        insert into gate_config (id, config)
        values (1, $1::jsonb)
        on conflict (id) do update set config = excluded.config, updated_at = now()
        returning config, updated_at
      `,
      [JSON.stringify(config)]
    );

    res.json({ config: result.rows[0].config, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    next(error);
  }
});
