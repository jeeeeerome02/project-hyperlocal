import { Router } from 'express';
import { query } from '../database/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { vendorApplySchema, vendorLocationSchema } from '../validators/schemas.js';
import { fuzzLocation } from '../utils/location.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// POST /vendor/apply — Apply for vendor mode
// =========================================================================
router.post('/apply', authenticate, validate(vendorApplySchema), async (req, res) => {
  try {
    const { businessName, businessCategory, description } = req.validatedBody;
    const userId = req.user.id;

    // Check if already has a vendor profile
    const existing = await query(
      'SELECT id, status FROM vendor_profiles WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length) {
      const profile = existing.rows[0];
      if (profile.status === 'approved') {
        return errorResponse(res, 409, 'ALREADY_VENDOR', 'You already have an approved vendor profile');
      }
      if (profile.status === 'pending_review') {
        return errorResponse(res, 409, 'APPLICATION_PENDING', 'Your vendor application is pending review');
      }
    }

    const result = await query(
      `INSERT INTO vendor_profiles (user_id, business_name, business_category, description, status)
       VALUES ($1, $2, $3, $4, 'pending_review')
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = $2,
         business_category = $3,
         description = $4,
         status = 'pending_review',
         updated_at = NOW()
       RETURNING id`,
      [userId, businessName, businessCategory, description || null]
    );

    // Add to moderation queue
    await query(
      `INSERT INTO moderation_queue (post_id, reason, priority)
       VALUES ($1, 'vendor_application', 3)`,
      [result.rows[0].id]
    );

    return successResponse(res, {
      applicationId: result.rows[0].id,
      status: 'pending_review',
      estimatedReviewTime: '24 hours',
    }, 201);
  } catch (err) {
    logger.error({ err }, 'Error applying as vendor');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to submit vendor application');
  }
});

// =========================================================================
// GET /vendor/dashboard — Get vendor analytics
// =========================================================================
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const vendorResult = await query(
      'SELECT * FROM vendor_profiles WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );
    if (!vendorResult.rows.length) {
      return errorResponse(res, 404, 'NOT_VENDOR', 'No approved vendor profile found');
    }

    const vendor = vendorResult.rows[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Stats
    const statsResult = await query(
      `SELECT 
        COALESCE(SUM(view_count), 0) as views_week,
        COALESCE(SUM(reaction_confirm), 0) as confirms_week,
        COUNT(*) as posts_week
       FROM posts
       WHERE author_id = $1 AND created_at >= $2`,
      [req.user.id, oneWeekAgo]
    );

    // New followers this week
    const newFollowersResult = await query(
      `SELECT COUNT(*) as cnt FROM vendor_followers
       WHERE vendor_id = $1 AND created_at >= $2`,
      [vendor.id, oneWeekAgo]
    );

    // Recent posts
    const recentPosts = await query(
      `SELECT id, content, view_count, reaction_confirm, created_at
       FROM posts WHERE author_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );

    return successResponse(res, {
      businessName: vendor.business_name,
      isVerified: vendor.is_verified,
      stats: {
        viewsThisWeek: parseInt(statsResult.rows[0].views_week),
        confirmsThisWeek: parseInt(statsResult.rows[0].confirms_week),
        followers: vendor.follower_count,
        newFollowersThisWeek: parseInt(newFollowersResult.rows[0].cnt),
      },
      recentPosts: recentPosts.rows.map((p) => ({
        id: p.id,
        content: p.content,
        views: p.view_count,
        confirms: p.reaction_confirm,
        createdAt: p.created_at,
      })),
      schedule: vendor.schedule,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching vendor dashboard');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch vendor dashboard');
  }
});

// =========================================================================
// PUT /vendor/location — Update vendor live location
// =========================================================================
router.put('/location', authenticate, validate(vendorLocationSchema), async (req, res) => {
  try {
    const { lat, lng } = req.validatedBody;

    // Light fuzzing for vendors (30-50m)
    const fuzzed = fuzzLocation(lat, lng, 30, 50);

    const result = await query(
      `UPDATE vendor_profiles SET
        current_location = ST_SetSRID(ST_MakePoint($2, $1), 4326),
        location_updated_at = NOW(),
        updated_at = NOW()
       WHERE user_id = $3 AND status = 'approved'
       RETURNING id`,
      [fuzzed.lat, fuzzed.lng, req.user.id]
    );

    if (!result.rows.length) {
      return errorResponse(res, 404, 'NOT_VENDOR', 'No approved vendor profile found');
    }

    // Store in location history
    await query(
      `INSERT INTO vendor_location_history (vendor_id, location)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326))`,
      [result.rows[0].id, fuzzed.lat, fuzzed.lng]
    );

    // Broadcast location update via WebSocket
    if (req.app.get('io')) {
      req.app.get('io').to('geo:nearby').emit('vendor:location', {
        vendorId: result.rows[0].id,
        location: { lat: fuzzed.lat, lng: fuzzed.lng },
      });
    }

    return successResponse(res, { updated: true });
  } catch (err) {
    logger.error({ err }, 'Error updating vendor location');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update vendor location');
  }
});

// =========================================================================
// POST /vendor/:vendorId/follow — Follow a vendor
// =========================================================================
router.post('/:vendorId/follow', authenticate, async (req, res) => {
  try {
    await query(
      `INSERT INTO vendor_followers (vendor_id, follower_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.vendorId, req.user.id]
    );
    return successResponse(res, { followed: true });
  } catch (err) {
    logger.error({ err }, 'Error following vendor');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to follow vendor');
  }
});

// =========================================================================
// DELETE /vendor/:vendorId/follow — Unfollow a vendor
// =========================================================================
router.delete('/:vendorId/follow', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM vendor_followers WHERE vendor_id = $1 AND follower_id = $2',
      [req.params.vendorId, req.user.id]
    );
    return successResponse(res, { unfollowed: true });
  } catch (err) {
    logger.error({ err }, 'Error unfollowing vendor');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to unfollow vendor');
  }
});

export default router;
