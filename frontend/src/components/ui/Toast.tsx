// ============================================================================
// HyperLocal — Toast Notification System
// ============================================================================
'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { create } from 'zustand';

// ─── Toast Store ───
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
      ].slice(-5), // max 5 toasts
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
};

// ─── Toast Icons & Colors ───
const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-800 dark:text-emerald-300',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-300',
  },
};

// ─── Individual Toast Item ───
function ToastItem({ toast: t }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const config = toastConfig[t.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => removeToast(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-elevated ${config.bg} ${config.border} max-w-sm w-full`}
    >
      <Icon size={20} className={`${config.iconColor} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${config.titleColor}`}>{t.title}</p>
        {t.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(t.id)}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
      >
        <X size={14} className="text-gray-400" />
      </button>
    </motion.div>
  );
}

// ─── Toast Container ───
export default function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
