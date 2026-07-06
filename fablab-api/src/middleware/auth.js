import { query } from '../db/pool.js';
import { verifyUserToken } from '../auth/jwt.js';
import { toPublicUser } from '../models/user.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const payload = verifyUserToken(token);
    const result = await query('select * from users where id = $1', [payload.sub]);
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: 'Invalid bearer token' });
      return;
    }

    if (user.is_deactivated) {
      res.status(403).json({ error: 'User is deactivated' });
      return;
    }

    req.user = user;
    req.publicUser = toPublicUser(user);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid bearer token' });
      return;
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
