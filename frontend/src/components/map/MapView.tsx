// ============================================================================
// Hyperlocal Radar — MapView Component (wrapper)
// ============================================================================
// This file intentionally does NOT import react-map-gl or mapbox-gl.
// Those heavy modules are isolated in MapViewInner.tsx and only loaded when a
// valid Mapbox token is present.  This prevents mapbox-gl v3's module-level
// initialisation from crashing with "Cannot read properties of undefined
// (reading '0')" when no token is configured.
// ============================================================================
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useMapStore, usePostStore, useUIStore } from '@/store';
import { getCategoryConfig } from '@/types';
import type { HeatmapPoint } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Lazily load the real map only when we actually need it (token present).
// ssr:false because mapbox-gl requires the browser DOM / WebGL.
const MapViewInner = dynamic(() => import('./MapViewInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">Loading map…</div>
    </div>
  ),
});

interface MapViewProps {
  heatmapData?: HeatmapPoint[];
}

/**
 * Fallback view rendered when no Mapbox token is configured.
 * Shows posts in a grid/list layout so the app is still usable.
 */
function NoTokenFallback() {
  const { posts, selectPost } = usePostStore();
  const { openBottomSheet } = useUIStore();
  const { userLocation } = useMapStore();

  return (
    <div className="map-container bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center overflow-auto">
      {/* Banner */}
      <div className="mt-16 mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm max-w-lg w-full">
        <p className="text-amber-800 text-sm font-medium">🗺️ Mapbox token not configured</p>
        <p className="text-amber-700 text-xs mt-1">
          Add your token to <code className="bg-amber-100 px-1 rounded">frontend/.env.local</code> as{' '}
          <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> and restart the dev server.
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-900 underline text-xs mt-2 inline-block"
        >
          Get a free Mapbox token →
        </a>
      </div>

      {/* Location info */}
      {userLocation && (
        <p className="text-xs text-slate-500 mb-3">
          📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </p>
      )}

      {/* Post grid */}
      <div className="px-4 pb-32 w-full max-w-lg space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No posts nearby yet — create the first one!
          </div>
        ) : (
          posts.map((post) => {
            const cat = getCategoryConfig(post.category);
            return (
              <button
                key={post.id}
                onClick={() => { selectPost(post); openBottomSheet('post-detail'); }}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1"
                      style={{ backgroundColor: cat.color + '22', color: cat.color }}
                    >
                      {cat.displayName}
                    </span>
                    <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ✅ {post.reactions?.confirm ?? 0} · 👍 {post.reactions?.still_active ?? 0} · 🙏 {post.reactions?.thanks ?? 0}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function MapView({ heatmapData }: MapViewProps) {
  // If no Mapbox token, show the fallback list UI.
  // Crucially this prevents MapViewInner (and therefore mapbox-gl) from ever
  // being loaded, avoiding the module-level initialisation crash.
  if (!MAPBOX_TOKEN) {
    return <NoTokenFallback />;
  }

  return <MapViewInner heatmapData={heatmapData} />;
}
