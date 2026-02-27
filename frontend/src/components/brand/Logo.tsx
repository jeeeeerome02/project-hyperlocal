// ============================================================================
// HyperLocal — Brand Logo Component
// ============================================================================
'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-2xl' },
  lg: { icon: 44, text: 'text-4xl' },
  xl: { icon: 56, text: 'text-5xl' },
};

export default function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon mark — a radar pulse */}
      <div
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-500/25"
        style={{ width: s.icon, height: s.icon }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-[60%] h-[60%]"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="2" fill="white" stroke="none" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      </div>

      {/* Wordmark */}
      {variant === 'full' && (
        <span className={`${s.text} font-extrabold tracking-tight`}>
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
            Hyper
          </span>
          <span className="text-gray-900 dark:text-white">Local</span>
        </span>
      )}
    </div>
  );
}
