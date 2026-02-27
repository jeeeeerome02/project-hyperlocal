// ============================================================================
// Hyperlocal Radar — Post Detail Bottom Sheet
// ============================================================================
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  Flag,
  Clock,
  MapPin,
  ThumbsUp,
  CheckCircle2,
  XCircle,
  Heart,
  Share2,
  Trash2,
} from 'lucide-react';
import { usePostStore, useUIStore, useAuthStore } from '@/store';
import { useReactToPost, useExtendTtl, useReportPost } from '@/hooks';
import { useCountdown } from '@/hooks/useCountdown';
import { getCategoryConfig } from '@/types';
import type { ReactionType } from '@/types';
import { clsx } from 'clsx';

export default function PostDetailSheet() {
  const { selectedPost } = usePostStore();
  const { bottomSheet, closeBottomSheet } = useUIStore();
  const { user } = useAuthStore();
  const reactMutation = useReactToPost();
  const extendMutation = useExtendTtl();
  const reportMutation = useReportPost();
  const [showReport, setShowReport] = useState(false);

  const isOpen = bottomSheet === 'post-detail' && !!selectedPost;

  if (!selectedPost) return null;

  const cat = getCategoryConfig(selectedPost.category);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={closeBottomSheet}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.icon}
                  </span>
                  <div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.displayName}
                    </span>
                    <CountdownBadge expiresAt={selectedPost.expiresAt} />
                  </div>
                </div>
                <button onClick={closeBottomSheet} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <p className="text-gray-800 text-base leading-relaxed mb-4">
                {selectedPost.content}
              </p>

              {/* Photo */}
              {selectedPost.photoUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden">
                  <img
                    src={selectedPost.photoUrl}
                    alt="Post photo"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {Math.round(selectedPost.distanceMeters)}m away
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm">
                  {selectedPost.author.displayName?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedPost.author.displayName || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedPost.author.trustTier.replace(/_/g, ' ')}
                    {selectedPost.author.isVerifiedVendor && ' · ✅ Verified Vendor'}
                    {selectedPost.author.isVendor && !selectedPost.author.isVerifiedVendor && ' · 🏪 Vendor'}
                  </p>
                </div>
              </div>

              {/* Reaction Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <ReactionButton
                  icon={<CheckCircle2 size={18} />}
                  label="Confirm"
                  count={selectedPost.reactions.confirm}
                  active={selectedPost.userReaction === 'confirm'}
                  onClick={() => reactMutation.mutate({ postId: selectedPost.id, reaction: 'confirm' })}
                  color="text-green-600"
                />
                <ReactionButton
                  icon={<ThumbsUp size={18} />}
                  label="Active"
                  count={selectedPost.reactions.still_active}
                  active={selectedPost.userReaction === 'still_active'}
                  onClick={() => reactMutation.mutate({ postId: selectedPost.id, reaction: 'still_active' })}
                  color="text-blue-600"
                />
                <ReactionButton
                  icon={<XCircle size={18} />}
                  label="Gone"
                  count={selectedPost.reactions.no_longer_valid}
                  active={selectedPost.userReaction === 'no_longer_valid'}
                  onClick={() => reactMutation.mutate({ postId: selectedPost.id, reaction: 'no_longer_valid' })}
                  color="text-red-500"
                />
                <ReactionButton
                  icon={<Heart size={18} />}
                  label="Thanks"
                  count={selectedPost.reactions.thanks}
                  active={selectedPost.userReaction === 'thanks'}
                  onClick={() => reactMutation.mutate({ postId: selectedPost.id, reaction: 'thanks' })}
                  color="text-pink-500"
                />
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {/* Extend TTL */}
                {selectedPost.canExtend && user?.id === selectedPost.author.id && (
                  <button
                    onClick={() => extendMutation.mutate(selectedPost.id)}
                    disabled={extendMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg"
                  >
                    <Clock size={16} /> Extend
                  </button>
                )}

                {/* Share */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${cat.icon} ${cat.displayName}`,
                        text: selectedPost.content.slice(0, 100),
                        url: window.location.href,
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  <Share2 size={16} /> Share
                </button>

                {/* Report */}
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                >
                  <Flag size={16} /> Report
                </button>

                {/* Delete (own post) */}
                {user?.id === selectedPost.author.id && (
                  <button
                    onClick={() => {
                      // Could use a mutation here
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Report modal */}
              {showReport && (
                <ReportForm
                  onSubmit={(reason, details) => {
                    reportMutation.mutate({ postId: selectedPost.id, reason, details });
                    setShowReport(false);
                  }}
                  onCancel={() => setShowReport(false)}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const { timeLeft, isUrgent } = useCountdown(expiresAt);
  return (
    <p
      className={clsx(
        'text-xs font-mono mt-0.5',
        isUrgent ? 'text-red-600 font-bold' : 'text-gray-500',
      )}
    >
      ⏱ {timeLeft}
    </p>
  );
}

function ReactionButton({
  icon,
  label,
  count,
  active,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all',
        active ? `${color} bg-gray-100 shadow-inner` : 'text-gray-500 hover:bg-gray-50',
      )}
    >
      {icon}
      <span>{count}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function ReportForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string, details?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reasons = ['spam', 'inaccurate', 'inappropriate', 'harassment', 'duplicate', 'other'];

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h4 className="font-semibold text-sm text-gray-800 mb-3">Report this post</h4>
      <div className="flex flex-wrap gap-2 mb-3">
        {reasons.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium capitalize',
              reason === r ? 'bg-red-100 text-red-700' : 'bg-white text-gray-600 border',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Additional details (optional)"
        className="w-full p-2 border rounded-lg text-sm mb-3 resize-none h-20"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
          Cancel
        </button>
        <button
          onClick={() => reason && onSubmit(reason, details || undefined)}
          disabled={!reason}
          className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
        >
          Submit Report
        </button>
      </div>
    </div>
  );
}
