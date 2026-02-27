import { Router } from 'express';
import { query } from '../database/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { moderationActionSchema, banUserSchema } from '../validators/schemas.js';
import logger from '../utils/logger.js';

const router = Router();

const MOD_ROLES = ['moderator', 'official', 'admin'];

// =========================================================================
// GET /moderation/queue — Get items pending moderation
// =========================================================================
router.get('/queue', authenticate, requireRole(...MOD_ROLES), async (req, res) => {
  try {
    const { status = 'pending', category, limit = 20 } = req.query;

    let categoryFilter = '';
    const params = [status, parseInt(limit)];

    if (category && category !== 'all') {
      categoryFilter = 'AND p.category = $3';
      params.push(category);
    }

    const result = await query(
      `SELECT 
        mq.id as queue_id,
        mq.reason as queue_reason,
        mq.priority,
        mq.created_at as queued_at,
        p.id as post_id,
        p.content,
        p.category,
        p.photo_url,
        ST_Y(p.location) as lat,
        ST_X(p.location) as lng,
        p.created_at as post_created_at,
        p.duplicate_score,
        u.id as author_id,
        u.display_name as author_name,
        u.trust_score as author_trust,
        u.trust_tier as author_tier,
        u.role as author_role,
        EXTRACT(DAY FROM NOW() - u.created_at) as author_age_days,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as author_post_count,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND status = 'removed_by_mod') as author_removed_count,
        (SELECT COUNT(*) FROM reports WHERE post_id = p.id) as report_count
       FROM moderation_queue mq
       JOIN posts p ON mq.post_id = p.id
       JOIN users u ON p.author_id = u.id
       WHERE mq.status = $1
       ${categoryFilter}
       ORDER BY mq.priority ASC, mq.created_at ASC
       LIMIT $2`,
      params
    );

    const items = result.rows.map((r) => ({
      id: r.queue_id,
      post: {
        id: r.post_id,
        content: r.content,
        category: r.category,
        photoUrl: r.photo_url,
        location: { lat: r.lat, lng: r.lng },
        duplicateScore: r.duplicate_score,
        createdAt: r.post_created_at,
        reportCount: parseInt(r.report_count),
      },
      author: {
        id: r.author_id,
        displayName: r.author_name || 'Anonymous',
        trustScore: r.author_trust,
        trustTier: r.author_tier,
        role: r.author_role,
        accountAgeDays: Math.floor(parseFloat(r.author_age_days)),
        totalPosts: parseInt(r.author_post_count),
        removedPosts: parseInt(r.author_removed_count),
      },
      reason: r.queue_reason,
      priority: r.priority,
      queuedAt: r.queued_at,
    }));

    // Get total counts per status
    const countsResult = await query(
      `SELECT status, COUNT(*) as cnt FROM moderation_queue GROUP BY status`
    );
    const counts = Object.fromEntries(
      countsResult.rows.map((r) => [r.status, parseInt(r.cnt)])
    );

    return successResponse(res, {
      items,
      total: items.length,
      counts: {
        pending: counts.pending || 0,
        inReview: counts.in_review || 0,
        resolved: counts.resolved || 0,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching moderation queue');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch moderation queue');
  }
});

// =========================================================================
// POST /moderation/:itemId/action — Take moderation action
// =========================================================================
router.post('/:itemId/action', authenticate, requireRole(...MOD_ROLES), validate(moderationActionSchema), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { action, note } = req.validatedBody;

    // Fetch queue item
    const queueResult = await query(
      `SELECT mq.*, p.author_id, p.id as post_id
       FROM moderation_queue mq
       JOIN posts p ON mq.post_id = p.id
       WHERE mq.id = $1 AND mq.status IN ('pending', 'in_review')`,
      [itemId]
    );

    if (!queueResult.rows.length) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Moderation item not found or already resolved');
    }

    const queueItem = queueResult.rows[0];

    // Apply action
    switch (action) {
      case 'approve':
        await query("UPDATE posts SET status = 'active', moderation_status = 'approved' WHERE id = $1", [queueItem.post_id]);
        break;

      case 'reject':
      case 'remove':
        await query("UPDATE posts SET status = 'removed_by_mod', moderation_status = 'removed' WHERE id = $1", [queueItem.post_id]);
        // Emit removal via WebSocket
        if (req.app.get('io')) {
          req.app.get('io').to('geo:nearby').emit('post:expired', { postId: queueItem.post_id });
        }
        break;

      case 'escalate':
        await query(
          "UPDATE moderation_queue SET status = 'pending', priority = 1 WHERE id = $1",
          [itemId]
        );
        break;

      case 'mute_user_24h':
        await query(
          "UPDATE users SET mute_expires_at = NOW() + INTERVAL '24 hours' WHERE id = $1",
          [queueItem.author_id]
        );
        await query("UPDATE posts SET status = 'removed_by_mod' WHERE id = $1", [queueItem.post_id]);
        break;

      case 'warn_user':
        // Create notification for the user
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'moderation_action', 'Content Warning', $2, $3)`,
          [
            queueItem.author_id,
            `Your post was flagged for review. Reason: ${note || 'Policy violation'}. Repeated violations may result in account restrictions.`,
            JSON.stringify({ postId: queueItem.post_id, action: 'warning' }),
          ]
        );
        break;
    }

    // Mark queue item resolved
    if (action !== 'escalate') {
      await query(
        `UPDATE moderation_queue SET 
          status = 'resolved', 
          resolved_action = $1,
          resolved_note = $2,
          resolved_at = NOW(),
          assigned_to = $3
         WHERE id = $4`,
        [action, note || null, req.user.id, itemId]
      );
    }

    // Log moderation action
    await query(
      `INSERT INTO moderation_log (moderator_id, target_user_id, target_post_id, action, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        queueItem.author_id,
        queueItem.post_id,
        action,
        note || null,
        JSON.stringify({ queueItemId: itemId }),
      ]
    );

    return successResponse(res, {
      itemId,
      action,
      resolved: action !== 'escalate',
    });
  } catch (err) {
    logger.error({ err }, 'Error processing moderation action');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to process moderation action');
  }
});

// =========================================================================
// GET /moderation/users/:userId — Get user moderation history
// =========================================================================
router.get('/users/:userId', authenticate, requireRole(...MOD_ROLES), async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await query(
      `SELECT id, display_name, role, trust_score, trust_tier, 
              created_at, ban_expires_at, mute_expires_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rows.length) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    const logResult = await query(
      `SELECT ml.*, u.display_name as moderator_name
       FROM moderation_log ml
       LEFT JOIN users u ON ml.moderator_id = u.id
       WHERE ml.target_user_id = $1
       ORDER BY ml.created_at DESC
       LIMIT 50`,
      [userId]
    );

    return successResponse(res, {
      user: userResult.rows[0],
      moderationHistory: logResult.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching user moderation history');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch moderation history');
  }
});

// =========================================================================
// POST /moderation/users/:userId/ban — Ban a user (admin only)
// =========================================================================
router.post('/users/:userId/ban', authenticate, requireRole('admin'), validate(banUserSchema), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.validatedBody;

    const durationMap = {
      '24h': "INTERVAL '24 hours'",
      '7d': "INTERVAL '7 days'",
      '30d': "INTERVAL '30 days'",
      permanent: "INTERVAL '100 years'",
    };

    await query(
      `UPDATE users SET 
        ban_expires_at = NOW() + ${durationMap[duration]},
        is_active = CASE WHEN '${duration}' = 'permanent' THEN false ELSE is_active END,
        updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Remove all active posts by banned user
    await query(
      "UPDATE posts SET status = 'removed_by_mod' WHERE author_id = $1 AND status = 'active'",
      [userId]
    );

    // Log
    await query(
      `INSERT INTO moderation_log (moderator_id, target_user_id, action, reason, metadata)
       VALUES ($1, $2, 'ban_user', $3, $4)`,
      [req.user.id, userId, reason, JSON.stringify({ duration })]
    );

    return successResponse(res, { banned: true, duration });
  } catch (err) {
    logger.error({ err }, 'Error banning user');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to ban user');
  }
});

export default router;
