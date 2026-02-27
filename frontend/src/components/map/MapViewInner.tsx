// ============================================================================
// Hyperlocal Radar — MapView Inner (actual Mapbox map rendering)
// Only loaded when a valid NEXT_PUBLIC_MAPBOX_TOKEN is present.
// ============================================================================
'use client';

import React, { useCallback, useRef, useMemo } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl';
import { useMapStore, usePostStore, useFilterStore, useUIStore } from '@/store';
import { useSocket } from '@/hooks/useSocket';
import { getCategoryConfig } from '@/types';
import type { Post, HeatmapPoint } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewInnerProps {
  heatmapData?: HeatmapPoint[];
}

export default function MapViewInner({ heatmapData }: MapViewInnerProps) {
  const mapRef = useRef<MapRef>(null);
  const { viewport, setViewport, userLocation } = useMapStore();
  const { posts, selectPost } = usePostStore();
  const { showHeatmap } = useFilterStore();
  const { openBottomSheet } = useUIStore();
  const { updateViewport } = useSocket();

  // Handle map movement
  const onMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewport({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
        bearing: evt.viewState.bearing,
        pitch: evt.viewState.pitch,
      });
    },
    [setViewport],
  );

  const onMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      updateViewport(
        evt.viewState.latitude,
        evt.viewState.longitude,
        evt.viewState.zoom,
      );
    },
    [updateViewport],
  );

  // Click on a post pin
  const handlePinClick = useCallback(
    (post: Post) => {
      selectPost(post);
      openBottomSheet('post-detail');
      setViewport({ latitude: post.location.lat, longitude: post.location.lng });
    },
    [selectPost, openBottomSheet, setViewport],
  );

  // Generate GeoJSON for heatmap layer
  const heatmapGeoJson = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return null;
    return {
      type: 'FeatureCollection' as const,
      features: heatmapData.map((pt) => ({
        type: 'Feature' as const,
        properties: { weight: pt.weight },
        geometry: {
          type: 'Point' as const,
          coordinates: [pt.lng, pt.lat],
        },
      })),
    };
  }, [heatmapData]);

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewport}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        maxZoom={20}
        minZoom={10}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <GeolocateControl position="bottom-right" trackUserLocation />

        {/* User location pulsing dot */}
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
            <div className="pulse-dot" />
          </Marker>
        )}

        {/* Post pins */}
        {posts.map((post) => {
          const cat = getCategoryConfig(post.category);
          return (
            <Marker
              key={post.id}
              latitude={post.location.lat}
              longitude={post.location.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handlePinClick(post);
              }}
            >
              <button
                className="pin-fade-in flex flex-col items-center group"
                aria-label={`${cat.displayName} post`}
              >
                <span
                  className="text-2xl drop-shadow-md group-hover:scale-125 transition-transform"
                  role="img"
                  aria-label={cat.displayName}
                >
                  {cat.icon}
                </span>
                <span
                  className="w-2 h-2 rounded-full -mt-0.5 shadow"
                  style={{ backgroundColor: cat.color }}
                />
              </button>
            </Marker>
          );
        })}

        {/* Heatmap layer */}
        {showHeatmap && heatmapGeoJson && (
          <Source id="heatmap-source" type="geojson" data={heatmapGeoJson}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 3],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 18, 40],
                'heatmap-opacity': 0.6,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0,0,255,0)',
                  0.2, 'rgb(0,255,128)',
                  0.4, 'rgb(128,255,0)',
                  0.6, 'rgb(255,255,0)',
                  0.8, 'rgb(255,128,0)',
                  1.0, 'rgb(255,0,0)',
                ],
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
