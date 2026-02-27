# Core Features, Categories & Auto-Expiry Rules

## 1. Core Feature Map

### 1.1 Map Feed (Primary Screen)
- Interactive vector map (Mapbox GL JS) centered on user's detected location
- Pins rendered as category-colored icons with size proportional to trust-weighted engagement
- Cluster aggregation when zoom level < 14 (street-level)
- Radius ring indicator showing the user's configured 1 km or 2 km interest zone
- Pull-to-refresh triggers WebSocket reconnection + REST fallback fetch
- Tap pin → bottom sheet with post details, photo, reactions, trust badge

### 1.2 Post Creation Flow
1. User taps floating "+" button → category picker slides up
2. User selects category (required) → map centers on current location with draggable pin
3. User writes short text (max 280 chars) + optional photo (max 5 MB, JPEG/PNG/WebP)
4. User confirms → location is fuzzed server-side → post submitted via REST → broadcast via WebSocket
5. Optimistic UI: pin appears immediately on submitter's map with "pending" badge

### 1.3 Category System & Auto-Expiry Rules

| Category | Icon | Color | Default TTL | Max Extension | Trust Threshold | Description |
|----------|------|-------|-------------|---------------|-----------------|-------------|
| **Street Food / Pop-Up Vendor** | 🍜 | `#FF6B35` | 4 hours | +2 hours (1x) | 10 | Food carts, temporary stalls, mobile sellers |
| **Lost & Found** | 🔍 | `#4ECDC4` | 72 hours | +48 hours (2x) | 5 | Lost pets, wallets, keys, found items |
| **Safety Alert** | ⚠️ | `#FF1744` | 12 hours | +6 hours (1x) | 30 | Suspicious activity, fire, flooding, crime in progress |
| **Traffic / Road** | 🚗 | `#FFD93D` | 6 hours | +3 hours (1x) | 10 | Road closures, accidents, heavy traffic, construction |
| **Community Event** | 🎉 | `#6C5CE7` | 24 hours | +12 hours (1x) | 15 | Block parties, clean-up drives, basketball leagues |
| **Utility Issue** | 🔧 | `#A8DADC` | 48 hours | +24 hours (1x) | 10 | Power outage, water interruption, internet down |
| **Noise Complaint** | 🔊 | `#F4845F` | 3 hours | None | 15 | Loud music, construction noise, animal disturbance |
| **Free Stuff / Giveaway** | 🎁 | `#2ECC71` | 8 hours | +4 hours (1x) | 10 | Items left on curb, free food, giveaway boxes |
| **Barangay Announcement** | 📢 | `#0984E3` | 7 days | +7 days (unlimited) | MOD_ONLY | Official announcements from verified officials |
| **General / Other** | 💬 | `#636E72` | 6 hours | +2 hours (1x) | 5 | Anything that doesn't fit other categories |

### 1.4 Auto-Expiry Engine Design

```
Every 60 seconds, the expiry worker runs:

1. SELECT posts WHERE expires_at <= NOW() AND status = 'active'
2. For each expired post:
   a. Set status = 'expired'
   b. Broadcast WebSocket event: { type: 'post:expired', postId }
   c. Move post to `posts_archive` table (partitioned by month)
3. Log expiry batch metrics (count, avg age, category breakdown)
```

**Extension Logic:**
- A post creator can request ONE extension before expiry (via "Keep Alive" button visible in last 30 minutes of TTL)
- Extension adds the category's max extension time
- Extension resets the "last active" timestamp for engagement ranking
- Posts with 0 engagement (no reactions, no views >5) are NOT eligible for extension

### 1.5 Reactions & Engagement
- Quick reactions: 👍 Confirm, ⚠️ Still Active, ❌ No Longer Valid, 🙏 Thanks
- "Confirm" reactions from high-trust users (score >50) add +1 hour to post TTL automatically
- "No Longer Valid" reactions trigger early expiry review:
  - If 3+ distinct users mark it → auto-expire immediately
  - If 1–2 users mark it → flag for moderator review

### 1.6 Filtering & Discovery
- Category toggle pills at top of map (multi-select, persisted in localStorage)
- Time filter: "Last hour", "Last 4 hours", "Today", "All active"
- Sort toggle: "Nearest first" (default) | "Most confirmed" | "Most recent"
- Search bar: full-text search across post content (PostgreSQL tsvector)

### 1.7 Notifications
- Push notifications via Firebase Cloud Messaging (FCM)
- User configures:
  - Interest categories (e.g., only Safety Alerts and Lost & Found)
  - Radius (default 1 km, max 2 km)
  - Quiet hours (e.g., 10 PM – 7 AM)
- Notification payload: `{ title, category, distance, thumbnailUrl, postId }`
- Rate limiting: max 10 notifications per hour per user to prevent fatigue

### 1.8 Heatmap View
- Toggle button switches map from pin view to heatmap overlay
- Heatmap uses kernel density estimation on active post locations
- Color gradient: green (low activity) → yellow → red (high activity)
- Heatmap data is pre-computed every 5 minutes via background job and cached in Redis
- Heatmap respects category filters (e.g., show heatmap of only Safety Alerts)
- Data source: only active (non-expired) posts contribute to heatmap

### 1.9 Duplicate Detection
When a new post is created, the system runs a multi-signal duplicate check:

```
DUPLICATE_SCORE = (
    spatial_proximity_score * 0.4 +    // 0–1, inverse distance within 200m
    temporal_proximity_score * 0.3 +    // 0–1, inverse time delta within 2 hours
    text_similarity_score * 0.3         // 0–1, trigram similarity via pg_trgm
)

IF DUPLICATE_SCORE >= 0.75:
    → Block post, show "Similar report already exists nearby" with link
    → Offer to "Confirm existing post" instead

IF DUPLICATE_SCORE >= 0.50 AND < 0.75:
    → Allow post but tag as "possible duplicate"
    → Link to potentially duplicate post
    → Moderator queue entry created

IF DUPLICATE_SCORE < 0.50:
    → Post normally
```

**Spatial proximity formula:**
```sql
spatial_score = GREATEST(0, 1 - (ST_Distance(new_post.geom, existing.geom) / 200.0))
```

**Temporal proximity formula:**
```sql
temporal_score = GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - existing.created_at)) / 7200.0))
```

**Text similarity:**
```sql
text_score = similarity(new_post.content, existing.content)  -- pg_trgm
```

## 2. Vendor Mode

### 2.1 Vendor Registration Flow
1. User navigates to Profile → "Enable Vendor Mode"
2. User fills: Business name, category (food/goods/services), description, photo
3. Optional: Upload business permit or DTI registration for "Verified Vendor" badge
4. Moderator reviews application (target: <24 hours)
5. Approved vendors get:
   - Custom vendor pin icon (larger, branded)
   - Ability to set recurring schedules ("I'm here every MWF 6–10 AM")
   - Extended post TTL (+50% of category default)
   - Basic analytics: views, confirms, follower count

### 2.2 Vendor Pin Behavior
- Vendor pins show business name + "Open Now" / "Schedule" indicator
- Users can "Follow" a vendor → notification when vendor posts
- Vendor pins have a subtle pulsing animation to differentiate from user posts
- Vendors can update their pin location in real-time (moving vendor, e.g., taho seller)
  - Location updates throttled to once per 60 seconds
  - Previous locations shown as faded trail on map (last 3 positions)

### 2.3 Vendor Dashboard
- Total views this week
- Confirm reactions count
- Follower count + new followers
- Heatmap of where their followers are concentrated (aggregated, not individual)
- Post history with engagement metrics
