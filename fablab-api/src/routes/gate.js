import express from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { config } from '../config.js';
import { emitRealtimeChange } from '../realtime/bus.js';

export const gateRouter = express.Router();

const gateOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  requiresProject: z.boolean().optional(),
  requiresEvent: z.boolean().optional(),
  requiresText: z.boolean().optional()
});

const gateConfigSchema = z.object({
  config: z.record(z.array(gateOptionSchema))
});

const gateParamSchema = z.enum(['GATE_IN', 'GATE_OUT', 'EVENT']);

function qrColumn(gate) {
  if (gate === 'GATE_IN') return 'permanent_gate_in_qr_id';
  if (gate === 'EVENT') return 'permanent_event_qr_id';
  return 'permanent_gate_out_qr_id';
}

function mapPermanentQr(row) {
  return {
    GATE_IN: row?.permanent_gate_in_qr_id || null,
    GATE_OUT: row?.permanent_gate_out_qr_id || null,
    EVENT: row?.permanent_event_qr_id || null
  };
}

async function getOrCreatePermanentQr(gate) {
  const column = qrColumn(gate);
  const newId = randomUUID();
  const result = await query(
    `
      insert into gate_config (id, config, ${column})
      values (1, '{}'::jsonb, $1)
      on conflict (id) do update
      set
        ${column} = coalesce(gate_config.${column}, excluded.${column}),
        updated_at = case when gate_config.${column} is null then now() else gate_config.updated_at end
      returning permanent_gate_in_qr_id, permanent_gate_out_qr_id, permanent_event_qr_id, updated_at
    `,
    [newId]
  );

  return result.rows[0];
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
    const configResult = await query('select config, permanent_gate_in_qr_id, permanent_gate_out_qr_id, permanent_event_qr_id from gate_config where id = 1');
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
      permanentQr: mapPermanentQr(configResult.rows[0]),
      events: eventsResult.rows.map(mapEvent)
    });
  } catch (error) {
    next(error);
  }
});

gateRouter.post('/permanent-qr/:gate', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = gateParamSchema.safeParse(String(req.params.gate || '').toUpperCase());
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid gate' });
      return;
    }

    const row = await getOrCreatePermanentQr(parsed.data);
    emitRealtimeChange({ entity: 'gate-config', action: 'publish', id: parsed.data });
    res.json({ qr: { gate: parsed.data, id: mapPermanentQr(row)[parsed.data] }, permanentQr: mapPermanentQr(row), updatedAt: row.updated_at });
  } catch (error) {
    next(error);
  }
});

gateRouter.get('/dev/permanent-qr/:gate', async (req, res, next) => {
  try {
    if (config.nodeEnv === 'production') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const gate = String(req.params.gate || '').toUpperCase();
    if (!['GATE_IN', 'GATE_OUT', 'EVENT'].includes(gate)) {
      res.status(400).json({ error: 'Invalid gate' });
      return;
    }

    const row = await getOrCreatePermanentQr(gate);
    res.json({ qr: { gate, id: mapPermanentQr(row)[gate] } });
  } catch (error) {
    next(error);
  }
});

gateRouter.put('/config', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = gateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const config = parsed.data.config;
    const result = await query(
      `
        insert into gate_config (id, config)
        values (1, $1::jsonb)
        on conflict (id) do update set config = excluded.config, updated_at = now()
        returning config, updated_at
      `,
      [JSON.stringify(config)]
    );

    emitRealtimeChange({ entity: 'gate-config', action: 'publish', id: 'config' });
    res.json({ config: result.rows[0].config, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    next(error);
  }
});
