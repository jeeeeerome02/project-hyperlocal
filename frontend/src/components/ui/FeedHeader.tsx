// ============================================================================
// HyperLocal — Feed Header with branding + search
// ============================================================================
'use client';

import React from 'react';
import Logo from '@/components/brand/Logo';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store';

interface FeedHeaderProps {
  onNotifications?: () => void;
  onSearch?: () => void;
}

export default function FeedHeader({ onNotifications, onSearch }: FeedHeaderProps) {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 pb-2 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-100/50 dark:border-white/5">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <Logo size="sm" />

        <div className="flex items-center gap-1">
          <button
            onClick={onSearch}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Search size={20} className="text-gray-500" />
          </button>
          <button
            onClick={onNotifications}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Bell size={20} className="text-gray-500" />
            {/* Notification dot */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-fuchsia-500 rounded-full" />
          </button>
          {isAuthenticated && user && (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold ml-1">
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
