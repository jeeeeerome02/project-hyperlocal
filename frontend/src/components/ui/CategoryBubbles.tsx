// ============================================================================
// HyperLocal — Category Story Bubbles (horizontal scroll)
// ============================================================================
'use client';

import React from 'react';
import { CATEGORIES, type PostCategory } from '@/types';
import { useFilterStore } from '@/store';

export default function CategoryBubbles() {
  const { activeCategories, toggleCategory } = useFilterStore();

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {/* "All" bubble */}
        <button
          onClick={() => useFilterStore.getState().setCategories([])}
          className={`flex flex-col items-center gap-1.5 shrink-0 ${
            activeCategories.length === 0 ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${
              activeCategories.length === 0
                ? 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-500/20 ring-2 ring-fuchsia-300'
                : 'bg-gray-100 dark:bg-white/5'
            }`}
          >
            🌐
          </div>
          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">All</span>
        </button>

        {CATEGORIES.map((cat) => {
          const isActive = activeCategories.includes(cat.slug as PostCategory);
          return (
            <button
              key={cat.slug}
              onClick={() => toggleCategory(cat.slug as PostCategory)}
              className={`flex flex-col items-center gap-1.5 shrink-0 transition-opacity ${
                isActive || activeCategories.length === 0 ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${
                  isActive
                    ? 'shadow-lg ring-2'
                    : 'bg-gray-100 dark:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `${cat.color}20`,
                        boxShadow: `0 4px 12px ${cat.color}30`,
                        // @ts-expect-error CSS custom property
                        '--tw-ring-color': cat.color,
                      }
                    : undefined
                }
              >
                {cat.icon}
              </div>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-[56px]">
                {cat.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
