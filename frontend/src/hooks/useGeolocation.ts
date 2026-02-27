// ============================================================================
// Hyperlocal Radar — Geolocation Hook
// ============================================================================
'use client';

import { useEffect, useCallback } from 'react';
import { useMapStore } from '@/store';

export function useGeolocation() {
  const { userLocation, isLocating, setUserLocation, setLocating, setViewport } = useMapStore();

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setViewport({ latitude: loc.lat, longitude: loc.lng });
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [setUserLocation, setViewport, setLocating]);

  // Auto-locate on mount
  useEffect(() => {
    if (!userLocation) locate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { userLocation, isLocating, locate };
}
