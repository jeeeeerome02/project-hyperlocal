// ============================================================================
// Hyperlocal Radar — WebSocket Hook
// ============================================================================
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePostStore, useMapStore, useUIStore } from '@/store';
import { getAccessToken } from '@/lib/api';
import type { Post } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addPost, removePost, updatePost } = usePostStore();
  const { viewport } = useMapStore();
  const { setSocketConnected } = useUIStore();

  useEffect(() => {
    const token = getAccessToken();
    const socket = io(WS_URL, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      // Send initial viewport
      socket.emit('viewport:update', {
        lat: viewport.latitude,
        lng: viewport.longitude,
        zoom: viewport.zoom,
      });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time events
    socket.on('post:new', (post: Post) => {
      addPost(post);
    });

    socket.on('post:expired', ({ postId }: { postId: string }) => {
      removePost(postId);
    });

    socket.on('post:updated', ({ postId, reactions }: { postId: string; reactions: Post['reactions'] }) => {
      updatePost(postId, { reactions });
    });

    socket.on('vendor:location', (_data: { vendorId: string; lat: number; lng: number }) => {
      // Can handle vendor live location markers here
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send viewport updates when map moves
  const updateViewport = useCallback(
    (lat: number, lng: number, zoom: number) => {
      socketRef.current?.emit('viewport:update', { lat, lng, zoom });
    },
    [],
  );

  // Track post view
  const trackPostView = useCallback((postId: string) => {
    socketRef.current?.emit('post:view', { postId });
  }, []);

  return { socket: socketRef, updateViewport, trackPostView };
}
