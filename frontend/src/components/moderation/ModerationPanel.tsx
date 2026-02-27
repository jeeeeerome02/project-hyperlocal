// ============================================================================
// Hyperlocal Radar — Moderation Panel (Desktop View)
// ============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronUp,
  Ban,
  MessageSquareWarning,
  Eye,
} from 'lucide-react';
import { moderationApi, type ApiError } from '@/lib/api';
import { getCategoryConfig } from '@/types';
import { clsx } from 'clsx';

interface QueueItem {
  id: string;
  post_id: string;
  status: string;
  reason: string;
  content: string;
  category: string;
  author_display_name: string;
  author_trust_score: number;
  report_count: number;
  created_at: string;
}

export default function ModerationPanel() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [filter, setFilter] = useState<'pending' | 'escalated'>('pending');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moderationApi.getQueue({ status: filter });
      setQueue(res.data as QueueItem[]);
    } catch (err) {
      console.error('Failed to fetch moderation queue:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleAction = useCallback(
    async (itemId: string, action: string) => {
      try {
        await moderationApi.takeAction(itemId, action, actionReason || undefined);
        setQueue((prev) => prev.filter((q) => q.id !== itemId));
        setSelectedItem(null);
        setActionReason('');
      } catch (err) {
        console.error('Moderation action failed:', err);
      }
    },
    [actionReason],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!selectedItem) return;
      switch (e.key) {
        case 'a':
          handleAction(selectedItem.id, 'approve');
          break;
        case 'r':
          handleAction(selectedItem.id, 'reject');
          break;
        case 'e':
          handleAction(selectedItem.id, 'escalate');
          break;
        case 'x':
          handleAction(selectedItem.id, 'remove');
          break;
        case 'Escape':
          setSelectedItem(null);
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, handleAction]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-primary" />
            <h1 className="text-xl font-bold text-gray-800">Moderation Panel</h1>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
              {queue.length} items
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={clsx(
                'px-4 py-2 text-sm rounded-lg font-medium',
                filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600',
              )}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('escalated')}
              className={clsx(
                'px-4 py-2 text-sm rounded-lg font-medium',
                filter === 'escalated' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600',
              )}
            >
              Escalated
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue list */}
        <div className="lg:col-span-2 space-y-3">
          {loading && (
            <div className="text-center py-12 text-gray-400">Loading queue...</div>
          )}

          {!loading && queue.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Queue is clear!</p>
            </div>
          )}

          {queue.map((item) => {
            const cat = getCategoryConfig(item.category as any);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={clsx(
                  'w-full text-left p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-2',
                  selectedItem?.id === item.id ? 'border-primary' : 'border-transparent',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.displayName}
                        </span>
                        {item.report_count > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {item.report_count} reports
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{item.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        By {item.author_display_name || 'Anonymous'} · Trust: {item.author_trust_score}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail / Action panel */}
        <div className="lg:col-span-1">
          {selectedItem ? (
            <div className="bg-white rounded-xl shadow-md p-5 sticky top-6">
              <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>

              <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">Reason: {selectedItem.reason}</p>
                <p className="text-gray-500 text-xs line-clamp-4">{selectedItem.content}</p>
              </div>

              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Moderation note (optional)"
                className="w-full p-3 border rounded-lg text-sm mb-4 resize-none h-20"
              />

              <div className="grid grid-cols-2 gap-2 mb-4">
                <ActionBtn
                  icon={<CheckCircle size={16} />}
                  label="Approve"
                  shortcut="A"
                  onClick={() => handleAction(selectedItem.id, 'approve')}
                  color="bg-green-500 hover:bg-green-600"
                />
                <ActionBtn
                  icon={<XCircle size={16} />}
                  label="Reject"
                  shortcut="R"
                  onClick={() => handleAction(selectedItem.id, 'reject')}
                  color="bg-red-500 hover:bg-red-600"
                />
                <ActionBtn
                  icon={<ChevronUp size={16} />}
                  label="Escalate"
                  shortcut="E"
                  onClick={() => handleAction(selectedItem.id, 'escalate')}
                  color="bg-amber-500 hover:bg-amber-600"
                />
                <ActionBtn
                  icon={<AlertTriangle size={16} />}
                  label="Remove"
                  shortcut="X"
                  onClick={() => handleAction(selectedItem.id, 'remove')}
                  color="bg-gray-700 hover:bg-gray-800"
                />
              </div>

              <div className="border-t pt-3 space-y-2">
                <button
                  onClick={() => handleAction(selectedItem.id, 'warn')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg"
                >
                  <MessageSquareWarning size={16} /> Warn User
                </button>
                <button
                  onClick={() => handleAction(selectedItem.id, 'mute')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  <Ban size={16} /> Mute (24h)
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-4 text-center">
                Keyboard: [A]pprove [R]eject [E]scalate [X] Remove [Esc] Deselect
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-5 text-center">
              <Eye size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Select an item to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  shortcut,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors`}
    >
      {icon}
      {label}
      <kbd className="ml-1 text-white/60 text-[10px] bg-white/20 px-1 rounded">{shortcut}</kbd>
    </button>
  );
}
