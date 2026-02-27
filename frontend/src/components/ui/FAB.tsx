// ============================================================================
// Hyperlocal Radar — FAB (Floating Action Button)
// ============================================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useUIStore } from '@/store';

export default function FAB() {
  const { openBottomSheet, bottomSheet } = useUIStore();

  if (bottomSheet !== 'none') return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => openBottomSheet('create-post')}
      className="fab fixed bottom-6 right-6 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
      aria-label="Create new post"
    >
      <Plus size={28} strokeWidth={2.5} />
    </motion.button>
  );
}
