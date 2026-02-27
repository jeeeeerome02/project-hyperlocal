// ============================================================================
// Hyperlocal Radar — Category Filter Bar
// ============================================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useFilterStore } from '@/store';
import { CATEGORIES, type PostCategory } from '@/types';
import { clsx } from 'clsx';

export default function CategoryFilter() {
  const { activeCategories, toggleCategory } = useFilterStore();

  return (
    <div className="absolute top-4 left-0 right-0 z-10 px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategories.includes(cat.slug);
          return (
            <motion.button
              key={cat.slug}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleCategory(cat.slug as PostCategory)}
              className={clsx(
                'category-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'text-white shadow-md'
                  : 'bg-white/90 text-gray-700 shadow-sm hover:shadow-md',
              )}
              style={
                isActive
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              <span>{cat.icon}</span>
              <span>{cat.displayName}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
