import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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

export interface GarageVehicle {
  id: string;
  model: string;
  brand: string;
  year: string;
  plateNumber: string;
  batteryPercent: number;
  rangeKm: number;
  travelTimeEst: string;
  energyKwh: number;
  chargingPort: string;
  connectorType: "Type A" | "CHAdeMO" | "Type B" | "CCS2" | "15A Socket";
  isPrimary: boolean;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "voltmate_sec_access_token",
  REFRESH_TOKEN: "voltmate_sec_refresh_token",
  USER_PROFILE: "@voltmate_user_profile_v2",
  GARAGE_VEHICLES: "@voltmate_garage_vehicles_v2",
  SAVED_STATIONS: "@voltmate_saved_stations_v2",
};

const DEFAULT_VEHICLES: GarageVehicle[] = [
  {
    id: "v-model-x",
    model: "Model X",
    brand: "Tesla",
    year: "2018",
    plateNumber: "KL-07-EV-2018",
    batteryPercent: 72,
    rangeKm: 70,
    travelTimeEst: "1h 20m",
    energyKwh: 68.2,
    chargingPort: "Type A",
    connectorType: "Type A",
    isPrimary: true,
  },
  {
    id: "v-nexon-ev",
    model: "Nexon EV",
    brand: "Tata",
    year: "2025",
    plateNumber: "KL-07-CS-4921",
    batteryPercent: 84,
    rangeKm: 245,
    travelTimeEst: "3h 40m",
    energyKwh: 40.5,
    chargingPort: "Type B (CCS2)",
    connectorType: "Type B",
    isPrimary: false,
  },
  {
    id: "v-windsor-ev",
    model: "Windsor EV",
    brand: "MG",
    year: "2025",
    plateNumber: "KL-07-DF-1092",
    batteryPercent: 64,
    rangeKm: 198,
    travelTimeEst: "2h 50m",
    energyKwh: 38.0,
    chargingPort: "CHAdeMO / CCS2",
    connectorType: "CHAdeMO",
    isPrimary: false,
  },
];

async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {}
  await AsyncStorage.setItem(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
    }
  } catch {}
  return AsyncStorage.getItem(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {}
  await AsyncStorage.removeItem(key);
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    return Date.now() >= parsed.exp * 1000;
  } catch {
    return false;
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  vehicles: GarageVehicle[];
  selectedVehicleId: string;
  savedStationIds: string[];
  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
  updateCredits: (newBalance: number) => void;
  selectVehicle: (vehicleId: string) => void;
  addVehicle: (vehicle: GarageVehicle) => void;
  removeVehicle: (vehicleId: string) => void;
  updateVehicleBattery: (vehicleId: string, batteryPercent: number) => void;
  toggleSavedStation: (stationId: string) => void;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  vehicles: DEFAULT_VEHICLES,
  selectedVehicleId: DEFAULT_VEHICLES[0].id,
  savedStationIds: ["st-pall-mall", "st-spark-ev"],

  setAuthSession: async (accessToken, refreshToken, user) => {
    try {
      await Promise.all([
        setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user)),
      ]);
    } catch (e) {
      console.warn("Secure storage save error", e);
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

  selectVehicle: (vehicleId) => {
    const updated = get().vehicles.map((v) => ({
      ...v,
      isPrimary: v.id === vehicleId,
    }));
    AsyncStorage.setItem(STORAGE_KEYS.GARAGE_VEHICLES, JSON.stringify(updated)).catch(() => {});
    set({ selectedVehicleId: vehicleId, vehicles: updated });
  },

  addVehicle: (vehicle) => {
    const current = get().vehicles;
    const updated = vehicle.isPrimary
      ? [vehicle, ...current.map((v) => ({ ...v, isPrimary: false }))]
      : [...current, vehicle];
    AsyncStorage.setItem(STORAGE_KEYS.GARAGE_VEHICLES, JSON.stringify(updated)).catch(() => {});
    set({
      vehicles: updated,
      selectedVehicleId: vehicle.isPrimary ? vehicle.id : get().selectedVehicleId,
    });
  },

  removeVehicle: (vehicleId) => {
    const current = get().vehicles;
    if (current.length <= 1) return;
    const filtered = current.filter((v) => v.id !== vehicleId);
    if (!filtered.some((v) => v.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    const primary = filtered.find((v) => v.isPrimary) || filtered[0];
    AsyncStorage.setItem(STORAGE_KEYS.GARAGE_VEHICLES, JSON.stringify(filtered)).catch(() => {});
    set({ vehicles: filtered, selectedVehicleId: primary.id });
  },

  updateVehicleBattery: (vehicleId, batteryPercent) => {
    const clamped = Math.max(0, Math.min(100, Math.round(batteryPercent)));
    const updated = get().vehicles.map((v) =>
      v.id === vehicleId
        ? { ...v, batteryPercent: clamped, rangeKm: Math.round((v.energyKwh * 4.2 * clamped) / 100) }
        : v
    );
    AsyncStorage.setItem(STORAGE_KEYS.GARAGE_VEHICLES, JSON.stringify(updated)).catch(() => {});
    set({ vehicles: updated });
  },

  toggleSavedStation: (stationId) => {
    const current = get().savedStationIds;
    const exists = current.includes(stationId);
    const updated = exists ? current.filter((id) => id !== stationId) : [...current, stationId];
    AsyncStorage.setItem(STORAGE_KEYS.SAVED_STATIONS, JSON.stringify(updated)).catch(() => {});
    set({ savedStationIds: updated });
  },

  logout: async () => {
    try {
      await Promise.all([
        deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
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
      const [token, refresh, userStr, vehiclesStr, savedStr] = await Promise.all([
        getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.GARAGE_VEHICLES),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_STATIONS),
      ]);

      const loadedVehicles: GarageVehicle[] = vehiclesStr ? JSON.parse(vehiclesStr) : DEFAULT_VEHICLES;
      const primaryVehicle = loadedVehicles.find((v) => v.isPrimary) || loadedVehicles[0];
      const loadedSaved: string[] = savedStr ? JSON.parse(savedStr) : ["st-pall-mall", "st-spark-ev"];

      if (token && userStr) {
        if (refresh && isJwtExpired(refresh)) {
          await get().logout();
          return;
        }
        set({
          accessToken: token,
          refreshToken: refresh,
          user: JSON.parse(userStr),
          isAuthenticated: true,
          isLoading: false,
          vehicles: loadedVehicles,
          selectedVehicleId: primaryVehicle.id,
          savedStationIds: loadedSaved,
        });
        return;
      }

      set({
        isLoading: false,
        vehicles: loadedVehicles,
        selectedVehicleId: primaryVehicle.id,
        savedStationIds: loadedSaved,
      });
    } catch (e) {
      console.warn("Storage load error", e);
      set({ isLoading: false });
    }
  },
}));
