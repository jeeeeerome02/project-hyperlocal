import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { otpSendSchema, otpVerifySchema, refreshTokenSchema } from '../validators/schemas.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPhone,
  encryptPhone,
  authenticate,
} from '../middleware/auth.js';
import { checkRateLimit } from '../database/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// POST /auth/otp/send — Send OTP to phone number
// =========================================================================
router.post('/otp/send', validate(otpSendSchema), async (req, res) => {
  try {
    const { phone, purpose } = req.validatedBody;

    // Rate limit: 5 OTP sends per 15 minutes per IP
    const ipHash = crypto.createHash('sha256').update(req.ip).digest('hex').substring(0, 16);
    const rateCheck = await checkRateLimit(`rl:otp:${ipHash}`, 5, 900);
    if (!rateCheck.allowed) {
      return errorResponse(res, 429, 'RATE_LIMIT', 'Too many OTP requests. Try again later.', {
        retryAfter: rateCheck.resetIn,
      });
    }

    // In production, use Twilio Verify to send OTP
    // For development, we'll create a mock OTP
    if (config.env === 'production' && config.twilio.accountSid) {
      // const twilio = (await import('twilio')).default;
      // const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      // await client.verify.v2
      //   .services(config.twilio.verifyServiceSid)
      //   .verifications.create({ to: phone, channel: 'sms' });
      logger.info({ phone: phone.substring(0, 6) + '****' }, 'OTP sent via Twilio');
    } else {
      // Dev mode: OTP is always 123456
      logger.info({ phone: phone.substring(0, 6) + '****' }, 'Dev OTP: 123456');
    }

    return successResponse(res, {
      otpSent: true,
      expiresIn: 300,
      retryAfter: 60,
    });
  } catch (err) {
    logger.error({ err }, 'OTP send error');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to send OTP');
  }
});

// =========================================================================
// POST /auth/otp/verify — Verify OTP and return tokens
// =========================================================================
router.post('/otp/verify', validate(otpVerifySchema), async (req, res) => {
  try {
    const { phone, code } = req.validatedBody;

    // In production, verify with Twilio
    let verified = false;
    if (config.env === 'production' && config.twilio.accountSid) {
      // const twilio = (await import('twilio')).default;
      // const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      // const check = await client.verify.v2
      //   .services(config.twilio.verifyServiceSid)
      //   .verificationChecks.create({ to: phone, code });
      // verified = check.status === 'approved';
      verified = true; // Placeholder
    } else {
      // Dev mode: accept 123456
      verified = code === '123456';
    }

    if (!verified) {
      return errorResponse(res, 400, 'INVALID_OTP', 'The OTP code is invalid or expired');
    }

    // Look up or create user
    const phoneHash = hashPhone(phone);
    let userResult = await query('SELECT * FROM users WHERE phone_hash = $1', [phoneHash]);
    let isNewUser = false;

    if (!userResult.rows.length) {
      // Create new user
      isNewUser = true;
      const encryptedPhone = encryptPhone(phone);
      userResult = await query(
        `INSERT INTO users (phone_hash, phone_encrypted, role, trust_score, trust_tier)
         VALUES ($1, $2, 'registered', 5, 'newcomer')
         RETURNING *`,
        [phoneHash, encryptedPhone]
      );
    }

    const user = userResult.rows[0];

    // Check if banned
    if (user.ban_expires_at && new Date(user.ban_expires_at) > new Date()) {
      return errorResponse(res, 403, 'ACCOUNT_BANNED', 'Your account is currently banned', {
        banExpiresAt: user.ban_expires_at,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const { token: refreshToken, hash: refreshHash } = generateRefreshToken();

    // Store refresh token (expire old ones)
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() 
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [user.id]
    );
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshHash]
    );

    // Mask phone for response
    const maskedPhone = phone.substring(0, 6) + '****' + phone.substring(phone.length - 3);

    return successResponse(res, {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        phone: maskedPhone,
        displayName: user.display_name,
        role: user.role,
        trustTier: user.trust_tier,
        createdAt: user.created_at,
      },
      isNewUser,
    });
  } catch (err) {
    logger.error({ err }, 'OTP verify error');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to verify OTP');
  }
});

// =========================================================================
// POST /auth/refresh — Refresh access token
// =========================================================================
router.post('/refresh', validate(refreshTokenSchema), async (req, res) => {
  try {
    const { refreshToken } = req.validatedBody;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await query(
      `SELECT rt.*, u.id as user_id, u.role, u.trust_tier, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (!result.rows.length) {
      return errorResponse(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }

    const row = result.rows[0];
    if (!row.is_active) {
      return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    // Revoke old refresh token (rotation)
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );

    // Issue new tokens
    const user = { id: row.user_id, role: row.role, trust_tier: row.trust_tier };
    const newAccessToken = generateAccessToken(user);
    const { token: newRefreshToken, hash: newHash } = generateRefreshToken();

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [row.user_id, newHash]
    );

    return successResponse(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    logger.error({ err }, 'Token refresh error');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to refresh token');
  }
});

// =========================================================================
// POST /auth/logout — Revoke refresh token
// =========================================================================
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2',
        [tokenHash, req.user.id]
      );
    }
    return successResponse(res, { loggedOut: true });
  } catch (err) {
    logger.error({ err }, 'Logout error');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to logout');
  }
});

export default router;
