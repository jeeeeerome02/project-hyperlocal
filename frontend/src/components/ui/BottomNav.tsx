// ============================================================================
// HyperLocal — Bottom Navigation Bar (Mobile Only, 2026 Enterprise)
// ============================================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Map, Plus, Bell, User } from 'lucide-react';

export type TabId = 'feed' | 'map' | 'create' | 'alerts' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; icon: typeof Home; label: string }[] = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'map', icon: Map, label: 'Map' },
  { id: 'create', icon: Plus, label: '' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom lg:hidden">
      <div className="mx-3 mb-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-elevated-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCreate = tab.id === 'create';

            if (isCreate) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange('create')}
                  className="relative -mt-5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-90 transition-transform">
                    <Plus size={26} className="text-white" strokeWidth={2.5} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center w-16 h-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-0.5 w-8 h-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon
                  size={22}
                  className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {tab.label && (
                  <span
                    className={`text-[10px] mt-0.5 font-medium ${
                      isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
