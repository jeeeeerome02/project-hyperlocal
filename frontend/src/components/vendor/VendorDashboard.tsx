// ============================================================================
// Hyperlocal Radar — Vendor Dashboard
// ============================================================================
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Store,
  MapPin,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { vendorApi } from '@/lib/api';
import { getCategoryConfig } from '@/types';
import type { Post, VendorProfile } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  profile: VendorProfile;
  weeklyStats: {
    totalPosts: number;
    totalReactions: number;
    totalConfirms: number;
    avgResponseTime: number;
  };
  recentPosts: Post[];
}

export default function VendorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorApi.getDashboard();
      setData(res.data as DashboardData);
    } catch (err) {
      console.error('Failed to load vendor dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Live location sharing
  const toggleLocationSharing = useCallback(() => {
    if (isSharing) {
      setIsSharing(false);
      return;
    }

    if (!navigator.geolocation) return;

    setIsSharing(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        vendorApi.updateLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error('Location error:', err);
        setIsSharing(false);
      },
      { enableHighAccuracy: true },
    );

    // Clean up on unmount
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSharing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Unable to load dashboard</p>
      </div>
    );
  }

  const { profile, weeklyStats, recentPosts } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">{profile.businessName}</h1>
              <p className="text-sm text-gray-500">
                {profile.businessCategory}
                {profile.isVerified && <span className="ml-2 text-green-600">✅ Verified</span>}
              </p>
            </div>
          </div>

          <button
            onClick={toggleLocationSharing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isSharing
                ? 'bg-green-100 text-green-700 animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MapPin size={16} />
            {isSharing ? 'Sharing Live' : 'Share Location'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<BarChart3 size={20} />}
            label="Posts This Week"
            value={weeklyStats.totalPosts}
            color="text-blue-600 bg-blue-50"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Reactions"
            value={weeklyStats.totalReactions}
            color="text-green-600 bg-green-50"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Followers"
            value={profile.followerCount}
            color="text-purple-600 bg-purple-50"
          />
          <StatCard
            icon={<Clock size={20} />}
            label="Confirms"
            value={weeklyStats.totalConfirms}
            color="text-amber-600 bg-amber-50"
          />
        </div>

        {/* Recent Posts */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Posts</h2>
        <div className="space-y-3">
          {recentPosts.length === 0 && (
            <div className="text-center py-8 bg-white rounded-xl">
              <p className="text-gray-400">No posts this week</p>
            </div>
          )}
          {recentPosts.map((post) => {
            const cat = getCategoryConfig(post.category);
            return (
              <div
                key={post.id}
                className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </span>
                    <span>✅ {post.reactions.confirm}</span>
                    <span>👍 {post.reactions.still_active}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
