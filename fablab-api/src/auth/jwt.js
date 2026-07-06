import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email || null
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyUserToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
