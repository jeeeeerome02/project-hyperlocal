// ============================================================================
// Hyperlocal Radar — Main Map Page
// ============================================================================
'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { QueryProvider } from '@/lib/query-provider';
import { useGeolocation, useNearbyPosts, useCurrentUser, useHeatmapData } from '@/hooks';
import { useSocket } from '@/hooks/useSocket';
import { useMapStore, useFilterStore, usePostStore, useUIStore, useAuthStore } from '@/store';
import { getAccessToken } from '@/lib/api';
import CategoryFilter from '@/components/map/CategoryFilter';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import CreatePostFlow from '@/components/posts/CreatePostFlow';
import FAB from '@/components/ui/FAB';
import TopBar from '@/components/ui/TopBar';
import AuthModal from '@/components/auth/AuthModal';
import PostCard from '@/components/posts/PostCard';

// Dynamic import for MapView (avoid SSR issues with mapbox-gl)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">Loading map...</div>
    </div>
  ),
});

function MapPage() {
  const { viewport } = useMapStore();
  const { showHeatmap } = useFilterStore();
  const { posts, selectPost } = usePostStore();
  const { openBottomSheet, bottomSheet, isSocketConnected } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const [showAuth, setShowAuth] = useState(false);
  const [showList, setShowList] = useState(false);

  // Initialize geolocation
  useGeolocation();

  // Connect WebSocket
  useSocket();

  // Fetch user if token exists
  const { isLoading: userLoading } = useCurrentUser();

  // Fetch nearby posts
  const { isLoading: postsLoading, refetch } = useNearbyPosts();

  // Heatmap data
  const heatmapBounds = showHeatmap
    ? {
        north: viewport.latitude + 0.02,
        south: viewport.latitude - 0.02,
        east: viewport.longitude + 0.02,
        west: viewport.longitude - 0.02,
      }
    : null;
  const { data: heatmapData } = useHeatmapData(heatmapBounds);

  // Prompt auth for actions that require it
  const handleAuthRequired = () => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return false;
    }
    return true;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map */}
      <MapView heatmapData={heatmapData} />

      {/* Category filter pills */}
      <CategoryFilter />

      {/* Top bar (search, heatmap toggle, profile) */}
      <TopBar />

      {/* Connection indicator */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <div
          className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`}
          title={isSocketConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Post list toggle */}
      <button
        onClick={() => setShowList(!showList)}
        className="absolute bottom-24 left-4 z-30 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md text-sm font-medium text-gray-700 hover:shadow-lg transition-all"
      >
        {showList ? '🗺️ Map' : `📋 List (${posts.length})`}
      </button>

      {/* Post list overlay */}
      {showList && (
        <div className="absolute bottom-32 left-4 right-4 z-30 max-h-[50vh] overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl p-3 space-y-2">
          {posts.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              {postsLoading ? 'Loading...' : 'No posts nearby'}
            </p>
          )}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              compact
              onClick={() => {
                selectPost(post);
                openBottomSheet('post-detail');
                setShowList(false);
              }}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <div onClick={() => handleAuthRequired()}>
        <FAB />
      </div>

      {/* Bottom sheets */}
      <PostDetailSheet />
      <CreatePostFlow />

      {/* Auth modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

// Wrap in QueryProvider
export default function Page() {
  return (
    <QueryProvider>
      <MapPage />
    </QueryProvider>
  );
}
