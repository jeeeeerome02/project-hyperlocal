import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import { query } from '../database/db.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Generate a JWT access token for a user.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      trustTier: user.trust_tier,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );
}

/**
 * Generate a refresh token (random string, hashed for storage).
 */
export function generateRefreshToken() {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash a phone number with SHA-256 for storage.
 */
export function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

/**
 * Encrypt a phone number with AES-256-GCM for encrypted storage.
 */
export function encryptPhone(phone) {
  const key = crypto.scryptSync(config.jwt.secret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return Buffer.from(`${iv.toString('hex')}:${authTag}:${encrypted}`);
}

/**
 * Express middleware: Authenticate JWT token.
 * Sets req.user = { id, role, trustTier }
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      trustTier: decoded.trustTier,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    return errorResponse(res, 401, 'INVALID_TOKEN', 'Invalid access token');
  }
}

/**
 * Express middleware: Optional authentication.
 * Sets req.user if valid token, otherwise req.user = null.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      trustTier: decoded.trustTier,
    };
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Express middleware factory: Require specific roles.
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}

/**
 * Check if user is muted or banned before allowing post actions.
 */
export async function checkUserStatus(req, res, next) {
  if (!req.user) return next();

  try {
    const result = await query(
      `SELECT ban_expires_at, mute_expires_at, is_active 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'Your account has been disabled');
    }

    const user = result.rows[0];
    if (user.ban_expires_at && new Date(user.ban_expires_at) > new Date()) {
      return errorResponse(res, 403, 'ACCOUNT_BANNED', 'Your account is currently banned', {
        banExpiresAt: user.ban_expires_at,
      });
    }

    if (user.mute_expires_at && new Date(user.mute_expires_at) > new Date()) {
      return errorResponse(res, 403, 'ACCOUNT_MUTED', 'You are temporarily muted', {
        muteExpiresAt: user.mute_expires_at,
      });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Error checking user status');
    next(err);
  }
}
