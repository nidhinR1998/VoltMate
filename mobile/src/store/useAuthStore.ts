import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  activeRole: "DRIVER" | "HOST";
  kycVerified: boolean;
  trustScore: number;
  voltCreditsBalance: number;
  upiId?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
  updateCredits: (newBalance: number) => void;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "@voltmate_access_token",
  REFRESH_TOKEN: "@voltmate_refresh_token",
  USER_PROFILE: "@voltmate_user_profile",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuthSession: async (accessToken, refreshToken, user) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER_PROFILE, JSON.stringify(user)],
      ]);
    } catch (e) {
      console.warn("Storage save error", e);
    }
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated)).catch(() => {});
    set({ user: updated });
  },

  updateCredits: (newBalance) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, voltCreditsBalance: newBalance };
    AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated)).catch(() => {});
    set({ user: updated });
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
      ]);
    } catch (e) {
      console.warn("Storage remove error", e);
    }
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadSession: async () => {
    try {
      const items = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
      ]);
      const token = items[0][1];
      const refresh = items[1][1];
      const userStr = items[2][1];

      if (token && userStr) {
        set({
          accessToken: token,
          refreshToken: refresh,
          user: JSON.parse(userStr),
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch (e) {
      console.warn("Storage load error", e);
    }
    set({ isLoading: false });
  },
}));

