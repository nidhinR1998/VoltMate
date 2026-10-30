import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiClient } from "../services/api";

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

export interface StationConnectorSpec {
  id: string;
  name: "Type A" | "CHAdeMO" | "Type B";
  priceLabel: string;
  pricePerKwh: number;
  slotLabel: string;
  powerKw: number;
}

export interface StationCatalogItem {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerKwh: number;
  priceDisplay: string;
  powerKw: number;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  nodeType: "P2P_HOME" | "PUBLIC_DC";
  distanceKm: number;
  driveMins: number;
  rating: number;
  reviews: number;
  connectors: string[];
  connectorSpecs: StationConnectorSpec[];
  hostPhone?: string;
}

export interface BookingRecord {
  id: string;
  gatePassCode: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  connectorName: string;
  slotLabel: string;
  powerKw: number;
  pricePerKwh: number;
  priceLabel: string;
  dateLabel: string;
  timeWindow: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  status: "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface ActiveChargingSession {
  id: string;
  bookingId?: string;
  stationId: string;
  stationName: string;
  connectorName: string;
  slotLabel: string;
  powerKw: number;
  pricePerKwh: number;
  vehicleId: string;
  vehicleName: string;
  startedAtMs: number;
  initialBatteryPercent: number;
}

export interface ChargingReceipt {
  id: string;
  stationId: string;
  station: string;
  date: string;
  connector: string;
  kwh: string;
  duration: string;
  amount: string;
  numericAmount: number;
}

export interface WalletTransaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "voltmate_sec_access_token",
  REFRESH_TOKEN: "voltmate_sec_refresh_token",
  USER_PROFILE: "@voltmate_user_profile_v3",
  GARAGE_VEHICLES: "@voltmate_garage_vehicles_v3",
  SAVED_STATIONS: "@voltmate_saved_stations_v3",
  STATIONS_CATALOG: "@voltmate_stations_catalog_v3",
  BOOKINGS: "@voltmate_bookings_v3",
  ACTIVE_SESSION: "@voltmate_active_session_v3",
  CHARGING_HISTORY: "@voltmate_charging_history_v3",
  WALLET_TXNS: "@voltmate_wallet_txns_v3",
  NOTIFICATIONS: "@voltmate_notifications_v3",
};

const DEFAULT_CONNECTOR_SPECS: StationConnectorSpec[] = [
  {
    id: "conn-type-a",
    name: "Type A",
    priceLabel: "$1.00/ kWh",
    pricePerKwh: 1.0,
    slotLabel: "Slot A",
    powerKw: 22.0,
  },
  {
    id: "conn-chademo",
    name: "CHAdeMO",
    priceLabel: "$0.50/ kWh",
    pricePerKwh: 0.5,
    slotLabel: "Slot B",
    powerKw: 50.0,
  },
  {
    id: "conn-type-b",
    name: "Type B",
    priceLabel: "$0.75/ kWh",
    pricePerKwh: 0.75,
    slotLabel: "Slot C",
    powerKw: 60.0,
  },
];

export const INITIAL_STATIONS: StationCatalogItem[] = [
  {
    id: "st-pall-mall",
    title: "Pall Mall Station",
    address: "1 White Hall Palace, Street 5, Kakkanad",
    latitude: 10.0168,
    longitude: 76.3422,
    pricePerKwh: 0.5,
    priceDisplay: "$0.50/ kWh",
    powerKw: 50.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 1.0,
    driveMins: 3,
    rating: 4.5,
    reviews: 56,
    connectors: ["Type A", "CHAdeMO", "Type B"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    hostPhone: "+919847012345",
  },
  {
    id: "st-spark-ev",
    title: "Spark EV Station",
    address: "14 Seaport-Airport Ave, Infopark Phase 1",
    latitude: 10.0188,
    longitude: 76.3372,
    pricePerKwh: 0.75,
    priceDisplay: "$0.75/ kWh",
    powerKw: 22.0,
    status: "AVAILABLE",
    nodeType: "P2P_HOME",
    distanceKm: 1.8,
    driveMins: 3,
    rating: 4.8,
    reviews: 84,
    connectors: ["Type A", "Type B", "CHAdeMO"],
    connectorSpecs: [
      {
        id: "conn-type-a",
        name: "Type A",
        priceLabel: "$0.75/ kWh",
        pricePerKwh: 0.75,
        slotLabel: "Slot A",
        powerKw: 22.0,
      },
      {
        id: "conn-chademo",
        name: "CHAdeMO",
        priceLabel: "$0.50/ kWh",
        pricePerKwh: 0.5,
        slotLabel: "Slot B",
        powerKw: 50.0,
      },
      {
        id: "conn-type-b",
        name: "Type B",
        priceLabel: "$0.65/ kWh",
        pricePerKwh: 0.65,
        slotLabel: "Slot C",
        powerKw: 30.0,
      },
    ],
    hostPhone: "+919847099881",
  },
  {
    id: "st-infopark-hub",
    title: "Infopark Green Plaza",
    address: "Gate 2, Infopark Expressway, Kochi",
    latitude: 10.0232,
    longitude: 76.3468,
    pricePerKwh: 0.9,
    priceDisplay: "$0.90/ kWh",
    powerKw: 60.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 2.0,
    driveMins: 5,
    rating: 4.7,
    reviews: 112,
    connectors: ["Type B", "CHAdeMO", "Type A"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    hostPhone: "+919847033211",
  },
  {
    id: "st-sadar-road",
    title: "Sadar Road Supercharge",
    address: "88 Sadar Road Junction, Edappally",
    latitude: 10.0132,
    longitude: 76.3492,
    pricePerKwh: 0.8,
    priceDisplay: "$0.80/ kWh",
    powerKw: 30.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 2.5,
    driveMins: 6,
    rating: 4.6,
    reviews: 43,
    connectors: ["Type A", "CHAdeMO", "Type B"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    hostPhone: "+919847044556",
  },
  {
    id: "st-lotus-villa",
    title: "Lotus Enclave EV Spot",
    address: "Villa 14, West Avenue, Kakkanad",
    latitude: 10.0108,
    longitude: 76.3352,
    pricePerKwh: 0.5,
    priceDisplay: "$0.50/ kWh",
    powerKw: 7.4,
    status: "AVAILABLE",
    nodeType: "P2P_HOME",
    distanceKm: 3.0,
    driveMins: 7,
    rating: 4.9,
    reviews: 68,
    connectors: ["Type A", "Type B", "CHAdeMO"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    hostPhone: "+919847077123",
  },
  {
    id: "st-stadium-hub",
    title: "Stadium Corridor Hub",
    address: "Tangail Stadium South Gate, Kaloor",
    latitude: 10.0095,
    longitude: 76.3435,
    pricePerKwh: 0.85,
    priceDisplay: "$0.85/ kWh",
    powerKw: 50.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 3.5,
    driveMins: 8,
    rating: 4.4,
    reviews: 39,
    connectors: ["CHAdeMO", "Type A", "Type B"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    hostPhone: "+919847088900",
  },
];

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
    chargingPort: "Type B",
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
    chargingPort: "CHAdeMO",
    connectorType: "CHAdeMO",
    isPrimary: false,
  },
];

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: "bk-initial-01",
    gatePassCode: "#849-201",
    stationId: "st-pall-mall",
    stationName: "Pall Mall Station",
    stationAddress: "1 White Hall Palace, Street 5, Kakkanad",
    connectorName: "CHAdeMO",
    slotLabel: "Slot B",
    powerKw: 50.0,
    pricePerKwh: 0.5,
    priceLabel: "$0.50/ kWh",
    dateLabel: "Today",
    timeWindow: "16:30 – 17:30",
    vehicleId: "v-model-x",
    vehicleName: "Tesla Model X",
    plateNumber: "KL-07-EV-2018",
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_HISTORY: ChargingReceipt[] = [
  {
    id: "INV-2026-841",
    stationId: "st-pall-mall",
    station: "Pall Mall Station",
    date: "May 28, 2026 • 16:30",
    connector: "CHAdeMO • Slot B",
    kwh: "28.4 kWh",
    duration: "38 mins",
    amount: "$14.20",
    numericAmount: 14.2,
  },
  {
    id: "INV-2026-819",
    stationId: "st-spark-ev",
    station: "Spark EV Station",
    date: "May 24, 2026 • 11:15",
    connector: "Type A • Slot A",
    kwh: "19.2 kWh",
    duration: "52 mins",
    amount: "$14.40",
    numericAmount: 14.4,
  },
];

const INITIAL_TXNS: WalletTransaction[] = [
  {
    id: "tx-welcome",
    title: "Welcome Spark Credits",
    subtitle: "Account Onboarding Bonus",
    amount: 100.0,
    type: "CREDIT",
    timestamp: "Initial Deposit",
  },
  {
    id: "tx-topup-1",
    title: "Wallet Top-Up",
    subtitle: "Instant UPI / Card Settlement",
    amount: 56.7,
    type: "CREDIT",
    timestamp: "2 days ago",
  },
  {
    id: "tx-charge-1",
    title: "Pall Mall Station",
    subtitle: "28.4 kWh • CHAdeMO Slot B",
    amount: 14.2,
    type: "DEBIT",
    timestamp: "May 28",
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    title: "Pall Mall Station Slot Available",
    body: "CHAdeMO & Type A bays are open now with 0 min wait time.",
    time: "Just now",
    unread: true,
  },
  {
    id: "n-2",
    title: "Off-Peak Smart Tariff Active",
    body: "Save 18% on kWh rates at Spark EV Station until 6:00 PM.",
    time: "15m ago",
    unread: true,
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
  stations: StationCatalogItem[];
  bookings: BookingRecord[];
  activeBookingId: string | null;
  activeSession: ActiveChargingSession | null;
  chargingHistory: ChargingReceipt[];
  walletTransactions: WalletTransaction[];
  notifications: AppNotification[];
  hostStationOnline: boolean;

  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
  updateCredits: (newBalance: number) => void;
  topUpWallet: (amount: number, methodLabel?: string) => void;
  selectVehicle: (vehicleId: string) => void;
  addVehicle: (vehicle: GarageVehicle) => void;
  removeVehicle: (vehicleId: string) => void;
  updateVehicleBattery: (vehicleId: string, batteryPercent: number) => void;
  toggleSavedStation: (stationId: string) => void;
  createBooking: (input: {
    stationId: string;
    stationName: string;
    stationAddress: string;
    connectorName: string;
    slotLabel: string;
    powerKw: number;
    pricePerKwh: number;
    priceLabel: string;
    dateLabel: string;
    timeWindow: string;
  }) => BookingRecord;
  cancelBooking: (bookingId: string) => void;
  startChargingSession: (input: {
    bookingId?: string;
    stationId: string;
    stationName: string;
    connectorName: string;
    slotLabel: string;
    powerKw: number;
    pricePerKwh: number;
  }) => ActiveChargingSession;
  completeChargingSession: (input: {
    finalBatteryPercent: number;
    deliveredKwh: number;
    durationFormatted: string;
    totalCost: number;
  }) => ChargingReceipt;
  addHostStation: (station: Omit<StationCatalogItem, "id" | "distanceKm" | "driveMins" | "rating" | "reviews" | "connectorSpecs">) => StationCatalogItem;
  setHostStationOnline: (online: boolean) => void;
  markNotificationsRead: () => void;
  addNotification: (title: string, body: string) => void;
  syncStationsFromBackend: (lat?: number, lng?: number) => Promise<void>;
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
  stations: INITIAL_STATIONS,
  bookings: INITIAL_BOOKINGS,
  activeBookingId: INITIAL_BOOKINGS[0].id,
  activeSession: null,
  chargingHistory: INITIAL_HISTORY,
  walletTransactions: INITIAL_TXNS,
  notifications: INITIAL_NOTIFICATIONS,
  hostStationOnline: true,

  setAuthSession: async (accessToken, refreshToken, user) => {
    const normalizedUser: UserProfile = {
      ...user,
      voltCreditsBalance:
        typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance > 0
          ? user.voltCreditsBalance
          : 142.5,
    };
    try {
      await Promise.all([
        setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(normalizedUser)),
      ]);
    } catch (e) {
      console.warn("Secure storage save error", e);
    }
    set({
      accessToken,
      refreshToken,
      user: normalizedUser,
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
    const updated = { ...current, voltCreditsBalance: +newBalance.toFixed(2) };
    AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated)).catch(() => {});
    set({ user: updated });
  },

  topUpWallet: (amount, methodLabel = "Instant UPI / Card") => {
    const current = get().user;
    const currentBal = current?.voltCreditsBalance ?? 142.5;
    const newBal = +(currentBal + amount).toFixed(2);
    if (current) {
      const updatedUser = { ...current, voltCreditsBalance: newBal };
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedUser)).catch(() => {});
      set({ user: updatedUser });
    }
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      title: "Wallet Funds Added",
      subtitle: methodLabel,
      amount,
      type: "CREDIT",
      timestamp: "Just now",
    };
    const updatedTxns = [newTx, ...get().walletTransactions];
    AsyncStorage.setItem(STORAGE_KEYS.WALLET_TXNS, JSON.stringify(updatedTxns)).catch(() => {});
    set({ walletTransactions: updatedTxns });
    get().addNotification(
      `Wallet Topped Up (+$${amount.toFixed(2)})`,
      `Your available VoltMate balance is now $${newBal.toFixed(2)}.`
    );
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
    get().addNotification(
      "New EV Added to Garage",
      `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber}) is now ready for slot booking.`
    );
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
    const updated = get().vehicles.map((v) => {
      if (v.id !== vehicleId) return v;
      const newRange = Math.max(12, Math.round((v.energyKwh * 3.8 * clamped) / 100));
      const totalMins = Math.max(15, Math.round((newRange / 52) * 60));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const travelTimeEst = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      return {
        ...v,
        batteryPercent: clamped,
        rangeKm: newRange,
        travelTimeEst,
      };
    });
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

  createBooking: (input) => {
    const vehicles = get().vehicles;
    const activeVehicle =
      vehicles.find((v) => v.id === get().selectedVehicleId) || vehicles[0];
    const rand3 = Math.floor(100 + Math.random() * 899);
    const rand3b = Math.floor(100 + Math.random() * 899);
    const gatePassCode = `#${rand3}-${rand3b}`;

    const newBooking: BookingRecord = {
      id: `bk-${Date.now()}`,
      gatePassCode,
      stationId: input.stationId,
      stationName: input.stationName,
      stationAddress: input.stationAddress,
      connectorName: input.connectorName,
      slotLabel: input.slotLabel,
      powerKw: input.powerKw,
      pricePerKwh: input.pricePerKwh,
      priceLabel: input.priceLabel,
      dateLabel: input.dateLabel,
      timeWindow: input.timeWindow,
      vehicleId: activeVehicle.id,
      vehicleName: `${activeVehicle.brand} ${activeVehicle.model}`,
      plateNumber: activeVehicle.plateNumber,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    const updated = [newBooking, ...get().bookings];
    AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated)).catch(() => {});
    set({ bookings: updated, activeBookingId: newBooking.id });

    get().addNotification(
      `Booking Confirmed • Pass ${gatePassCode}`,
      `${input.stationName} (${input.connectorName} • ${input.slotLabel}) reserved for ${input.dateLabel} at ${input.timeWindow}.`
    );

    return newBooking;
  },

  cancelBooking: (bookingId) => {
    const updated = get().bookings.map((b) =>
      b.id === bookingId ? { ...b, status: "CANCELLED" as const } : b
    );
    const nextActive = updated.find((b) => b.status === "CONFIRMED" || b.status === "ACTIVE");
    AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated)).catch(() => {});
    set({
      bookings: updated,
      activeBookingId: nextActive ? nextActive.id : null,
    });
  },

  startChargingSession: (input) => {
    const vehicles = get().vehicles;
    const activeVehicle =
      vehicles.find((v) => v.id === get().selectedVehicleId) || vehicles[0];

    const session: ActiveChargingSession = {
      id: `sess-${Date.now()}`,
      bookingId: input.bookingId || get().activeBookingId || undefined,
      stationId: input.stationId,
      stationName: input.stationName,
      connectorName: input.connectorName,
      slotLabel: input.slotLabel,
      powerKw: input.powerKw,
      pricePerKwh: input.pricePerKwh,
      vehicleId: activeVehicle.id,
      vehicleName: `${activeVehicle.brand} ${activeVehicle.model}`,
      startedAtMs: Date.now(),
      initialBatteryPercent: activeVehicle.batteryPercent,
    };

    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session)).catch(() => {});
    set({ activeSession: session });
    return session;
  },

  completeChargingSession: (input) => {
    const currentSession = get().activeSession;
    const vehicles = get().vehicles;
    const activeVehicle =
      vehicles.find((v) => v.id === (currentSession?.vehicleId || get().selectedVehicleId)) ||
      vehicles[0];

    if (activeVehicle) {
      get().updateVehicleBattery(activeVehicle.id, input.finalBatteryPercent);
    }

    const stationName = currentSession?.stationName || "Pall Mall Station";
    const stationId = currentSession?.stationId || "st-pall-mall";
    const connectorSummary = currentSession
      ? `${currentSession.connectorName} • ${currentSession.slotLabel}`
      : "CHAdeMO • Slot B";

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const receipt: ChargingReceipt = {
      id: `INV-${now.getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
      stationId,
      station: stationName,
      date: `${dateStr} • ${timeStr}`,
      connector: connectorSummary,
      kwh: `${input.deliveredKwh.toFixed(1)} kWh`,
      duration: input.durationFormatted,
      amount: `$${input.totalCost.toFixed(2)}`,
      numericAmount: input.totalCost,
    };

    const updatedHistory = [receipt, ...get().chargingHistory];
    AsyncStorage.setItem(STORAGE_KEYS.CHARGING_HISTORY, JSON.stringify(updatedHistory)).catch(
      () => {}
    );

    // Deduct from wallet
    const currentUser = get().user;
    const currentBal = currentUser?.voltCreditsBalance ?? 142.5;
    const nextBal = Math.max(0, +(currentBal - input.totalCost).toFixed(2));
    if (currentUser) {
      const updatedUser = { ...currentUser, voltCreditsBalance: nextBal };
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedUser)).catch(() => {});
      set({ user: updatedUser });
    }

    const debitTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      title: stationName,
      subtitle: `${input.deliveredKwh.toFixed(1)} kWh • ${connectorSummary}`,
      amount: input.totalCost,
      type: "DEBIT",
      timestamp: "Just now",
    };
    const updatedTxns = [debitTx, ...get().walletTransactions];
    AsyncStorage.setItem(STORAGE_KEYS.WALLET_TXNS, JSON.stringify(updatedTxns)).catch(() => {});

    // Mark booking completed if linked
    const updatedBookings = get().bookings.map((b) =>
      b.id === currentSession?.bookingId ? { ...b, status: "COMPLETED" as const } : b
    );
    AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings)).catch(() => {});
    AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION).catch(() => {});

    set({
      activeSession: null,
      chargingHistory: updatedHistory,
      walletTransactions: updatedTxns,
      bookings: updatedBookings,
    });

    get().addNotification(
      `Charging Complete (${Math.round(input.finalBatteryPercent)}%)`,
      `Delivered ${input.deliveredKwh.toFixed(1)} kWh at ${stationName}. Total settled: $${input.totalCost.toFixed(2)}.`
    );

    return receipt;
  },

  addHostStation: (stationInput) => {
    const newStation: StationCatalogItem = {
      ...stationInput,
      id: `st-host-${Date.now()}`,
      distanceKm: 0.8,
      driveMins: 2,
      rating: 5.0,
      reviews: 1,
      connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    };
    const updated = [newStation, ...get().stations];
    AsyncStorage.setItem(STORAGE_KEYS.STATIONS_CATALOG, JSON.stringify(updated)).catch(() => {});
    set({ stations: updated });
    get().addNotification(
      "New Host Station Published!",
      `${newStation.title} is now live on the VoltMate Driver Map.`
    );
    return newStation;
  },

  setHostStationOnline: (online) => {
    const updated = get().stations.map((s, idx) =>
      idx === 0 ? { ...s, status: online ? ("AVAILABLE" as const) : ("OFFLINE" as const) } : s
    );
    set({ hostStationOnline: online, stations: updated });
  },

  markNotificationsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, unread: false }));
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated)).catch(() => {});
    set({ notifications: updated });
  },

  addNotification: (title, body) => {
    const item: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      time: "Just now",
      unread: true,
    };
    const updated = [item, ...get().notifications.slice(0, 19)];
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated)).catch(() => {});
    set({ notifications: updated });
  },

  syncStationsFromBackend: async (lat = 10.0159, lng = 76.3419) => {
    try {
      const res = await apiClient.get("/discovery/nearby", {
        params: { lat, lng, radius_km: 15 },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped: StationCatalogItem[] = res.data.map((node: any, index: number) => ({
          id: String(node.id || `st-backend-${index}`),
          title: node.title || node.name || `VoltMate Station #${index + 1}`,
          address: node.address || "Kakkanad Smart Corridor, Kochi",
          latitude: Number(node.latitude || 10.0159 + index * 0.003),
          longitude: Number(node.longitude || 76.3419 + index * 0.003),
          pricePerKwh: Number(node.price_per_kwh || 0.65),
          priceDisplay: `$${Number(node.price_per_kwh || 0.65).toFixed(2)}/ kWh`,
          powerKw: Number(node.power_kw || 22.0),
          status: "AVAILABLE",
          nodeType: node.is_public_commercial ? "PUBLIC_DC" : "P2P_HOME",
          distanceKm: Number(((node.distance_meters || 1200) / 1000).toFixed(1)),
          driveMins: Math.max(2, Math.round((node.distance_meters || 1200) / 450)),
          rating: 4.8,
          reviews: 42 + index * 7,
          connectors: ["Type A", "CHAdeMO", "Type B"],
          connectorSpecs: DEFAULT_CONNECTOR_SPECS,
        }));
        const merged = [
          ...INITIAL_STATIONS,
          ...mapped.filter((m) => !INITIAL_STATIONS.some((i) => i.title === m.title)),
        ];
        set({ stations: merged });
      }
    } catch {
      // Keep INITIAL_STATIONS when offline
    }
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
      const [
        token,
        refresh,
        userStr,
        vehiclesStr,
        savedStr,
        stationsStr,
        bookingsStr,
        sessionStr,
        historyStr,
        txnsStr,
        notifsStr,
      ] = await Promise.all([
        getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.GARAGE_VEHICLES),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_STATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.STATIONS_CATALOG),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION),
        AsyncStorage.getItem(STORAGE_KEYS.CHARGING_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.WALLET_TXNS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
      ]);

      const loadedVehicles: GarageVehicle[] = vehiclesStr
        ? JSON.parse(vehiclesStr)
        : DEFAULT_VEHICLES;
      const primaryVehicle =
        loadedVehicles.find((v) => v.isPrimary) || loadedVehicles[0];
      const loadedSaved: string[] = savedStr
        ? JSON.parse(savedStr)
        : ["st-pall-mall", "st-spark-ev"];
      const loadedStations: StationCatalogItem[] = stationsStr
        ? JSON.parse(stationsStr)
        : INITIAL_STATIONS;
      const loadedBookings: BookingRecord[] = bookingsStr
        ? JSON.parse(bookingsStr)
        : INITIAL_BOOKINGS;
      const loadedSession: ActiveChargingSession | null = sessionStr
        ? JSON.parse(sessionStr)
        : null;
      const loadedHistory: ChargingReceipt[] = historyStr
        ? JSON.parse(historyStr)
        : INITIAL_HISTORY;
      const loadedTxns: WalletTransaction[] = txnsStr
        ? JSON.parse(txnsStr)
        : INITIAL_TXNS;
      const loadedNotifs: AppNotification[] = notifsStr
        ? JSON.parse(notifsStr)
        : INITIAL_NOTIFICATIONS;

      const activeBk =
        loadedBookings.find(
          (b) => b.status === "CONFIRMED" || b.status === "ACTIVE"
        ) || loadedBookings[0];

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
          stations: loadedStations,
          bookings: loadedBookings,
          activeBookingId: activeBk ? activeBk.id : null,
          activeSession: loadedSession,
          chargingHistory: loadedHistory,
          walletTransactions: loadedTxns,
          notifications: loadedNotifs,
        });
        return;
      }

      set({
        isLoading: false,
        vehicles: loadedVehicles,
        selectedVehicleId: primaryVehicle.id,
        savedStationIds: loadedSaved,
        stations: loadedStations,
        bookings: loadedBookings,
        activeBookingId: activeBk ? activeBk.id : null,
        activeSession: loadedSession,
        chargingHistory: loadedHistory,
        walletTransactions: loadedTxns,
        notifications: loadedNotifs,
      });
    } catch (e) {
      console.warn("Storage load error", e);
      set({ isLoading: false });
    }
  },
}));
