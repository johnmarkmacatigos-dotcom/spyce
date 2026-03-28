import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'spyce-store' });

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

interface User {
  id: string;
  piUid: string;
  piUsername: string;
  displayName: string;
  avatarUrl?: string;
  spyceScore: number;
  piBalance: string; // micro-Pi as string (BigInt safe)
  role: string;
  isVerified: boolean;
  kycStatus: string;
}

interface AuthState {
  user: User | null;
  jwt: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setJwt: (jwt: string) => void;
  updateBalance: (newBalanceMicroPi: string) => void;
  updateScore: (score: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      jwt: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setJwt: (jwt) => set({ jwt }),

      updateBalance: (newBalanceMicroPi) =>
        set((state) => ({
          user: state.user ? { ...state.user, piBalance: newBalanceMicroPi } : null,
        })),

      updateScore: (score) =>
        set((state) => ({
          user: state.user ? { ...state.user, spyceScore: score } : null,
        })),

      logout: () => set({ user: null, jwt: null, isAuthenticated: false }),
    }),
    {
      name: 'spyce-auth',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ user: state.user, jwt: state.jwt, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

// Helper: display Pi balance
export const formatPiBalance = (microPi: string): string => {
  const pi = Number(BigInt(microPi)) / 1_000_000;
  return pi.toFixed(4);
};
