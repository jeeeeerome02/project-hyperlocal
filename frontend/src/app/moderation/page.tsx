// ============================================================================
// Hyperlocal Radar — Moderation Page
// ============================================================================
'use client';

import React from 'react';
import { QueryProvider } from '@/lib/query-provider';
import ModerationPanel from '@/components/moderation/ModerationPanel';

export default function ModerationPage() {
  return (
    <QueryProvider>
      <ModerationPanel />
    </QueryProvider>
  );
}
