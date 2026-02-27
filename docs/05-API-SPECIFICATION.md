# API Specification

## Base URL
- Production: `https://api.hyperlocal.app/v1`
- Staging: `https://api-staging.hyperlocal.app/v1`

## Authentication
All authenticated endpoints require: `Authorization: Bearer <access_token>`

## Common Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Content must be between 1 and 280 characters",
    "details": [
      { "field": "content", "rule": "maxLength", "value": 280 }
    ]
  },
  "meta": {
    "timestamp": "2026-02-28T10:00:00Z",
    "requestId": "req_abc124"
  }
}
```

---

## 1. Authentication Endpoints

### POST /auth/otp/send
Send OTP to phone number for registration or login.

**Request:**
```json
{
  "phone": "+639171234567",
  "purpose": "login"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "otpSent": true,
    "expiresIn": 300,
    "retryAfter": 60
  }
}
```

### POST /auth/otp/verify
Verify OTP and receive tokens.

**Request:**
```json
{
  "phone": "+639171234567",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_a1b2c3d4e5f6...",
    "expiresIn": 900,
    "user": {
      "id": "usr_k7m2n9p4",
      "phone": "+63917****567",
      "displayName": null,
      "role": "registered",
      "trustTier": "newcomer",
      "createdAt": "2026-02-28T10:00:00Z"
    },
    "isNewUser": true
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "rt_a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_new_token...",
    "expiresIn": 900
  }
}
```

### POST /auth/logout
Revoke refresh token.

**Request:**
```json
{
  "refreshToken": "rt_a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

---

## 2. User Endpoints

### GET /users/me
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_k7m2n9p4",
    "phone": "+63917****567",
    "displayName": "Maria S.",
    "avatarUrl": "https://media.hyperlocal.app/avatars/usr_k7m2n9p4.webp",
    "role": "registered",
    "trustScore": 42,
    "trustTier": "active_neighbor",
    "stats": {
      "totalPosts": 28,
      "confirmedPosts": 19,
      "totalReactions": 156,
      "accountAgeDays": 45
    },
    "notificationPrefs": {
      "categories": ["safety_alert", "lost_found", "street_food"],
      "radiusKm": 1,
      "quietHoursStart": "22:00",
      "quietHoursEnd": "07:00"
    },
    "vendorProfile": null,
    "createdAt": "2026-01-14T08:30:00Z"
  }
}
```

### PATCH /users/me
Update user profile.

**Request:**
```json
{
  "displayName": "Maria Santos",
  "avatarUrl": "https://media.hyperlocal.app/avatars/usr_k7m2n9p4.webp"
}
```

### PUT /users/me/notifications
Update notification preferences.

**Request:**
```json
{
  "categories": ["safety_alert", "lost_found"],
  "radiusKm": 1.5,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "06:00",
  "fcmToken": "fMt4k..."
}
```

### DELETE /users/me
Request account deletion.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deletionScheduled": true,
    "deletionDate": "2026-03-07T10:00:00Z"
  }
}
```

---

## 3. Post Endpoints

### GET /posts/nearby
Fetch active posts within radius of a point. This is the primary map feed endpoint.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| lat | float | Yes | — | Center latitude |
| lng | float | Yes | — | Center longitude |
| radiusKm | float | No | 1 | Search radius (max 2) |
| categories | string | No | all | Comma-separated category slugs |
| since | ISO8601 | No | 24h ago | Only posts created after this time |
| sort | string | No | nearest | "nearest", "recent", "confirmed" |
| limit | int | No | 50 | Max results (max 100) |
| offset | int | No | 0 | Pagination offset |

**Request Example:**
```
GET /posts/nearby?lat=14.5995&lng=120.9842&radiusKm=1&categories=street_food,safety_alert&sort=nearest&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "pst_x9y2z1",
        "category": "street_food",
        "content": "Fresh lumpia vendor near the basketball court, just arrived!",
        "photoUrl": "https://media.hyperlocal.app/posts/pst_x9y2z1.webp",
        "location": {
          "lat": 14.5998,
          "lng": 120.9839,
          "fuzzed": true
        },
        "distanceMeters": 42,
        "author": {
          "id": "usr_a1b2c3",
          "displayName": "Kuya Ben",
          "trustTier": "trusted_neighbor",
          "isVendor": true,
          "isVerifiedVendor": false
        },
        "reactions": {
          "confirm": 12,
          "still_active": 5,
          "no_longer_valid": 0,
          "thanks": 8
        },
        "userReaction": null,
        "isDuplicate": false,
        "expiresAt": "2026-02-28T14:00:00Z",
        "canExtend": true,
        "createdAt": "2026-02-28T10:00:00Z"
      }
    ],
    "total": 34,
    "hasMore": true
  }
}
```

### POST /posts
Create a new post.

**Request (multipart/form-data):**
```json
{
  "category": "street_food",
  "content": "Fresh lumpia vendor near the basketball court!",
  "lat": 14.5995,
  "lng": 120.9842,
  "photo": "<binary file>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "pst_x9y2z1",
    "category": "street_food",
    "content": "Fresh lumpia vendor near the basketball court!",
    "photoUrl": "https://media.hyperlocal.app/posts/pst_x9y2z1.webp",
    "location": {
      "lat": 14.5998,
      "lng": 120.9839,
      "fuzzed": true
    },
    "expiresAt": "2026-02-28T14:00:00Z",
    "duplicateCheck": {
      "score": 0.12,
      "status": "unique",
      "similarPostId": null
    },
    "moderationStatus": "approved",
    "createdAt": "2026-02-28T10:00:00Z"
  }
}
```

### POST /posts/:postId/react
Add or change reaction on a post.

**Request:**
```json
{
  "reaction": "confirm"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "postId": "pst_x9y2z1",
    "reaction": "confirm",
    "newReactionCounts": {
      "confirm": 13,
      "still_active": 5,
      "no_longer_valid": 0,
      "thanks": 8
    },
    "ttlExtended": false
  }
}
```

### POST /posts/:postId/extend
Request TTL extension for own post.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "postId": "pst_x9y2z1",
    "previousExpiresAt": "2026-02-28T14:00:00Z",
    "newExpiresAt": "2026-02-28T16:00:00Z",
    "extensionsRemaining": 0
  }
}
```

### POST /posts/:postId/report
Report a post for moderation.

**Request:**
```json
{
  "reason": "misinformation",
  "details": "This vendor is not actually here, checked 10 minutes ago"
}
```

### DELETE /posts/:postId
Delete own post.

---

## 4. Vendor Endpoints

### POST /vendor/apply
Apply for vendor mode.

**Request (multipart/form-data):**
```json
{
  "businessName": "Kuya Ben's Taho",
  "businessCategory": "food",
  "description": "Fresh taho every morning, soy milk and arnibal",
  "photo": "<binary logo file>",
  "permitDocument": "<binary file, optional>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "applicationId": "vapp_m3n4o5",
    "status": "pending_review",
    "estimatedReviewTime": "24 hours"
  }
}
```

### GET /vendor/dashboard
Get vendor analytics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "businessName": "Kuya Ben's Taho",
    "isVerified": false,
    "stats": {
      "viewsThisWeek": 342,
      "confirmsThisWeek": 89,
      "followers": 156,
      "newFollowersThisWeek": 12
    },
    "recentPosts": [ ... ],
    "followerHeatmap": {
      "type": "FeatureCollection",
      "features": [ ... ]
    }
  }
}
```

### PUT /vendor/location
Update vendor's live location (for moving vendors).

**Request:**
```json
{
  "lat": 14.6001,
  "lng": 120.9845
}
```

### POST /vendor/:vendorId/follow
Follow a vendor.

### DELETE /vendor/:vendorId/follow
Unfollow a vendor.

---

## 5. Heatmap Endpoint

### GET /heatmap
Get heatmap grid data for viewport.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| bounds | string | Yes | "sw_lat,sw_lng,ne_lat,ne_lng" |
| categories | string | No | Filter by category |
| resolution | string | No | "low" (100m grid), "medium" (50m), "high" (25m) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resolution": "medium",
    "gridSize": 50,
    "points": [
      { "lat": 14.5990, "lng": 120.9840, "weight": 5 },
      { "lat": 14.5995, "lng": 120.9845, "weight": 12 },
      { "lat": 14.6000, "lng": 120.9840, "weight": 3 }
    ],
    "generatedAt": "2026-02-28T10:05:00Z",
    "expiresAt": "2026-02-28T10:10:00Z"
  }
}
```

---

## 6. Moderation Endpoints

### GET /moderation/queue
Get posts pending moderation review.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | pending | "pending", "flagged", "escalated" |
| category | string | all | Filter by category |
| limit | int | 20 | Max results |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mod_q1w2e3",
        "post": {
          "id": "pst_r4t5y6",
          "content": "Suspicious person lurking...",
          "category": "safety_alert",
          "photoUrl": "...",
          "location": { "lat": 14.600, "lng": 120.984 },
          "author": {
            "id": "usr_u7i8o9",
            "displayName": "Anonymous User",
            "trustTier": "newcomer",
            "trustScore": 7
          },
          "createdAt": "2026-02-28T09:45:00Z"
        },
        "reason": "low_trust_auto_queue",
        "reports": [],
        "duplicateScore": 0.0,
        "createdAt": "2026-02-28T09:45:01Z"
      }
    ],
    "total": 8
  }
}
```

### POST /moderation/:itemId/action
Take moderation action.

**Request:**
```json
{
  "action": "approve",
  "note": "Verified via patrol report"
}
```

Available actions: `approve`, `reject`, `remove`, `escalate`, `mute_user_24h`, `warn_user`

### GET /moderation/users/:userId
Get moderation history for a user.

### POST /moderation/users/:userId/ban
Ban a user (admin only).

**Request:**
```json
{
  "reason": "Repeated misinformation after warnings",
  "duration": "permanent"
}
```

---

## 7. Upload Endpoint

### POST /upload
Upload a photo (pre-signed URL approach).

**Request:**
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 2048576
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://hyperlocal-media.r2.cloudflarestorage.com/uploads/...",
    "fileKey": "posts/pst_temp_abc123.webp",
    "publicUrl": "https://media.hyperlocal.app/posts/pst_temp_abc123.webp",
    "expiresIn": 300
  }
}
```

---

## 8. Search Endpoint

### GET /search
Full-text search across active posts.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars) |
| lat | float | Yes | Center latitude |
| lng | float | Yes | Center longitude |
| radiusKm | float | No | Default 2 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "pst_x9y2z1",
        "content": "Fresh lumpia vendor near the basketball court!",
        "category": "street_food",
        "relevanceScore": 0.89,
        "distanceMeters": 150,
        "createdAt": "2026-02-28T10:00:00Z"
      }
    ],
    "total": 3
  }
}
```

## 9. Rate Limits

| Endpoint Group | Limit | Window | Scope |
|---------------|-------|--------|-------|
| POST /auth/* | 5 | 15 min | IP |
| POST /posts | 5 | 30 min | User |
| POST /posts/*/react | 30 | 1 min | User |
| GET /posts/nearby | 60 | 1 min | User |
| POST /upload | 10 | 30 min | User |
| GET /* (general) | 120 | 1 min | User |
| POST /moderation/* | 100 | 1 min | User |
