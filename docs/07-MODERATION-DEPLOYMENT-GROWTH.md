# Moderation, Safety, Deployment, Growth & Monetization

## 1. Moderation Tools and Safety Layer

### 1.1 Moderation Queue Workflow

```
Post Created
    │
    ▼
┌──────────────────────────┐
│ Trust Score Check         │
│ Author trust >= 25?       │
└──────────┬───────────────┘
           │
    YES ◄──┴──► NO
    │              │
    ▼              ▼
[Published]   [Queued for Review]
    │              │
    ▼              ▼
Community      Moderator picks
reactions      from queue
    │              │
    ▼              ▼
3+ "Invalid"   ┌─────────────────┐
reactions?     │ Moderator Action │
    │          │ • Approve → Pub  │
YES │          │ • Reject → Hide  │
    │          │ • Escalate → Admin│
    ▼          │ • Warn User      │
[Auto-hide]   │ • Mute 24h       │
    │          └─────────────────┘
    ▼                │
Moderator            ▼
final review    Trust score
                adjusted
```

### 1.2 Automated Safety Filters

| Filter | Trigger | Action | Technology |
|--------|---------|--------|-----------|
| **Profanity Filter** | Regex match against curated word list (Tagalog + English) | Replace with asterisks; flag if >3 profanities | Custom regex engine |
| **NSFW Image Detection** | Confidence >0.85 from classifier | Auto-hide, trust -15, moderator alert | NSFWJS (TensorFlow.js) |
| **Spam Detection** | Same text posted 3x in 24h by same user | Auto-remove duplicates, trust -10 | PostgreSQL dedup query |
| **Rate Limiting** | >5 posts in 30 min | Block new posts for 1h | Redis sliding window counter |
| **Location Spoofing** | GPS jump >50 km in <5 min | Block posting 24h, flag account | Server-side coordinate validation |
| **Hate Speech** | ML classifier confidence >0.80 | Auto-hide, moderator review | Perspective API (Google) |
| **Personal Info** | Phone numbers, addresses detected in text | Redact before publishing, warn user | Regex pattern matching |

### 1.3 Escalation Path

```
Level 1: Community Self-Moderation
  → "No Longer Valid" reactions (3+ = auto-hide)

Level 2: Community Moderators
  → Review flagged posts, approve/reject
  → Can mute users for 24 hours
  → Can issue warnings

Level 3: Barangay Officials
  → Same as L2 + can create announcements
  → Can request Admin intervention

Level 4: System Admin
  → Permanent bans
  → Role management
  → Policy override
  → Account investigation (audit logs)
```

### 1.4 Moderation SLAs

| Queue Type | Target Response Time | Escalation Trigger |
|-----------|---------------------|-------------------|
| Auto-flagged (NSFW, spam) | <15 minutes | If unresolved in 30 min → push notify moderator |
| Community-reported (1-2 reports) | <1 hour | If unresolved in 2h → escalate to next moderator |
| Community-reported (3+ reports) | Auto-hidden immediately | Moderator confirms or reverses within 1h |
| Vendor applications | <24 hours | Admin notified if >48h pending |
| Safety alerts from newcomers | <10 minutes | Critical: push-notify all active moderators |

### 1.5 Appeals Process

1. User receives notification of removed post / mute / warning
2. "Appeal" button in notification → opens text form (max 500 chars)
3. Appeal goes to different moderator than original (if available)
4. Moderator reviews original post + context + appeal text
5. Decision: Uphold / Reverse / Reduce severity
6. User notified of decision (final for that instance)

---

## 2. MVP Roadmap

### Phase 1: Foundation (Weeks 1–4)
| Week | Deliverables |
|------|-------------|
| 1 | Project setup: Next.js + Express + PostgreSQL/PostGIS + Redis Docker Compose. DB schema migration. Auth: OTP registration + JWT. |
| 2 | Core post CRUD: create (with fuzzing), read (nearby query), expire (worker). Map integration: Mapbox with pin rendering. |
| 3 | Reactions system. Category filtering. WebSocket for live pin updates. Basic trust score calculation (simplified: just post count + accuracy). |
| 4 | Photo upload (S3/R2). Duplicate detection (basic spatial + text matching). Mobile-responsive CSS polish. |

**Milestone: Internal alpha — team testing with real map data**

### Phase 2: Community Features (Weeks 5–8)
| Week | Deliverables |
|------|-------------|
| 5 | Trust score full model implementation. Moderation queue (basic: auto-queue low-trust posts). Moderator review panel v1. |
| 6 | Push notifications (FCM). Notification preferences UI. Heatmap overlay (pre-computed). |
| 7 | Vendor mode: application flow, vendor pins, follow system. Vendor dashboard v1 (basic stats). |
| 8 | Full-text search. User profile + settings. Post extension ("Keep Alive"). Rate limiting + anti-abuse v1. |

**Milestone: Closed beta — 1 barangay, 50–100 invited users**

### Phase 3: Polish & Hardening (Weeks 9–12)
| Week | Deliverables |
|------|-------------|
| 9 | NSFW image detection. Profanity filter. Location spoofing detection. Automated safety filters live. |
| 10 | PWA manifest + service worker (offline mode: cached map tiles, queue posts for sync). Performance optimization (<3s load on 3G). |
| 11 | Barangay official role + announcement category. Moderation keyboard shortcuts. Moderator analytics. |
| 12 | Load testing (simulate 1,000 concurrent users). Security audit. Privacy policy + terms of service. Bug fixes. |

**Milestone: Public launch — 1 barangay, open registration**

### Phase 4: Growth (Weeks 13–20)
| Week | Deliverables |
|------|-------------|
| 13–14 | Onboarding flow improvements based on beta feedback. Dark mode. |
| 15–16 | Expand to 5 adjacent barangays. Community moderator recruitment tooling. Vendor verification workflow. |
| 17–18 | Analytics dashboard (admin). Sponsored pins infrastructure (backend only). |
| 19–20 | City-wide expansion plan execution. Performance optimization for scale. Regional moderator hierarchy. |

**Milestone: City-level deployment — 20+ barangays active**

---

## 3. Deployment Plan

### 3.1 Infrastructure

```
┌──────────────────────────────────────────────────────────┐
│                   Production Environment                  │
│                                                          │
│  ┌─ Railway.app / Render.com (MVP) ─────────────────┐   │
│  │                                                    │   │
│  │  Service: api                                      │   │
│  │  Runtime: Node.js 20                               │   │
│  │  Instances: 1 (auto-scale to 3)                    │   │
│  │  RAM: 1GB                                          │   │
│  │                                                    │   │
│  │  Service: ws                                       │   │
│  │  Runtime: Node.js 20                               │   │
│  │  Instances: 1 (auto-scale to 3)                    │   │
│  │  RAM: 1GB                                          │   │
│  │                                                    │   │
│  │  Service: worker                                   │   │
│  │  Runtime: Node.js 20                               │   │
│  │  Instances: 1                                      │   │
│  │  RAM: 512MB                                        │   │
│  │                                                    │   │
│  │  Service: frontend                                 │   │
│  │  Runtime: Next.js (Vercel or same platform)        │   │
│  │  Edge functions for SSR                            │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Managed Services ─────────────────────────────────┐  │
│  │  PostgreSQL: Neon.tech (serverless, auto-scale)     │  │
│  │  Redis: Upstash (serverless, per-request pricing)   │  │
│  │  Storage: Cloudflare R2 (zero egress)               │  │
│  │  CDN: Cloudflare (free tier) + Vercel Edge          │  │
│  │  DNS: Cloudflare                                    │  │
│  │  Monitoring: Sentry (free tier) + UptimeRobot       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Scale Phase: Kubernetes ──────────────────────────┐  │
│  │  Provider: DigitalOcean Kubernetes (DOKS)           │  │
│  │  Nodes: 3x s-2vcpu-4gb ($72/mo total)              │  │
│  │  Ingress: NGINX Ingress Controller                  │  │
│  │  Cert: Let's Encrypt via cert-manager               │  │
│  │  Monitoring: Prometheus + Grafana stack              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 CI/CD Pipeline (GitHub Actions)

```yaml
# Triggers: push to main, pull requests
# Steps:
# 1. Lint (ESLint + Prettier check)
# 2. Type check (TypeScript)
# 3. Unit tests (Vitest)
# 4. Integration tests (Supertest + test DB)
# 5. Build (Next.js + API)
# 6. Deploy to staging (on PR merge to develop)
# 7. Deploy to production (on release tag)
# 8. Post-deploy health check
# 9. Sentry release + source map upload
```

### 3.3 Estimated Monthly Cost

| Service | MVP (1 barangay) | Growth (city) | Notes |
|---------|-------------------|---------------|-------|
| Compute (Railway/Render) | $25 | $100 | Auto-scaling |
| PostgreSQL (Neon) | $0 (free tier) | $25 | 10GB included |
| Redis (Upstash) | $0 (free tier) | $10 | 10K commands/day free |
| Storage (R2) | $0 (10GB free) | $5 | Zero egress |
| CDN (Cloudflare) | $0 | $0 | Free tier sufficient |
| Twilio (OTP) | $10 | $50 | $0.05/verification |
| Mapbox | $0 (50K loads/mo) | $50 | Free tier generous |
| Sentry | $0 | $26 | Free tier for MVP |
| Domain | $12/year | $12/year | .app domain |
| **Total** | **~$40/mo** | **~$270/mo** | |

---

## 4. Growth Strategy

### 4.1 Phase 1: Barangay First (Months 1–3)

**Strategy**: Hyper-focused single-barangay deployment. Prove the model works in one community before expanding.

| Tactic | Details |
|--------|---------|
| **Barangay Partnership** | Partner with one tech-friendly barangay captain. Offer free "Barangay Announcement" feature as value proposition. Captain promotes app via official channels. |
| **Seed Content** | Team manually posts 20–30 real events before public launch to avoid "empty room" problem. Recruit 10 power users (sari-sari store owners, tricycle drivers, known community figures). |
| **Physical Presence** | QR code posters at sari-sari stores, basketball courts, barangay hall. "Scan to see what's happening on your street." |
| **Vendor Incentive** | First 20 vendors get free "Verified" status for 3 months. This creates visible vendor pins that attract consumer users. |
| **WhatsApp/Viber Bridge** | Create bot that cross-posts highlights to existing community Viber groups with "See more on Hyperlocal Radar" link. |

### 4.2 Phase 2: Adjacent Barangays (Months 4–6)

| Tactic | Details |
|--------|---------|
| **Organic Spillover** | Users near barangay borders naturally see pins from adjacent areas → curiosity-driven adoption |
| **Moderator Recruitment** | Recruit 2 community moderators per barangay (trusted residents). Gamify with "Community Guardian" badge. |
| **Success Story Marketing** | Case study: "How Barangay X recovered 15 lost items in 30 days using Hyperlocal Radar" shared on social media. |
| **Barangay Captain Network** | Original captain introduces neighboring captains. Group demonstration showing the official announcement feature. |

### 4.3 Phase 3: City-Wide (Months 7–12)

| Tactic | Details |
|--------|---------|
| **City Government Partnership** | Integrate with city disaster risk reduction office (DRRMO). Safety alerts feed into official protocols. |
| **Local Media** | Pitch to local newspaper/radio: "The app that's making neighborhoods safer." |
| **Vendor Network Effect** | As vendor count grows, consumers are pulled in. As consumer count grows, vendors are incentivized. |
| **Company/Organization Partnerships** | Homeowner associations, churches, schools can have official accounts. |

### 4.4 Phase 4: National (Year 2+)

| Tactic | Details |
|--------|---------|
| **City-by-City Playbook** | Replicate the barangay-first strategy per city. Document playbook for community managers. |
| **API Platform** | Open API for LGU integration, news organization feeds, emergency services. |
| **Brand Partnerships** | National brands sponsor city-wide heatmap overlays ("Jollibee Activity Map"). |

---

## 5. Monetization Model

### 5.1 Revenue Streams

| Stream | Description | Target Launch | Est. Revenue (Year 1) |
|--------|------------|---------------|----------------------|
| **Vendor Subscription** | Monthly subscription for premium vendor features | Month 6 | ₱50K/mo (100 vendors × ₱500/mo) |
| **Sponsored Pins** | Businesses pay for promoted pins that appear at top of category | Month 9 | ₱30K/mo |
| **Premium Dashboards** | Advanced analytics for barangay officials and HOAs | Month 12 | ₱20K/mo |
| **Data Insights** | Anonymized, aggregated neighborhood activity reports for city planners | Year 2 | TBD |

### 5.2 Vendor Subscription Tiers

| Tier | Price | Features |
|------|-------|---------|
| **Free Vendor** | ₱0/mo | Basic vendor pin, 1 post/day, manual location updates |
| **Pro Vendor** | ₱299/mo | Unlimited posts, real-time location tracking, verified badge priority review, basic analytics (views + confirms), custom pin icon |
| **Business Vendor** | ₱799/mo | All Pro features + follower heatmap, engagement reports, multiple staff accounts, scheduled posts, API access for POS integration |

### 5.3 Sponsored Pin Mechanics

- Sponsored pins appear in a user's feed ONLY if within their configured radius
- Visually distinct: subtle "Sponsored" label, no deception
- Maximum 2 sponsored pins per map viewport
- Category-relevant: a food sponsor only appears when food filter is active
- Pricing: ₱50/day per 1km radius coverage, minimum 7-day campaign
- Performance reporting: impressions, pin taps, navigate taps

### 5.4 Premium Dashboards

| Dashboard | Audience | Price | Features |
|-----------|---------|-------|---------|
| **Barangay Dashboard** | Barangay officials | ₱999/mo | Real-time activity overview, safety alert trends, community sentiment, exportable reports, multi-moderator management |
| **HOA Dashboard** | Homeowner associations | ₱499/mo | Subdivision-scoped view, announcement tools, resident engagement metrics |

### 5.5 Free-to-Use Guarantee

Core features remain free forever for residents:
- Viewing the map and all pins
- Creating posts and reacting
- Receiving notifications
- Basic profile and settings

Monetization ONLY applies to business features (vendor tools, premium analytics, sponsored content). This ensures the community value proposition is never gated.
