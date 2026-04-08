import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SpyceUser {
  id: string;
  piUid: string;
  piUsername: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  spyceScore: number;
  piBalance: number;    // In Pi (display value)
  role: string;
  isVerified: boolean;
  kycStatus: string;
  referralCode?: string;
}

interface AuthState {
  user: SpyceUser | null;
  jwt: string | null;
  isAuthenticated: boolean;
  setUser: (user: SpyceUser) => void;
  setJwt: (jwt: string) => void;
  updateBalance: (newBalance: number) => void;
  updateScore: (score: number) => void;
  logout: () => void;
}

interface FeedState {
  feedCursor: string | null;
  setFeedCursor: (cursor: string | null) => void;
  currentVideoIndex: number;
  setCurrentVideoIndex: (index: number) => void;
}

interface PiEarnState {
  totalEarnedToday: number;
  recentEarns: Array<{ amount: number; type: string; timestamp: number }>;
  addEarn: (amount: number, type: string) => void;
  resetDailyEarns: () => void;
}

interface UIState {
  isTabBarVisible: boolean;
  setTabBarVisible: (v: boolean) => void;
  activeSheet: string | null;
  setActiveSheet: (sheet: string | null) => void;
  piCoinBurstTrigger: { amount: number; key: number } | null;
  triggerPiCoinBurst: (amount: number) => void;
  clearPiCoinBurst: () => void;
}

// ─────────────────────────────────────────────────────────────
// Auth Store
// ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      jwt: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setJwt: (jwt) => set({ jwt }),

      updateBalance: (newBalance) =>
        set((state) => ({
          user: state.user ? { ...state.user, piBalance: newBalance } : null,
        })),

      updateScore: (score) =>
        set((state) => ({
          user: state.user ? { ...state.user, spyceScore: score } : null,
        })),

      logout: () =>
        set({ user: null, jwt: null, isAuthenticated: false }),
    }),
    {
      name: 'spyce-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ─────────────────────────────────────────────────────────────
// Feed Store
// ─────────────────────────────────────────────────────────────

export const useFeedStore = create<FeedState>()((set) => ({
  feedCursor: null,
  setFeedCursor: (cursor) => set({ feedCursor: cursor }),
  currentVideoIndex: 0,
  setCurrentVideoIndex: (index) => set({ currentVideoIndex: index }),
}));

// ─────────────────────────────────────────────────────────────
// Pi Earn Store
// ─────────────────────────────────────────────────────────────

export const usePiEarnStore = create<PiEarnState>()(
  persist(
    (set, get) => ({
      totalEarnedToday: 0,
      recentEarns: [],

      addEarn: (amount, type) => {
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Filter out earns from previous day
        const todayEarns = get().recentEarns.filter(
          (e) => e.timestamp >= todayStart.getTime(),
        );

        const newEarn = { amount, type, timestamp: now };

        set({
          totalEarnedToday: todayEarns.reduce((s, e) => s + e.amount, 0) + amount,
          recentEarns: [...todayEarns, newEarn].slice(-50), // Keep last 50
        });
      },

      resetDailyEarns: () => set({ totalEarnedToday: 0, recentEarns: [] }),
    }),
    {
      name: 'spyce-pi-earns',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─────────────────────────────────────────────────────────────
// UI Store
// ─────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()((set) => ({
  isTabBarVisible: true,
  setTabBarVisible: (v) => set({ isTabBarVisible: v }),

  activeSheet: null,
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),

  piCoinBurstTrigger: null,
  triggerPiCoinBurst: (amount) =>
    set({ piCoinBurstTrigger: { amount, key: Date.now() } }),
  clearPiCoinBurst: () => set({ piCoinBurstTrigger: null }),
}));
