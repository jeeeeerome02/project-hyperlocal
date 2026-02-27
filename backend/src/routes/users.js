import { Router } from 'express';
import { query } from '../database/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { updateProfileSchema, notificationPrefsSchema } from '../validators/schemas.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// GET /users/me — Get current user profile
// =========================================================================
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.*,
              (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND status IN ('active','expired')) as total_posts,
              (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND reaction_confirm >= 3) as confirmed_posts,
              (SELECT COUNT(*) FROM reactions WHERE user_id = u.id) as total_reactions,
              EXTRACT(DAY FROM NOW() - u.created_at) as account_age_days
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    const user = result.rows[0];

    // Check vendor profile
    const vendorResult = await query(
      'SELECT * FROM vendor_profiles WHERE user_id = $1',
      [req.user.id]
    );

    const vendorProfile = vendorResult.rows.length ? {
      id: vendorResult.rows[0].id,
      businessName: vendorResult.rows[0].business_name,
      businessCategory: vendorResult.rows[0].business_category,
      status: vendorResult.rows[0].status,
      isVerified: vendorResult.rows[0].is_verified,
      followerCount: vendorResult.rows[0].follower_count,
    } : null;

    return successResponse(res, {
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      trustScore: user.trust_score,
      trustTier: user.trust_tier,
      stats: {
        totalPosts: parseInt(user.total_posts),
        confirmedPosts: parseInt(user.confirmed_posts),
        totalReactions: parseInt(user.total_reactions),
        accountAgeDays: Math.floor(parseFloat(user.account_age_days)),
      },
      notificationPrefs: user.notification_prefs,
      vendorProfile,
      createdAt: user.created_at,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching user profile');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch profile');
  }
});

// =========================================================================
// PATCH /users/me — Update profile
// =========================================================================
router.patch('/me', authenticate, validate(updateProfileSchema), async (req, res) => {
  try {
    const updates = req.validatedBody;
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramCount++}`);
      values.push(updates.displayName);
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatarUrl);
    }

    if (setClauses.length === 0) {
      return errorResponse(res, 400, 'NO_CHANGES', 'No fields to update');
    }

    values.push(req.user.id);
    await query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      values
    );

    return successResponse(res, { updated: true });
  } catch (err) {
    logger.error({ err }, 'Error updating profile');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update profile');
  }
});

// =========================================================================
// PUT /users/me/notifications — Update notification preferences
// =========================================================================
router.put('/me/notifications', authenticate, validate(notificationPrefsSchema), async (req, res) => {
  try {
    const prefs = req.validatedBody;

    await query(
      `UPDATE users SET
        notification_prefs = $1,
        fcm_token = COALESCE($2, fcm_token),
        updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(prefs), prefs.fcmToken || null, req.user.id]
    );

    return successResponse(res, { updated: true });
  } catch (err) {
    logger.error({ err }, 'Error updating notification prefs');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update notification preferences');
  }
});

// =========================================================================
// DELETE /users/me — Request account deletion
// =========================================================================
router.delete('/me', authenticate, async (req, res) => {
  try {
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `UPDATE users SET deleted_at = $1, is_active = false, updated_at = NOW() WHERE id = $2`,
      [deletionDate.toISOString(), req.user.id]
    );

    return successResponse(res, {
      deletionScheduled: true,
      deletionDate: deletionDate.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error scheduling account deletion');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to schedule account deletion');
  }
});

export default router;
