/**
 * Background job workers using BullMQ.
 * 
 * Workers:
 * 1. ExpiryWorker  - Expires posts past their TTL (runs every 60 seconds)
 * 2. TrustWorker   - Recalculates trust scores (runs every 6 hours)
 * 3. HeatmapWorker - Pre-computes heatmap data (runs every 5 minutes)
 * 4. ArchiveWorker - Moves expired posts to archive table (runs daily)
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { query } from '../database/db.js';
import redis from '../database/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

// =========================================================================
// Queue Definitions
// =========================================================================

export const expiryQueue = new Queue('post-expiry', { connection });
export const trustQueue = new Queue('trust-score', { connection });
export const heatmapQueue = new Queue('heatmap', { connection });
export const archiveQueue = new Queue('archive', { connection });
export const notificationQueue = new Queue('notifications', { connection });

// =========================================================================
// Worker: Post Expiry (every 60 seconds)
// =========================================================================

const expiryWorker = new Worker('post-expiry', async (job) => {
  const startTime = Date.now();

  try {
    // Find all posts that should be expired
    const result = await query(
      `UPDATE posts 
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND expires_at <= NOW()
       RETURNING id, category`
    );

    const expiredCount = result.rowCount;

    if (expiredCount > 0) {
      // Gather category breakdown
      const breakdown = {};
      result.rows.forEach((row) => {
        breakdown[row.category] = (breakdown[row.category] || 0) + 1;
      });

      logger.info({
        expiredCount,
        breakdown,
        durationMs: Date.now() - startTime,
      }, 'Post expiry batch completed');

      // Note: WebSocket broadcast for individual post expirations would be done
      // via the IO instance passed through the app. For the worker context,
      // we publish to Redis pub/sub instead.
      for (const row of result.rows) {
        await redis.publish('ws:broadcast', JSON.stringify({
          event: 'post:expired',
          data: { postId: row.id },
        }));
      }
    }

    return { expired: expiredCount };
  } catch (err) {
    logger.error({ err }, 'Post expiry worker error');
    throw err;
  }
}, { connection, concurrency: 1 });

// =========================================================================
// Worker: Trust Score Recalculation (every 6 hours)
// =========================================================================

const trustWorker = new Worker('trust-score', async (job) => {
  const startTime = Date.now();

  try {
    // Get all active users
    const users = await query(
      `SELECT id FROM users WHERE is_active = true AND deleted_at IS NULL`
    );

    let updated = 0;
    let errors = 0;

    for (const user of users.rows) {
      try {
        // Call the trust score computation function
        const result = await query(
          'SELECT * FROM compute_trust_score($1)',
          [user.id]
        );

        if (result.rows.length) {
          const { total_score, tier, breakdown } = result.rows[0];

          // Get current score for history
          const current = await query(
            'SELECT trust_score, trust_tier FROM users WHERE id = $1',
            [user.id]
          );

          const oldScore = current.rows[0].trust_score;
          const oldTier = current.rows[0].trust_tier;

          // Update user
          await query(
            `UPDATE users SET 
              trust_score = $1, 
              trust_tier = $2, 
              updated_at = NOW()
             WHERE id = $3`,
            [total_score, tier, user.id]
          );

          // Record history if score changed
          if (oldScore !== total_score) {
            await query(
              `INSERT INTO trust_score_history (user_id, old_score, new_score, old_tier, new_tier, breakdown)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [user.id, oldScore, total_score, oldTier, tier, breakdown]
            );
          }

          // Cache in Redis
          await redis.setex(`trust:user:${user.id}`, 21600, JSON.stringify({
            score: total_score,
            tier,
          }));

          updated++;
        }
      } catch (err) {
        logger.error({ err, userId: user.id }, 'Trust score calculation error for user');
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ updated, errors, totalUsers: users.rows.length, durationMs: duration },
      'Trust score recalculation completed');

    return { updated, errors };
  } catch (err) {
    logger.error({ err }, 'Trust score worker error');
    throw err;
  }
}, { connection, concurrency: 1 });

// =========================================================================
// Worker: Archive (daily — move expired posts to archive table)
// =========================================================================

const archiveWorker = new Worker('archive', async (job) => {
  const startTime = Date.now();

  try {
    // Move posts expired for more than 24 hours to archive
    const result = await query(
      `WITH moved AS (
        DELETE FROM posts 
        WHERE status IN ('expired', 'removed_by_author', 'removed_by_mod', 'auto_removed')
          AND updated_at < NOW() - INTERVAL '24 hours'
        RETURNING *
      )
      INSERT INTO posts_archive 
      SELECT * FROM moved
      RETURNING id`
    );

    const archived = result.rowCount;
    logger.info({ archived, durationMs: Date.now() - startTime },
      'Post archival completed');

    // Also clean up old rate limit events
    await query(
      `DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '24 hours'`
    );

    // Clean up old notifications (>30 days)
    await query(
      `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
    );

    return { archived };
  } catch (err) {
    logger.error({ err }, 'Archive worker error');
    throw err;
  }
}, { connection, concurrency: 1 });

// =========================================================================
// Worker: Push Notifications
// =========================================================================

const notificationWorker = new Worker('notifications', async (job) => {
  const { postId, category, lat, lng } = job.data;

  try {
    // Find users who should be notified (based on their preferences + radius)
    const users = await query(
      `SELECT u.id, u.fcm_token, u.notification_prefs,
              ST_DistanceSphere(
                ST_SetSRID(ST_MakePoint($2, $1), 4326),
                ST_SetSRID(ST_MakePoint(u.last_known_lng, u.last_known_lat), 4326)
              ) as distance_meters
       FROM users u
       WHERE u.is_active = true
         AND u.fcm_token IS NOT NULL
         AND u.last_known_lat IS NOT NULL
         AND u.notification_prefs->>'enabled' = 'true'
         AND u.notification_prefs->'categories' ? $3
         AND ST_DWithin(
           ST_SetSRID(ST_MakePoint(u.last_known_lng, u.last_known_lat), 4326)::geography,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           (u.notification_prefs->>'radiusKm')::float * 1000
         )
       LIMIT 500`,
      [lat, lng, category]
    );

    // Get post content for notification
    const postResult = await query(
      'SELECT content, category FROM posts WHERE id = $1',
      [postId]
    );

    if (!postResult.rows.length) return { sent: 0 };
    const post = postResult.rows[0];

    let sent = 0;
    for (const user of users.rows) {
      try {
        // Check quiet hours
        const prefs = user.notification_prefs;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        if (prefs.quietHoursStart && prefs.quietHoursEnd) {
          if (currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd) {
            continue; // Skip during quiet hours
          }
        }

        // Check rate limit: max 10 notifications per hour per user
        const hourKey = `notif:rate:${user.id}`;
        const count = await redis.incr(hourKey);
        if (count === 1) await redis.expire(hourKey, 3600);
        if (count > 10) continue;

        // Store notification in DB
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data, sent_via_push)
           VALUES ($1, 'nearby_post', $2, $3, $4, true)`,
          [
            user.id,
            `${category.replace('_', ' ')} nearby`,
            post.content.substring(0, 100),
            JSON.stringify({
              postId,
              category,
              distance: Math.round(user.distance_meters),
            }),
          ]
        );

        // In production: send via Firebase Cloud Messaging
        // await admin.messaging().send({
        //   token: user.fcm_token,
        //   notification: { title: `${category} nearby`, body: post.content.substring(0, 100) },
        //   data: { postId, category },
        // });

        sent++;
      } catch (err) {
        logger.debug({ err, userId: user.id }, 'Failed to send notification to user');
      }
    }

    logger.info({ postId, category, sent, totalEligible: users.rows.length },
      'Push notifications dispatched');

    return { sent };
  } catch (err) {
    logger.error({ err }, 'Notification worker error');
    throw err;
  }
}, { connection, concurrency: 3 });

// =========================================================================
// Schedule recurring jobs
// =========================================================================

export async function scheduleRecurringJobs() {
  // Post expiry: every 60 seconds
  await expiryQueue.upsertJobScheduler(
    'expiry-cron',
    { every: 60000 },
    { name: 'expire-posts' }
  );

  // Trust score recalculation: every 6 hours
  await trustQueue.upsertJobScheduler(
    'trust-cron',
    { every: 6 * 60 * 60 * 1000 },
    { name: 'recalculate-trust' }
  );

  // Archive: daily at 3 AM
  await archiveQueue.upsertJobScheduler(
    'archive-cron',
    { pattern: '0 3 * * *' },
    { name: 'archive-expired' }
  );

  logger.info('Recurring background jobs scheduled');
}

// =========================================================================
// Helper: Queue a notification job (called from post creation)
// =========================================================================

export async function queuePostNotification(postId, category, lat, lng) {
  await notificationQueue.add('notify-nearby', { postId, category, lat, lng }, {
    delay: 5000, // 5 second delay to allow for post moderation
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
