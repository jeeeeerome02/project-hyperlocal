// ============================================================================
// HyperLocal — Full Profile Page (2026 Enterprise)
// ============================================================================
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  Bell,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  Edit3,
  Camera,
  ChevronRight,
  LogOut,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { useThemeStore } from '@/store/theme';
import { formatDistanceToNow } from 'date-fns';

type ProfileTab = 'overview' | 'settings' | 'security';

interface ProfilePageProps {
  onSignIn?: () => void;
}

export default function ProfilePage({ onSignIn }: ProfilePageProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  // Guest state
  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-6">
          <User size={40} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">You&apos;re not signed in</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
          Sign in to create posts, react to events, and build your neighborhood reputation.
        </p>
        <button onClick={onSignIn} className="btn-primary px-8 py-3">
          Sign In
        </button>
      </div>
    );
  }

  const trustTierLabel: Record<string, { label: string; color: string; emoji: string }> = {
    newcomer: { label: 'Newcomer', color: 'text-gray-500', emoji: '🌱' },
    neighbor: { label: 'Neighbor', color: 'text-blue-500', emoji: '🏠' },
    active_neighbor: { label: 'Active Neighbor', color: 'text-yellow-500', emoji: '⭐' },
    trusted_neighbor: { label: 'Trusted Neighbor', color: 'text-amber-500', emoji: '🌟' },
    community_pillar: { label: 'Community Pillar', color: 'text-violet-500', emoji: '🏆' },
    neighborhood_guardian: { label: 'Guardian', color: 'text-fuchsia-500', emoji: '🛡️' },
  };

  const trust = trustTierLabel[user.trustTier] || trustTierLabel.newcomer;

  const tabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* ─── Cover + Avatar ─── */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-32 lg:h-40 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 rounded-b-3xl lg:rounded-3xl lg:mx-0 lg:mt-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-40" />
        </div>

        {/* Avatar */}
        <div className="relative -mt-14 ml-6 lg:ml-8">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-[3px] shadow-xl shadow-primary-500/20">
            <div className="w-full h-full rounded-[13px] bg-white dark:bg-gray-900 flex items-center justify-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName || ''} className="w-full h-full rounded-[13px] object-cover" />
              ) : (
                <span className="text-4xl font-bold gradient-text">
                  {user.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          </div>
          <button className="absolute bottom-1 right-1 w-8 h-8 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Camera size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* ─── User Info ─── */}
      <div className="px-6 lg:px-8 mt-4">
        <div className="flex items-center justify-between">
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input py-1.5 px-3 text-lg font-bold w-48"
                  autoFocus
                />
                <button onClick={() => setIsEditingName(false)} className="btn-secondary py-1.5 px-3 text-xs">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                  {user.displayName || 'Anonymous'}
                </h1>
                <button onClick={() => setIsEditingName(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <Edit3 size={14} className="text-gray-400" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm text-gray-400">@{user.phone?.slice(-4) || 'user'}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10">
                <span>{trust.emoji}</span>
                <span className={trust.color}>{trust.label}</span>
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="hidden lg:flex btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'recently'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            Local
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            Trust Score: {user.trustScore}
          </span>
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-3 gap-3 px-6 lg:px-8 mt-6">
        {[
          { label: 'Posts', value: user.stats?.totalPosts || 0, color: 'from-violet-500 to-fuchsia-500' },
          { label: 'Reactions', value: user.stats?.totalReactions || 0, color: 'from-fuchsia-500 to-orange-400' },
          { label: 'Confirmed', value: user.stats?.confirmedPosts || 0, color: 'from-orange-400 to-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold font-display bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1 px-6 lg:px-8 mt-6 border-b border-gray-100 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Trust Score Card */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Award size={20} className="text-primary-500" />
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white">Trust Score</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(user.trustScore, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {user.trustScore < 20 && "Keep posting to build your neighborhood reputation!"}
                      {user.trustScore >= 20 && user.trustScore < 50 && "You're becoming a trusted neighbor!"}
                      {user.trustScore >= 50 && user.trustScore < 80 && "Great reputation — neighbors trust your reports!"}
                      {user.trustScore >= 80 && "You're a pillar of your community!"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold gradient-text font-display">{user.trustScore}</p>
                    <p className="text-2xs text-gray-400 uppercase tracking-wider">Score</p>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Activity</h3>
                <div className="space-y-3">
                  <ActivityItem label="Posts Created" value={String(user.stats?.totalPosts || 0)} icon="📝" />
                  <ActivityItem label="Reactions Given" value={String(user.stats?.totalReactions || 0)} icon="👍" />
                  <ActivityItem label="Posts Confirmed" value={String(user.stats?.confirmedPosts || 0)} icon="✅" />
                  <ActivityItem label="Account Age" value={`${user.stats?.accountAgeDays || 0} days`} icon="📅" />
                </div>
              </div>

              {/* Vendor Profile (if applicable) */}
              {user.vendorProfile && (
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-3">Vendor Profile</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-xl">
                      🏪
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user.vendorProfile.businessName}</p>
                      <p className="text-xs text-gray-400">{user.vendorProfile.businessCategory} · {user.vendorProfile.followerCount} followers</p>
                    </div>
                    {user.vendorProfile.isVerified && (
                      <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile sign out */}
              <button
                onClick={logout}
                className="lg:hidden w-full py-3 rounded-xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                Sign Out
              </button>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Appearance */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
                <SettingsRow
                  icon={isDark ? Moon : Sun}
                  label="Dark Mode"
                  description={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                  action={
                    <button
                      onClick={toggleTheme}
                      className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-primary-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-5' : ''}`} />
                    </button>
                  }
                />
              </div>

              {/* Notifications */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
                <div className="space-y-1">
                  <SettingsRow
                    icon={Bell}
                    label="Push Notifications"
                    description={user.notificationPrefs?.enabled ? 'Enabled' : 'Disabled'}
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                  <SettingsRow
                    icon={Volume2}
                    label="Quiet Hours"
                    description={`${user.notificationPrefs?.quietHoursStart || '22:00'} — ${user.notificationPrefs?.quietHoursEnd || '07:00'}`}
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                  <SettingsRow
                    icon={MapPin}
                    label="Alert Radius"
                    description={`${user.notificationPrefs?.radiusKm || 1} km`}
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                </div>
              </div>

              {/* Account */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Account</h3>
                <div className="space-y-1">
                  <SettingsRow
                    icon={Smartphone}
                    label="Phone Number"
                    description={user.phone ? `****${user.phone.slice(-4)}` : 'Not set'}
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                  <SettingsRow
                    icon={Globe}
                    label="Language"
                    description="English"
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card p-5 border-red-100 dark:border-red-500/20">
                <h3 className="font-display font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                <SettingsRow
                  icon={Trash2}
                  label="Delete Account"
                  description="Permanently remove your data"
                  danger
                  action={<ChevronRight size={16} className="text-red-400" />}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Security Status */}
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={20} className="text-emerald-500" />
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white">Security Status</h3>
                  <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Secure</span>
                </div>
                <div className="space-y-3">
                  <SecurityItem label="Phone Verified" verified />
                  <SecurityItem label="Active Sessions" detail="1 device" />
                  <SecurityItem label="Last Login" detail="Just now" />
                  <SecurityItem label="Two-Factor Auth" verified={false} />
                </div>
              </div>

              {/* Sessions */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Smartphone size={18} className="text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Current Device</p>
                    <p className="text-xs text-gray-400">Active now</p>
                  </div>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                </div>
              </div>

              {/* Privacy */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Privacy</h3>
                <div className="space-y-1">
                  <SettingsRow
                    icon={Eye}
                    label="Profile Visibility"
                    description="Visible to neighbors"
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                  <SettingsRow
                    icon={MapPin}
                    label="Location Fuzzing"
                    description="Enabled (approximate location shown)"
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                  <SettingsRow
                    icon={Lock}
                    label="Data Export"
                    description="Download your data"
                    action={<ChevronRight size={16} className="text-gray-400" />}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Helper Components ───

function ActivityItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  description,
  action,
  danger,
}: {
  icon: typeof User;
  label: string;
  description: string;
  action?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button className="flex items-center gap-3 w-full p-3 -mx-1 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
      <Icon size={18} className={danger ? 'text-red-500' : 'text-gray-400'} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      {action}
    </button>
  );
}

function SecurityItem({ label, verified, detail }: { label: string; verified?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {verified !== undefined ? (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          verified
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
        }`}>
          {verified ? '✓ Verified' : 'Not set'}
        </span>
      ) : (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{detail}</span>
      )}
    </div>
  );
}
