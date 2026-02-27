// ============================================================================
// HyperLocal — Desktop Sidebar Navigation (2026 Enterprise)
// ============================================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Map,
  Bell,
  User,
  Settings,
  TrendingUp,
  Shield,
  Moon,
  Sun,
  LogOut,
  Plus,
  Compass,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useAuthStore } from '@/store';
import { useThemeStore } from '@/store/theme';

export type NavItem = 'feed' | 'map' | 'alerts' | 'profile' | 'settings';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
  onCreatePost: () => void;
}

const mainNavItems: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'map', icon: Map, label: 'Map' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const secondaryNavItems = [
  { icon: TrendingUp, label: 'Trending', badge: 'New' },
  { icon: Compass, label: 'Explore' },
  { icon: Shield, label: 'Safety Hub' },
];

export default function Sidebar({ activeNav, onNavChange, onCreatePost }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[280px] flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-100 dark:border-gray-800">
        <Logo size="md" />
      </div>

      {/* Create Post CTA */}
      <div className="px-4 pt-5 pb-2">
        <button
          onClick={onCreatePost}
          className="btn-primary w-full py-3 rounded-xl text-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          New Post
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-0.5">
          {mainNavItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavChange(item.id)}
                className={`sidebar-nav-item w-full relative ${isActive ? 'active' : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  size={20}
                  className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className={isActive ? 'text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                  {item.label}
                </span>
                {item.id === 'alerts' && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-2xs font-bold rounded-full flex items-center justify-center">
                    3
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary nav */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="px-4 text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Discover
          </p>
          <div className="space-y-0.5">
            {secondaryNavItems.map((item) => (
              <button
                key={item.label}
                className="sidebar-nav-item w-full opacity-60 hover:opacity-100"
              >
                <item.icon size={20} className="text-gray-400" strokeWidth={1.8} />
                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="sidebar-nav-item w-full"
        >
          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-gray-400" />}
          <span className="text-gray-600 dark:text-gray-400">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary-500/20">
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.displayName || 'Anonymous'}
              </p>
              <p className="text-xs text-gray-400 truncate">@{user.phone?.slice(-4) || 'user'}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <User size={18} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Guest</p>
              <p className="text-xs text-gray-400">Sign in to post</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
