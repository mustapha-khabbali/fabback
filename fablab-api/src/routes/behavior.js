import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';
import { BEHAVIOR_PARAMS, recomputeAndPersist } from '../services/behaviorScore.js';

export const behaviorRouter = express.Router();

const recognitionSchema = z.object({
  targetId: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1),
  machineName: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  projectTitle: z.string().optional().nullable()
});

const reportSchema = z.object({
  targetId: z.string().trim().min(1),
  category: z.enum(['disrespect', 'cooperation', 'copy']),
  details: z.string().trim().min(1)
});

const reviewSchema = z.object({
  status: z.enum(['valide', 'rejete'])
});

function uuidOrNull(value) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function mapRecognition(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name || '',
    targetId: row.target_id,
    targetName: row.target_name || '',
    rating: row.rating,
    machineName: row.machine_name,
    projectId: row.project_id,
    projectTitle: row.project_title,
    comment: row.comment,
    counted: row.counted,
    createdAt: row.created_at
  };
}

function mapReport(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name || '',
    targetId: row.target_id,
    targetName: row.target_name || '',
    category: row.category,
    details: row.details,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name || '',
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  };
}

async function assertTargetUser(targetId, req, res) {
  if (targetId === req.user.id) {
    res.status(400).json({ error: 'Action impossible sur soi-même.' });
    return null;
  }
  const result = await query('select id from users where id = $1 and is_deactivated = false', [targetId]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return null;
  }
  return result.rows[0];
}

behaviorRouter.use(requireAuth);

behaviorRouter.post('/recognitions', async (req, res, next) => {
  try {
    const parsed = recognitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;
    if (!(await assertTargetUser(data.targetId, req, res))) return;

    const { recognition, score } = await withTransaction(async (client) => {
      // Weekly cap: only the first sender→target recognition per rolling week
      // counts toward the score; extras are stored but flagged non comptée.
      const recent = await client.query(
        `select 1 from recognitions
         where sender_id = $1 and target_id = $2 and counted = true
           and created_at > now() - ($3 || ' days')::interval
         limit 1`,
        [req.user.id, data.targetId, BEHAVIOR_PARAMS.RECOGNITION_CAP_WINDOW_DAYS]
      );
      const counted = recent.rows.length === 0;

      const inserted = await client.query(
        `insert into recognitions (sender_id, target_id, rating, machine_name, project_id, project_title, comment, counted)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [
          req.user.id,
          data.targetId,
          data.rating,
          data.machineName || null,
          uuidOrNull(data.projectId),
          data.projectTitle || null,
          data.comment,
          counted
        ]
      );

      const newScore = counted ? await recomputeAndPersist(client, data.targetId) : null;
      return { recognition: inserted.rows[0], score: newScore };
    });

    if (recognition.counted) {
      emitRealtimeChange({ entity: 'users', action: 'patch', id: data.targetId });
    }
    emitRealtimeChange({ entity: 'behavior', action: 'recognition', id: recognition.id });
    res.status(201).json({ recognition: mapRecognition(recognition), score });
  } catch (error) {
    next(error);
  }
});

behaviorRouter.post('/reports', async (req, res, next) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }
    const data = parsed.data;
    if (!(await assertTargetUser(data.targetId, req, res))) return;

    // No score impact at submission — only admin validation applies a penalty.
    const result = await query(
      `insert into reports (sender_id, target_id, category, details)
       values ($1, $2, $3, $4) returning *`,
      [req.user.id, data.targetId, data.category, data.details]
    );

    emitRealtimeChange({ entity: 'behavior', action: 'report', id: result.rows[0].id });
    res.status(201).json({ report: mapReport(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

// Everything below is admin-only: reports are confidential toward everyone
// else, including (especially) the reported user.
behaviorRouter.use(requireRole('administrateur'));

behaviorRouter.get('/users/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const [received, sent, reportsReceived, reportsFiled, target] = await Promise.all([
      query(
        `select r.*, s.prenom || ' ' || s.nom as sender_name
         from recognitions r left join users s on s.id = r.sender_id
         where r.target_id = $1 order by r.created_at desc`,
        [userId]
      ),
      query(
        `select r.*, t.prenom || ' ' || t.nom as target_name
         from recognitions r left join users t on t.id = r.target_id
         where r.sender_id = $1 order by r.created_at desc`,
        [userId]
      ),
      query(
        `select r.*, s.prenom || ' ' || s.nom as sender_name, rb.prenom || ' ' || rb.nom as reviewed_by_name
         from reports r
         left join users s on s.id = r.sender_id
         left join users rb on rb.id = r.reviewed_by
         where r.target_id = $1 order by r.created_at desc`,
        [userId]
      ),
      query(
        `select r.*, t.prenom || ' ' || t.nom as target_name
         from reports r left join users t on t.id = r.target_id
         where r.sender_id = $1 order by r.created_at desc`,
        [userId]
      ),
      query('select comportement_rating from users where id = $1', [userId])
    ]);

    res.json({
      score: target.rows[0]?.comportement_rating === null || target.rows[0]?.comportement_rating === undefined
        ? null
        : Number(target.rows[0].comportement_rating),
      recognitionsReceived: received.rows.map(mapRecognition),
      recognitionsSent: sent.rows.map(mapRecognition),
      reportsReceived: reportsReceived.rows.map(mapReport),
      reportsFiled: reportsFiled.rows.map(mapReport)
    });
  } catch (error) {
    next(error);
  }
});

behaviorRouter.get('/reports', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (req.query.status) {
      params.push(String(req.query.status));
      where = `where r.status = $${params.length}`;
    }
    const result = await query(
      `select r.*, s.prenom || ' ' || s.nom as sender_name, t.prenom || ' ' || t.nom as target_name,
              rb.prenom || ' ' || rb.nom as reviewed_by_name
       from reports r
       left join users s on s.id = r.sender_id
       left join users t on t.id = r.target_id
       left join users rb on rb.id = r.reviewed_by
       ${where}
       order by r.created_at desc`,
      params
    );
    res.json({ reports: result.rows.map(mapReport) });
  } catch (error) {
    next(error);
  }
});

behaviorRouter.patch('/reports/:id', async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const { report, score } = await withTransaction(async (client) => {
      const updated = await client.query(
        `update reports
         set status = $1, reviewed_by = $2, reviewed_at = now()
         where id = $3 returning *`,
        [parsed.data.status, req.user.id, req.params.id]
      );
      if (!updated.rows[0]) return { report: null, score: null };
      const newScore = await recomputeAndPersist(client, updated.rows[0].target_id);
      return { report: updated.rows[0], score: newScore };
    });

    if (!report) {
      res.status(404).json({ error: 'Signalement introuvable.' });
      return;
    }

    emitRealtimeChange({ entity: 'users', action: 'patch', id: report.target_id });
    emitRealtimeChange({ entity: 'behavior', action: 'report-review', id: report.id });
    res.json({ report: mapReport(report), score });
  } catch (error) {
    next(error);
  }
});

behaviorRouter.patch('/recognitions/:id/revoke', async (req, res, next) => {
  try {
    const { recognition, score } = await withTransaction(async (client) => {
      const updated = await client.query(
        `update recognitions
         set counted = false, revoked_by = $1, revoked_at = now()
         where id = $2 returning *`,
        [req.user.id, req.params.id]
      );
      if (!updated.rows[0]) return { recognition: null, score: null };
      const newScore = await recomputeAndPersist(client, updated.rows[0].target_id);
      return { recognition: updated.rows[0], score: newScore };
    });

    if (!recognition) {
      res.status(404).json({ error: 'Reconnaissance introuvable.' });
      return;
    }

    emitRealtimeChange({ entity: 'users', action: 'patch', id: recognition.target_id });
    emitRealtimeChange({ entity: 'behavior', action: 'recognition-revoke', id: recognition.id });
    res.json({ recognition: mapRecognition(recognition), score });
  } catch (error) {
    next(error);
  }
});
