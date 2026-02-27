import dotenv from 'dotenv';
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  wsPort: parseInt(process.env.WS_PORT || '3002', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://hyperlocal:password@localhost:5432/hyperlocal_db',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '5', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-256bit',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.S3_BUCKET_NAME || 'hyperlocal-media',
    publicUrl: process.env.S3_PUBLIC_URL || 'https://media.hyperlocal.app',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  app: {
    defaultRadiusKm: parseFloat(process.env.DEFAULT_RADIUS_KM || '1'),
    maxRadiusKm: parseFloat(process.env.MAX_RADIUS_KM || '2'),
    postRateLimitCount: parseInt(process.env.POST_RATE_LIMIT_COUNT || '5', 10),
    postRateLimitWindowMinutes: parseInt(process.env.POST_RATE_LIMIT_WINDOW_MINUTES || '30', 10),
    maxPostContentLength: 280,
    maxPhotoSize: 5 * 1024 * 1024, // 5MB
  },
};

export default config;
