-- ============================================================================
-- Hyperlocal Neighborhood Social Radar — Complete Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "postgis";           -- Spatial queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- Trigram text similarity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";         -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- Encryption utilities

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'registered',
    'trusted',
    'vendor',
    'verified_vendor',
    'moderator',
    'official',
    'admin'
);

CREATE TYPE trust_tier AS ENUM (
    'newcomer',       -- 0-9
    'neighbor',       -- 10-24
    'active_neighbor', -- 25-49
    'trusted_neighbor', -- 50-74
    'community_pillar', -- 75-89
    'neighborhood_guardian' -- 90-100
);

CREATE TYPE post_status AS ENUM (
    'pending_moderation',
    'active',
    'expired',
    'removed_by_author',
    'removed_by_mod',
    'auto_removed'
);

CREATE TYPE post_category AS ENUM (
    'street_food',
    'lost_found',
    'safety_alert',
    'traffic_road',
    'community_event',
    'utility_issue',
    'noise_complaint',
    'free_stuff',
    'barangay_announcement',
    'general'
);

CREATE TYPE reaction_type AS ENUM (
    'confirm',
    'still_active',
    'no_longer_valid',
    'thanks'
);

CREATE TYPE report_reason AS ENUM (
    'misinformation',
    'spam',
    'harassment',
    'nsfw_content',
    'personal_info_exposed',
    'hate_speech',
    'off_topic',
    'duplicate',
    'other'
);

CREATE TYPE moderation_action AS ENUM (
    'approve',
    'reject',
    'remove',
    'escalate',
    'mute_user_24h',
    'warn_user',
    'ban_user',
    'unban_user',
    'reverse_removal'
);

CREATE TYPE vendor_status AS ENUM (
    'pending_review',
    'approved',
    'rejected',
    'suspended'
);

CREATE TYPE notification_type AS ENUM (
    'nearby_post',
    'post_confirmed',
    'post_expiring',
    'post_removed',
    'vendor_post',
    'trust_change',
    'moderation_action',
    'vendor_application_update'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_hash      VARCHAR(128) NOT NULL UNIQUE,  -- SHA-256 of phone number
    phone_encrypted BYTEA NOT NULL,                -- AES-256 encrypted phone
    display_name    VARCHAR(50),
    avatar_url      VARCHAR(500),
    role            user_role NOT NULL DEFAULT 'registered',
    trust_score     SMALLINT NOT NULL DEFAULT 5 CHECK (trust_score >= 0 AND trust_score <= 100),
    trust_tier      trust_tier NOT NULL DEFAULT 'newcomer',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    email           VARCHAR(255),
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    device_fingerprint_hash VARCHAR(128),
    last_known_lat  DOUBLE PRECISION,
    last_known_lng  DOUBLE PRECISION,
    notification_prefs JSONB NOT NULL DEFAULT '{
        "categories": ["safety_alert", "lost_found", "street_food", "traffic_road"],
        "radiusKm": 1,
        "quietHoursStart": "22:00",
        "quietHoursEnd": "07:00",
        "enabled": true
    }'::jsonb,
    fcm_token       VARCHAR(500),
    ban_expires_at  TIMESTAMPTZ,
    mute_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- Soft delete
);

CREATE INDEX idx_users_phone_hash ON users(phone_hash);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_trust_score ON users(trust_score);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_device_fingerprint ON users(device_fingerprint_hash);

-- ----------------------------------------------------------------------------
-- Refresh Tokens
-- ----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ----------------------------------------------------------------------------
-- Category Configuration
-- ----------------------------------------------------------------------------
CREATE TABLE category_config (
    category        post_category PRIMARY KEY,
    display_name    VARCHAR(50) NOT NULL,
    icon            VARCHAR(10) NOT NULL,
    color           VARCHAR(7) NOT NULL,
    default_ttl_hours INTEGER NOT NULL,
    max_extension_hours INTEGER NOT NULL DEFAULT 0,
    max_extensions  SMALLINT NOT NULL DEFAULT 1,
    min_trust_to_post SMALLINT NOT NULL DEFAULT 5,
    fuzz_min_meters INTEGER NOT NULL DEFAULT 50,
    fuzz_max_meters INTEGER NOT NULL DEFAULT 150,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      SMALLINT NOT NULL DEFAULT 0
);

-- Seed category configuration
INSERT INTO category_config (category, display_name, icon, color, default_ttl_hours, max_extension_hours, max_extensions, min_trust_to_post, fuzz_min_meters, fuzz_max_meters, sort_order) VALUES
('street_food',           'Street Food',           '🍜', '#FF6B35', 4,  2,  1, 10, 30,  50,  1),
('lost_found',            'Lost & Found',          '🔍', '#4ECDC4', 72, 48, 2, 5,  100, 150, 2),
('safety_alert',          'Safety Alert',          '⚠️', '#FF1744', 12, 6,  1, 30, 50,  100, 3),
('traffic_road',          'Traffic / Road',        '🚗', '#FFD93D', 6,  3,  1, 10, 30,  50,  4),
('community_event',       'Community Event',       '🎉', '#6C5CE7', 24, 12, 1, 15, 50,  100, 5),
('utility_issue',         'Utility Issue',         '🔧', '#A8DADC', 48, 24, 1, 10, 100, 200, 6),
('noise_complaint',       'Noise Complaint',       '🔊', '#F4845F', 3,  0,  0, 15, 150, 200, 7),
('free_stuff',            'Free Stuff / Giveaway', '🎁', '#2ECC71', 8,  4,  1, 10, 50,  100, 8),
('barangay_announcement', 'Barangay Announcement', '📢', '#0984E3', 168, 168, 99, 0, 0, 0, 9),
('general',               'General / Other',       '💬', '#636E72', 6,  2,  1, 5,  100, 150, 10);

-- ----------------------------------------------------------------------------
-- Posts (partitioned by created_at month for archive efficiency)
-- ----------------------------------------------------------------------------
CREATE TABLE posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID NOT NULL REFERENCES users(id),
    category        post_category NOT NULL,
    content         VARCHAR(280) NOT NULL,
    photo_url       VARCHAR(500),
    
    -- Fuzzed location (the ONLY location stored)
    location        GEOMETRY(Point, 4326) NOT NULL,
    fuzz_radius_used INTEGER NOT NULL,  -- Meters of fuzzing applied (for audit)
    
    status          post_status NOT NULL DEFAULT 'active',
    
    -- Expiry management
    expires_at      TIMESTAMPTZ NOT NULL,
    extensions_used SMALLINT NOT NULL DEFAULT 0,
    
    -- Duplicate tracking
    duplicate_score REAL DEFAULT 0,
    linked_post_id  UUID REFERENCES posts(id),
    
    -- Engagement counters (denormalized for read performance)
    reaction_confirm       INTEGER NOT NULL DEFAULT 0,
    reaction_still_active  INTEGER NOT NULL DEFAULT 0,
    reaction_no_longer_valid INTEGER NOT NULL DEFAULT 0,
    reaction_thanks        INTEGER NOT NULL DEFAULT 0,
    view_count             INTEGER NOT NULL DEFAULT 0,
    
    -- Full-text search
    content_tsv     TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'auto_approved',
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index (GiST) — critical for nearby queries
CREATE INDEX idx_posts_location ON posts USING GIST(location);

-- Status + expiry for the expiry worker
CREATE INDEX idx_posts_status_expires ON posts(status, expires_at) WHERE status = 'active';

-- Category filtering
CREATE INDEX idx_posts_category_status ON posts(category, status);

-- Author lookup
CREATE INDEX idx_posts_author ON posts(author_id);

-- Full-text search index (GIN)
CREATE INDEX idx_posts_content_fts ON posts USING GIN(content_tsv);

-- Trigram index for similarity search (duplicate detection)
CREATE INDEX idx_posts_content_trgm ON posts USING GIN(content gin_trgm_ops);

-- Time-based queries
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Composite index for the main nearby feed query
CREATE INDEX idx_posts_active_nearby ON posts(status, created_at DESC) 
    WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- Posts Archive (expired posts moved here by archiver worker)
-- ----------------------------------------------------------------------------
CREATE TABLE posts_archive (
    LIKE posts INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example for 2026)
CREATE TABLE posts_archive_2026_01 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE posts_archive_2026_02 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE posts_archive_2026_03 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE posts_archive_2026_04 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE posts_archive_2026_05 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE posts_archive_2026_06 PARTITION OF posts_archive
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ----------------------------------------------------------------------------
-- Reactions
-- ----------------------------------------------------------------------------
CREATE TABLE reactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction    reaction_type NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)  -- One reaction per user per post
);

CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);

-- ----------------------------------------------------------------------------
-- Reports (flagged content)
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id),
    reason      report_reason NOT NULL,
    details     VARCHAR(500),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, reviewed, dismissed
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_post ON reports(post_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- ----------------------------------------------------------------------------
-- Moderation Queue
-- ----------------------------------------------------------------------------
CREATE TABLE moderation_queue (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL,  -- 'low_trust_auto_queue', 'community_flagged', 'auto_detected'
    priority    SMALLINT NOT NULL DEFAULT 5,  -- 1=highest, 10=lowest
    assigned_to UUID REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_review, resolved
    resolved_action moderation_action,
    resolved_note VARCHAR(500),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modqueue_status_priority ON moderation_queue(status, priority) WHERE status = 'pending';
CREATE INDEX idx_modqueue_assigned ON moderation_queue(assigned_to) WHERE status = 'in_review';

-- ----------------------------------------------------------------------------
-- Moderation Log (audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE moderation_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id    UUID NOT NULL REFERENCES users(id),
    target_user_id  UUID REFERENCES users(id),
    target_post_id  UUID REFERENCES posts(id),
    action          moderation_action NOT NULL,
    reason          VARCHAR(500),
    metadata        JSONB,  -- Additional context
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modlog_moderator ON moderation_log(moderator_id);
CREATE INDEX idx_modlog_target_user ON moderation_log(target_user_id);
CREATE INDEX idx_modlog_created_at ON moderation_log(created_at DESC);

-- ----------------------------------------------------------------------------
-- Vendor Profiles
-- ----------------------------------------------------------------------------
CREATE TABLE vendor_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name   VARCHAR(100) NOT NULL,
    business_category VARCHAR(50) NOT NULL,  -- 'food', 'goods', 'services'
    description     VARCHAR(500),
    logo_url        VARCHAR(500),
    permit_doc_url  VARCHAR(500),
    status          vendor_status NOT NULL DEFAULT 'pending_review',
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    
    -- Live location for moving vendors
    current_location GEOMETRY(Point, 4326),
    location_updated_at TIMESTAMPTZ,
    
    -- Schedule (JSONB for flexibility)
    schedule        JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"days": ["mon","wed","fri"], "startTime": "06:00", "endTime": "10:00"}]
    
    follower_count  INTEGER NOT NULL DEFAULT 0,
    
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_note     VARCHAR(500),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_user ON vendor_profiles(user_id);
CREATE INDEX idx_vendor_status ON vendor_profiles(status);
CREATE INDEX idx_vendor_location ON vendor_profiles USING GIST(current_location);

-- ----------------------------------------------------------------------------
-- Vendor Followers
-- ----------------------------------------------------------------------------
CREATE TABLE vendor_followers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id   UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(vendor_id, follower_id)
);

CREATE INDEX idx_vendor_followers_vendor ON vendor_followers(vendor_id);
CREATE INDEX idx_vendor_followers_follower ON vendor_followers(follower_id);

-- ----------------------------------------------------------------------------
-- Vendor Location History (trail for moving vendors)
-- ----------------------------------------------------------------------------
CREATE TABLE vendor_location_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id   UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    location    GEOMETRY(Point, 4326) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_loc_history ON vendor_location_history(vendor_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       VARCHAR(100) NOT NULL,
    body        VARCHAR(300),
    data        JSONB,  -- { postId, category, distance, etc. }
    is_read     BOOLEAN NOT NULL DEFAULT false,
    sent_via_push BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = false;

-- ----------------------------------------------------------------------------
-- Trust Score History (for audit and debugging)
-- ----------------------------------------------------------------------------
CREATE TABLE trust_score_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_score   SMALLINT NOT NULL,
    new_score   SMALLINT NOT NULL,
    old_tier    trust_tier NOT NULL,
    new_tier    trust_tier NOT NULL,
    breakdown   JSONB NOT NULL,  -- Detailed score components
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trust_history_user ON trust_score_history(user_id, calculated_at DESC);

-- ----------------------------------------------------------------------------
-- Rate Limit Tracking (backup for Redis)
-- ----------------------------------------------------------------------------
CREATE TABLE rate_limit_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    ip_hash     VARCHAR(128),
    action      VARCHAR(50) NOT NULL,  -- 'post_create', 'otp_send', etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_user_action ON rate_limit_events(user_id, action, created_at DESC);
CREATE INDEX idx_rate_limit_ip_action ON rate_limit_events(ip_hash, action, created_at DESC);

-- Auto-cleanup: delete rate limit events older than 24 hours
-- (Run as a scheduled task or use pg_cron)

-- ----------------------------------------------------------------------------
-- Heatmap Cache (pre-computed grid data)
-- ----------------------------------------------------------------------------
CREATE TABLE heatmap_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grid_lat        DOUBLE PRECISION NOT NULL,
    grid_lng        DOUBLE PRECISION NOT NULL,
    category        post_category,  -- NULL = all categories
    weight          INTEGER NOT NULL DEFAULT 0,
    resolution_meters INTEGER NOT NULL DEFAULT 50,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(grid_lat, grid_lng, category, resolution_meters)
);

CREATE INDEX idx_heatmap_cache_computed ON heatmap_cache(computed_at);
CREATE INDEX idx_heatmap_cache_category ON heatmap_cache(category);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get nearby active posts (primary map feed query)
CREATE OR REPLACE FUNCTION get_nearby_posts(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 1.0,
    p_categories post_category[] DEFAULT NULL,
    p_since TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '24 hours'),
    p_sort VARCHAR DEFAULT 'nearest',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    category post_category,
    content VARCHAR,
    photo_url VARCHAR,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    author_id UUID,
    author_display_name VARCHAR,
    author_trust_tier trust_tier,
    author_role user_role,
    reaction_confirm INTEGER,
    reaction_still_active INTEGER,
    reaction_no_longer_valid INTEGER,
    reaction_thanks INTEGER,
    expires_at TIMESTAMPTZ,
    extensions_used SMALLINT,
    duplicate_score REAL,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    user_point GEOMETRY;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    RETURN QUERY
    SELECT 
        p.id,
        p.category,
        p.content,
        p.photo_url,
        ST_Y(p.location) AS lat,
        ST_X(p.location) AS lng,
        ST_DistanceSphere(p.location, user_point) AS distance_meters,
        u.id AS author_id,
        u.display_name AS author_display_name,
        u.trust_tier AS author_trust_tier,
        u.role AS author_role,
        p.reaction_confirm,
        p.reaction_still_active,
        p.reaction_no_longer_valid,
        p.reaction_thanks,
        p.expires_at,
        p.extensions_used,
        p.duplicate_score,
        p.created_at
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.status = 'active'
      AND p.created_at >= p_since
      AND ST_DWithin(
          p.location::geography,
          user_point::geography,
          p_radius_km * 1000  -- Convert km to meters
      )
      AND (p_categories IS NULL OR p.category = ANY(p_categories))
    ORDER BY
        CASE WHEN p_sort = 'nearest' THEN ST_DistanceSphere(p.location, user_point) END ASC,
        CASE WHEN p_sort = 'recent' THEN p.created_at END DESC,
        CASE WHEN p_sort = 'confirmed' THEN p.reaction_confirm END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check for duplicate posts
CREATE OR REPLACE FUNCTION check_duplicate_post(
    p_content VARCHAR,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_category post_category,
    p_spatial_radius_meters DOUBLE PRECISION DEFAULT 200,
    p_temporal_window_hours DOUBLE PRECISION DEFAULT 2
)
RETURNS TABLE (
    existing_post_id UUID,
    spatial_score DOUBLE PRECISION,
    temporal_score DOUBLE PRECISION,
    text_score DOUBLE PRECISION,
    composite_score DOUBLE PRECISION
) AS $$
DECLARE
    new_point GEOMETRY;
BEGIN
    new_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    RETURN QUERY
    SELECT 
        p.id AS existing_post_id,
        GREATEST(0, 1.0 - (ST_DistanceSphere(p.location, new_point) / p_spatial_radius_meters)) AS spatial_score,
        GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (p_temporal_window_hours * 3600))) AS temporal_score,
        similarity(p_content, p.content)::DOUBLE PRECISION AS text_score,
        (
            GREATEST(0, 1.0 - (ST_DistanceSphere(p.location, new_point) / p_spatial_radius_meters)) * 0.4 +
            GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (p_temporal_window_hours * 3600))) * 0.3 +
            similarity(p_content, p.content)::DOUBLE PRECISION * 0.3
        ) AS composite_score
    FROM posts p
    WHERE p.status = 'active'
      AND p.category = p_category
      AND p.created_at >= NOW() - (p_temporal_window_hours || ' hours')::INTERVAL
      AND ST_DWithin(
          p.location::geography,
          new_point::geography,
          p_spatial_radius_meters
      )
    ORDER BY composite_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Compute trust score for a user
CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id UUID)
RETURNS TABLE (
    total_score SMALLINT,
    tier trust_tier,
    breakdown JSONB
) AS $$
DECLARE
    v_base_score DOUBLE PRECISION := 5;
    v_accuracy_score DOUBLE PRECISION := 0;
    v_engagement_score DOUBLE PRECISION := 0;
    v_longevity_score DOUBLE PRECISION := 0;
    v_verification_bonus DOUBLE PRECISION := 0;
    v_penalty_score DOUBLE PRECISION := 0;
    v_total DOUBLE PRECISION;
    v_tier trust_tier;
    
    v_total_posts INTEGER;
    v_confirmed_posts INTEGER;
    v_age_days DOUBLE PRECISION;
    v_confirms_given INTEGER;
    v_reports_validated INTEGER;
    v_posts_removed INTEGER;
    v_posts_flagged INTEGER;
    v_mute_count INTEGER;
    v_ban_count INTEGER;
    v_email_verified BOOLEAN;
    v_role user_role;
BEGIN
    -- Gather user stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE reaction_confirm >= 3)
    INTO v_total_posts, v_confirmed_posts
    FROM posts WHERE author_id = p_user_id AND status IN ('active', 'expired');
    
    SELECT 
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0,
        email_verified,
        role
    INTO v_age_days, v_email_verified, v_role
    FROM users WHERE id = p_user_id;
    
    SELECT COUNT(*) INTO v_confirms_given
    FROM reactions WHERE user_id = p_user_id AND reaction = 'confirm';
    
    SELECT COUNT(*) INTO v_reports_validated
    FROM reports WHERE reporter_id = p_user_id AND status = 'reviewed';
    
    SELECT COUNT(*) INTO v_posts_removed
    FROM posts WHERE author_id = p_user_id AND status = 'removed_by_mod';
    
    SELECT COUNT(*) INTO v_posts_flagged
    FROM reports r JOIN posts p ON r.post_id = p.id WHERE p.author_id = p_user_id;
    
    SELECT COUNT(*) INTO v_mute_count
    FROM moderation_log WHERE target_user_id = p_user_id AND action = 'mute_user_24h';
    
    SELECT COUNT(*) INTO v_ban_count
    FROM moderation_log WHERE target_user_id = p_user_id AND action = 'ban_user';
    
    -- Calculate components
    IF v_total_posts > 0 THEN
        v_accuracy_score := LEAST(40, (v_confirmed_posts::DOUBLE PRECISION / v_total_posts) * 30 + 5);
    END IF;
    
    v_engagement_score := LEAST(20, 
        LOG(2, GREATEST(1, v_confirms_given) + 1) * 3 +
        LOG(2, GREATEST(1, v_reports_validated) + 1) * 5
    );
    
    v_longevity_score := LEAST(15, SQRT(GREATEST(0, v_age_days)) * 1.2);
    
    IF v_email_verified THEN v_verification_bonus := v_verification_bonus + 5; END IF;
    IF v_role = 'official' THEN v_verification_bonus := v_verification_bonus + 5; END IF;
    IF v_role IN ('vendor', 'verified_vendor') THEN v_verification_bonus := v_verification_bonus + 3; END IF;
    
    v_penalty_score := (v_posts_removed * 8) + (v_posts_flagged * 2) + (v_mute_count * 10) + (v_ban_count * 50);
    
    -- Compute total
    v_total := LEAST(100, GREATEST(0, 
        v_base_score + v_accuracy_score + v_engagement_score + 
        v_longevity_score + v_verification_bonus - v_penalty_score
    ));
    
    -- Determine tier
    v_tier := CASE
        WHEN v_total >= 90 THEN 'neighborhood_guardian'
        WHEN v_total >= 75 THEN 'community_pillar'
        WHEN v_total >= 50 THEN 'trusted_neighbor'
        WHEN v_total >= 25 THEN 'active_neighbor'
        WHEN v_total >= 10 THEN 'neighbor'
        ELSE 'newcomer'
    END;
    
    RETURN QUERY SELECT 
        v_total::SMALLINT,
        v_tier,
        jsonb_build_object(
            'base', v_base_score,
            'accuracy', ROUND(v_accuracy_score::NUMERIC, 2),
            'engagement', ROUND(v_engagement_score::NUMERIC, 2),
            'longevity', ROUND(v_longevity_score::NUMERIC, 2),
            'verification', v_verification_bonus,
            'penalty', v_penalty_score,
            'stats', jsonb_build_object(
                'totalPosts', v_total_posts,
                'confirmedPosts', v_confirmed_posts,
                'accountAgeDays', ROUND(v_age_days::NUMERIC),
                'confirmsGiven', v_confirms_given,
                'reportsValidated', v_reports_validated,
                'postsRemoved', v_posts_removed
            )
        );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Generate heatmap data
CREATE OR REPLACE FUNCTION generate_heatmap(
    p_sw_lat DOUBLE PRECISION,
    p_sw_lng DOUBLE PRECISION,
    p_ne_lat DOUBLE PRECISION,
    p_ne_lng DOUBLE PRECISION,
    p_category post_category DEFAULT NULL,
    p_resolution_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
    grid_lat DOUBLE PRECISION,
    grid_lng DOUBLE PRECISION,
    weight BIGINT
) AS $$
DECLARE
    lat_step DOUBLE PRECISION;
    lng_step DOUBLE PRECISION;
BEGIN
    -- Approximate degree step for given resolution in meters
    lat_step := p_resolution_meters / 111320.0;  -- 1 degree lat ≈ 111.32 km
    lng_step := p_resolution_meters / (111320.0 * COS(RADIANS((p_sw_lat + p_ne_lat) / 2)));
    
    RETURN QUERY
    SELECT 
        ROUND((ST_Y(p.location) / lat_step)::NUMERIC) * lat_step AS grid_lat,
        ROUND((ST_X(p.location) / lng_step)::NUMERIC) * lng_step AS grid_lng,
        COUNT(*) AS weight
    FROM posts p
    WHERE p.status = 'active'
      AND ST_Within(
          p.location,
          ST_MakeEnvelope(p_sw_lng, p_sw_lat, p_ne_lng, p_ne_lat, 4326)
      )
      AND (p_category IS NULL OR p.category = p_category)
    GROUP BY 
        ROUND((ST_Y(p.location) / lat_step)::NUMERIC) * lat_step,
        ROUND((ST_X(p.location) / lng_step)::NUMERIC) * lng_step;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_vendor_profiles_updated_at
    BEFORE UPDATE ON vendor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Update denormalized reaction counts on posts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET
            reaction_confirm = reaction_confirm + CASE WHEN NEW.reaction = 'confirm' THEN 1 ELSE 0 END,
            reaction_still_active = reaction_still_active + CASE WHEN NEW.reaction = 'still_active' THEN 1 ELSE 0 END,
            reaction_no_longer_valid = reaction_no_longer_valid + CASE WHEN NEW.reaction = 'no_longer_valid' THEN 1 ELSE 0 END,
            reaction_thanks = reaction_thanks + CASE WHEN NEW.reaction = 'thanks' THEN 1 ELSE 0 END
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET
            reaction_confirm = reaction_confirm - CASE WHEN OLD.reaction = 'confirm' THEN 1 ELSE 0 END,
            reaction_still_active = reaction_still_active - CASE WHEN OLD.reaction = 'still_active' THEN 1 ELSE 0 END,
            reaction_no_longer_valid = reaction_no_longer_valid - CASE WHEN OLD.reaction = 'no_longer_valid' THEN 1 ELSE 0 END,
            reaction_thanks = reaction_thanks - CASE WHEN OLD.reaction = 'thanks' THEN 1 ELSE 0 END
        WHERE id = OLD.post_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Decrement old reaction, increment new
        UPDATE posts SET
            reaction_confirm = reaction_confirm 
                - CASE WHEN OLD.reaction = 'confirm' THEN 1 ELSE 0 END
                + CASE WHEN NEW.reaction = 'confirm' THEN 1 ELSE 0 END,
            reaction_still_active = reaction_still_active 
                - CASE WHEN OLD.reaction = 'still_active' THEN 1 ELSE 0 END
                + CASE WHEN NEW.reaction = 'still_active' THEN 1 ELSE 0 END,
            reaction_no_longer_valid = reaction_no_longer_valid 
                - CASE WHEN OLD.reaction = 'no_longer_valid' THEN 1 ELSE 0 END
                + CASE WHEN NEW.reaction = 'no_longer_valid' THEN 1 ELSE 0 END,
            reaction_thanks = reaction_thanks 
                - CASE WHEN OLD.reaction = 'thanks' THEN 1 ELSE 0 END
                + CASE WHEN NEW.reaction = 'thanks' THEN 1 ELSE 0 END
        WHERE id = NEW.post_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reaction_counts
    AFTER INSERT OR UPDATE OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

-- Trigger: Update vendor follower count
CREATE OR REPLACE FUNCTION update_vendor_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE vendor_profiles SET follower_count = follower_count + 1 WHERE id = NEW.vendor_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE vendor_profiles SET follower_count = follower_count - 1 WHERE id = OLD.vendor_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_follower_count
    AFTER INSERT OR DELETE ON vendor_followers
    FOR EACH ROW EXECUTE FUNCTION update_vendor_follower_count();
