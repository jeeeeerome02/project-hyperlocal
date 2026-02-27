// ============================================================================
// Hyperlocal Radar — Map & App Store (Zustand)
// ============================================================================
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Post, PostCategory, User, Location } from '@/types';

// ---------------------------------------------------------------------------
// Auth Store
// ---------------------------------------------------------------------------
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
    }),
    { name: 'auth-store' },
  ),
);

// ---------------------------------------------------------------------------
// Map / Viewport Store
// ---------------------------------------------------------------------------
interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

interface MapState {
  viewport: Viewport;
  userLocation: Location | null;
  isLocating: boolean;
  setViewport: (vp: Partial<Viewport>) => void;
  setUserLocation: (loc: Location | null) => void;
  setLocating: (v: boolean) => void;
}

export const useMapStore = create<MapState>()(
  devtools(
    (set) => ({
      viewport: {
        latitude: 14.5995, // Metro Manila default
        longitude: 120.9842,
        zoom: 15,
        bearing: 0,
        pitch: 0,
      },
      userLocation: null,
      isLocating: false,
      setViewport: (vp) =>
        set((s) => ({ viewport: { ...s.viewport, ...vp } })),
      setUserLocation: (userLocation) => set({ userLocation }),
      setLocating: (isLocating) => set({ isLocating }),
    }),
    { name: 'map-store' },
  ),
);

// ---------------------------------------------------------------------------
// Post / Feed Store
// ---------------------------------------------------------------------------
interface PostState {
  posts: Post[];
  selectedPost: Post | null;
  isLoading: boolean;
  error: string | null;
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  removePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  selectPost: (post: Post | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const usePostStore = create<PostState>()(
  devtools(
    (set) => ({
      posts: [],
      selectedPost: null,
      isLoading: false,
      error: null,
      setPosts: (posts) => set({ posts, isLoading: false, error: null }),
      addPost: (post) =>
        set((s) => ({ posts: [post, ...s.posts] })),
      removePost: (postId) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),
      updatePost: (postId, updates) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
          selectedPost:
            s.selectedPost?.id === postId
              ? { ...s.selectedPost, ...updates }
              : s.selectedPost,
        })),
      selectPost: (selectedPost) => set({ selectedPost }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    { name: 'post-store' },
  ),
);

// ---------------------------------------------------------------------------
// Filter Store
// ---------------------------------------------------------------------------
interface FilterState {
  activeCategories: PostCategory[];
  radiusKm: number;
  showHeatmap: boolean;
  toggleCategory: (cat: PostCategory) => void;
  setCategories: (cats: PostCategory[]) => void;
  setRadius: (km: number) => void;
  toggleHeatmap: () => void;
}

export const useFilterStore = create<FilterState>()(
  devtools(
    (set) => ({
      activeCategories: [],
      radiusKm: 1,
      showHeatmap: false,
      toggleCategory: (cat) =>
        set((s) => ({
          activeCategories: s.activeCategories.includes(cat)
            ? s.activeCategories.filter((c) => c !== cat)
            : [...s.activeCategories, cat],
        })),
      setCategories: (activeCategories) => set({ activeCategories }),
      setRadius: (radiusKm) => set({ radiusKm }),
      toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
    }),
    { name: 'filter-store' },
  ),
);

// ---------------------------------------------------------------------------
// UI Store (bottom sheets, modals, etc.)
// ---------------------------------------------------------------------------
type BottomSheetView = 'none' | 'post-detail' | 'create-post' | 'notifications' | 'profile' | 'search';

interface UIState {
  bottomSheet: BottomSheetView;
  createPostStep: number;
  createPostCategory: PostCategory | null;
  isSocketConnected: boolean;
  openBottomSheet: (view: BottomSheetView) => void;
  closeBottomSheet: () => void;
  setCreatePostStep: (step: number) => void;
  setCreatePostCategory: (cat: PostCategory | null) => void;
  setSocketConnected: (v: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      bottomSheet: 'none',
      createPostStep: 0,
      createPostCategory: null,
      isSocketConnected: false,
      openBottomSheet: (bottomSheet) => set({ bottomSheet }),
      closeBottomSheet: () =>
        set({ bottomSheet: 'none', createPostStep: 0, createPostCategory: null }),
      setCreatePostStep: (createPostStep) => set({ createPostStep }),
      setCreatePostCategory: (createPostCategory) => set({ createPostCategory }),
      setSocketConnected: (isSocketConnected) => set({ isSocketConnected }),
    }),
    { name: 'ui-store' },
  ),
);
