// ============================================================
// SPYCE - Global State (Zustand)
// ============================================================
import { create } from 'zustand';
import api from './api';

// ── Auth Store ────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('spyce_token') || null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('spyce_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  updateUser: (updates) => {
    set(state => ({ user: { ...state.user, ...updates } }));
  },

  logout: () => {
    localStorage.removeItem('spyce_token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initAuth: async () => {
    const token = localStorage.getItem('spyce_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('spyce_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// ── Feed Store ────────────────────────────────────────────────
export const useFeedStore = create((set, get) => ({
  videos: [],
  currentIndex: 0,
  isLoading: false,
  hasMore: true,
  seenIds: [],
  feedType: 'foryou', // 'foryou' | 'following'

  setFeedType: (type) => {
    set({ feedType: type, videos: [], currentIndex: 0, seenIds: [], hasMore: true });
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  loadMore: async () => {
    const { isLoading, hasMore, videos, seenIds, feedType } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    try {
      const endpoint = feedType === 'following' ? '/feed/following' : '/feed';
      const { data } = await api.get(endpoint, {
        params: { seen: seenIds.slice(-30).join(',') }
      });
      const newVideos = data.videos || [];
      const newIds = newVideos.map(v => v.id);

      set(state => ({
        videos: [...state.videos, ...newVideos],
        seenIds: [...state.seenIds, ...newIds],
        hasMore: data.hasMore,
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false });
    }
  },

  toggleLike: (videoId, isLiked, likesCount) => {
    set(state => ({
      videos: state.videos.map(v =>
        v.id === videoId ? { ...v, isLiked, likesCount } : v
      )
    }));
  },
}));

// ── Notification Store ────────────────────────────────────────
export const useNotifStore = create((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  increment: () => set(state => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
