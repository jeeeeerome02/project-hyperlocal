// ============================================================================
// Hyperlocal Radar — Vendor Dashboard Page
// ============================================================================
'use client';

import React from 'react';
import { QueryProvider } from '@/lib/query-provider';
import VendorDashboard from '@/components/vendor/VendorDashboard';

export default function VendorPage() {
  return (
    <QueryProvider>
      <VendorDashboard />
    </QueryProvider>
  );
}
