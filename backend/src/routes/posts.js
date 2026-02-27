import { Router } from 'express';
import { query, withTransaction } from '../database/db.js';
import { cacheGetOrCompute } from '../database/redis.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { authenticate, optionalAuth, checkUserStatus } from '../middleware/auth.js';
import { checkRateLimit } from '../database/redis.js';
import { fuzzLocation, isValidCoordinate } from '../utils/location.js';
import {
  createPostSchema,
  nearbyQuerySchema,
  reactionSchema,
  reportSchema,
} from '../validators/schemas.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// GET /posts/nearby — Fetch active posts within radius (primary map feed)
// =========================================================================
router.get('/nearby', optionalAuth, validate(nearbyQuerySchema, 'query'), async (req, res) => {
  try {
    const { lat, lng, radiusKm, categories, since, sort, limit, offset } = req.validatedQuery;

    // Parse categories if provided
    const categoryArray = categories
      ? categories.split(',').map((c) => c.trim())
      : null;

    // Parse since date (default: 24 hours ago)
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Build the PostGIS query using the stored function
    const result = await query(
      `SELECT * FROM get_nearby_posts($1, $2, $3, $4, $5, $6, $7, $8)`,
      [lat, lng, radiusKm, categoryArray, sinceDate.toISOString(), sort, limit, offset]
    );

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM posts p
       WHERE p.status = 'active'
         AND p.created_at >= $3
         AND ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $4)
         ${categoryArray ? "AND p.category = ANY($5)" : ""}`,
      categoryArray
        ? [lat, lng, sinceDate.toISOString(), radiusKm * 1000, categoryArray]
        : [lat, lng, sinceDate.toISOString(), radiusKm * 1000]
    );

    // Get user's reactions for these posts (if authenticated)
    let userReactions = {};
    if (req.user && result.rows.length > 0) {
      const postIds = result.rows.map((p) => p.id);
      const rxResult = await query(
        `SELECT post_id, reaction FROM reactions WHERE user_id = $1 AND post_id = ANY($2)`,
        [req.user.id, postIds]
      );
      userReactions = Object.fromEntries(rxResult.rows.map((r) => [r.post_id, r.reaction]));
    }

    // Check vendor status for authors
    const authorIds = [...new Set(result.rows.map((p) => p.author_id))];
    let vendorMap = {};
    if (authorIds.length > 0) {
      const vendorResult = await query(
        `SELECT user_id, status, is_verified FROM vendor_profiles WHERE user_id = ANY($1) AND status = 'approved'`,
        [authorIds]
      );
      vendorMap = Object.fromEntries(
        vendorResult.rows.map((v) => [v.user_id, { isVendor: true, isVerified: v.is_verified }])
      );
    }

    const posts = result.rows.map((p) => ({
      id: p.id,
      category: p.category,
      content: p.content,
      photoUrl: p.photo_url,
      location: {
        lat: p.lat,
        lng: p.lng,
        fuzzed: true,
      },
      distanceMeters: Math.round(p.distance_meters),
      author: {
        id: p.author_id,
        displayName: p.author_display_name || 'Neighbor',
        trustTier: p.author_trust_tier,
        ...(vendorMap[p.author_id] || { isVendor: false, isVerified: false }),
      },
      reactions: {
        confirm: p.reaction_confirm,
        still_active: p.reaction_still_active,
        no_longer_valid: p.reaction_no_longer_valid,
        thanks: p.reaction_thanks,
      },
      userReaction: userReactions[p.id] || null,
      isDuplicate: p.duplicate_score >= 0.5,
      expiresAt: p.expires_at,
      canExtend: p.extensions_used === 0,
      createdAt: p.created_at,
    }));

    const total = parseInt(countResult.rows[0]?.total || 0);
    return successResponse(res, {
      posts,
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching nearby posts');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch nearby posts');
  }
});

// =========================================================================
// POST /posts — Create a new post
// =========================================================================
router.post('/', authenticate, checkUserStatus, validate(createPostSchema), async (req, res) => {
  try {
    const { category, content, lat, lng } = req.validatedBody;
    const userId = req.user.id;

    // Rate limit: 5 posts per 30 minutes
    const rateCheck = await checkRateLimit(
      `rl:post:${userId}`,
      config.app.postRateLimitCount,
      config.app.postRateLimitWindowMinutes * 60
    );
    if (!rateCheck.allowed) {
      return errorResponse(res, 429, 'RATE_LIMIT',
        `Post rate limit exceeded. You can create ${config.app.postRateLimitCount} posts per ${config.app.postRateLimitWindowMinutes} minutes.`,
        { remaining: rateCheck.remaining, retryAfter: rateCheck.resetIn }
      );
    }

    // Validate coordinates
    if (!isValidCoordinate(lat, lng)) {
      return errorResponse(res, 400, 'INVALID_LOCATION', 'Invalid latitude or longitude');
    }

    // Get category configuration
    const catConfigResult = await query(
      'SELECT * FROM category_config WHERE category = $1 AND is_active = true',
      [category]
    );
    if (!catConfigResult.rows.length) {
      return errorResponse(res, 400, 'INVALID_CATEGORY', 'Category is not available');
    }
    const catConfig = catConfigResult.rows[0];

    // Check trust requirement
    const userResult = await query('SELECT trust_score FROM users WHERE id = $1', [userId]);
    const userTrust = userResult.rows[0]?.trust_score || 0;

    if (category === 'barangay_announcement' && !['official', 'admin'].includes(req.user.role)) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Only barangay officials can create announcements');
    }

    // Fuzz the location (PRIVACY: original coordinates discarded after this point)
    const fuzzed = fuzzLocation(lat, lng, catConfig.fuzz_min_meters, catConfig.fuzz_max_meters);

    // Run duplicate detection
    const dupResult = await query(
      'SELECT * FROM check_duplicate_post($1, $2, $3, $4)',
      [content, fuzzed.lat, fuzzed.lng, category]
    );

    let duplicateStatus = 'unique';
    let linkedPostId = null;
    let duplicateScore = 0;

    if (dupResult.rows.length > 0) {
      const topDup = dupResult.rows[0];
      duplicateScore = topDup.composite_score;

      if (duplicateScore >= 0.75) {
        return errorResponse(res, 409, 'DUPLICATE_POST',
          'A similar report already exists nearby. Please confirm the existing post instead.',
          {
            existingPostId: topDup.existing_post_id,
            score: duplicateScore,
          }
        );
      }

      if (duplicateScore >= 0.5) {
        duplicateStatus = 'possible_duplicate';
        linkedPostId = topDup.existing_post_id;
      }
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + catConfig.default_ttl_hours * 60 * 60 * 1000);

    // Determine moderation status
    const needsModeration = userTrust < 25;
    const status = needsModeration ? 'pending_moderation' : 'active';

    // Insert the post
    const postResult = await query(
      `INSERT INTO posts (
        author_id, category, content, photo_url,
        location, fuzz_radius_used,
        status, expires_at, duplicate_score, linked_post_id,
        moderation_status
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($6, $5), 4326), $7,
        $8, $9, $10, $11,
        $12
      ) RETURNING *`,
      [
        userId, category, content, req.body.photoUrl || null,
        fuzzed.lat, fuzzed.lng, fuzzed.fuzzRadiusUsed,
        status, expiresAt.toISOString(), duplicateScore, linkedPostId,
        needsModeration ? 'pending' : 'auto_approved',
      ]
    );

    const post = postResult.rows[0];

    // If needs moderation, add to queue
    if (needsModeration) {
      await query(
        `INSERT INTO moderation_queue (post_id, reason, priority)
         VALUES ($1, 'low_trust_auto_queue', $2)`,
        [post.id, category === 'safety_alert' ? 1 : 5]
      );
    }

    // Emit WebSocket event for live map updates (handled by WS server)
    if (req.app.get('io') && status === 'active') {
      const io = req.app.get('io');
      io.to(`geo:nearby`).emit('post:new', {
        id: post.id,
        category,
        content,
        location: { lat: fuzzed.lat, lng: fuzzed.lng },
        authorTrustTier: req.user.trustTier,
        expiresAt: expiresAt.toISOString(),
        createdAt: post.created_at,
      });
    }

    return successResponse(res, {
      id: post.id,
      category,
      content,
      photoUrl: post.photo_url,
      location: {
        lat: fuzzed.lat,
        lng: fuzzed.lng,
        fuzzed: true,
      },
      expiresAt: expiresAt.toISOString(),
      duplicateCheck: {
        score: duplicateScore,
        status: duplicateStatus,
        similarPostId: linkedPostId,
      },
      moderationStatus: needsModeration ? 'pending' : 'approved',
      createdAt: post.created_at,
    }, 201);
  } catch (err) {
    logger.error({ err }, 'Error creating post');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create post');
  }
});

// =========================================================================
// POST /posts/:postId/react — React to a post
// =========================================================================
router.post('/:postId/react', authenticate, validate(reactionSchema), async (req, res) => {
  try {
    const { postId } = req.params;
    const { reaction } = req.validatedBody;
    const userId = req.user.id;

    // Check post exists and is active
    const postResult = await query(
      'SELECT id, status, expires_at, author_id FROM posts WHERE id = $1',
      [postId]
    );
    if (!postResult.rows.length || postResult.rows[0].status !== 'active') {
      return errorResponse(res, 404, 'POST_NOT_FOUND', 'Post not found or no longer active');
    }

    // Cannot react to own post
    if (postResult.rows[0].author_id === userId) {
      return errorResponse(res, 400, 'SELF_REACTION', 'Cannot react to your own post');
    }

    // Upsert reaction (one per user per post)
    await query(
      `INSERT INTO reactions (post_id, user_id, reaction)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET reaction = $3, created_at = NOW()`,
      [postId, userId, reaction]
    );

    // Check if "confirm" from trusted user should extend TTL
    let ttlExtended = false;
    if (reaction === 'confirm') {
      const userTrust = await query('SELECT trust_score FROM users WHERE id = $1', [userId]);
      if (userTrust.rows[0]?.trust_score >= 50) {
        // Extend by 1 hour if within last 2 hours of TTL
        const post = postResult.rows[0];
        const timeLeft = new Date(post.expires_at) - new Date();
        if (timeLeft < 2 * 60 * 60 * 1000) { // Less than 2 hours left
          await query(
            `UPDATE posts SET expires_at = expires_at + INTERVAL '1 hour' WHERE id = $1`,
            [postId]
          );
          ttlExtended = true;
        }
      }
    }

    // Check if "no_longer_valid" should trigger auto-expiry
    if (reaction === 'no_longer_valid') {
      const invalidCount = await query(
        `SELECT COUNT(*) as cnt FROM reactions 
         WHERE post_id = $1 AND reaction = 'no_longer_valid'`,
        [postId]
      );
      if (parseInt(invalidCount.rows[0].cnt) >= 3) {
        await query(
          `UPDATE posts SET status = 'auto_removed' WHERE id = $1`,
          [postId]
        );
        // Emit WebSocket event
        if (req.app.get('io')) {
          req.app.get('io').to('geo:nearby').emit('post:expired', { postId });
        }
      }
    }

    // Get updated reaction counts
    const updatedPost = await query(
      `SELECT reaction_confirm, reaction_still_active, reaction_no_longer_valid, reaction_thanks
       FROM posts WHERE id = $1`,
      [postId]
    );

    return successResponse(res, {
      postId,
      reaction,
      newReactionCounts: {
        confirm: updatedPost.rows[0].reaction_confirm,
        still_active: updatedPost.rows[0].reaction_still_active,
        no_longer_valid: updatedPost.rows[0].reaction_no_longer_valid,
        thanks: updatedPost.rows[0].reaction_thanks,
      },
      ttlExtended,
    });
  } catch (err) {
    logger.error({ err }, 'Error reacting to post');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to save reaction');
  }
});

// =========================================================================
// POST /posts/:postId/extend — Extend post TTL
// =========================================================================
router.post('/:postId/extend', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const postResult = await query(
      `SELECT p.*, cc.max_extension_hours, cc.max_extensions
       FROM posts p
       JOIN category_config cc ON p.category = cc.category
       WHERE p.id = $1 AND p.author_id = $2 AND p.status = 'active'`,
      [postId, userId]
    );

    if (!postResult.rows.length) {
      return errorResponse(res, 404, 'POST_NOT_FOUND', 'Post not found or you are not the author');
    }

    const post = postResult.rows[0];

    if (post.extensions_used >= post.max_extensions) {
      return errorResponse(res, 400, 'NO_EXTENSIONS', 'No extensions remaining for this post');
    }

    if (post.max_extension_hours === 0) {
      return errorResponse(res, 400, 'NO_EXTENSIONS', 'This category does not support extensions');
    }

    // Check if within last 30 minutes of TTL
    const timeLeft = new Date(post.expires_at) - new Date();
    if (timeLeft > 30 * 60 * 1000) {
      return errorResponse(res, 400, 'TOO_EARLY', 'Extensions are only available in the last 30 minutes before expiry');
    }

    // Check engagement requirement
    const totalEngagement = post.reaction_confirm + post.reaction_still_active + post.reaction_thanks;
    if (totalEngagement === 0 && post.view_count < 5) {
      return errorResponse(res, 400, 'LOW_ENGAGEMENT', 'Posts with no engagement cannot be extended');
    }

    const previousExpires = post.expires_at;
    const newExpires = new Date(
      new Date(post.expires_at).getTime() + post.max_extension_hours * 60 * 60 * 1000
    );

    await query(
      `UPDATE posts SET 
        expires_at = $1, 
        extensions_used = extensions_used + 1,
        updated_at = NOW()
       WHERE id = $2`,
      [newExpires.toISOString(), postId]
    );

    return successResponse(res, {
      postId,
      previousExpiresAt: previousExpires,
      newExpiresAt: newExpires.toISOString(),
      extensionsRemaining: post.max_extensions - post.extensions_used - 1,
    });
  } catch (err) {
    logger.error({ err }, 'Error extending post');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to extend post');
  }
});

// =========================================================================
// POST /posts/:postId/report — Report a post
// =========================================================================
router.post('/:postId/report', authenticate, validate(reportSchema), async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason, details } = req.validatedBody;
    const userId = req.user.id;

    // Check post exists
    const postExists = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (!postExists.rows.length) {
      return errorResponse(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }

    // Check for duplicate report from this user
    const existingReport = await query(
      'SELECT id FROM reports WHERE post_id = $1 AND reporter_id = $2',
      [postId, userId]
    );
    if (existingReport.rows.length) {
      return errorResponse(res, 409, 'ALREADY_REPORTED', 'You have already reported this post');
    }

    await query(
      `INSERT INTO reports (post_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4)`,
      [postId, userId, reason, details || null]
    );

    // Check if total reports >= 3 → auto-hide
    const reportCount = await query(
      'SELECT COUNT(*) as cnt FROM reports WHERE post_id = $1',
      [postId]
    );
    if (parseInt(reportCount.rows[0].cnt) >= 3) {
      await query("UPDATE posts SET status = 'auto_removed' WHERE id = $1", [postId]);
      // Add to moderation queue for final review
      await query(
        `INSERT INTO moderation_queue (post_id, reason, priority)
         VALUES ($1, 'community_flagged_3plus', 2)
         ON CONFLICT DO NOTHING`,
        [postId]
      );
    }

    return successResponse(res, { reported: true });
  } catch (err) {
    logger.error({ err }, 'Error reporting post');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to report post');
  }
});

// =========================================================================
// DELETE /posts/:postId — Delete own post
// =========================================================================
router.delete('/:postId', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await query(
      `UPDATE posts SET status = 'removed_by_author', updated_at = NOW()
       WHERE id = $1 AND author_id = $2 AND status = 'active'
       RETURNING id`,
      [postId, req.user.id]
    );

    if (!result.rows.length) {
      return errorResponse(res, 404, 'POST_NOT_FOUND', 'Post not found or already removed');
    }

    // Broadcast removal
    if (req.app.get('io')) {
      req.app.get('io').to('geo:nearby').emit('post:expired', { postId });
    }

    return successResponse(res, { deleted: true });
  } catch (err) {
    logger.error({ err }, 'Error deleting post');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to delete post');
  }
});

export default router;
