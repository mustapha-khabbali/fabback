import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getFirebaseAuth } from '../auth/firebaseAdmin.js';
import { signUserToken } from '../auth/jwt.js';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { isProfileComplete, toPublicUser } from '../models/user.js';
import { userProfileSchema, buildUserPatch } from './users.js';
import { emitRealtimeChange } from '../realtime/bus.js';

export const authRouter = express.Router();

const adminLoginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1)
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1)
});

function sendValidationError(res, error) {
  res.status(400).json({
    error: 'Invalid request body',
    details: error.flatten()
  });
}

async function findUserByGoogle(decodedToken) {
  const email = decodedToken.email?.trim().toLowerCase() || null;
  const result = await query(
    `
      select *
      from users
      where google_uid = $1
        or ($2::text is not null and lower(email) = $2)
      order by google_uid = $1 desc
      limit 1
    `,
    [decodedToken.uid, email]
  );

  return result.rows[0] || null;
}

async function upsertGoogleUser(decodedToken) {
  const existingUser = await findUserByGoogle(decodedToken);
  const email = decodedToken.email?.trim().toLowerCase() || null;
  const displayName = decodedToken.name || '';
  const [prenom = '', ...restName] = displayName.split(' ').filter(Boolean);
  const nom = restName.join(' ');

  if (existingUser) {
    const result = await query(
      `
        update users
        set
          google_uid = coalesce(google_uid, $2),
          email = coalesce(email, $3),
          updated_at = now()
        where id = $1
        returning *
      `,
      [existingUser.id, decodedToken.uid, email]
    );
    emitRealtimeChange({ entity: 'users', action: 'patch', id: result.rows[0].id });
    return result.rows[0];
  }

  const result = await query(
    `
      insert into users (
        google_uid, role, prenom, nom, email
      )
      values ($1, 'visiteur', $2, $3, $4)
      returning *
    `,
    [decodedToken.uid, prenom, nom, email]
  );

  emitRealtimeChange({ entity: 'users', action: 'register', id: result.rows[0].id });
  return result.rows[0];
}

authRouter.post('/admin', async (req, res, next) => {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const result = await query('select * from users where lower(email) = $1', [parsed.data.email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.role !== 'administrateur') {
      res.status(403).json({ error: 'Admin role required' });
      return;
    }

    if (user.is_deactivated) {
      res.status(403).json({ error: 'User is deactivated' });
      return;
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json({
      token: signUserToken(user),
      user: toPublicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/google', async (req, res, next) => {
  try {
    const parsed = googleLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const decodedToken = await getFirebaseAuth().verifyIdToken(parsed.data.idToken);
    const user = await upsertGoogleUser(decodedToken);

    if (user.is_deactivated) {
      res.status(403).json({ error: 'User is deactivated' });
      return;
    }

    const profileComplete = isProfileComplete(user);
    res.json({
      token: signUserToken(user),
      user: profileComplete ? toPublicUser(user) : null,
      profileComplete
    });
  } catch (error) {
    if (error.code?.startsWith('auth/')) {
      res.status(401).json({ error: 'Invalid Firebase token' });
      return;
    }
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.publicUser });
});

authRouter.post('/register', requireAuth, async (req, res, next) => {
  try {
    const parsed = userProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const { columns, values, params } = buildUserPatch(parsed.data);
    const result = await query(
      `
        update users
        set ${columns.join(', ')}, updated_at = now()
        where id = $${params.length + 1}
        returning *
      `,
      [...values, req.user.id]
    );

    emitRealtimeChange({ entity: 'users', action: 'register', id: result.rows[0].id });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});
