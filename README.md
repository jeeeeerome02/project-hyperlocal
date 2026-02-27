# Hyperlocal Neighborhood Social Radar

> A real-time, map-based micro-event platform for neighborhoods — think of it as a live social layer on top of your barangay.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20_LTS-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostGIS](https://img.shields.io/badge/PostGIS-3.4-blue)

## What is it?

Radar is a hyperlocal social platform where neighbors can share real-time, auto-expiring micro-events — street food vendors popping up, lost pets, power outages, free stuff on the curb, traffic incidents, and more. Everything is pinned on a live map with a countdown timer.

**Key features:**
- **Live Map Feed** — Real-time pins with WebSocket updates
- **10 Category Types** — Street Food, Safety Alert, Lost & Found, etc.
- **Auto-Expiry** — Posts disappear after their TTL (3h → 7d depending on category)
- **Community Validation** — Confirm, Still Active, Gone, Thanks reactions
- **Heatmap View** — See activity hotspots at a glance
- **Vendor Mode** — Live location sharing for street food vendors
- **Trust Scores** — Accuracy-based reputation system (0–100)
- **Privacy First** — Location fuzzing, no real names required

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Mapbox GL JS, Zustand, Tailwind CSS |
| Backend | Node.js 20, Express 4, Socket.io 4 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7 |
| Queue | BullMQ |
| Auth | JWT + Phone OTP (Twilio Verify) |
| Maps | Mapbox GL JS v3 |

## Project Structure

```
project-hyperlocal/
├── docs/                          # Product specification (7 documents)
│   ├── 01-PRODUCT-OVERVIEW.md
│   ├── 02-CORE-FEATURES.md
│   ├── 03-ROLES-TRUST-PRIVACY.md
│   ├── 04-SYSTEM-ARCHITECTURE.md
│   ├── 05-API-SPECIFICATION.md
│   ├── 06-UI-UX-WIREFRAMES.md
│   └── 07-MODERATION-DEPLOYMENT-GROWTH.md
├── backend/
│   ├── database/schema.sql        # Full PostgreSQL + PostGIS schema
│   ├── src/
│   │   ├── config/                # Centralized configuration
│   │   ├── database/              # PostgreSQL pool + Redis client
│   │   ├── middleware/            # Auth, validation
│   │   ├── routes/                # REST API endpoints
│   │   ├── utils/                 # Location fuzzing, logger, responses
│   │   ├── validators/           # Zod schemas
│   │   ├── websocket/            # Socket.io server
│   │   ├── workers/              # BullMQ background jobs
│   │   └── server.js             # Express entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js pages (map, moderation, vendor)
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom hooks (geolocation, socket, data)
│   │   ├── lib/                   # API client, query provider
│   │   ├── store/                 # Zustand state management
│   │   └── types/                 # TypeScript definitions
│   ├── public/                    # PWA manifest, icons
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml             # Full local dev environment
├── .github/workflows/ci.yml      # CI/CD pipeline
├── .env.example                   # Environment variable template
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Mapbox account (free tier)
- Twilio account (for OTP, optional for dev)

### 1. Clone & configure

```bash
git clone <repo-url> project-hyperlocal
cd project-hyperlocal
cp .env.example .env
# Edit .env with your Mapbox token and other keys
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

This starts PostgreSQL+PostGIS and Redis, and auto-runs the schema migration.

### 3. Start backend

```bash
cd backend
npm install
node src/server.js
```

API available at `http://localhost:4000`. Health check: `GET /health`

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — you'll see the map centered on Metro Manila.

### Alternative: Full Docker

```bash
docker compose up --build
```

Runs everything (PostgreSQL, Redis, backend, frontend) in containers.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/otp/send` | Send OTP to phone |
| POST | `/v1/auth/otp/verify` | Verify OTP, get tokens |
| GET | `/v1/posts/nearby` | Fetch nearby posts (PostGIS) |
| POST | `/v1/posts` | Create a new post |
| POST | `/v1/posts/:id/react` | React to a post |
| GET | `/v1/heatmap` | Get heatmap grid data |
| GET | `/v1/search` | Full-text + spatial search |
| GET | `/v1/moderation/queue` | Moderation queue |

Full API spec: [docs/05-API-SPECIFICATION.md](docs/05-API-SPECIFICATION.md)

## Documentation

| Document | Contents |
|----------|----------|
| [01 — Product Overview](docs/01-PRODUCT-OVERVIEW.md) | Vision, personas, scope, success metrics |
| [02 — Core Features](docs/02-CORE-FEATURES.md) | Categories, TTL rules, reactions, heatmap, duplicate detection |
| [03 — Roles, Trust & Privacy](docs/03-ROLES-TRUST-PRIVACY.md) | 7 roles, trust score formula, location fuzzing, GDPR |
| [04 — System Architecture](docs/04-SYSTEM-ARCHITECTURE.md) | Architecture diagram, tech stack, scaling strategy |
| [05 — API Specification](docs/05-API-SPECIFICATION.md) | 20+ endpoints with request/response samples |
| [06 — UI/UX Wireframes](docs/06-UI-UX-WIREFRAMES.md) | Design system, 7 screen wireframes |
| [07 — Moderation & Growth](docs/07-MODERATION-DEPLOYMENT-GROWTH.md) | Moderation workflow, MVP roadmap, deployment, monetization |

## License

MIT

