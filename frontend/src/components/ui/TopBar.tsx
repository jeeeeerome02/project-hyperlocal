// ============================================================================
// Hyperlocal Radar — Top Bar (Search + Profile)
// ============================================================================
'use client';

import React, { useState } from 'react';
import { Search, User, Bell, Map, Layers } from 'lucide-react';
import { useUIStore, useFilterStore, useAuthStore } from '@/store';

export default function TopBar() {
  const { openBottomSheet } = useUIStore();
  const { showHeatmap, toggleHeatmap } = useFilterStore();
  const { user, isAuthenticated } = useAuthStore();
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="absolute top-16 left-4 right-4 z-20 flex gap-2">
      {/* Search bar */}
      <div className="flex-1 flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-md px-4 py-2.5">
        <Search size={18} className="text-gray-400 mr-2" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => openBottomSheet('search')}
          placeholder="Search nearby events..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      {/* Heatmap toggle */}
      <button
        onClick={toggleHeatmap}
        className={`p-2.5 rounded-2xl shadow-md transition-colors ${
          showHeatmap ? 'bg-primary text-white' : 'bg-white/95 text-gray-600'
        }`}
        title="Toggle heatmap"
      >
        <Layers size={20} />
      </button>

      {/* Notifications */}
      <button
        onClick={() => openBottomSheet('notifications')}
        className="p-2.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-md text-gray-600 hover:text-primary transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
      </button>

      {/* Profile */}
      <button
        onClick={() => openBottomSheet('profile')}
        className="p-2.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-md text-gray-600 hover:text-primary transition-colors"
        title="Profile"
      >
        {isAuthenticated && user?.displayName ? (
          <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
            {user.displayName[0].toUpperCase()}
          </span>
        ) : (
          <User size={20} />
        )}
      </button>
    </div>
  );
}
