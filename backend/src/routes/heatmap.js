import { Router } from 'express';
import { query } from '../database/db.js';
import { cacheGetOrCompute } from '../database/redis.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { heatmapQuerySchema, searchQuerySchema } from '../validators/schemas.js';
import logger from '../utils/logger.js';

const router = Router();

// =========================================================================
// GET /heatmap — Get heatmap grid data for viewport
// =========================================================================
router.get('/', optionalAuth, validate(heatmapQuerySchema, 'query'), async (req, res) => {
  try {
    const { bounds, categories, resolution } = req.validatedQuery;
    const [swLat, swLng, neLat, neLng] = bounds.split(',').map(Number);

    const resolutionMap = { low: 100, medium: 50, high: 25 };
    const gridSize = resolutionMap[resolution];

    // Cache key based on viewport + filters (rounded to reduce cache misses)
    const cacheKey = `heatmap:${Math.round(swLat * 100)}:${Math.round(swLng * 100)}:${Math.round(neLat * 100)}:${Math.round(neLng * 100)}:${categories || 'all'}:${gridSize}`;

    const data = await cacheGetOrCompute(cacheKey, 300, async () => {
      const categoryFilter = categories || null;

      const result = await query(
        'SELECT * FROM generate_heatmap($1, $2, $3, $4, $5, $6)',
        [swLat, swLng, neLat, neLng, categoryFilter, gridSize]
      );

      return result.rows.map((r) => ({
        lat: r.grid_lat,
        lng: r.grid_lng,
        weight: parseInt(r.weight),
      }));
    });

    return successResponse(res, {
      resolution,
      gridSize,
      points: data,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error generating heatmap');
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to generate heatmap data');
  }
});

export default router;
