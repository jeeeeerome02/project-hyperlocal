# System Architecture

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐    │
│  │  Next.js PWA     │  │  Moderator Panel │  │  Vendor Dashboard   │    │
│  │  (React + MapGL) │  │  (Admin UI)      │  │  (Analytics UI)     │    │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────┬───────────┘    │
│           │                     │                       │                │
│           └─────────────────────┼───────────────────────┘                │
│                                 │                                        │
│                    HTTPS + WSS (TLS 1.3)                                │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                         EDGE / CDN LAYER                                 │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │  Cloudflare CDN + WAF + DDoS Protection                       │      │
│  │  - Static assets cached at edge                                │      │
│  │  - Rate limiting: 100 req/min per IP                           │      │
│  │  - Bot detection enabled                                       │      │
│  └────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                       APPLICATION LAYER                                  │
│                                 │                                        │
│  ┌──────────────────────────────┴──────────────────────────────────┐     │
│  │                    NGINX Reverse Proxy                          │     │
│  │  - SSL termination    - WebSocket upgrade handling              │     │
│  │  - Load balancing     - Request routing                         │     │
│  └────────┬─────────────────────────────────┬──────────────────────┘     │
│           │                                 │                            │
│  ┌────────┴─────────┐             ┌─────────┴────────────┐              │
│  │  REST API Server │             │  WebSocket Server     │              │
│  │  (Node.js +      │             │  (Node.js + Socket.io)│              │
│  │   Express.js)    │             │                       │              │
│  │                  │             │  - Room per geohash   │              │
│  │  - Auth (JWT)    │             │  - Redis pub/sub      │              │
│  │  - CRUD ops      │             │    adapter             │              │
│  │  - File upload   │             │  - Heartbeat 30s      │              │
│  │  - Trust calc    │             │  - Auto-reconnect     │              │
│  │  - Moderation    │             │                       │              │
│  └────────┬─────────┘             └─────────┬────────────┘              │
│           │                                 │                            │
│           └──────────┬──────────────────────┘                            │
│                      │                                                   │
│  ┌───────────────────┴──────────────────────────────────────────────┐    │
│  │              Background Job Workers (Bull + Redis)                │    │
│  │                                                                   │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐            │    │
│  │  │ Expiry       │ │ Trust Score  │ │ Heatmap       │            │    │
│  │  │ Worker       │ │ Calculator   │ │ Generator     │            │    │
│  │  │ (every 60s)  │ │ (every 6h)  │ │ (every 5min)  │            │    │
│  │  └──────────────┘ └──────────────┘ └───────────────┘            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐            │    │
│  │  │ Notification │ │ Photo NSFW   │ │ Archive       │            │    │
│  │  │ Dispatcher   │ │ Scanner      │ │ Mover         │            │    │
│  │  │ (on-demand)  │ │ (on-upload)  │ │ (daily)       │            │    │
│  │  └──────────────┘ └──────────────┘ └───────────────┘            │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                          DATA LAYER                                      │
│                                 │                                        │
│  ┌──────────────────┐  ┌───────┴──────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL 16   │  │  Redis 7         │  │  AWS S3 / Cloudflare │   │
│  │  + PostGIS 3.4   │  │                  │  │  R2 (Object Storage) │   │
│  │                  │  │  - Session cache  │  │                      │   │
│  │  - Primary DB    │  │  - Trust scores   │  │  - Post photos       │   │
│  │  - Spatial index │  │  - Heatmap data   │  │  - Vendor logos       │   │
│  │  - Full-text     │  │  - Rate limiters  │  │  - User avatars       │   │
│  │    search        │  │  - WS pub/sub     │  │                      │   │
│  │  - pg_trgm       │  │  - Geohash rooms  │  │  CDN: Cloudflare     │   │
│  │                  │  │                  │  │  Images              │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Firebase Cloud Messaging (FCM) — Push Notifications             │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack Justification

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | Next.js 14 (App Router) + React 18 | SSR for SEO on public map pages; app router for nested layouts; React for component ecosystem |
| **Map** | Mapbox GL JS v3 | Vector tiles, custom styling, excellent performance on mobile, built-in clustering, heatmap layers |
| **State Management** | Zustand | Lightweight, no boilerplate, perfect for map state + filter state + WS state |
| **Backend Runtime** | Node.js 20 LTS | Non-blocking I/O ideal for WebSocket connections; shared JS ecosystem with frontend |
| **API Framework** | Express.js 4 | Mature, well-documented, extensive middleware ecosystem |
| **Realtime** | Socket.io 4 | WebSocket with automatic fallback to polling; room support for geohash-based channels; Redis adapter for horizontal scaling |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | Industry-standard spatial database; GiST indexes for spatial queries; pg_trgm for text similarity; JSONB for flexible metadata |
| **Cache** | Redis 7 | In-memory speed for trust scores, rate limiting, heatmap data; pub/sub for WS scaling |
| **Job Queue** | BullMQ (Redis-backed) | Reliable job processing with retry, delay, and cron scheduling; dashboard via Bull Board |
| **Object Storage** | Cloudflare R2 or AWS S3 | Cost-effective image storage; R2 preferred for zero-egress-fee model |
| **Push Notifications** | Firebase Cloud Messaging | Free tier sufficient for MVP; cross-platform support |
| **Auth** | JWT (access token) + Refresh Token rotation | Stateless authentication; refresh tokens stored server-side in DB |
| **OTP** | Twilio Verify | Production-grade phone verification; fallback to email OTP |
| **NSFW Detection** | TensorFlow.js (NSFWJS) | Client-side pre-screening + server-side confirmation; no external API dependency |
| **Deployment** | Docker Compose → Kubernetes | Docker for dev/staging; K8s for production scaling |
| **CI/CD** | GitHub Actions | Native to GitHub repo; parallel test/lint/build/deploy pipelines |
| **Monitoring** | Prometheus + Grafana | Metrics collection + dashboarding; AlertManager for on-call |
| **Logging** | Pino (structured JSON) → ELK Stack | High-performance logging; Elasticsearch for log search |
| **Error Tracking** | Sentry | Real-time error capture with source maps |

## 3. Scaling Strategy

### 3.1 Horizontal Scaling Plan

| Component | MVP (1 barangay) | Growth (10 barangays) | Scale (city-wide) |
|-----------|-------------------|----------------------|-------------------|
| API Server | 1 instance (2 vCPU) | 3 instances behind LB | 6+ instances, auto-scaling |
| WS Server | 1 instance (2 vCPU) | 3 instances + Redis adapter | 6+ instances, sticky sessions |
| PostgreSQL | 1 primary | 1 primary + 1 read replica | 1 primary + 2 replicas + PgBouncer |
| Redis | 1 instance | 1 primary + 1 replica | Redis Cluster (3 shards) |
| Workers | 1 instance (all jobs) | 2 instances (split by job type) | Dedicated worker per job type |
| Storage | R2 single bucket | R2 single bucket | R2 with lifecycle policies |

### 3.2 Database Optimization

- **Spatial indexing**: GiST index on all geometry columns
- **Partitioning**: `posts` table partitioned by `created_at` month for archive queries
- **Connection pooling**: PgBouncer in transaction mode (max 100 connections per pool)
- **Read replicas**: All read-heavy queries (map feed, heatmap data) routed to replicas
- **Vacuum**: Aggressive autovacuum settings due to high post creation/expiry churn

### 3.3 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|-------------|
| Active posts in viewport | Redis sorted set by geohash | 30 seconds | On new post / expiry event |
| Trust scores | Redis hash | 6 hours | On moderation action (force recalc) |
| Heatmap grid data | Redis hash | 5 minutes | On heatmap worker completion |
| User session | Redis hash | 24 hours | On logout / token refresh |
| Category config | Redis hash | 1 hour | On admin config change |
| Vendor profiles | Redis hash | 15 minutes | On vendor profile update |

## 4. Environment Configuration

```bash
# .env.example
NODE_ENV=production
PORT=3001
WS_PORT=3002

# Database
DATABASE_URL=postgresql://hyperlocal:password@localhost:5432/hyperlocal_db
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Twilio (OTP)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=

# Cloudflare R2 / S3
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=hyperlocal-media
S3_PUBLIC_URL=https://media.hyperlocal.app

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Sentry
SENTRY_DSN=

# App Config
DEFAULT_RADIUS_KM=1
MAX_RADIUS_KM=2
POST_RATE_LIMIT_COUNT=5
POST_RATE_LIMIT_WINDOW_MINUTES=30
```
