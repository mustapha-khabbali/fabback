import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { emitRealtimeChange } from '../realtime/bus.js';

export const projectsRouter = express.Router();

const contributorSchema = z.object({
  userId: z.string(),
  role: z.string().optional().nullable(),
  accessLevel: z.enum(['CO_FOUNDER', 'MEMBER']).optional().nullable(),
  isAdmin: z.boolean().optional().nullable(),
  status: z.enum(['PENDING', 'ACCEPTED']).optional().nullable(),
  pendingRole: z.string().optional().nullable(),
  pendingAccessLevel: z.string().optional().nullable(),
  pendingIsAdmin: z.boolean().optional().nullable(),
  pendingRemove: z.boolean().optional().nullable(),
  approvals: z.array(z.string()).optional().nullable(),
  memberAccepted: z.boolean().optional().nullable()
});

const journalSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string(),
  title: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  version: z.number().int().optional().nullable()
});

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().optional(),
  ownerId: z.string().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  phase: z.enum(['MOC', 'POC', 'MVP', 'READY_TO_MARKET']).optional().nullable(),
  image: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  contributors: z.array(contributorSchema).optional(),
  supervisorIds: z.array(z.string()).optional(),
  sdgIds: z.array(z.string()).optional(),
  journals: z.array(journalSchema).optional(),
  reviewRequested: z.boolean().optional().nullable(),
  status: z.string().optional().nullable()
});

const recycleSchema = z.object({
  // Not necessarily a uuid: bin entries for journals/members carry client-side ids,
  // and the id is no longer used as the DB primary key anyway.
  id: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  type: z.enum(['project', 'journal', 'member']),
  payload: z.record(z.any()).optional(),
  deletedAt: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  memberData: z.record(z.any()).optional()
}).passthrough(); // keep the full original object (title, contributors, journals, …)

function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadProjects(client, user) {
  const projectResult = await client.query(
    `
      select p.*
      from projects p
      where $1 = 'administrateur'
        or p.owner_id = $2
        or exists (
          select 1 from project_contributors pc
          where pc.project_id = p.id and pc.user_id = $2
        )
      order by p.created_at desc
    `,
    [user.role, user.id]
  );
  const projectIds = projectResult.rows.map((row) => row.id);
  if (!projectIds.length) return [];

  const contributors = await client.query('select * from project_contributors where project_id = any($1::uuid[]) order by added_at', [projectIds]);
  const supervisors = await client.query('select * from project_supervisors where project_id = any($1::uuid[])', [projectIds]);
  const sdgs = await client.query('select * from project_sdgs where project_id = any($1::uuid[])', [projectIds]);
  const journals = await client.query('select * from journals where project_id = any($1::uuid[]) order by created_at desc', [projectIds]);

  return projectResult.rows.map((project) => ({
    id: project.id,
    userId: project.owner_id,
    ownerId: project.owner_id,
    title: project.title,
    description: project.description,
    phase: project.phase,
    image: project.image,
    color: '#3B5FE6',
    contributors: contributors.rows
      .filter((row) => row.project_id === project.id)
      .map((row) => ({
        userId: row.user_id,
        role: row.role,
        accessLevel: row.access_level,
        isAdmin: row.is_admin,
        status: row.status,
        pendingRole: row.pending_role,
        pendingAccessLevel: row.pending_access_level,
        pendingIsAdmin: row.pending_is_admin,
        pendingRemove: row.pending_remove,
        approvals: row.approvals,
        memberAccepted: row.member_accepted
      })),
    supervisorIds: supervisors.rows.filter((row) => row.project_id === project.id).map((row) => row.user_id),
    sdgIds: sdgs.rows.filter((row) => row.project_id === project.id).map((row) => row.sdg_id),
    journals: journals.rows
      .filter((row) => row.project_id === project.id)
      .map((row) => ({
        id: row.id,
        date: toDateInput(row.date),
        title: row.title,
        content: row.content,
        image: row.image,
        phase: row.phase,
        version: row.version
      })),
    createdAt: project.created_at
  }));
}

async function replaceProject(client, project, ownerId) {
  const projectId = project.id;
  const row = projectId
    ? await client.query(
      `
        update projects
        set title = $1, description = $2, phase = $3, image = $4, updated_at = now()
        where id = $5
        returning id
      `,
      [project.title, project.description || '', project.phase || 'MOC', project.image || null, projectId]
    )
    : await client.query(
      `
        insert into projects (owner_id, title, description, phase, image)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [ownerId, project.title, project.description || '', project.phase || 'MOC', project.image || null]
    );

  const id = row.rows[0]?.id || projectId;
  if (!id) return null;

  await client.query('delete from project_contributors where project_id = $1', [id]);
  await client.query('delete from project_supervisors where project_id = $1', [id]);
  await client.query('delete from project_sdgs where project_id = $1', [id]);
  await client.query('delete from journals where project_id = $1', [id]);

  for (const contributor of project.contributors || []) {
    await client.query(
      `
        insert into project_contributors (
          project_id, user_id, role, access_level, is_admin, status,
          pending_role, pending_access_level, pending_is_admin, pending_remove,
          approvals, member_accepted
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
      `,
      [
        id,
        contributor.userId,
        contributor.role || 'Tuteur',
        contributor.accessLevel || 'MEMBER',
        Boolean(contributor.isAdmin),
        contributor.status || 'PENDING',
        contributor.pendingRole || null,
        contributor.pendingAccessLevel || null,
        contributor.pendingIsAdmin ?? null,
        contributor.pendingRemove ?? null,
        contributor.approvals ? JSON.stringify(contributor.approvals) : null,
        contributor.memberAccepted ?? null
      ]
    );
  }

  for (const supervisorId of project.supervisorIds || ['user-sara']) {
    await client.query(
      `
        insert into project_supervisors (project_id, user_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [id, supervisorId]
    );
  }

  for (const sdgId of (project.sdgIds || []).slice(0, 3)) {
    await client.query(
      'insert into project_sdgs (project_id, sdg_id) values ($1, $2) on conflict do nothing',
      [id, sdgId]
    );
  }

  for (const journal of project.journals || []) {
    if (journal.id) {
      await client.query(
        `
          insert into journals (id, project_id, date, title, content, image, phase, version)
          values ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [journal.id, id, journal.date, journal.title || null, journal.content || '', journal.image || null, journal.phase || null, journal.version || 1]
      );
    } else {
      await client.query(
        `
          insert into journals (project_id, date, title, content, image, phase, version)
          values ($1,$2,$3,$4,$5,$6,$7)
        `,
        [id, journal.date, journal.title || null, journal.content || '', journal.image || null, journal.phase || null, journal.version || 1]
      );
    }
  }

  return id;
}

function canWriteProject(user, project) {
  if (user.role === 'administrateur') return true;
  if (!project.id) return true;
  if (project.userId === user.id || project.ownerId === user.id) return true;
  return (project.contributors || []).some((contributor) =>
    contributor.userId === user.id
    && contributor.status === 'ACCEPTED'
    && (contributor.accessLevel === 'CO_FOUNDER' || contributor.isAdmin)
  );
}

projectsRouter.use(requireAuth);

projectsRouter.get('/', async (req, res, next) => {
  try {
    const projects = await withTransaction((client) => loadProjects(client, req.user));
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get('/mine', async (req, res, next) => {
  try {
    const projects = await withTransaction((client) => loadProjects(client, req.user));
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

// A PENDING contributor cannot pass canWriteProject, so accepting an
// invitation through /sync was silently dropped and the banner reappeared.
// This endpoint lets the invited person act on their own contributor row
// only, mirroring the acceptance rules the app applies client-side.
projectsRouter.post('/:id/invitation', async (req, res, next) => {
  try {
    const parsed = z.object({ action: z.enum(['accept', 'decline']) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const projectId = req.params.id;
    const outcome = await withTransaction(async (client) => {
      const projectResult = await client.query('select owner_id from projects where id = $1', [projectId]);
      if (!projectResult.rows[0]) return { error: 'Projet introuvable', status: 404 };

      const contributorsResult = await client.query(
        'select * from project_contributors where project_id = $1',
        [projectId]
      );
      const mine = contributorsResult.rows.find((row) => String(row.user_id) === String(req.user.id));
      if (!mine) return { error: 'Invitation introuvable', status: 404 };

      if (parsed.data.action === 'decline') {
        if (!mine.pending_role) {
          // Initial invitation declined: leave the project entirely.
          await client.query(
            'delete from project_contributors where project_id = $1 and user_id = $2',
            [projectId, req.user.id]
          );
        } else {
          // Role-change declined: stay a member with the previous role.
          await client.query(
            `
              update project_contributors
              set status = 'ACCEPTED', pending_role = null, pending_access_level = null,
                  pending_is_admin = null, approvals = null, member_accepted = null
              where project_id = $1 and user_id = $2
            `,
            [projectId, req.user.id]
          );
        }
        return { accepted: false };
      }

      const activeAdminIds = [
        projectResult.rows[0].owner_id,
        ...contributorsResult.rows
          .filter((row) => row.status === 'ACCEPTED' && (row.access_level === 'CO_FOUNDER' || row.is_admin))
          .map((row) => row.user_id)
      ];
      const approvals = (Array.isArray(mine.approvals) ? mine.approvals : []).map(String);
      const hasAllAdminApprovals = activeAdminIds.length <= 1
        || activeAdminIds.every((id) => approvals.includes(String(id)));

      if (hasAllAdminApprovals) {
        await client.query(
          `
            update project_contributors
            set role = coalesce(pending_role, role),
                access_level = coalesce(pending_access_level, access_level),
                is_admin = coalesce(pending_is_admin, is_admin),
                status = 'ACCEPTED',
                pending_role = null, pending_access_level = null, pending_is_admin = null,
                approvals = null, member_accepted = null
            where project_id = $1 and user_id = $2
          `,
          [projectId, req.user.id]
        );
      } else {
        await client.query(
          'update project_contributors set member_accepted = true where project_id = $1 and user_id = $2',
          [projectId, req.user.id]
        );
      }
      return { accepted: hasAllAdminApprovals };
    });

    if (outcome.error) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }

    const projects = await withTransaction((client) => loadProjects(client, req.user));
    emitRealtimeChange({ entity: 'projects', action: 'invitation', id: projectId });
    res.json({ projects, accepted: outcome.accepted });
  } catch (error) {
    next(error);
  }
});

projectsRouter.put('/sync', async (req, res, next) => {
  try {
    const parsed = z.object({ projects: z.array(projectSchema) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const projects = await withTransaction(async (client) => {
      const keptOwnedIds = [];
      for (const project of parsed.data.projects) {
        if (!canWriteProject(req.user, project)) continue;
        const savedId = await replaceProject(client, project, project.userId || project.ownerId || req.user.id);
        if (savedId) keptOwnedIds.push(savedId);
      }
      // Real deletion: drop the user's OWN projects that are no longer in the list
      // they submitted. Without this, deleting a project only hid it on the client
      // and it reappeared on the next refresh (while also sitting in the bin).
      await client.query(
        'delete from projects where owner_id = $1 and not (id = any($2::uuid[]))',
        [req.user.id, keptOwnedIds]
      );
      return loadProjects(client, req.user);
    });

    emitRealtimeChange({ entity: 'projects', action: 'sync', id: 'projects' });
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const projects = await withTransaction(async (client) => {
      await replaceProject(client, parsed.data, parsed.data.userId || req.user.id);
      return loadProjects(client, req.user);
    });

    emitRealtimeChange({ entity: 'projects', action: 'create', id: projects[0]?.id || 'projects' });
    res.status(201).json({ project: projects[0], projects });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get('/recycle-bin', async (req, res, next) => {
  try {
    const result = await query(
      `
        select *
        from recycle_bin
        where $1 = 'administrateur' or owner_id = $2
        order by deleted_at desc
      `,
      [req.user.role, req.user.id]
    );
    res.json({
      recycleBin: result.rows.map((row) => ({
        ...(row.payload || {}),
        ownerId: row.owner_id,
        type: row.type,
        deletedAt: row.deleted_at,
        id: row.id
      }))
    });
  } catch (error) {
    next(error);
  }
});

projectsRouter.put('/recycle-bin', async (req, res, next) => {
  try {
    const parsed = z.object({ recycleBin: z.array(recycleSchema) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const recycleBin = await withTransaction(async (client) => {
      if (req.user.role === 'administrateur') {
        await client.query('delete from recycle_bin');
      } else {
        await client.query('delete from recycle_bin where owner_id = $1', [req.user.id]);
      }
      const seenEntries = new Set();
      for (const item of parsed.data.recycleBin) {
        // Always let the DB generate a fresh, unique id for each bin entry. Re-using
        // the original object id caused primary-key collisions, which made "delete
        // one from the bin" fail and wipe every entry sharing that id. The original
        // id is preserved inside the payload as `originalId` — and kept stable across
        // re-syncs (round-tripped entries carry the DB id in `id`, not the original).
        const { id, ownerId, type, deletedAt, ...rest } = item;
        const originalId = rest.originalId || id;
        // Clients sync their whole local bin, so a stale optimistic copy and the
        // re-keyed server copy of the same object can both be in the list — insert
        // each deleted object only once.
        if (originalId) {
          const dedupeKey = `${type}:${originalId}`;
          if (seenEntries.has(dedupeKey)) continue;
          seenEntries.add(dedupeKey);
        }
        const payload = { ...rest, originalId };
        await client.query(
          'insert into recycle_bin (owner_id, type, payload, deleted_at) values ($1,$2,$3::jsonb,$4)',
          [ownerId || req.user.id, type, JSON.stringify(payload), deletedAt || new Date().toISOString()]
        );
      }
      const result = await client.query(
        `
          select *
          from recycle_bin
          where $1 = 'administrateur' or owner_id = $2
          order by deleted_at desc
        `,
        [req.user.role, req.user.id]
      );
      return result.rows.map((row) => ({
        ...(row.payload || {}),
        ownerId: row.owner_id,
        type: row.type,
        deletedAt: row.deleted_at,
        id: row.id
      }));
    });

    emitRealtimeChange({ entity: 'projects', action: 'recycle-bin', id: 'recycle-bin' });
    res.json({ recycleBin });
  } catch (error) {
    next(error);
  }
});
