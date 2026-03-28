import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authenticateWithPi } from '../services/piAuth';

interface User {
  id: string;
  piUsername: string;
  displayName: string;
  avatarUrl?: string;
  piBalance: number;
  spyceScore: number;
  role: string;
}

interface AuthState {
  user: User | null;
  jwt: string | null;
  hasOnboarded: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  jwt: null,
  hasOnboarded: false,
  isLoading: false,

  initAuth: async () => {
    try {
      const jwt = await SecureStore.getItemAsync('spyce_jwt');
      const userStr = await SecureStore.getItemAsync('spyce_user');
      const onboarded = await SecureStore.getItemAsync('spyce_onboarded');
      if (jwt && userStr) {
        set({ jwt, user: JSON.parse(userStr), hasOnboarded: true });
      } else {
        set({ hasOnboarded: !!onboarded });
      }
    } catch (e) {
      console.error('initAuth error', e);
    }
  },

  login: async () => {
    set({ isLoading: true });
    try {
      const { jwt, user } = await authenticateWithPi();
      await SecureStore.setItemAsync('spyce_jwt', jwt);
      await SecureStore.setItemAsync('spyce_user', JSON.stringify(user));
      await SecureStore.setItemAsync('spyce_onboarded', '1');
      set({ jwt, user, hasOnboarded: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('spyce_jwt');
    await SecureStore.deleteItemAsync('spyce_user');
    set({ user: null, jwt: null });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    SecureStore.setItemAsync('spyce_user', JSON.stringify(updated));
  },
}));