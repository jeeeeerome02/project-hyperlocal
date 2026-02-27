import { Router } from 'express';
import { query } from '../database/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { searchQuerySchema } from '../validators/schemas.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// GET /search — Full-text search across active posts
// =========================================================================
router.get('/', optionalAuth, validate(searchQuerySchema, 'query'), async (req, res) => {
  try {
    const { q, lat, lng, radiusKm } = req.validatedQuery;

    // Use PostgreSQL full-text search with tsvector + spatial filter
    const result = await query(
      `SELECT 
        p.id,
        p.content,
        p.category,
        ts_rank(p.content_tsv, plainto_tsquery('english', $1)) AS relevance_score,
        ST_DistanceSphere(p.location, ST_SetSRID(ST_MakePoint($3, $2), 4326)) AS distance_meters,
        p.created_at
       FROM posts p
       WHERE p.status = 'active'
         AND p.content_tsv @@ plainto_tsquery('english', $1)
         AND ST_DWithin(
           p.location::geography,
           ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
           $4
         )
       ORDER BY relevance_score DESC, distance_meters ASC
       LIMIT 20`,
      [q, lat, lng, radiusKm * 1000]
    );

    return successResponse(res, {
      results: result.rows.map((r) => ({
        id: r.id,
        content: r.content,
        category: r.category,
        relevanceScore: parseFloat(r.relevance_score).toFixed(2),
        distanceMeters: Math.round(r.distance_meters),
        createdAt: r.created_at,
      })),
      total: result.rows.length,
    });
  } catch (err) {
    logger.error({ err }, 'Error searching posts');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Search failed');
  }
});

export default router;
