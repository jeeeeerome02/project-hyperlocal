// ============================================================================
// HyperLocal — Feed Header (Responsive, 2026 Enterprise)
// ============================================================================
'use client';

import React from 'react';
import Logo from '@/components/brand/Logo';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store';
import ThemeToggle from './ThemeToggle';

interface FeedHeaderProps {
  onNotifications?: () => void;
  onSearch?: () => void;
  title?: string;
}

export default function FeedHeader({ onNotifications, onSearch, title }: FeedHeaderProps) {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 max-w-feed mx-auto lg:max-w-none">
        {/* Left: Logo or Title */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          {title && (
            <h1 className="hidden lg:block font-display text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
          )}
          {!title && (
            <h1 className="hidden lg:block font-display text-lg font-bold text-gray-900 dark:text-white">Feed</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={onSearch}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Search size={20} className="text-gray-500 dark:text-gray-400" />
          </button>

          {/* Theme toggle (desktop only) */}
          <div className="hidden lg:block">
            <ThemeToggle size="sm" />
          </div>

          {/* Notifications */}
          <button
            onClick={onNotifications}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Bell size={20} className="text-gray-500 dark:text-gray-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          </button>

          {/* User avatar (mobile only — desktop has sidebar) */}
          {isAuthenticated && user && (
            <div className="lg:hidden w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold ml-1 shadow-sm shadow-primary-500/20">
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
