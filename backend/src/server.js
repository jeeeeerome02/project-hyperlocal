import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { nanoid } from 'nanoid';
import Redis from 'ioredis';
import config from './config/index.js';
import logger from './utils/logger.js';
import { initializeWebSocket } from './websocket/socketServer.js';

// Workers are loaded lazily — BullMQ requires Redis 5+ which may not be available locally
let scheduleRecurringJobs = async () => { logger.warn('Workers not loaded (Redis 5+ required)'); };
let queuePostNotification = async () => { logger.debug('Notification queue skipped (workers disabled)'); };
try {
  // Check Redis version before importing BullMQ workers (which create Queue/Worker at top level)
  const probe = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await probe.connect();
  const info = await probe.info('server');
  await probe.quit();
  const versionMatch = info.match(/redis_version:(\d+)/);
  const majorVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
  if (majorVersion >= 5) {
    const workers = await import('./workers/index.js');
    scheduleRecurringJobs = workers.scheduleRecurringJobs;
    queuePostNotification = workers.queuePostNotification;
    logger.info(`Redis ${majorVersion}.x detected — BullMQ workers enabled`);
  } else {
    logger.warn(`Redis ${majorVersion}.x detected — BullMQ requires 5+, workers disabled`);
  }
} catch (err) {
  logger.warn({ err: err.message }, 'BullMQ workers unavailable — background jobs disabled');
}
export { queuePostNotification };

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import vendorRoutes from './routes/vendor.js';
import heatmapRoutes from './routes/heatmap.js';
import searchRoutes from './routes/search.js';
import moderationRoutes from './routes/moderation.js';

// =========================================================================
// Express App Setup
// =========================================================================

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const io = await initializeWebSocket(server);
app.set('io', io); // Make io accessible in route handlers

// =========================================================================
// Global Middleware
// =========================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Configured at CDN/Nginx level
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID and logging
app.use((req, res, next) => {
  const requestId = nanoid(12);
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId,
    }, 'Request completed');
  });

  next();
});

// =========================================================================
// API Routes (v1)
// =========================================================================

app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/posts', postRoutes);
app.use('/v1/vendor', vendorRoutes);
app.use('/v1/heatmap', heatmapRoutes);
app.use('/v1/search', searchRoutes);
app.use('/v1/moderation', moderationRoutes);

// =========================================================================
// Health Check
// =========================================================================

app.get('/health', async (req, res) => {
  try {
    const { query: dbQuery } = await import('./database/db.js');
    await dbQuery('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// =========================================================================
// 404 Handler
// =========================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// =========================================================================
// Global Error Handler
// =========================================================================

app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');

  // Don't leak error details in production
  const message = config.env === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    },
  });
});

// =========================================================================
// Start Server
// =========================================================================

async function start() {
  try {
    // Connect Redis
    const redis = (await import('./database/redis.js')).default;
    await redis.connect().catch(() => {
      logger.warn('Redis connection failed, running without cache');
    });

    // Schedule background workers
    await scheduleRecurringJobs().catch((err) => {
      logger.warn({ err }, 'Failed to schedule workers, will retry');
    });

    // Start HTTP + WebSocket server
    server.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.env,
        pid: process.pid,
      }, `🚀 Hyperlocal Radar API server running on port ${config.port}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // Force exit after 10s
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

start();

export default app;
