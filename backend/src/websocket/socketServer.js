import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Initialize Socket.io WebSocket server with Redis adapter for horizontal scaling.
 * 
 * Architecture:
 * - All connected clients join a "geo:nearby" room (simplified for MVP)
 * - In production, clients would join geohash-based rooms for efficient broadcasting
 * - Redis pub/sub adapter ensures events propagate across multiple WS server instances
 * 
 * Events emitted by server:
 * - post:new       -> New post created (broadcast to nearby users)
 * - post:expired   -> Post expired or removed (broadcast to all)
 * - post:updated   -> Post reactions updated
 * - vendor:location -> Vendor location update
 * - heatmap:update  -> Heatmap data refreshed
 * 
 * Events received from client:
 * - viewport:update -> Client reports current map viewport (for future geohash rooms)
 * - post:view       -> Client viewed a post detail (increment view count)
 */
export async function initializeWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 30000,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for scaling across multiple WS server instances
  if (config.redis.url) {
    try {
      const pubClient = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: 3 });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('WebSocket Redis adapter initialized');
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to initialize Redis adapter, running without it');
    }
  }

  // Authentication middleware for WebSocket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Allow anonymous connections (read-only)
      socket.data.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.data.user = {
        id: decoded.sub,
        role: decoded.role,
        trustTier: decoded.trustTier,
      };
      next();
    } catch (err) {
      // Allow connection but mark as unauthenticated
      socket.data.user = null;
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id || 'anonymous';
    logger.debug({ userId, socketId: socket.id }, 'WebSocket client connected');

    // Join the global nearby room (MVP simplified approach)
    // In production, this would be geohash-based rooms
    socket.join('geo:nearby');

    // Handle viewport updates (for future geohash-based room management)
    socket.on('viewport:update', (data) => {
      // data: { swLat, swLng, neLat, neLng, zoom }
      // In production: compute geohash cells covered by viewport,
      // join those rooms, leave old rooms
      logger.debug({ userId, viewport: data }, 'Viewport updated');
    });

    // Handle post view tracking
    socket.on('post:view', async (data) => {
      if (!data?.postId) return;
      try {
        // Increment view count (fire-and-forget, non-critical)
        const { query: dbQuery } = await import('../database/db.js');
        await dbQuery(
          'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
          [data.postId]
        );
      } catch (err) {
        // Non-critical: log and continue
        logger.debug({ err, postId: data.postId }, 'Failed to increment view count');
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.debug({ userId, socketId: socket.id, reason }, 'WebSocket client disconnected');
    });

    // Error handling
    socket.on('error', (err) => {
      logger.error({ err, userId, socketId: socket.id }, 'WebSocket error');
    });

    // Send initial connection ack with server time (for clock sync)
    socket.emit('connected', {
      serverTime: new Date().toISOString(),
      userId: socket.data.user?.id || null,
    });
  });

  // Metrics logging every 60 seconds
  setInterval(() => {
    const connectedCount = io.sockets.sockets.size;
    logger.info({ connections: connectedCount }, 'WebSocket connection count');
  }, 60000);

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Utility: Broadcast a post event to relevant clients.
 * In production, this would target specific geohash rooms.
 */
export function broadcastPostEvent(io, eventType, data) {
  io.to('geo:nearby').emit(eventType, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
