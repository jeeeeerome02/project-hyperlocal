// ============================================================================
// HyperLocal — Social Feed PostCard (2026 Design)
// ============================================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryConfig } from '@/types';
import { useCountdown } from '@/hooks/useCountdown';
import type { Post } from '@/types';
import { clsx } from 'clsx';
import { CheckCircle2, ThumbsUp, Clock, MapPin, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  compact?: boolean;
}

export default function PostCard({ post, onClick, compact = false }: PostCardProps) {
  const cat = getCategoryConfig(post.category);
  const { timeLeft, isUrgent } = useCountdown(post.expiresAt);

  const totalReactions =
    post.reactions.confirm +
    post.reactions.still_active +
    post.reactions.no_longer_valid +
    post.reactions.thanks;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 p-3.5 bg-white/80 dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all w-full text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${cat.color}15` }}
        >
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{post.content}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={10} /> {Math.round(post.distanceMeters)}m
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className={clsx('text-xs font-mono', isUrgent ? 'text-red-500' : 'text-gray-400')}>
              {timeLeft}
            </span>
          </div>
        </div>
        {totalReactions > 0 && (
          <span className="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold px-2 py-1 rounded-full">
            {totalReactions}
          </span>
        )}
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="block w-full text-left bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all group"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 p-4 pb-2">
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}88)` }}
          >
            {post.author.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <TrustBadge tier={post.author.trustTier} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {post.author.displayName || 'Anonymous'}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
            >
              {cat.icon} {cat.displayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
            <MapPin size={10} />
            <span>{Math.round(post.distanceMeters)}m away</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed line-clamp-4">
          {post.content}
        </p>
      </div>

      {/* Photo */}
      {post.photoUrl && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden">
          <img
            src={post.photoUrl}
            alt="Post photo"
            className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Countdown bar */}
      <div className="mx-4 mb-3">
        <div
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isUrgent
              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400',
          )}
        >
          <Clock size={12} />
          <span className="font-mono">{timeLeft}</span>
          <span className="text-gray-400 dark:text-gray-500">remaining</span>
        </div>
      </div>

      {/* Engagement bar */}
      <div className="flex items-center border-t border-gray-100 dark:border-white/5">
        <ReactionButton icon={CheckCircle2} label="Confirm" count={post.reactions.confirm} color="text-emerald-500" />
        <ReactionButton icon={ThumbsUp} label="Still here" count={post.reactions.still_active} color="text-blue-500" />
        <ReactionButton icon={MessageCircle} label="Comment" count={0} color="text-gray-400" />
        <ReactionButton icon={Share2} label="Share" count={0} color="text-gray-400" />
      </div>
    </motion.button>
  );
}

function ReactionButton({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: typeof CheckCircle2;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <button
      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon size={16} className={count > 0 ? color : 'text-gray-400'} />
      <span className={count > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
        {count > 0 ? count : label}
      </span>
    </button>
  );
}

function TrustBadge({ tier }: { tier: string }) {
  const badges: Record<string, { emoji: string; ring: string }> = {
    newcomer: { emoji: '🌱', ring: 'ring-gray-300' },
    neighbor: { emoji: '🏠', ring: 'ring-blue-300' },
    active_neighbor: { emoji: '⭐', ring: 'ring-yellow-400' },
    trusted_neighbor: { emoji: '🌟', ring: 'ring-amber-400' },
    community_pillar: { emoji: '🏆', ring: 'ring-violet-500' },
    neighborhood_guardian: { emoji: '🛡️', ring: 'ring-fuchsia-500' },
  };
  const b = badges[tier] || badges.newcomer;
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full text-[10px] ring-2 ring-white dark:ring-gray-900"
      title={tier}
    >
      {b.emoji}
    </span>
  );
}
