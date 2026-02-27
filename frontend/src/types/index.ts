// ============================================================================
// Hyperlocal Radar — Type Definitions
// ============================================================================

export type PostCategory =
  | 'street_food'
  | 'lost_found'
  | 'safety_alert'
  | 'traffic_road'
  | 'community_event'
  | 'utility_issue'
  | 'noise_complaint'
  | 'free_stuff'
  | 'barangay_announcement'
  | 'general';

export type ReactionType = 'confirm' | 'still_active' | 'no_longer_valid' | 'thanks';

export type TrustTier =
  | 'newcomer'
  | 'neighbor'
  | 'active_neighbor'
  | 'trusted_neighbor'
  | 'community_pillar'
  | 'neighborhood_guardian';

export type UserRole =
  | 'registered'
  | 'trusted'
  | 'vendor'
  | 'verified_vendor'
  | 'moderator'
  | 'official'
  | 'admin';

export interface Location {
  lat: number;
  lng: number;
  fuzzed?: boolean;
}

export interface PostAuthor {
  id: string;
  displayName: string;
  trustTier: TrustTier;
  isVendor: boolean;
  isVerifiedVendor: boolean;
}

export interface PostReactions {
  confirm: number;
  still_active: number;
  no_longer_valid: number;
  thanks: number;
}

export interface Post {
  id: string;
  category: PostCategory;
  content: string;
  photoUrl: string | null;
  location: Location;
  distanceMeters: number;
  author: PostAuthor;
  reactions: PostReactions;
  userReaction: ReactionType | null;
  isDuplicate: boolean;
  expiresAt: string;
  canExtend: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  trustScore: number;
  trustTier: TrustTier;
  stats: {
    totalPosts: number;
    confirmedPosts: number;
    totalReactions: number;
    accountAgeDays: number;
  };
  notificationPrefs: NotificationPrefs;
  vendorProfile: VendorProfile | null;
  createdAt: string;
}

export interface NotificationPrefs {
  categories: PostCategory[];
  radiusKm: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  enabled: boolean;
}

export interface VendorProfile {
  id: string;
  businessName: string;
  businessCategory: string;
  status: string;
  isVerified: boolean;
  followerCount: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface CategoryConfig {
  slug: PostCategory;
  displayName: string;
  icon: string;
  color: string;
  defaultTtlHours: number;
}

// Category configuration (shared between frontend and backend)
export const CATEGORIES: CategoryConfig[] = [
  { slug: 'street_food', displayName: 'Street Food', icon: '🍜', color: '#FF6B35', defaultTtlHours: 4 },
  { slug: 'lost_found', displayName: 'Lost & Found', icon: '🔍', color: '#4ECDC4', defaultTtlHours: 72 },
  { slug: 'safety_alert', displayName: 'Safety Alert', icon: '⚠️', color: '#FF1744', defaultTtlHours: 12 },
  { slug: 'traffic_road', displayName: 'Traffic / Road', icon: '🚗', color: '#FFD93D', defaultTtlHours: 6 },
  { slug: 'community_event', displayName: 'Community Event', icon: '🎉', color: '#6C5CE7', defaultTtlHours: 24 },
  { slug: 'utility_issue', displayName: 'Utility Issue', icon: '🔧', color: '#A8DADC', defaultTtlHours: 48 },
  { slug: 'noise_complaint', displayName: 'Noise Complaint', icon: '🔊', color: '#F4845F', defaultTtlHours: 3 },
  { slug: 'free_stuff', displayName: 'Free Stuff', icon: '🎁', color: '#2ECC71', defaultTtlHours: 8 },
  { slug: 'barangay_announcement', displayName: 'Announcement', icon: '📢', color: '#0984E3', defaultTtlHours: 168 },
  { slug: 'general', displayName: 'General', icon: '💬', color: '#636E72', defaultTtlHours: 6 },
];

export function getCategoryConfig(slug: PostCategory): CategoryConfig {
  return CATEGORIES.find((c) => c.slug === slug) || CATEGORIES[CATEGORIES.length - 1];
}
