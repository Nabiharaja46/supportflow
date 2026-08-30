import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const BEARER_PREFIX = 'Bearer ';

function readToken(authorization) {
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) return null;
  const token = authorization.slice(BEARER_PREFIX.length).trim();
  return token || null;
}

/**
 * requireAuth — verifies the JWT from the Authorization header.
 * 401 if missing/invalid/expired. On success attaches { userId, role } to req.user.
 */
export function requireAuth(req, res, next) {
  const token = readToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let decoded;
  try {
    // Throws on invalid signature and expired tokens.
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (!decoded.userId || !decoded.role) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = { userId: decoded.userId, role: decoded.role };
  next();
}

/**
 * requireRole(role) — 403 if req.user.role does not match the given role.
 * Must be composed AFTER requireAuth so req.user exists.
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: `Forbidden — requires role "${role}"` });
    }
    next();
  };
}