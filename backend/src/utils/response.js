/**
 * Standard API response helpers.
 * All responses follow the envelope pattern:
 * { success: boolean, data?: any, error?: object, meta: object }
 */

import { nanoid } from 'nanoid';

export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || nanoid(12),
    },
  });
}

export function errorResponse(res, statusCode, code, message, details = null) {
  const body = {
    success: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || nanoid(12),
    },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

export function paginatedResponse(res, data, total, hasMore) {
  return res.status(200).json({
    success: true,
    data: {
      ...data,
      total,
      hasMore,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || nanoid(12),
    },
  });
}
