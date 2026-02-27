# Hyperlocal Neighborhood Social Radar — Product Overview

## 1. Vision Statement

Hyperlocal Neighborhood Social Radar is a real-time, map-centric micro-event platform that surfaces ephemeral neighborhood happenings within a 1–2 km radius of each user. It transforms passive residents into active community sensors—reporting pop-up vendors, lost pets, safety incidents, small gatherings, traffic blockages, and other street-level events that traditional social media ignores.

## 2. Problem Statement

Existing social platforms (Facebook Groups, Nextdoor, Viber GCs) fail neighborhoods because:

| Problem | Impact |
|---------|--------|
| Posts are text-heavy walls with no spatial context | Users cannot see *where* something is happening relative to them |
| Content never expires | Stale "lost dog 3 months ago" posts bury active happenings |
| No built-in trust mechanism | Spam, fake reports, and trolling degrade signal-to-noise ratio |
| Privacy is binary (public/private) | Users fear posting because exact home locations are exposed |
| No category-based filtering | A user looking for street food must scroll past crime reports |
| No vendor/micro-business tooling | Informal sellers have no structured way to announce flash sales |

## 3. Target Users

| Persona | Archetype | Primary Use |
|---------|-----------|-------------|
| **Resident Maria** | Stay-at-home parent, 32 | Wants to know about pop-up food vendors, lost & found, barangay announcements |
| **Vendor Kuya Ben** | Taho seller, 45 | Wants to broadcast his morning route so regular customers find him |
| **Commuter Jess** | Office worker, 28 | Checks traffic and road closure pins before leaving home |
| **Barangay Captain Rodel** | Local official, 55 | Pushes safety advisories, monitors community sentiment heatmap |
| **Moderator Ate Liza** | Community volunteer, 40 | Reviews flagged posts, approves vendor registrations |

## 4. Core Value Proposition

- **Spatial First**: Every post is a pin on the map. No map, no post.
- **Ephemeral by Design**: Posts auto-expire based on category (street food pin = 4 hours; lost pet = 72 hours).
- **Trust-Weighted**: High-trust users' posts appear more prominently; new/low-trust users' posts require community validation.
- **Privacy Safe**: All user-generated locations are fuzzed by 50–200 m depending on category. Exact coordinates are never exposed to other users.
- **Mobile First, Desktop Capable**: The primary experience targets smartphones; a responsive desktop view supports moderators and vendors.

## 5. Key Differentiators vs. Competitors

| Feature | Hyperlocal Radar | Nextdoor | Facebook Groups | Waze |
|---------|-----------------|----------|----------------|------|
| Map-centric feed | ✅ Primary | ❌ Text feed | ❌ Text feed | ✅ Traffic only |
| Auto-expiring posts | ✅ Category-based | ❌ | ❌ | ✅ Fixed |
| Trust score | ✅ Multi-factor | ✅ Basic verification | ❌ | ❌ |
| Location fuzzing | ✅ Configurable | ❌ Address-level | ❌ | N/A |
| Vendor mode | ✅ Full tooling | ❌ | ❌ | ❌ |
| Heatmap view | ✅ Live density | ❌ | ❌ | ✅ Traffic only |
| Hyperlocal radius | ✅ 1–2 km | ~Neighborhood | Group-scoped | Regional |

## 6. Platform Scope (MVP)

**In scope:**
- Real-time map with categorized event pins
- Post creation with photo, category, and auto-placed fuzzy location
- Category-based auto-expiry engine
- User registration with phone OTP verification
- Trust score computation (post accuracy, community upvotes, account age)
- Location fuzzing at post creation time
- WebSocket-driven live pin updates
- Duplicate detection (spatial + temporal + textual similarity)
- Vendor mode with verification badge
- Basic moderation panel (flag, review, ban)
- Heatmap overlay showing event density
- Push notification for events within radius

**Out of scope for MVP:**
- Direct messaging between users
- Monetization billing infrastructure
- Multi-language internationalization
- Native mobile apps (PWA-first approach)
- Advanced analytics dashboards
- Third-party API integrations (weather, transit)

## 7. Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Monthly Active Users (MAU) per barangay | 500+ |
| Average posts per day per barangay | 30+ |
| Post accuracy rating (community validated) | >85% |
| Median time-to-first-response on safety alerts | <5 minutes |
| Vendor mode adoption | 20% of local vendors |
| User-reported spam rate | <2% of total posts |
| App load time (3G connection) | <3 seconds |
