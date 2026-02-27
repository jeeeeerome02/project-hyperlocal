// ============================================================================
// Hyperlocal Radar — Create Post Flow
// ============================================================================
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Send, ArrowLeft } from 'lucide-react';
import { useUIStore, useMapStore } from '@/store';
import { useCreatePost, useGeolocation } from '@/hooks';
import { CATEGORIES, type PostCategory } from '@/types';
import { clsx } from 'clsx';

export default function CreatePostFlow() {
  const { bottomSheet, closeBottomSheet, createPostStep, createPostCategory, setCreatePostStep, setCreatePostCategory } = useUIStore();
  const { userLocation } = useMapStore();
  const { locate } = useGeolocation();
  const createMutation = useCreatePost();

  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const isOpen = bottomSheet === 'create-post';

  const handleCategorySelect = useCallback(
    (slug: PostCategory) => {
      setCreatePostCategory(slug);
      setCreatePostStep(1);
    },
    [setCreatePostCategory, setCreatePostStep],
  );

  const handleSubmit = useCallback(async () => {
    if (!createPostCategory || !content.trim() || !userLocation) return;

    await createMutation.mutateAsync({
      category: createPostCategory,
      content: content.trim(),
      lat: userLocation.lat,
      lng: userLocation.lng,
      photoUrl: photoUrl || undefined,
    });

    // Reset & close
    setContent('');
    setPhotoUrl('');
    closeBottomSheet();
  }, [createPostCategory, content, userLocation, photoUrl, createMutation, closeBottomSheet]);

  const handleBack = useCallback(() => {
    if (createPostStep === 1) {
      setCreatePostStep(0);
      setCreatePostCategory(null);
    }
  }, [createPostStep, setCreatePostStep, setCreatePostCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={closeBottomSheet}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {createPostStep === 1 && (
                    <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-full">
                      <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                  )}
                  <h2 className="text-lg font-bold text-gray-800">
                    {createPostStep === 0 ? 'What are you posting?' : 'Write your post'}
                  </h2>
                </div>
                <button onClick={closeBottomSheet} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Step 0: Category Picker */}
              <AnimatePresence mode="wait">
                {createPostStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => handleCategorySelect(cat.slug)}
                        className="flex items-center gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-gray-200 hover:shadow-md transition-all bg-gray-50 text-left"
                      >
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          {cat.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{cat.displayName}</p>
                          <p className="text-xs text-gray-500">{cat.defaultTtlHours}h TTL</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Step 1: Post Composer */}
                {createPostStep === 1 && createPostCategory && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Selected category badge */}
                    {(() => {
                      const cat = CATEGORIES.find((c) => c.slug === createPostCategory);
                      if (!cat) return null;
                      return (
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.icon} {cat.displayName}
                        </div>
                      );
                    })()}

                    {/* Content */}
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Describe what's happening here..."
                      autoFocus
                      maxLength={500}
                      className="w-full p-4 border border-gray-200 rounded-2xl text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 text-right mt-1 mb-4">
                      {content.length}/500
                    </p>

                    {/* Photo URL input */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
                      <Camera size={18} className="text-gray-400" />
                      <input
                        type="url"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="Photo URL (optional)"
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-xl">
                      <MapPin size={18} className="text-green-500" />
                      {userLocation ? (
                        <span className="text-sm text-gray-600">
                          📍 Location detected ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
                        </span>
                      ) : (
                        <button
                          onClick={locate}
                          className="text-sm text-primary font-medium hover:underline"
                        >
                          Enable location to post
                        </button>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={
                        !content.trim() ||
                        !userLocation ||
                        createMutation.isPending
                      }
                      className={clsx(
                        'w-full py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2',
                        'bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-all active:scale-[0.98]',
                      )}
                    >
                      {createMutation.isPending ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>
                          <Send size={18} />
                          Post to Neighborhood
                        </>
                      )}
                    </button>

                    {createMutation.isError && (
                      <p className="text-red-500 text-xs mt-2 text-center">
                        {createMutation.error?.message || 'Failed to create post'}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
