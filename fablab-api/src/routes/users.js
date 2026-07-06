import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toPublicUser } from '../models/user.js';
import { emitRealtimeChange } from '../realtime/bus.js';

export const usersRouter = express.Router();

const roleSchema = z.enum(['stagiaire', 'formateur', 'administrateur', 'visiteur']);
const optionalText = z.string().trim().optional().nullable();
const phoneSchema = z.string().trim().regex(/^0[67]\d{8}$/).optional().nullable();
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase()).optional().nullable();
const programSchema = z.object({
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  result: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  dateMode: z.enum(['single', 'range']).optional().nullable(),
  date: z.string().trim().optional().nullable(),
  dateFrom: z.string().trim().optional().nullable(),
  dateTo: z.string().trim().optional().nullable()
}).strip();

export const userProfileSchema = z.object({
  role: roleSchema,
  prenom: z.string().trim().min(1),
  nom: z.string().trim().min(1),
  cin: optionalText,
  cef: optionalText,
  pole: optionalText,
  niveau: optionalText,
  filiere: optionalText,
  annee: optionalText,
  year: optionalText,
  option: optionalText,
  tel: phoneSchema,
  email: emailSchema,
  bio: optionalText,
  avatar: optionalText,
  programs: z.array(programSchema).optional(),
  charteAccepted: z.boolean().optional(),
  reproductionAccepted: z.boolean().optional()
});

const userPatchSchema = userProfileSchema.partial().extend({
  points: z.number().int().min(0).optional(),
  comportementRating: z.number().min(0).max(5).optional()
});

const createUserSchema = userProfileSchema.partial({
  cin: true,
  cef: true,
  pole: true,
  niveau: true,
  filiere: true,
  annee: true,
  year: true,
  option: true,
  tel: true,
  email: true,
  bio: true,
  avatar: true,
  programs: true,
  charteAccepted: true,
  reproductionAccepted: true
});
const emptyBodySchema = z.object({});

const fieldMap = {
  role: 'role',
  prenom: 'prenom',
  nom: 'nom',
  cin: 'cin',
  cef: 'cef',
  pole: 'pole',
  niveau: 'niveau',
  filiere: 'filiere',
  option: 'option',
  tel: 'tel',
  email: 'email',
  bio: 'bio',
  avatar: 'avatar',
  programs: 'programs',
  points: 'points'
};

export function buildUserPatch(data) {
  const normalized = {
    ...data,
    annee: data.annee ?? data.year
  };
  const columns = [];
  const values = [];
  const params = [];

  Object.entries(fieldMap).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      values.push(key === 'programs' ? JSON.stringify(normalized[key] ?? []) : normalized[key] ?? null);
      params.push(values.length);
      columns.push(`${column} = $${values.length}${key === 'programs' ? '::jsonb' : ''}`);
    }
  });

  if (Object.prototype.hasOwnProperty.call(normalized, 'annee')) {
    values.push(normalized.annee ?? null);
    params.push(values.length);
    columns.push(`annee = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'charteAccepted')) {
    values.push(Boolean(normalized.charteAccepted));
    params.push(values.length);
    columns.push(`charte_accepted = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'reproductionAccepted')) {
    values.push(Boolean(normalized.reproductionAccepted));
    params.push(values.length);
    columns.push(`reproduction_accepted = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'comportementRating')) {
    values.push(normalized.comportementRating);
    params.push(values.length);
    columns.push(`comportement_rating = $${values.length}`);
  }

  return { columns, values, params };
}

function canMutateUser(req, targetId) {
  return req.user.role === 'administrateur' || req.user.id === targetId;
}

usersRouter.use(requireAuth);

usersRouter.get('/', async (req, res, next) => {
  try {
    const { search = '', role = '' } = req.query;
    const params = [];
    const where = [];

    if (role) {
      params.push(String(role).toLowerCase());
      where.push(`role = $${params.length}`);
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      where.push(`(
        lower(prenom) like $${params.length}
        or lower(nom) like $${params.length}
        or lower(coalesce(email, '')) like $${params.length}
        or lower(coalesce(cin, '')) like $${params.length}
      )`);
    }

    const result = await query(
      `
        select *
        from users
        ${where.length ? `where ${where.join(' and ')}` : ''}
        order by created_at desc, nom asc, prenom asc
      `,
      params
    );

    res.json({ users: result.rows.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const data = {
      role: 'stagiaire',
      prenom: '',
      nom: '',
      charteAccepted: true,
      reproductionAccepted: true,
      ...parsed.data
    };
    const { columns, values } = buildUserPatch(data);
    const columnNames = columns.map((assignment) => assignment.split(' = ')[0]);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const result = await query(
      `
        insert into users (${columnNames.join(', ')})
        values (${placeholders.join(', ')})
        returning *
      `,
      values
    );

    emitRealtimeChange({ entity: 'users', action: 'register', id: result.rows[0].id });
    res.status(201).json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await query('select * from users where id = $1', [req.params.id]);
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id', async (req, res, next) => {
  try {
    if (!canMutateUser(req, req.params.id)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = userPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const { columns, values, params } = buildUserPatch(parsed.data);
    if (!columns.length) {
      const current = await query('select * from users where id = $1', [req.params.id]);
      res.json({ user: toPublicUser(current.rows[0]) });
      return;
    }

    const result = await query(
      `
        update users
        set ${columns.join(', ')}, updated_at = now()
        where id = $${params.length + 1}
        returning *
      `,
      [...values, req.params.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    emitRealtimeChange({ entity: 'users', action: 'patch', id: result.rows[0].id });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id/deactivate', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = emptyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await query(
      'update users set is_deactivated = true, updated_at = now() where id = $1 returning *',
      [req.params.id]
    );
    emitRealtimeChange({ entity: 'users', action: 'deactivate', id: result.rows[0].id });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id/reactivate', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = emptyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await query(
      'update users set is_deactivated = false, updated_at = now() where id = $1 returning *',
      [req.params.id]
    );
    emitRealtimeChange({ entity: 'users', action: 'reactivate', id: result.rows[0].id });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id/behavior-rating', requireRole('administrateur'), async (req, res, next) => {
  try {
    const parsed = z.object({ rating: z.number().min(0).max(5) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const result = await query(
      'update users set comportement_rating = $1, updated_at = now() where id = $2 returning *',
      [parsed.data.rating, req.params.id]
    );
    emitRealtimeChange({ entity: 'users', action: 'patch', id: result.rows[0].id });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:id', requireRole('administrateur'), async (req, res, next) => {
  try {
    await query('delete from project_contributors where user_id = $1', [req.params.id]);
    await query('delete from project_supervisors where user_id = $1', [req.params.id]);
    const result = await query('delete from users where id = $1 returning id', [req.params.id]);

    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    emitRealtimeChange({ entity: 'users', action: 'delete', id: result.rows[0].id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
