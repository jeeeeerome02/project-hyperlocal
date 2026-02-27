import { z } from 'zod';

// ========================================================================
// Auth Schemas
// ========================================================================

export const otpSendSchema = z.object({
  phone: z.string().regex(/^\+63\d{10}$/, 'Philippine phone number required (+63XXXXXXXXXX)'),
  purpose: z.enum(['login', 'register']),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+63\d{10}$/),
  code: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ========================================================================
// User Schemas
// ========================================================================

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

export const notificationPrefsSchema = z.object({
  categories: z.array(z.enum([
    'street_food', 'lost_found', 'safety_alert', 'traffic_road',
    'community_event', 'utility_issue', 'noise_complaint', 'free_stuff',
    'barangay_announcement', 'general',
  ])),
  radiusKm: z.number().min(0.5).max(2),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  fcmToken: z.string().optional(),
});

// ========================================================================
// Post Schemas
// ========================================================================

export const createPostSchema = z.object({
  category: z.enum([
    'street_food', 'lost_found', 'safety_alert', 'traffic_road',
    'community_event', 'utility_issue', 'noise_complaint', 'free_stuff',
    'barangay_announcement', 'general',
  ]),
  content: z.string().min(1).max(280),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(2).default(1),
  categories: z.string().optional(),
  since: z.string().datetime().optional(),
  sort: z.enum(['nearest', 'recent', 'confirmed']).default('nearest'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const reactionSchema = z.object({
  reaction: z.enum(['confirm', 'still_active', 'no_longer_valid', 'thanks']),
});

export const reportSchema = z.object({
  reason: z.enum([
    'misinformation', 'spam', 'harassment', 'nsfw_content',
    'personal_info_exposed', 'hate_speech', 'off_topic', 'duplicate', 'other',
  ]),
  details: z.string().max(500).optional(),
});

// ========================================================================
// Vendor Schemas
// ========================================================================

export const vendorApplySchema = z.object({
  businessName: z.string().min(2).max(100),
  businessCategory: z.enum(['food', 'goods', 'services']),
  description: z.string().max(500).optional(),
});

export const vendorLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ========================================================================
// Heatmap Schemas
// ========================================================================

export const heatmapQuerySchema = z.object({
  bounds: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/,
    'bounds must be "sw_lat,sw_lng,ne_lat,ne_lng"'),
  categories: z.string().optional(),
  resolution: z.enum(['low', 'medium', 'high']).default('medium'),
});

// ========================================================================
// Moderation Schemas
// ========================================================================

export const moderationActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'remove', 'escalate', 'mute_user_24h', 'warn_user']),
  note: z.string().max(500).optional(),
});

export const banUserSchema = z.object({
  reason: z.string().min(10).max(500),
  duration: z.enum(['24h', '7d', '30d', 'permanent']),
});

// ========================================================================
// Search Schema
// ========================================================================

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(2).default(2),
});
