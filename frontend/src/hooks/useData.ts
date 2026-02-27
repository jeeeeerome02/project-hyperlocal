// ============================================================================
// Hyperlocal Radar — Data Fetching Hooks (React Query)
// ============================================================================
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, usersApi, heatmapApi, searchApi, type NearbyPostsParams } from '@/lib/api';
import { useMapStore, useFilterStore, usePostStore, useAuthStore } from '@/store';
import type { ReactionType } from '@/types';

// ---------------------------------------------------------------------------
// Nearby Posts
// ---------------------------------------------------------------------------
export function useNearbyPosts() {
  const { userLocation } = useMapStore();
  const { activeCategories, radiusKm } = useFilterStore();
  const { setPosts, setLoading, setError } = usePostStore();

  return useQuery({
    queryKey: ['posts', 'nearby', userLocation?.lat, userLocation?.lng, radiusKm, activeCategories],
    queryFn: async () => {
      if (!userLocation) return [];
      setLoading(true);
      const params: NearbyPostsParams = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm,
      };
      if (activeCategories.length > 0) {
        params.categories = activeCategories.join(',');
      }
      const res = await postsApi.getNearby(params);
      setPosts(res.data);
      return res.data;
    },
    enabled: !!userLocation,
    refetchInterval: 30_000,
    staleTime: 15_000,
    meta: { onError: (err: Error) => setError(err.message) },
  });
}

// ---------------------------------------------------------------------------
// Create Post
// ---------------------------------------------------------------------------
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ---------------------------------------------------------------------------
// React to Post
// ---------------------------------------------------------------------------
export function useReactToPost() {
  const { updatePost } = usePostStore();

  return useMutation({
    mutationFn: ({ postId, reaction }: { postId: string; reaction: ReactionType }) =>
      postsApi.react(postId, reaction),
    onSuccess: (res, { postId, reaction }) => {
      updatePost(postId, { reactions: res.data.reactions, userReaction: reaction });
    },
  });
}

// ---------------------------------------------------------------------------
// Extend TTL
// ---------------------------------------------------------------------------
export function useExtendTtl() {
  const { updatePost } = usePostStore();

  return useMutation({
    mutationFn: (postId: string) => postsApi.extendTtl(postId),
    onSuccess: (res, postId) => {
      updatePost(postId, { expiresAt: res.data.expiresAt, canExtend: false });
    },
  });
}

// ---------------------------------------------------------------------------
// Report Post
// ---------------------------------------------------------------------------
export function useReportPost() {
  return useMutation({
    mutationFn: ({ postId, reason, details }: { postId: string; reason: string; details?: string }) =>
      postsApi.report(postId, reason, details),
  });
}

// ---------------------------------------------------------------------------
// Current User
// ---------------------------------------------------------------------------
export function useCurrentUser() {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await usersApi.getMe();
      setUser(res.data);
      return res.data;
    },
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------
export function useHeatmapData(bounds: { north: number; south: number; east: number; west: number } | null) {
  return useQuery({
    queryKey: ['heatmap', bounds],
    queryFn: async () => {
      if (!bounds) return [];
      const res = await heatmapApi.getData(bounds);
      return res.data;
    },
    enabled: !!bounds,
    staleTime: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export function useSearch(query: string) {
  const { userLocation } = useMapStore();

  return useQuery({
    queryKey: ['search', query, userLocation?.lat],
    queryFn: async () => {
      const res = await searchApi.search({
        q: query,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radiusKm: 5,
      });
      return res.data;
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
