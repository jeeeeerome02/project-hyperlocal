// ============================================================================
// HyperLocal — Main App Page (2026 Enterprise — Fully Responsive)
// ============================================================================
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryProvider } from '@/lib/query-provider';
import { useGeolocation, useNearbyPosts, useCurrentUser, useHeatmapData } from '@/hooks';
import { useSocket } from '@/hooks/useSocket';
import { useMapStore, useFilterStore, usePostStore, useUIStore, useAuthStore } from '@/store';
import { useThemeStore } from '@/store/theme';
import { getAccessToken } from '@/lib/api';
import PostDetailSheet from '@/components/posts/PostDetailSheet';
import CreatePostFlow from '@/components/posts/CreatePostFlow';
import PostCard from '@/components/posts/PostCard';
import LoginPage from '@/components/auth/LoginPage';
import BottomNav, { type TabId } from '@/components/ui/BottomNav';
import Sidebar, { type NavItem } from '@/components/ui/Sidebar';
import FeedHeader from '@/components/ui/FeedHeader';
import CategoryBubbles from '@/components/ui/CategoryBubbles';
import ProfilePage from '@/components/profile/ProfilePage';
import ToastContainer from '@/components/ui/Toast';
import { RefreshCw, MapPin, Loader2, TrendingUp, Clock, Flame } from 'lucide-react';

// Dynamic import for MapView (avoid SSR issues with mapbox-gl)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
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

  // Sync theme on mount
  useEffect(() => {
    const isDark = useThemeStore.getState().isDark;
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

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

  // Map TabId to NavItem for sidebar
  const handleNavChange = useCallback(
    (nav: NavItem) => {
      if (nav === 'settings') {
        setActiveTab('profile');
        return;
      }
      setActiveTab(nav as TabId);
    },
    [],
  );

  const handleCreatePost = useCallback(() => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    openBottomSheet('create-post');
  }, [isAuthenticated, openBottomSheet]);

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

  // Map active tab to NavItem for sidebar
  const sidebarNav: NavItem = (activeTab === 'create' || activeTab === 'alerts' || activeTab === 'feed' || activeTab === 'map' || activeTab === 'profile')
    ? (activeTab === 'create' ? 'feed' : activeTab as NavItem)
    : 'feed';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 mesh-gradient">
      {/* ─── Desktop Sidebar ─── */}
      <Sidebar
        activeNav={sidebarNav}
        onNavChange={handleNavChange}
        onCreatePost={handleCreatePost}
      />

      {/* ─── Main Content Area ─── */}
      <main className="lg:ml-[280px] min-h-screen">
        <AnimatePresence mode="wait">
          {/* ─── FEED TAB ─── */}
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-24 lg:pb-8"
            >
              <FeedHeader title="Feed" />

              <div className="lg:flex lg:gap-6 lg:px-6 lg:pt-6 lg:max-w-content">
                {/* Main Feed Column */}
                <div className="flex-1 lg:max-w-feed">
                  <CategoryBubbles />

                  {/* Refresh button */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => refetch()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl card text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      <RefreshCw size={13} className={postsLoading ? 'animate-spin' : ''} />
                      {postsLoading ? 'Refreshing...' : 'Refresh feed'}
                    </button>
                  </div>

                  {/* Nearby indicator */}
                  <div className="px-4 mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <MapPin size={12} className="text-primary-400" />
                      <span>Showing posts within {useFilterStore.getState().radiusKm}km of you</span>
                    </div>
                  </div>

                  {/* Post feed */}
                  <div className="px-4 space-y-3">
                    {posts.length === 0 && !postsLoading && (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent/10 flex items-center justify-center">
                          <MapPin size={28} className="text-primary-400" />
                        </div>
                        <h3 className="font-display font-semibold text-gray-700 dark:text-gray-200 mb-1">No posts nearby</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to share what&apos;s happening!</p>
                      </div>
                    )}

                    {postsLoading && posts.length === 0 && (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
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
                </div>

                {/* ─── Desktop Right Sidebar ─── */}
                <div className="hidden lg:block w-80 shrink-0 space-y-4 sticky top-16 self-start">
                  {/* Trending Card */}
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame size={18} className="text-orange-500" />
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm">Trending Nearby</h3>
                    </div>
                    <div className="space-y-3">
                      {posts.slice(0, 3).map((post, i) => (
                        <button
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className="flex items-start gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-white/5 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-300 dark:text-gray-600 mt-0.5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{post.content}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{Math.round(post.distanceMeters)}m away</p>
                          </div>
                        </button>
                      ))}
                      {posts.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No trending posts yet</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={18} className="text-primary-500" />
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm">Community Stats</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl text-center">
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400 font-display">{posts.length}</p>
                        <p className="text-2xs text-primary-500/70 font-medium">Active Posts</p>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-center">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400 font-display">
                          {posts.reduce((sum, p) => sum + (p.reactions?.confirm || 0), 0)}
                        </p>
                        <p className="text-2xs text-orange-500/70 font-medium">Confirmations</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={18} className="text-gray-400" />
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm">Just Now</h3>
                    </div>
                    <div className="space-y-2">
                      {posts.slice(0, 4).map((post) => (
                        <div key={post.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                          <span className="truncate">{post.author?.displayName || 'Someone'} posted in {post.category?.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
              className="fixed inset-0 lg:left-[280px]"
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
              className="pb-24 lg:pb-8"
            >
              <FeedHeader title="Alerts" />
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-400/10 flex items-center justify-center">
                  <span className="text-3xl">🔔</span>
                </div>
                <h3 className="font-display font-semibold text-gray-700 dark:text-gray-200 mb-1">No alerts yet</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">Community alerts will appear here</p>
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
              className="pb-24 lg:pb-8"
            >
              <FeedHeader title="Profile" />
              <ProfilePage onSignIn={() => setShowLogin(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ─── Overlays ─── */}
      <PostDetailSheet />
      <CreatePostFlow />
      <ToastContainer />
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
