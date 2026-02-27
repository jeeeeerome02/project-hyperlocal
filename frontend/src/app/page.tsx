// ============================================================================
// HyperLocal — Main App Page (Feed-first, 2026 Design)
// ============================================================================
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryProvider } from '@/lib/query-provider';
import { useGeolocation, useNearbyPosts, useCurrentUser, useHeatmapData } from '@/hooks';
import { useSocket } from '@/hooks/useSocket';
import { useMapStore, useFilterStore, usePostStore, useUIStore, useAuthStore } from '@/store';
import { getAccessToken } from '@/lib/api';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import CreatePostFlow from '@/components/posts/CreatePostFlow';
import PostCard from '@/components/posts/PostCard';
import LoginPage from '@/components/auth/LoginPage';
import BottomNav, { type TabId } from '@/components/ui/BottomNav';
import FeedHeader from '@/components/ui/FeedHeader';
import CategoryBubbles from '@/components/ui/CategoryBubbles';
import { RefreshCw, MapPin, Loader2 } from 'lucide-react';

// Dynamic import for MapView (avoid SSR issues with mapbox-gl)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-fuchsia-500 animate-spin" />
    </div>
  ),
});

function HyperLocalApp() {
  const { viewport } = useMapStore();
  const { showHeatmap } = useFilterStore();
  const { posts, selectPost } = usePostStore();
  const { openBottomSheet } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('feed');

  // Check if user has never logged in (no token)
  useEffect(() => {
    if (!getAccessToken()) {
      setShowLogin(true);
    }
  }, []);

  // Initialize geolocation
  useGeolocation();

  // Connect WebSocket  
  useSocket();

  // Fetch user if token exists
  useCurrentUser();

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

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === 'create') {
        if (!isAuthenticated) {
          setShowLogin(true);
          return;
        }
        openBottomSheet('create-post');
        return;
      }
      setActiveTab(tab);
    },
    [isAuthenticated, openBottomSheet],
  );

  const handlePostClick = useCallback(
    (post: typeof posts[number]) => {
      selectPost(post);
      openBottomSheet('post-detail');
    },
    [selectPost, openBottomSheet],
  );

  // Login screen
  if (showLogin) {
    return <LoginPage onComplete={() => setShowLogin(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AnimatePresence mode="wait">
        {/* ─── FEED TAB ─── */}
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-24"
          >
            <FeedHeader />
            <CategoryBubbles />

            {/* Pull to refresh area */}
            <div className="px-4 pb-3">
              <button
                onClick={() => refetch()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur border border-white/40 dark:border-white/10 text-xs font-medium text-gray-500 hover:text-fuchsia-500 transition-colors"
              >
                <RefreshCw size={13} className={postsLoading ? 'animate-spin' : ''} />
                {postsLoading ? 'Refreshing...' : 'Refresh feed'}
              </button>
            </div>

            {/* Nearby indicator */}
            <div className="px-4 mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MapPin size={12} className="text-fuchsia-400" />
                <span>Showing posts within {useFilterStore.getState().radiusKm}km of you</span>
              </div>
            </div>

            {/* Post feed */}
            <div className="px-4 space-y-3">
              {posts.length === 0 && !postsLoading && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                    <MapPin size={28} className="text-fuchsia-400" />
                  </div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No posts nearby</h3>
                  <p className="text-sm text-gray-400">Be the first to share what&apos;s happening!</p>
                </div>
              )}

              {postsLoading && posts.length === 0 && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
                </div>
              )}

              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── MAP TAB ─── */}
        {activeTab === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
          >
            <MapView heatmapData={heatmapData} />
            {/* Floating category pills on map */}
            <div className="absolute top-0 left-0 right-0 z-20 pt-3 bg-gradient-to-b from-white/80 dark:from-gray-950/80 to-transparent pb-6">
              <CategoryBubbles />
            </div>
          </motion.div>
        )}

        {/* ─── ALERTS TAB ─── */}
        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-24"
          >
            <FeedHeader />
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-400/10 flex items-center justify-center">
                <span className="text-3xl">🔔</span>
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No alerts yet</h3>
              <p className="text-sm text-gray-400">Community alerts will appear here</p>
            </div>
          </motion.div>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-24"
          >
            <FeedHeader />
            <ProfileSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tabs */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Bottom sheets */}
      <PostDetailSheet />
      <CreatePostFlow />
    </div>
  );
}

/** Simple profile section — shows user info or login prompt */
function ProfileSection() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
          <span className="text-3xl">👤</span>
        </div>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Not signed in</h3>
        <p className="text-sm text-gray-400 mb-4">Sign in to create posts and react</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Profile card */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 p-6 text-center mb-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-lg shadow-fuchsia-500/20">
          {user.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user.displayName || 'Anonymous'}</h2>
        <p className="text-sm text-gray-400">@{user.phone?.slice(-4) || 'user'}</p>

        {user.stats && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.totalPosts}</p>
              <p className="text-xs text-gray-400">Posts</p>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.totalReactions}</p>
              <p className="text-xs text-gray-400">Reactions</p>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{user.stats.confirmedPosts}</p>
              <p className="text-xs text-gray-400">Confirmed</p>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-2xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

// Wrap in QueryProvider
export default function Page() {
  return (
    <QueryProvider>
      <HyperLocalApp />
    </QueryProvider>
  );
}
