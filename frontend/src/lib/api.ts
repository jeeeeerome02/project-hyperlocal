// ============================================================================
// Hyperlocal Radar — API Client
// ============================================================================
import type { Post, User, HeatmapPoint, VendorProfile } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('radar_token', token);
  else localStorage.removeItem('radar_token');
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('radar_token');
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('radar_refresh');
  }
  return null;
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem('radar_refresh', token);
  else localStorage.removeItem('radar_refresh');
}

// ---------------------------------------------------------------------------
// Base fetch wrapper
// ---------------------------------------------------------------------------
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: Record<string, unknown>;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
    if (json.success) {
      setAccessToken(json.data.accessToken);
      setRefreshToken(json.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }

  const json = await res.json();
  if (!res.ok) {
    throw new ApiError(json.error || 'Request failed', res.status, json);
  }
  return json as ApiResponse<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export const authApi = {
  sendOtp(phone: string) {
    return apiFetch<{ message: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOtp(phone: string, code: string) {
    return apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  logout() {
    const refresh = getRefreshToken();
    return apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refresh }),
    });
  },
};

// ---------------------------------------------------------------------------
// Posts API
// ---------------------------------------------------------------------------
export interface NearbyPostsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  categories?: string;
  limit?: number;
  offset?: number;
}

export const postsApi = {
  getNearby(params: NearbyPostsParams) {
    const qs = new URLSearchParams();
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    if (params.radiusKm) qs.set('radiusKm', String(params.radiusKm));
    if (params.categories) qs.set('categories', params.categories);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return apiFetch<Post[]>(`/posts/nearby?${qs.toString()}`);
  },

  create(data: { category: string; content: string; lat: number; lng: number; photoUrl?: string }) {
    return apiFetch<Post>('/posts', { method: 'POST', body: JSON.stringify(data) });
  },

  react(postId: string, reaction: string) {
    return apiFetch<{ reactions: Post['reactions'] }>(`/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  },

  extendTtl(postId: string) {
    return apiFetch<{ expiresAt: string }>(`/posts/${postId}/extend`, { method: 'POST' });
  },

  report(postId: string, reason: string, details?: string) {
    return apiFetch<{ message: string }>(`/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  },

  delete(postId: string) {
    return apiFetch<{ message: string }>(`/posts/${postId}`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------
export const usersApi = {
  getMe() {
    return apiFetch<User>('/users/me');
  },

  updateProfile(data: { displayName?: string; avatarUrl?: string }) {
    return apiFetch<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  },

  updateNotificationPrefs(prefs: Partial<User['notificationPrefs']>) {
    return apiFetch<User['notificationPrefs']>('/users/me/notifications', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  deleteAccount() {
    return apiFetch<{ message: string }>('/users/me', { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Vendor API
// ---------------------------------------------------------------------------
export const vendorApi = {
  apply(data: { businessName: string; businessCategory: string; description?: string }) {
    return apiFetch<VendorProfile>('/vendor/apply', { method: 'POST', body: JSON.stringify(data) });
  },

  getDashboard() {
    return apiFetch<{
      profile: VendorProfile;
      weeklyStats: unknown;
      recentPosts: Post[];
    }>('/vendor/dashboard');
  },

  updateLocation(lat: number, lng: number) {
    return apiFetch<{ message: string }>('/vendor/location', {
      method: 'PUT',
      body: JSON.stringify({ lat, lng }),
    });
  },

  follow(vendorId: string) {
    return apiFetch<{ message: string }>(`/vendor/${vendorId}/follow`, { method: 'POST' });
  },

  unfollow(vendorId: string) {
    return apiFetch<{ message: string }>(`/vendor/${vendorId}/follow`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Heatmap API
// ---------------------------------------------------------------------------
export const heatmapApi = {
  getData(params: { north: number; south: number; east: number; west: number; category?: string }) {
    const qs = new URLSearchParams();
    qs.set('north', String(params.north));
    qs.set('south', String(params.south));
    qs.set('east', String(params.east));
    qs.set('west', String(params.west));
    if (params.category) qs.set('category', params.category);
    return apiFetch<HeatmapPoint[]>(`/heatmap?${qs.toString()}`);
  },
};

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------
export const searchApi = {
  search(params: { q: string; lat?: number; lng?: number; radiusKm?: number; limit?: number }) {
    const qs = new URLSearchParams();
    qs.set('q', params.q);
    if (params.lat) qs.set('lat', String(params.lat));
    if (params.lng) qs.set('lng', String(params.lng));
    if (params.radiusKm) qs.set('radiusKm', String(params.radiusKm));
    if (params.limit) qs.set('limit', String(params.limit));
    return apiFetch<Post[]>(`/search?${qs.toString()}`);
  },
};

// ---------------------------------------------------------------------------
// Moderation API
// ---------------------------------------------------------------------------
export const moderationApi = {
  getQueue(params?: { status?: string; category?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    return apiFetch<unknown[]>(`/moderation/queue?${qs.toString()}`);
  },

  takeAction(itemId: string, action: string, reason?: string) {
    return apiFetch<{ message: string }>(`/moderation/${itemId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  },

  getUserHistory(userId: string) {
    return apiFetch<unknown>(`/moderation/users/${userId}`);
  },

  banUser(userId: string, reason: string, durationHours?: number) {
    return apiFetch<{ message: string }>(`/moderation/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, durationHours }),
    });
  },
};
