# User Roles, Trust Score & Privacy Model

## 1. User Roles and Permission Levels

### 1.1 Role Hierarchy

| Role | Level | How Obtained | Permissions |
|------|-------|--------------|-------------|
| **Anonymous Viewer** | 0 | No registration | View map, view pins (read-only), no posting, no reactions |
| **Registered User** | 1 | Phone OTP signup | Create posts, react, report, follow vendors, configure notifications |
| **Trusted User** | 2 | Trust score ≥ 50 | Posts skip moderation queue, "Confirm" reactions extend TTL, can flag duplicates |
| **Vendor** | 3 | Moderator-approved application | All Registered User perms + vendor pin, schedule, dashboard, extended TTL |
| **Verified Vendor** | 3.5 | Document-verified by moderator | All Vendor perms + verified badge, priority pin rendering, analytics |
| **Community Moderator** | 4 | Appointed by Admin or elected by community vote | Review flagged posts, approve/reject vendors, issue warnings, mute users (24h) |
| **Barangay Official** | 5 | Admin-verified with government ID | All Moderator perms + Barangay Announcement category, sticky posts (7 days), bulk notify |
| **System Admin** | 6 | Platform operator | Full access: user management, role assignment, system config, data export, analytics |

### 1.2 Permission Matrix

| Action | Anon | Registered | Trusted | Vendor | Moderator | Official | Admin |
|--------|------|-----------|---------|--------|-----------|----------|-------|
| View map & pins | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create post | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| React to posts | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Report post/user | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extend own post TTL | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skip moderation queue | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| TTL-extending confirms | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Create vendor pin | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Set recurring schedule | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| View vendor dashboard | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Review flagged content | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve/reject vendors | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mute users (24h) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post barangay announcements | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create sticky posts | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage user roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Access admin panel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. Trust Score Model

### 2.1 Design Philosophy

The trust score is a composite metric (0–100) that represents a user's reliability and community standing. It determines content visibility, moderation bypass, and reaction power. The model is designed to:

- **Reward accuracy**: Posts that get "Confirm" reactions increase trust
- **Penalize abuse**: Flagged/removed posts decrease trust
- **Value longevity**: Account age provides a slow, steady trust baseline
- **Prevent gaming**: Rapid posting doesn't inflate score; quality matters

### 2.2 Trust Score Formula

```
TRUST_SCORE = min(100, (
    BASE_SCORE +
    ACCURACY_SCORE +
    ENGAGEMENT_SCORE +
    LONGEVITY_SCORE +
    VERIFICATION_BONUS -
    PENALTY_SCORE
))

Where:
  BASE_SCORE = 5 (given upon completed registration with phone verification)

  ACCURACY_SCORE = min(40, (
    (confirmed_posts / total_posts) * 30 +
    (avg_post_lifespan_used / avg_category_ttl) * 10
  ))
  // confirmed_posts = posts with ≥3 "Confirm" reactions
  // avg_post_lifespan_used = avg % of TTL before "No Longer Valid" or auto-expire

  ENGAGEMENT_SCORE = min(20, (
    log2(total_confirms_given + 1) * 3 +
    log2(total_reports_validated + 1) * 5
  ))
  // total_reports_validated = reports this user made that moderators agreed with

  LONGEVITY_SCORE = min(15, (
    sqrt(account_age_days) * 1.2
  ))
  // Caps at ~156 days to reach 15

  VERIFICATION_BONUS:
    +5 for email verification
    +5 for government ID verification (barangay officials)
    +3 for vendor verification (business permit submitted)

  PENALTY_SCORE = (
    posts_removed_by_mods * 8 +
    posts_flagged_by_community * 2 +
    mute_count * 10 +
    ban_count * 50
  )
```

### 2.3 Trust Score Tiers

| Tier | Score Range | Label | Visual | Effects |
|------|------------|-------|--------|---------|
| New | 0–9 | Newcomer | Gray dot | Posts enter moderation queue |
| Low | 10–24 | Neighbor | Blue dot | Posts enter moderation queue |
| Medium | 25–49 | Active Neighbor | Green dot | Posts visible immediately but can be flagged |
| High | 50–74 | Trusted Neighbor | Gold dot | Posts skip mod queue, confirms extend TTL |
| Very High | 75–89 | Community Pillar | Gold star | Posts get 20% visibility boost in feed ranking |
| Max | 90–100 | Neighborhood Guardian | Diamond | Can co-moderate (soft flags auto-hide posts) |

### 2.4 Trust Score Recalculation

- Recalculated every 6 hours via background job (not realtime to prevent gaming feedback loops)
- Cached in Redis: `trust:user:{userId}` with 6-hour TTL
- On moderation action (post removal, mute, ban), penalty applied immediately with forced recalculation

### 2.5 Anti-Abuse Mechanisms

| Mechanism | Trigger | Action |
|-----------|---------|--------|
| **Rate Limiting** | >5 posts in 30 min | Block new posts for 1 hour, trust -5 |
| **Spam Detection** | Identical text posted 3x in 24h | Auto-remove duplicates, trust -10 |
| **Sockpuppet Detection** | Multiple accounts from same device fingerprint | Flag for admin review, new accounts enter strict moderation |
| **Photo Abuse** | NSFW detected via ML classifier (confidence >0.85) | Auto-hide post, trust -15, moderator alert |
| **Location Spoofing** | GPS coordinates change >50 km in <5 minutes | Block posting for 24h, flag account |
| **Coordinated Flagging** | 3+ users from same IP flag same post | Discount flags, investigate flaggers |
| **Trust Bombing** | User receives >20 negative reactions in 1h | Temporary post hiding, moderator review |
| **Engagement Farming** | User creates post + immediately confirms with alt | Device fingerprint cross-reference, trust penalty |

---

## 3. Privacy Model

### 3.1 Design Principles

1. **No exact user locations are ever stored or shared** — all coordinates are fuzzed before persistence
2. **Post locations are fuzzed, not user home locations** — users never register a "home address"
3. **Fuzzing is irreversible** — original coordinates are discarded after fuzzing
4. **Category-appropriate fuzzing** — safety alerts need more precision than general posts
5. **Vendor locations are less fuzzed** — vendors opt into higher location precision for discoverability

### 3.2 Location Fuzzing Rules

| Category | Fuzzing Radius | Justification |
|----------|---------------|---------------|
| Street Food / Pop-Up Vendor | 30–50 m | Vendors need to be findable; low privacy risk |
| Lost & Found | 100–150 m | Approximate area helps searchers without pinpointing reporter's home |
| Safety Alert | 50–100 m | Needs reasonable precision for situational awareness |
| Traffic / Road | 30–50 m | Road segments are public infrastructure, low privacy concern |
| Community Event | 50–100 m | Events are intentionally public |
| Utility Issue | 100–200 m | Reports on area-wide issues; don't need exact location |
| Noise Complaint | 150–200 m | Highest fuzzing — prevents identifying the reporter to the noise source |
| Free Stuff / Giveaway | 50–100 m | Moderate precision for pickup |
| Barangay Announcement | 0 m (exact) | Official locations (barangay hall) are public knowledge |
| General / Other | 100–150 m | Default conservative fuzzing |

### 3.3 Fuzzing Algorithm

```javascript
function fuzzLocation(lat, lng, minRadiusMeters, maxRadiusMeters) {
  // Generate random distance within fuzzing range
  const radiusRange = maxRadiusMeters - minRadiusMeters;
  const randomRadius = minRadiusMeters + (Math.random() * radiusRange);

  // Generate random bearing (0-360 degrees)
  const randomBearing = Math.random() * 360;

  // Convert to radians
  const lat1 = lat * (Math.PI / 180);
  const lng1 = lng * (Math.PI / 180);
  const bearingRad = randomBearing * (Math.PI / 180);

  // Earth radius in meters
  const R = 6371000;

  // Calculate new position
  const angularDistance = randomRadius / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * (180 / Math.PI),
    lng: lng2 * (180 / Math.PI)
  };
}
```

### 3.4 Privacy-Preserving Data Practices

| Data Element | Stored? | Encrypted? | Shared? | Retention |
|-------------|---------|-----------|---------|-----------|
| User phone number | Yes | AES-256 at rest | Never | Until account deletion |
| Original post coordinates | No | N/A | N/A | Discarded after fuzzing |
| Fuzzed post coordinates | Yes | No (needed for spatial queries) | Yes (on map) | Until post expiry + 30 days archive |
| Device fingerprint | Yes | SHA-256 hashed | Never | 90 days rolling |
| IP address | Hashed only | SHA-256 | Never | 30 days for rate limiting |
| Post content text | Yes | No | Yes (on map) | Until post expiry + 30 days archive |
| Post photos | Yes | No | Yes (on map) | Until post expiry + 7 days |
| User display name | Yes | No | Yes | Until account deletion |
| Trust score | Yes | No | Tier only (not number) | Real-time |
| Push notification tokens | Yes | AES-256 | Never (server-side only) | Until token refresh |
| Moderation action logs | Yes | No | Admin-only | 1 year |

### 3.5 User Control

- **Location permission**: Required for posting; read-only browsing works with manual map panning
- **Profile visibility**: Display name + trust tier visible on posts; phone number never shown
- **Post deletion**: Users can delete their own posts at any time; archived copies retained 30 days for moderation audit
- **Account deletion**: Full data purge within 7 business days per request; only anonymized moderation logs retained
- **Data export**: Users can request a JSON export of their post history (GDPR/DPA compliance)

### 3.6 GDPR / Philippine Data Privacy Act Compliance

- **Lawful basis**: Legitimate interest for core features; consent for notifications and analytics
- **Data minimization**: Only phone number required for registration; no name, email, address required
- **Right to erasure**: Implemented via account deletion flow
- **Right to access**: Implemented via data export API
- **Data protection officer**: Required once platform exceeds 1,000 active profiles
- **Privacy policy**: Must be presented and accepted at registration; version-tracked
