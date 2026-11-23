import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "../services/api";
import { clearGoogleCredentialSession } from "../services/googleAuthService";
import {
  createRazorpayOrderOnServer,
  requestHostPayoutOnServer,
  RazorpayOrderCreateResponse,
  RazorpayVerifyResponse,
} from "../services/razorpayService";
import {
  fetchRealTimeEvStations,
  LiveEvStation,
  calcDistanceKm,
} from "../services/realTimeEvHunter";
import {
  fireNativePushNotification,
  initializeNativeNotifications,
} from "../services/notificationService";

import {
  TAB_BAR_SAFE_PADDING,
  UserProfile,
  VehicleRecord,
  ConnectorSpec,
  StationRecord,
  HostStationUpsertInput,
  BookingRecord,
  ChargingHistoryRecord,
  WalletTransaction,
  NotificationItem,
  HostRequestItem,
  HostScheduleDay,
  ActiveChargingSession,
  ToastPayload,
  normalizeUserRecord,
  normalizeStationRecord,
  partitionBookingsByTab,
  isLegacySeedRecord,
  sanitizePersistedRecords,
  isConnectorCompatibleWithVehicle,
  getCompatibleConnectorsForVehicle,
  filterStationForVehicle,
  DEFAULT_VEHICLES,
  INITIAL_STATIONS,
  ACTIVE_INITIAL_STATIONS,
  INITIAL_HOST_SCHEDULE,
} from "./engineTypesAndSeeds";
import {
  resolveLocalityFromCoordinates,
  validateAddressMatchesCoordinates,
} from "../services/hybridMapService";

export const DEFAULT_CONNECTOR_SPECS: ConnectorSpec[] = [
  {
    id: "conn-15a",
    name: "15A 3-Pin Domestic (3.3 kW)",
    priceLabel: "₹8.50/kWh",
    pricePerKwh: 8.5,
    slotLabel: "Slot A • 3.3 kW AC",
    powerKw: 3.3,
    plugImage: "TYPE_A",
  },
  {
    id: "conn-type2",
    name: "Type-2 AC Wallbox (7.4 kW)",
    priceLabel: "₹11.50/kWh",
    pricePerKwh: 11.5,
    slotLabel: "Slot B • 7.4 kW AC",
    powerKw: 7.4,
    plugImage: "TYPE_B",
  },
  {
    id: "conn-ccs2",
    name: "CCS2 DC Fast (60 kW)",
    priceLabel: "₹15.50/kWh",
    pricePerKwh: 15.5,
    slotLabel: "Slot C • 60 kW DC",
    powerKw: 60.0,
    plugImage: "CHADEMO",
  },
];

export {
  TAB_BAR_SAFE_PADDING,
  UserProfile,
  VehicleRecord,
  ConnectorSpec,
  StationRecord,
  HostStationUpsertInput,
  BookingRecord,
  ChargingHistoryRecord,
  WalletTransaction,
  NotificationItem,
  HostRequestItem,
  HostScheduleDay,
  ActiveChargingSession,
  ToastPayload,
  DEFAULT_VEHICLES,
  INITIAL_STATIONS,
  ACTIVE_INITIAL_STATIONS,
  INITIAL_HOST_SCHEDULE,
  normalizeStationRecord,
  partitionBookingsByTab,
  isLegacySeedRecord,
  sanitizePersistedRecords,
  isConnectorCompatibleWithVehicle,
  getCompatibleConnectorsForVehicle,
  filterStationForVehicle,
};

export {
  INDIAN_EV_BRANDS,
  INDIAN_EV_CATALOG,
  IndianEvModelPreset,
  IndianEvBrandCategory,
} from "../services/indianEvCatalog";

let activeScopedUserId = "guest";

function setScopedUserId(userId?: string | null) {
  activeScopedUserId = (userId || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
}

const STORAGE_KEYS = {
  TOKEN: "@voltmate_jwt_token_v8",
  REFRESH_TOKEN: "@voltmate_jwt_refresh_token_v8",
  SECURE_ACCESS_TOKEN: "voltmate_access_token_v8",
  SECURE_REFRESH_TOKEN: "voltmate_refresh_token_v8",
  ACTIVE_USER: "@voltmate_active_user_v8",
  get USER() {
    return `@voltmate_u_${activeScopedUserId}_user_v8`;
  },
  get VEHICLES() {
    return `@voltmate_u_${activeScopedUserId}_vehicles_v8`;
  },
  STATIONS: "@voltmate_stations_v13_clean",
  get BOOKINGS() {
    return `@voltmate_u_${activeScopedUserId}_bookings_v9_clean`;
  },
  get HISTORY() {
    return `@voltmate_u_${activeScopedUserId}_history_v9_clean`;
  },
  get TXNS() {
    return `@voltmate_u_${activeScopedUserId}_txns_v9_clean`;
  },
  get FAVORITES() {
    return `@voltmate_u_${activeScopedUserId}_favorites_v9_clean`;
  },
  get HOST_STATE() {
    return `@voltmate_u_${activeScopedUserId}_host_v9_clean`;
  },
  get ACTIVE_SESSION() {
    return `@voltmate_u_${activeScopedUserId}_active_session_v8`;
  },
  MAP_PREF: "@voltmate_map_pref_v5_engine",
};

async function saveSecureAuthTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.SECURE_ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.SECURE_REFRESH_TOKEN, refreshToken),
    ]);
  } catch {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  }
}

async function loadSecureAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  try {
    const [secAccess, secRefresh] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.SECURE_ACCESS_TOKEN),
      SecureStore.getItemAsync(STORAGE_KEYS.SECURE_REFRESH_TOKEN),
    ]);
    if (secAccess) {
      return { accessToken: secAccess, refreshToken: secRefresh || secAccess };
    }
  } catch {
    // Fallback to AsyncStorage on web or unsupported environments
  }
  const [legacyAccess, legacyRefresh] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
    AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
  return {
    accessToken: legacyAccess,
    refreshToken: legacyRefresh || legacyAccess,
  };
}

async function clearSecureAuthTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.SECURE_ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.SECURE_REFRESH_TOKEN),
    ]);
  } catch {
    // Ignore on web
  }
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
    AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
}

let telemetryIntervalRef: ReturnType<typeof setInterval> | null = null;

export interface VoltMateEngineState {
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  activeMode: "DRIVER" | "HOST";
  isLoading: boolean;
  vehicles: VehicleRecord[];
  stations: StationRecord[];
  bookings: BookingRecord[];
  chargingHistory: ChargingHistoryRecord[];
  transactions: WalletTransaction[];
  notifications: NotificationItem[];
  favoriteStationIds: string[];
  selectedStationId: string;
  hostRequests: HostRequestItem[];
  hostEarningsBalance: number;
  hostWeeklyEarnings: number;
  hostWeeklyKwh: number;
  hostSessionsCount: number;
  hostTransactions: WalletTransaction[];
  hostSchedule: HostScheduleDay[];
  preferredMapLayer: "standard" | "satellite" | "hybrid";
  themeMode: "light" | "dark" | "system";
  locale: "en" | "ml";
  toast: ToastPayload;
  reminderSnoozedUntil: string | null;
  activeSession: ActiveChargingSession | null;
  isChargingModalOpen: boolean;
  latestSettledReceipt: ChargingHistoryRecord | null;
  lastLiveSyncAt: string | null;
  activeRazorpayOrder: RazorpayOrderCreateResponse | null;
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    updatedAt: number;
  } | null;
  nearbyCity: string;
  locationStatus:
    | "LOCATING"
    | "READY"
    | "PERMISSION_DENIED"
    | "GPS_OFF"
    | "LOW_ACCURACY";

  setLocationState: (
    status:
      | "LOCATING"
      | "READY"
      | "PERMISSION_DENIED"
      | "GPS_OFF"
      | "LOW_ACCURACY",
    coords?: { latitude: number; longitude: number; accuracy?: number | null } | null,
    manualCity?: string
  ) => void;
  initializeAuth: () => Promise<void>;
  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  hydrateUserFromBackend: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  switchMode: (mode: "DRIVER" | "HOST") => void;
  topUpWallet: (amount: number, methodLabel?: string, launchUpiIntent?: boolean) => Promise<void>;
  closeRazorpayCheckout: () => void;
  applyVerifiedRazorpayPayment: (verified: RazorpayVerifyResponse) => Promise<void>;
  addVehicle: (v: Omit<VehicleRecord, "id" | "isPrimary">) => Promise<void>;
  setPrimaryVehicle: (id: string) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  updatePrimaryVehicleSoc: (newSoc: number) => Promise<void>;
  adjustActiveVehicleSoc: (deltaPercent: number) => Promise<void>;
  addOrUpdateHostStation: (input: HostStationUpsertInput) => Promise<StationRecord>;
  toggleHostStationOnline: (stationId: string, forceOnline?: boolean) => Promise<void>;
  deleteHostStation: (stationId: string) => Promise<void>;
  syncLiveStationsForRegion: (lat: number, lng: number, radiusKm?: number) => Promise<void>;
  selectStation: (stationId: string) => void;
  toggleFavoriteStation: (stationId: string) => Promise<void>;
  createBooking: (b: Omit<BookingRecord, "id" | "otpCode" | "status" | "createdAt">) => Promise<BookingRecord>;
  cancelBooking: (bookingId: string) => Promise<void>;
  rescheduleBooking: (bookingId: string, newSlotTime?: string) => Promise<void>;
  startChargingSession: (bookingId?: string, stationId?: string) => void;
  togglePauseChargingSession: () => void;
  setTargetCutOffSoc: (target: 80 | 90 | 100) => void;
  openChargingModal: () => void;
  closeChargingModal: () => void;
  clearSettledReceipt: () => void;
  stopChargingSession: () => Promise<ChargingHistoryRecord | null>;
  completeChargingSession: (session: {
    bookingId?: string;
    stationName: string;
    hostName?: string;
    energyKwh: number;
    durationMins: number;
    amount: number;
    ratePerKwh?: number;
    connectorType?: string;
    finalSocPercent?: number;
  }) => Promise<ChargingHistoryRecord>;
  markNotificationsRead: () => void;
  triggerTestReminder: () => void;
  snoozeReminder: (minutes: number) => void;
  respondHostRequest: (requestId: string, accept: boolean) => Promise<void>;
  withdrawHostEarnings: (amount: number, upiId: string) => Promise<void>;
  convertHostEarningsToWallet: (amount: number) => Promise<void>;
  updateHostSchedule: (schedule: HostScheduleDay[]) => Promise<void>;
  setPreferredMapLayer: (layer: "standard" | "satellite" | "hybrid") => Promise<void>;
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  setLocale: (locale: "en" | "ml") => void;
  showToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
  hideToast: () => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useVoltMateEngine = create<VoltMateEngineState>((set, get) => ({
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  activeMode: "DRIVER",
  isLoading: true,
  vehicles: DEFAULT_VEHICLES,
  stations: ACTIVE_INITIAL_STATIONS.map((s) => normalizeStationRecord(s)),
  bookings: [],
  chargingHistory: [],
  transactions: [],
  notifications: [],
  favoriteStationIds: [],
  selectedStationId: ACTIVE_INITIAL_STATIONS[0]?.id || "kl_pnr_chargemod_sahakarana",
  hostRequests: [],
  hostEarningsBalance: 0.0,
  hostWeeklyEarnings: 0.0,
  hostWeeklyKwh: 0.0,
  hostSessionsCount: 0,
  hostTransactions: [],
  hostSchedule: INITIAL_HOST_SCHEDULE,
  preferredMapLayer: "standard",
  themeMode: "light",
  locale: "en",
  toast: {
    visible: false,
    title: "",
    message: "",
    type: "success",
  },
  reminderSnoozedUntil: null,
  activeSession: null,
  isChargingModalOpen: false,
  latestSettledReceipt: null,
  lastLiveSyncAt: null,
  activeRazorpayOrder: null,
  userLocation: null,
  nearbyCity: "Locating...",
  locationStatus: "LOCATING",

  setThemeMode: (mode) => {
    set({ themeMode: mode });
  },

  setLocale: (locale) => {
    set({ locale });
  },

  setLocationState: (status, coords, manualCity) => {
    const resolvedCity =
      manualCity ||
      (coords
        ? resolveLocalityFromCoordinates(coords.latitude, coords.longitude).city
        : get().nearbyCity === "Locating..."
        ? "Select City"
        : get().nearbyCity);
    set({
      locationStatus: status,
      userLocation: coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            updatedAt: Date.now(),
          }
        : get().userLocation,
      nearbyCity: resolvedCity,
    });
  },

  showToast: (title, message, type = "success") => {
    set({
      toast: { visible: true, title, message, type },
    });
  },

  hideToast: () => {
    set((s) => ({
      toast: { ...s.toast, visible: false },
    }));
  },

  initializeAuth: async () => {
    await initializeNativeNotifications();
    try {
      const [{ accessToken: token, refreshToken }, activeUserJson, stationsJson, mapPref] =
        await Promise.all([
          loadSecureAuthTokens(),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_USER),
          AsyncStorage.getItem(STORAGE_KEYS.STATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.MAP_PREF),
        ]);

      const rawStations = stationsJson
        ? JSON.parse(stationsJson)
        : ACTIVE_INITIAL_STATIONS;
      const cleanedStations = sanitizePersistedRecords(
        Array.isArray(rawStations) ? rawStations : ACTIVE_INITIAL_STATIONS
      );
      const stations: StationRecord[] = (
        cleanedStations.length > 0 ? cleanedStations : ACTIVE_INITIAL_STATIONS
      ).map((st: any) => normalizeStationRecord(st));

      if (token && activeUserJson) {
        const parsedUser = normalizeUserRecord(JSON.parse(activeUserJson));
        setScopedUserId(parsedUser.id || parsedUser.email);
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const [
          scopedUserJson,
          vehiclesJson,
          bookingsJson,
          historyJson,
          txnsJson,
          favsJson,
          hostStateJson,
          activeSessionJson,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.VEHICLES),
          AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS),
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.TXNS),
          AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
          AsyncStorage.getItem(STORAGE_KEYS.HOST_STATE),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION),
        ]);

        const finalUser = scopedUserJson
          ? normalizeUserRecord(JSON.parse(scopedUserJson))
          : parsedUser;
        const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : DEFAULT_VEHICLES;
        const bookings = sanitizePersistedRecords<BookingRecord>(
          bookingsJson ? JSON.parse(bookingsJson) : []
        );
        const chargingHistory = sanitizePersistedRecords<ChargingHistoryRecord>(
          historyJson ? JSON.parse(historyJson) : []
        );
        const transactions = txnsJson ? JSON.parse(txnsJson) : [];
        const favoriteStationIds = favsJson ? JSON.parse(favsJson) : [];
        const hostState = hostStateJson ? JSON.parse(hostStateJson) : null;
        const restoredSession: ActiveChargingSession | null = activeSessionJson
          ? JSON.parse(activeSessionJson)
          : null;

        set({
          token,
          accessToken: token,
          refreshToken: refreshToken || token,
          isAuthenticated: true,
          user: finalUser,
          vehicles,
          stations,
          bookings,
          chargingHistory,
          transactions,
          notifications: [],
          favoriteStationIds,
          hostRequests: hostState?.hostRequests || [],
          hostEarningsBalance: hostState?.hostEarningsBalance ?? 0.0,
          hostWeeklyEarnings: hostState?.hostWeeklyEarnings ?? 0.0,
          hostWeeklyKwh: hostState?.hostWeeklyKwh ?? 0.0,
          hostSessionsCount: hostState?.hostSessionsCount ?? 0,
          hostTransactions: hostState?.hostTransactions || [],
          hostSchedule: hostState?.hostSchedule || INITIAL_HOST_SCHEDULE,
          activeSession: restoredSession,
          preferredMapLayer:
            mapPref === "satellite" || mapPref === "hybrid"
              ? mapPref
              : "standard",
          isLoading: false,
        });
        void get().hydrateUserFromBackend();
      } else {
        setScopedUserId("guest");
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
          vehicles: DEFAULT_VEHICLES,
          stations,
          bookings: [],
          chargingHistory: [],
          transactions: [],
          notifications: [],
          favoriteStationIds: [],
          hostRequests: [],
          hostEarningsBalance: 0.0,
          hostWeeklyEarnings: 0.0,
          hostWeeklyKwh: 0.0,
          hostSessionsCount: 0,
          hostTransactions: [],
          preferredMapLayer:
            mapPref === "satellite" || mapPref === "hybrid"
              ? mapPref
              : "standard",
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuthSession: async (accessToken, refreshToken, user) => {
    const normalizedUser = normalizeUserRecord(user);
    setScopedUserId(normalizedUser.id || normalizedUser.email);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    const [
      scopedUserJson,
      vehiclesJson,
      bookingsJson,
      historyJson,
      txnsJson,
      favsJson,
      hostStateJson,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.USER),
      AsyncStorage.getItem(STORAGE_KEYS.VEHICLES),
      AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS),
      AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
      AsyncStorage.getItem(STORAGE_KEYS.TXNS),
      AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
      AsyncStorage.getItem(STORAGE_KEYS.HOST_STATE),
    ]);

    const existingUser = scopedUserJson ? JSON.parse(scopedUserJson) : null;
    const mergedUser: UserProfile = normalizeUserRecord({
      ...existingUser,
      ...normalizedUser,
      phoneNumber: normalizedUser.phoneNumber || existingUser?.phoneNumber || "",
      phone: normalizedUser.phone || existingUser?.phone || "",
      upiId: normalizedUser.upiId || existingUser?.upiId || `${normalizedUser.email.split("@")[0]}@okaxis`,
      voltCreditsBalance:
        typeof existingUser?.voltCreditsBalance === "number"
          ? existingUser.voltCreditsBalance
          : normalizedUser.voltCreditsBalance,
    });

    const vehicles: VehicleRecord[] = vehiclesJson
      ? JSON.parse(vehiclesJson)
      : DEFAULT_VEHICLES.slice(0, 1).map((v) => ({
          ...v,
          id: `veh_${mergedUser.id}_1`,
        }));
    const bookings: BookingRecord[] = sanitizePersistedRecords<BookingRecord>(
      bookingsJson ? JSON.parse(bookingsJson) : []
    );
    const chargingHistory: ChargingHistoryRecord[] =
      sanitizePersistedRecords<ChargingHistoryRecord>(
        historyJson ? JSON.parse(historyJson) : []
      );
    const transactions: WalletTransaction[] = txnsJson
      ? JSON.parse(txnsJson)
      : [
          {
            id: `TX-WELCOME-${mergedUser.id}`,
            title: `Welcome EV Credit (${mergedUser.email})`,
            date: "Account Activated",
            amount: `+₹${mergedUser.voltCreditsBalance.toFixed(2)}`,
            isCredit: true,
          },
        ];
    const favoriteStationIds: string[] = favsJson ? JSON.parse(favsJson) : [];
    const hostState = hostStateJson ? JSON.parse(hostStateJson) : null;

    await Promise.all([
      saveSecureAuthTokens(accessToken, refreshToken || accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(mergedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mergedUser)),
    ]);

    set({
      token: accessToken,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      user: mergedUser,
      activeMode: mergedUser.activeRole === "HOST" ? "HOST" : "DRIVER",
      vehicles,
      bookings,
      chargingHistory,
      transactions,
      notifications: [
        {
          id: `NOTIF-WELCOME-${mergedUser.id}`,
          title: `Welcome to VoltMate, ${mergedUser.fullName}!`,
          message: `Signed in as ${mergedUser.email} • UPI: ${mergedUser.upiId}`,
          time: "Just now",
          read: false,
          category: "WALLET",
        },
      ],
      favoriteStationIds,
      hostRequests: hostState?.hostRequests || [],
      hostEarningsBalance: hostState?.hostEarningsBalance ?? 0.0,
      hostWeeklyEarnings: hostState?.hostWeeklyEarnings ?? 0.0,
      hostWeeklyKwh: hostState?.hostWeeklyKwh ?? 0.0,
      hostSessionsCount: hostState?.hostSessionsCount ?? 0,
      hostTransactions: hostState?.hostTransactions || [],
      hostSchedule: hostState?.hostSchedule || INITIAL_HOST_SCHEDULE,
    });
    void get().hydrateUserFromBackend();
  },

  hydrateUserFromBackend: async () => {
    const currentToken = get().accessToken || get().token;
    const currentUser = get().user;
    if (!currentToken || !currentUser) return;

    try {
      const [meRes, vehRes, bookRes, walletRes] = await Promise.allSettled([
        apiClient.get("/auth/me"),
        apiClient.get("/vehicles"),
        apiClient.get("/bookings/"),
        apiClient.get("/payments/wallet"),
      ]);

      // 1. Hydrate live profile
      if (meRes.status === "fulfilled" && meRes.value?.data) {
        const me = meRes.value.data;
        const walletData =
          walletRes.status === "fulfilled" ? walletRes.value?.data : null;
        const resolvedBalance =
          typeof walletData?.balance_inr === "number"
            ? walletData.balance_inr
            : typeof me.volt_credits_balance === "number"
            ? me.volt_credits_balance
            : currentUser.voltCreditsBalance;

        const freshUser = normalizeUserRecord({
          ...currentUser,
          id: me.id || currentUser.id,
          email: me.email || currentUser.email,
          fullName: me.full_name || currentUser.fullName,
          name: me.full_name || currentUser.name,
          phoneNumber: me.phone_number || currentUser.phoneNumber,
          phone: me.phone_number || currentUser.phone,
          upiId: me.upi_id || currentUser.upiId,
          upiVpa: me.upi_id || currentUser.upiVpa,
          activeRole: me.active_role || currentUser.activeRole,
          role: me.active_role || currentUser.role,
          kycVerified: me.kyc_verified ?? currentUser.kycVerified,
          trustScore: me.trust_score ?? currentUser.trustScore,
          voltCreditsBalance: resolvedBalance,
        });
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(freshUser)),
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser)),
        ]);
        set({ user: freshUser });

        if (walletData && Array.isArray(walletData.transactions) && walletData.transactions.length > 0) {
          const serverTxns: WalletTransaction[] = walletData.transactions.map((t: any) => ({
            id: String(t.id || `TX-${t.ledger_fact_id}`),
            title: String(t.title || "Wallet Transaction"),
            date: t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN") : "Verified",
            amount: `${t.is_credit ? "+" : "-"}₹${Number(t.amount_inr || 0).toFixed(2)}`,
            isCredit: Boolean(t.is_credit),
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(serverTxns));
          set({
            transactions: serverTxns,
            hostEarningsBalance:
              typeof walletData.host_earnings_balance_inr === "number"
                ? walletData.host_earnings_balance_inr
                : get().hostEarningsBalance,
          });
        }
      }

      // 2. Hydrate user vehicles from EDW if present
      if (vehRes.status === "fulfilled") {
        const rawList = Array.isArray(vehRes.value?.data?.data)
          ? vehRes.value.data.data
          : Array.isArray(vehRes.value?.data)
          ? vehRes.value.data
          : [];
        if (rawList.length > 0) {
          const mappedVehicles: VehicleRecord[] = rawList.map((rv: any, idx: number) => {
            const cap = Number(rv.battery_capacity_kwh) || 45;
            const maxR = cap < 10 ? 110 : Math.round(cap * 7.8);
            const connRaw = (rv.connector_types?.[0] || "CCS2").toUpperCase();
            const cType: VehicleRecord["connectorType"] = connRaw.includes("15A")
              ? "SOCKET_15A"
              : connRaw.includes("TYPE")
              ? "TYPE_2"
              : "CCS2";
            return {
              id: String(rv.id || `veh_edw_${idx}`),
              makeModel: `${rv.make || ""} ${rv.model || ""}`.trim() || "Tata Nexon.ev Empowered+ 45",
              year: "2025",
              plateNumber: rv.registration_number || "KL-07-EV-0001",
              batteryCapacityKwh: cap,
              connectorType: cType,
              connectorLabel: cType === "SOCKET_15A" ? "LECCS & 15A Socket" : "CCS2 DC & Type-2 AC",
              socPercent: 76,
              rangeKm: Math.round(maxR * 0.76),
              maxRangeKm: maxR,
              isPrimary: idx === 0 ? true : Boolean(rv.is_primary),
            };
          });
          await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(mappedVehicles));
          set({ vehicles: mappedVehicles });
        }
      }

      // 3. Hydrate user bookings from EDW if local bookings are empty
      if (bookRes.status === "fulfilled" && Array.isArray(bookRes.value?.data)) {
        const serverBookings = sanitizePersistedRecords(bookRes.value.data);
        if (serverBookings.length > 0 && get().bookings.length === 0) {
          const mappedBookings: BookingRecord[] = serverBookings.map((sb: any, idx: number) => {
            const fallbackPin = String(100000 + ((Number(sb.id) || (idx + 1) * 7919) % 899999));
            return {
              id: String(sb.id),
              stationId: String(sb.node_id),
              stationName: sb.node_title || "Verified EV Charging Hub",
              address: sb.society_name || "Verified EV Station",
              hostName: sb.host_name || "Verified EV Host",
              hostPhone: "+9118002098282",
              slotTime: "Today • Instant Slot",
              connectorType: "CCS2 DC / Type-2 AC",
              powerKw: 30,
              pricePerKwh: 12.5,
              estimatedKwh: Number(sb.estimated_kwh) || 15,
              totalAmount: Number(sb.total_amount_inr) || 187.5,
              otpCode: String(sb.gate_pass_code || fallbackPin)
                .replace(/\D/g, "")
                .padEnd(6, "8")
                .slice(0, 6),
              status:
                sb.status === "COMPLETED"
                  ? "COMPLETED"
                  : sb.status === "CANCELLED"
                  ? "CANCELLED"
                  : sb.status === "ACTIVE_CHARGING"
                  ? "ACTIVE_CHARGING"
                  : "CONFIRMED",
              createdAt: sb.created_at || new Date().toISOString(),
            };
          });
          const cleanMapped = sanitizePersistedRecords(mappedBookings);
          await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(cleanMapped));
          set({ bookings: cleanMapped });
        }
      }
    } catch {
      // Offline / background hydration gracefully skipped
    }
  },

  updateProfile: async (updates) => {
    const current =
      get().user ||
      normalizeUserRecord({
        id: "usr_guest",
        email: "driver@voltmate.in",
        fullName: "EV Driver",
        role: "DRIVER",
        voltCreditsBalance: 250.0,
      });
    const updatedUser: UserProfile = normalizeUserRecord({
      ...current,
      ...updates,
      name: updates.fullName || updates.name || current.fullName,
      fullName: updates.fullName || updates.name || current.fullName,
      phone: updates.phoneNumber || updates.phone || current.phoneNumber,
      phoneNumber: updates.phoneNumber || updates.phone || current.phoneNumber,
      upiVpa: updates.upiId || updates.upiVpa || current.upiId,
      upiId: updates.upiId || updates.upiVpa || current.upiId,
    });

    try {
      await apiClient.patch("/auth/me", {
        full_name: updatedUser.fullName,
        phone_number: updatedUser.phoneNumber,
        upi_id: updatedUser.upiId,
      });
    } catch {
      // Offline / cellular fallback persisted locally
    }

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updatedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
    ]);
    set({ user: updatedUser });
    const msg = `Profile & UPI VPA (${updatedUser.upiId}) saved for ${updatedUser.fullName}.`;
    get().showToast("Profile Updated", msg, "success");
    await fireNativePushNotification("VoltMate Profile Updated", msg);
  },

  switchMode: (mode) => {
    set({ activeMode: mode });
    const cityLabel =
      get().nearbyCity &&
      get().nearbyCity !== "Locating..." &&
      get().nearbyCity !== "Select City"
        ? get().nearbyCity
        : "nearby";
    get().showToast(
      mode === "HOST" ? "Switched to Host Studio" : "Switched to Driver Mode",
      mode === "HOST"
        ? `Managing your ${cityLabel} P2P charger & ₹ INR payouts.`
        : `Exploring ${cityLabel} EV chargers & active sessions.`,
      "info"
    );
  },

  topUpWallet: async (amount, methodLabel = "Razorpay Checkout") => {
    try {
      const order = await createRazorpayOrderOnServer({
        purpose: "WALLET_TOPUP",
        amountInr: amount,
      });
      set({ activeRazorpayOrder: order });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        `Could not create Razorpay order for ₹${amount} (${methodLabel}).`;
      get().showToast("Razorpay Order Error", detail, "warning");
    }
  },

  closeRazorpayCheckout: () => {
    set({ activeRazorpayOrder: null });
  },

  applyVerifiedRazorpayPayment: async (verified) => {
    const current =
      get().user ||
      normalizeUserRecord({
        id: "usr_guest",
        email: "driver@voltmate.in",
        fullName: "EV Driver",
        role: "DRIVER",
        voltCreditsBalance: 0.0,
      });
    const newBalance =
      typeof verified.wallet_balance_inr === "number"
        ? Number(verified.wallet_balance_inr.toFixed(2))
        : Number((current.voltCreditsBalance + verified.amount_inr).toFixed(2));

    const updatedUser: UserProfile = {
      ...current,
      voltCreditsBalance: newBalance,
    };
    const newTx: WalletTransaction = {
      id: verified.ledger_entry?.txn_id || `TX-TOPUP-${Date.now()}`,
      title: "VoltMate Wallet Top-Up",
      date: "Just now",
      amount: `+₹${verified.amount_inr.toFixed(2)}`,
      isCredit: true,
      gatewayRef: verified.razorpay_payment_id,
    };
    const updatedTxns = [newTx, ...get().transactions];
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `+₹${verified.amount_inr.toFixed(2)} Added to Wallet`,
      message: `Wallet top-up completed • Updated balance: ₹${newBalance.toFixed(2)}.`,
      time: "Just now",
      read: false,
      category: "WALLET",
    };
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updatedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
    ]);
    set({
      user: updatedUser,
      transactions: updatedTxns,
      notifications: [newNotif, ...get().notifications],
      activeRazorpayOrder: null,
    });
    const toastTitle = `+₹${verified.amount_inr.toFixed(0)} Wallet Top-Up Complete`;
    const toastMsg = `Updated balance: ₹${newBalance.toFixed(2)}`;
    get().showToast(toastTitle, toastMsg, "success");
    await fireNativePushNotification(toastTitle, toastMsg);
  },

  addVehicle: async (v) => {
    const existing = get().vehicles.map((item) => ({ ...item, isPrimary: false }));
    let serverVehId = `veh-${Date.now()}`;
    try {
      const res = await apiClient.post("/vehicles", {
        make_model: v.makeModel,
        plate_number: v.plateNumber,
        battery_capacity_kwh: v.batteryCapacityKwh,
      });
      if (res.data?.data?.id) {
        serverVehId = String(res.data.data.id);
      }
    } catch {
      // Persisted locally when offline
    }
    const newVehicle: VehicleRecord = {
      ...v,
      id: serverVehId,
      maxRangeKm: Math.round((v.rangeKm / Math.max(10, v.socPercent)) * 100),
      isPrimary: true,
    };
    const updated = [newVehicle, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
    const msg = `${newVehicle.makeModel} (${newVehicle.plateNumber}) is now your active EV.`;
    get().showToast("Vehicle Added to Garage", msg, "success");
    await fireNativePushNotification("EV Added to Garage", msg);
  },

  setPrimaryVehicle: async (id) => {
    const updated = get().vehicles.map((v) => ({
      ...v,
      isPrimary: v.id === id,
    }));
    const active = updated.find((v) => v.id === id);
    try {
      await apiClient.patch(`/vehicles/${id}/primary`);
    } catch {
      // Persisted locally when offline
    }
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
    if (active) {
      get().showToast(
        "Active EV Switched",
        `${active.makeModel} • ${active.plateNumber} (${active.socPercent}% SOC • ${active.rangeKm} km)`,
        "info"
      );
    }
  },

  removeVehicle: async (id) => {
    if (get().vehicles.length <= 1) {
      get().showToast(
        "Cannot Remove Last Vehicle",
        "At least 1 active EV must remain in your garage.",
        "warning"
      );
      return;
    }
    try {
      await apiClient.delete(`/vehicles/${id}`);
    } catch {
      // Persisted locally when offline
    }
    const filtered = get().vehicles.filter((v) => v.id !== id);
    if (filtered.length > 0 && !filtered.some((v) => v.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(filtered));
    set({ vehicles: filtered });
    get().showToast("Vehicle Removed", "Your EV garage has been updated.", "info");
  },

  updatePrimaryVehicleSoc: async (newSoc) => {
    const clamped = Math.max(5, Math.min(100, Math.round(newSoc)));
    let primaryId = "";
    let primaryRange = 250;
    const updated = get().vehicles.map((v) => {
      if (!v.isPrimary) return v;
      primaryId = v.id;
      const maxRange = v.maxRangeKm || (v.batteryCapacityKwh < 10 ? 110 : 350);
      primaryRange = Math.round((clamped / 100) * maxRange);
      return {
        ...v,
        socPercent: clamped,
        rangeKm: primaryRange,
      };
    });
    if (primaryId) {
      try {
        await apiClient.patch(`/vehicles/${primaryId}/soc`, {
          soc_percent: clamped,
          range_km: primaryRange,
        });
      } catch {
        // Persisted locally when offline
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
  },

  adjustActiveVehicleSoc: async (deltaPercent) => {
    const active = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];
    if (!active) return;
    const nextSoc = Math.max(5, Math.min(100, active.socPercent + deltaPercent));
    await get().updatePrimaryVehicleSoc(nextSoc);
  },

  addOrUpdateHostStation: async (input) => {
    const user = get().user;
    const isEdit = Boolean(input.id);
    const stationId = input.id || `p2p-host-${Date.now()}`;
    const lat =
      Number(input.latitude) || get().userLocation?.latitude || 12.1045;
    const lng =
      Number(input.longitude) || get().userLocation?.longitude || 75.2058;
    const locality = resolveLocalityFromCoordinates(lat, lng);
    const addressCheck = validateAddressMatchesCoordinates(
      input.address,
      lat,
      lng,
      25
    );
    if (!addressCheck.valid) {
      throw new Error(
        addressCheck.warningMessage ||
          "Station address does not match the GPS pin coordinates."
      );
    }
    const resolvedTitle = (
      input.title ||
      input.name ||
      `${locality.city} P2P Home Charger`
    ).trim();
    const connectorSpecs: ConnectorSpec[] =
      input.connectorSpecs && input.connectorSpecs.length > 0
        ? input.connectorSpecs.map((c, idx) => ({
            ...c,
            plugImage:
              c.plugImage ||
              (c.name.toUpperCase().includes("15A")
                ? "TYPE_A"
                : c.name.toUpperCase().includes("CCS")
                ? "CHADEMO"
                : "TYPE_B"),
            id: c.id || `${stationId}-conn-${idx + 1}`,
          }))
        : (input.connectors && input.connectors.length > 0
            ? input.connectors
            : [{ name: "Type-2 AC Wallbox (7.4 kW)", powerKw: 7.4, pricePerKwh: 10.5 }]
          ).map((c, idx) => ({
            id: `${stationId}-conn-${idx + 1}`,
            name: c.name,
            priceLabel: `₹${Number(c.pricePerKwh).toFixed(2)}/kWh`,
            pricePerKwh: Number(c.pricePerKwh),
            slotLabel: `Slot ${String.fromCharCode(65 + idx)} • ${c.powerKw} kW`,
            powerKw: Number(c.powerKw),
            plugImage: c.name.toUpperCase().includes("15A")
              ? "TYPE_A"
              : c.name.toUpperCase().includes("CCS")
              ? "CHADEMO"
              : "TYPE_B",
          }));

    const maxPowerKw =
      input.maxPowerKw ?? Math.max(...connectorSpecs.map((c) => c.powerKw), 3.3);
    const minPricePerKwh =
      input.pricePerKwh ?? Math.min(...connectorSpecs.map((c) => c.pricePerKwh), 10.5);
    const isOnline = input.isOnline !== false;
    const autoApprove = input.autoApproveVerifiedDrivers !== false;

    const upsertedStation: StationRecord = {
      id: stationId,
      name: resolvedTitle,
      hostName: input.hostName || user?.fullName || "Verified EV Host",
      hostPhone: input.hostPhone || user?.phoneNumber || "+919847049210",
      address: input.address.trim(),
      city: input.city || locality.city,
      pincode: input.pincode || locality.pincode,
      landmark: input.landmark?.trim(),
      latitude: lat,
      longitude: lng,
      stationType: "P2P_HOME",
      connectorTypes: input.connectorTypes || connectorSpecs.map((c) => c.name),
      connectorSpecs,
      maxPowerKw,
      pricePerKwh: minPricePerKwh,
      parkingFeePerHrInr: input.parkingFeePerHrInr ?? 15,
      rating: 5.0,
      reviewsCount: isEdit ? 12 : 1,
      distanceKm: 0.2,
      etaMins: 2,
      isAvailable: isOnline,
      isOnline,
      isUserHosted: true,
      autoApproveVerifiedDrivers: autoApprove,
      discomBoard: input.discomBoard || "KSEB",
      parkingBayNumber: input.parkingBayNumber || "Driveway Bay A-1",
      gateInstructions:
        input.gateInstructions || "Show 6-digit pass to security guard at main gate",
      amenities: input.amenities || ["Covered Parking", "CCTV Monitored", "24/7 Access"],
      lastSyncedAt: new Date().toISOString(),
    };

    try {
      const resp = await apiClient.post("/host/stations", {
        id: stationId,
        title: upsertedStation.name,
        address: upsertedStation.address,
        landmark: upsertedStation.landmark,
        latitude: upsertedStation.latitude,
        longitude: upsertedStation.longitude,
        hostName: upsertedStation.hostName,
        hostPhone: upsertedStation.hostPhone,
        discomBoard: upsertedStation.discomBoard,
        parkingBayNumber: upsertedStation.parkingBayNumber,
        gateInstructions: upsertedStation.gateInstructions,
        amenities: upsertedStation.amenities,
        connectors: connectorSpecs.map((c) => ({
          name: c.name,
          powerKw: c.powerKw,
          pricePerKwh: c.pricePerKwh,
        })),
        parkingFeePerHrInr: upsertedStation.parkingFeePerHrInr,
        isOnline: upsertedStation.isOnline,
        autoApproveVerifiedDrivers: upsertedStation.autoApproveVerifiedDrivers,
      });
      if (resp.data?.node_id && !isEdit) {
        upsertedStation.id = String(resp.data.node_id);
      }
    } catch {
      // Offline / local ACID fallback
    }

    const currentStations = get().stations;
    const exists = currentStations.some((s) => s.id === stationId || s.id === upsertedStation.id);
    const updatedStations = exists
      ? currentStations.map((s) =>
          s.id === stationId || s.id === upsertedStation.id ? upsertedStation : s
        )
      : [upsertedStation, ...currentStations];

    const newNotif: NotificationItem = {
      id: `NOTIF-HOST-${Date.now()}`,
      title: isEdit
        ? `Host Station Updated: ${upsertedStation.name}`
        : "Your P2P Station is now LIVE on the Map!",
      message: `${upsertedStation.name} (from ₹${upsertedStation.pricePerKwh.toFixed(2)}/kWh) is active at ${upsertedStation.address}.`,
      time: "Just now",
      read: false,
      category: "HOST",
    };

    await AsyncStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updatedStations));
    set({
      stations: updatedStations,
      selectedStationId: upsertedStation.id,
      notifications: [newNotif, ...get().notifications],
    });

    const toastTitle = isEdit
      ? "Host Station & Tariff Updated!"
      : "Your P2P Station is now LIVE on the Map!";
    const toastMsg = `${upsertedStation.name} • ₹${upsertedStation.pricePerKwh.toFixed(2)}/kWh`;
    get().showToast(toastTitle, toastMsg, "success");
    await fireNativePushNotification(toastTitle, toastMsg);
    return upsertedStation;
  },

  toggleHostStationOnline: async (stationId, forceOnline) => {
    const currentStations = get().stations;
    const target = currentStations.find((s) => s.id === stationId) || currentStations[0];
    if (!target) return;

    const nextOnline =
      typeof forceOnline === "boolean" ? forceOnline : !(target.isOnline !== false);

    try {
      await apiClient.patch(`/host/stations/${target.id}/toggle-online?is_online=${nextOnline}`);
    } catch {
      // Local persistence fallback
    }

    const updatedStations = currentStations.map((s) =>
      s.id === target.id
        ? { ...s, isOnline: nextOnline, isAvailable: nextOnline }
        : s
    );
    await AsyncStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updatedStations));
    set({ stations: updatedStations });

    const title = nextOnline
      ? `${target.name} is ONLINE`
      : `${target.name} is PAUSED`;
    const msg = nextOnline
      ? "Visible on the Driver Map with P2P Host • Instant Book badge."
      : "Hidden from active Driver discovery while offline.";
    get().showToast(title, msg, nextOnline ? "success" : "warning");
    await fireNativePushNotification(title, msg);
  },

  deleteHostStation: async (stationId) => {
    const currentStations = get().stations;
    const target = currentStations.find((s) => s.id === stationId);
    if (!target) return;

    try {
      await apiClient.delete(`/host/stations/${stationId}`);
    } catch {
      // Local persistence fallback
    }

    const updated = currentStations.filter((s) => s.id !== stationId);
    await AsyncStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updated));
    set({
      stations: updated,
      selectedStationId: updated[0]?.id || "s1",
    });
    get().showToast(
      "Host Station Removed",
      `${target.name} has been decommissioned from the grid.`,
      "warning"
    );
  },

  syncLiveStationsForRegion: async (lat, lng, radiusKm = 25) => {
    const locality = resolveLocalityFromCoordinates(lat, lng);
    const currentStations = get().stations.map((s) =>
      normalizeStationRecord(s, lat, lng)
    );
    // Preserve active User-Hosted P2P stations
    const p2pHostRecords = currentStations.filter(
      (s) =>
        (s.isUserHosted || s.stationType === "P2P_HOME") &&
        s.isOnline !== false &&
        !s.name.toLowerCase().includes("lotus greens")
    );

    const p2pLiveInputs: LiveEvStation[] = p2pHostRecords.map((h) => ({
      id: h.id,
      title: h.name,
      operator: h.hostName,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      distanceKm: calcDistanceKm(lat, lng, h.latitude, h.longitude),
      driveMins: Math.max(2, Math.round(calcDistanceKm(lat, lng, h.latitude, h.longitude) * 2.2)),
      rating: h.rating || 4.9,
      reviewCount: h.reviewsCount || 18,
      stationType: "P2P_HOME",
      hostName: h.hostName,
      phone: h.hostPhone,
      connectors: (h.connectorSpecs || DEFAULT_CONNECTOR_SPECS).map((cs) => ({
        id: cs.id,
        type: cs.name.toUpperCase().includes("CCS")
          ? "CCS2"
          : cs.name.toUpperCase().includes("TYPE")
          ? "Type-2"
          : cs.name.toUpperCase().includes("LECCS")
          ? "LECCS"
          : "15A",
        powerKw: cs.powerKw,
        pricePerKwhInr: cs.pricePerKwh,
        availableCount: 1,
        totalCount: 1,
      })),
    }));

    const liveItems = await fetchRealTimeEvStations(
      lat,
      lng,
      radiusKm,
      p2pLiveInputs
    );

    // ONE canonical station mapper for Home carousel, Map sheet, Station details, and Booking
    const mappedStations: StationRecord[] = liveItems.map((item) => {
      const existingHost = p2pHostRecords.find((h) => h.id === item.id);
      if (existingHost) {
        return normalizeStationRecord(existingHost, lat, lng);
      }
      return normalizeStationRecord(item, lat, lng);
    });

    // Keep distant or paused user-hosted stations at the tail with their true Haversine distance
    const otherUserHosts = currentStations
      .filter(
        (s) => s.isUserHosted && !mappedStations.some((m) => m.id === s.id)
      )
      .map((s) => normalizeStationRecord(s, lat, lng));

    const sortedInRadius = [...mappedStations].sort(
      (a, b) => a.distanceKm - b.distanceKm
    );

    const finalStations =
      sortedInRadius.length > 0
        ? [...sortedInRadius, ...otherUserHosts]
        : ACTIVE_INITIAL_STATIONS.map((s) =>
            normalizeStationRecord(s, lat, lng)
          ).sort((a, b) => a.distanceKm - b.distanceKm);

    const closestOnline =
      sortedInRadius[0] || finalStations.find((s) => s.isOnline !== false);

    set({
      stations: finalStations,
      selectedStationId:
        closestOnline?.id ||
        finalStations[0]?.id ||
        "kl_pnr_chargemod_sahakarana",
      nearbyCity: locality.city,
      lastLiveSyncAt: new Date().toISOString(),
    });
  },

  selectStation: (stationId) => {
    set({ selectedStationId: stationId });
  },

  toggleFavoriteStation: async (stationId) => {
    const current = get().favoriteStationIds;
    const isRemoving = current.includes(stationId);
    const updated = isRemoving
      ? current.filter((id) => id !== stationId)
      : [...current, stationId];
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    set({ favoriteStationIds: updated });
    const st = get().stations.find((s) => s.id === stationId);
    get().showToast(
      isRemoving ? "Removed from Saved Hubs" : "Added to Saved Charging Hubs",
      st ? st.name : "Updated your favorite stations.",
      "info"
    );
  },

  createBooking: async (b) => {
    const currentUser = get().user;
    const currentBalance = currentUser?.voltCreditsBalance ?? 0;
    if (currentBalance < b.totalAmount) {
      const shortfall = Number((b.totalAmount - currentBalance).toFixed(2));
      const suggestedTopUp = Math.max(100, Math.ceil(shortfall));
      get().showToast(
        "Insufficient Wallet Balance",
        `Required: ₹${b.totalAmount.toFixed(2)} • Available: ₹${currentBalance.toFixed(2)} (Shortfall: ₹${shortfall.toFixed(2)}). Preparing VoltMate Wallet Top-Up...`,
        "warning"
      );
      await get().topUpWallet(suggestedTopUp, "Razorpay Booking Shortfall");
      throw new Error(`INSUFFICIENT_WALLET_BALANCE:${shortfall.toFixed(2)}`);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const st = get().stations.find((s) => s.id === b.stationId);
    const activeVehicle = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];
    const isP2pHostStation = st?.stationType === "P2P_HOME" || Boolean(st?.isUserHosted);
    const autoApprove = st?.autoApproveVerifiedDrivers !== false;

    let serverBookingId = `VOLT-${Math.floor(10000 + Math.random() * 90000)}`;
    let serverPin = otpCode;

    try {
      const bkRes = await apiClient.post("/bookings", {
        stationId: b.stationId,
        connectorType: b.connectorType,
        scheduledTime: b.slotTime,
        gatePassPin: otpCode,
        estimatedKwh: b.estimatedKwh,
        estimatedAmountInr: b.totalAmount,
        paymentMode: "WALLET",
      });
      if (bkRes.data?.booking_natural_uuid) {
        serverBookingId = String(bkRes.data.booking_natural_uuid);
      }
      if (bkRes.data?.gate_pass_pin_num) {
        serverPin = String(bkRes.data.gate_pass_pin_num);
      }
    } catch (err: any) {
      if (err?.response?.status === 402) {
        const shortfall = Math.max(100, Math.ceil(b.totalAmount - currentBalance));
        get().showToast(
          "Insufficient Wallet Balance",
          err.response?.data?.detail || "Please top up your wallet to reserve this slot.",
          "warning"
        );
        await get().topUpWallet(shortfall, "Razorpay Booking Hold");
        throw err;
      }
    }

    const booking: BookingRecord = {
      ...b,
      id: serverBookingId,
      hostPhone: b.hostPhone || st?.hostPhone || "+919847011223",
      otpCode: serverPin,
      status: isP2pHostStation && !autoApprove ? "UPCOMING" : "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    // Place pre-authorized wallet hold (`BOOKING_HOLD`)
    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        voltCreditsBalance: Math.max(
          0,
          Number((currentUser.voltCreditsBalance - b.totalAmount).toFixed(2))
        ),
      };
      const holdTx: WalletTransaction = {
        id: `TX-HOLD-${booking.id}`,
        title: `Booking Hold: ${b.stationName}`,
        date: "Pre-Authorized Hold",
        amount: `-₹${b.totalAmount.toFixed(2)}`,
        isCredit: false,
      };
      const updatedTxns = [holdTx, ...get().transactions];
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updatedUser)),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
        AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
      ]);
      set({ user: updatedUser, transactions: updatedTxns });
    }

    let updatedHostRequests = get().hostRequests;
    if (isP2pHostStation) {
      const hostReq: HostRequestItem = {
        id: `REQ-${booking.id}`,
        bookingId: booking.id,
        stationId: b.stationId,
        stationName: b.stationName,
        driverName: currentUser?.fullName || "Verified EV Driver",
        vehicle: `${activeVehicle?.makeModel || "Tata Nexon EV"} • ${activeVehicle?.plateNumber || "KL-07-CS-4921"}`,
        plateNumber: activeVehicle?.plateNumber || "KL-07-CS-4921",
        connector: b.connectorType,
        slot: b.slotTime,
        estEnergy: `${b.estimatedKwh} kWh`,
        estKwhNum: b.estimatedKwh,
        payout: `+₹${b.totalAmount.toFixed(2)}`,
        payoutAmount: b.totalAmount,
        rating: "4.9 ★",
        otpCode,
        status: autoApprove ? "PENDING" : "PENDING",
      };
      updatedHostRequests = [hostReq, ...updatedHostRequests];
      const hostState = {
        hostRequests: updatedHostRequests,
        hostEarningsBalance: get().hostEarningsBalance,
        hostWeeklyEarnings: get().hostWeeklyEarnings,
        hostWeeklyKwh: get().hostWeeklyKwh,
        hostSessionsCount: get().hostSessionsCount,
        hostTransactions: get().hostTransactions,
        hostSchedule: get().hostSchedule,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    }

    const updated = [booking, ...get().bookings];
    const passFormatted = `#${otpCode.slice(0, 3)}-${otpCode.slice(3)}`;
    const notifTitle =
      isP2pHostStation && !autoApprove
        ? `Booking Sent to Host: ${b.stationName}`
        : `Slot Reserved: ${b.stationName}`;
    const notifMsg =
      isP2pHostStation && !autoApprove
        ? `Awaiting approval in Host Studio -> Booking Requests for ${b.slotTime}.`
        : `Slot ${b.slotTime} (${b.connectorType}) confirmed • Gate Pass ${passFormatted} ready.`;
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: notifTitle,
      message: notifMsg,
      time: "Just now",
      read: false,
      category: "BOOKING",
    };
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    set({
      bookings: updated,
      hostRequests: updatedHostRequests,
      notifications: [newNotif, ...get().notifications],
    });
    get().showToast(notifTitle, notifMsg, "success");
    await fireNativePushNotification(notifTitle, notifMsg);
    return booking;
  },

  cancelBooking: async (bookingId) => {
    const target = get().bookings.find((b) => b.id === bookingId);
    try {
      await apiClient.post(`/bookings/${bookingId}/cancel`);
    } catch {
      // Proceed with local hold release when offline or non-UUID id
    }
    const updated = get().bookings.map((b) =>
      b.id === bookingId ? { ...b, status: "CANCELLED" as const } : b
    );
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));

    const currentUser = get().user;
    if (target && currentUser && target.totalAmount > 0) {
      const refundedBalance = Number(
        (currentUser.voltCreditsBalance + target.totalAmount).toFixed(2)
      );
      const updatedUser: UserProfile = {
        ...currentUser,
        voltCreditsBalance: refundedBalance,
      };
      const releaseTx: WalletTransaction = {
        id: `TX-REL-${bookingId}`,
        title: `Hold Released: ${target.stationName}`,
        date: "Just now",
        amount: `+₹${target.totalAmount.toFixed(2)}`,
        isCredit: true,
      };
      const updatedTxns = [releaseTx, ...get().transactions];
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updatedUser)),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
        AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
      ]);
      set({
        bookings: updated,
        user: updatedUser,
        transactions: updatedTxns,
      });
      get().showToast(
        "Reservation Cancelled & Hold Released",
        `Cancelled slot at ${target.stationName}. ₹${target.totalAmount.toFixed(2)} returned to your wallet.`,
        "info"
      );
      return;
    }

    set({ bookings: updated });
    get().showToast(
      "Reservation Cancelled",
      target ? `Cancelled slot at ${target.stationName}.` : "Slot released.",
      "warning"
    );
  },

  rescheduleBooking: async (bookingId, newSlotTime) => {
    const target = get().bookings.find((b) => b.id === bookingId);
    if (!target) return;
    const slotLabel = newSlotTime || "Today • Next Available (+2 hrs)";
    try {
      await apiClient.patch(`/bookings/${bookingId}/reschedule`, {
        offset_hours: 2,
        slot_label: slotLabel,
      });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        get().showToast(
          "Slot Conflict",
          err.response?.data?.detail || "Requested time slot is already booked.",
          "warning"
        );
        return;
      }
    }
    const updated = get().bookings.map((b) =>
      b.id === bookingId ? { ...b, slotTime: slotLabel } : b
    );
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    set({ bookings: updated });
    get().showToast(
      "Slot Rescheduled",
      `Updated ${target.stationName} reservation to ${slotLabel}.`,
      "success"
    );
  },

  startChargingSession: (bookingId, stationId) => {
    if (telemetryIntervalRef) {
      clearInterval(telemetryIntervalRef);
      telemetryIntervalRef = null;
    }

    const bookings = get().bookings;
    const stations = get().stations;
    const activeVehicle = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];

    const targetBooking =
      (bookingId ? bookings.find((b) => b.id === bookingId) : bookings[0]) || null;
    const targetStation =
      (stationId
        ? stations.find((s) => s.id === stationId)
        : targetBooking
        ? stations.find((s) => s.id === targetBooking.stationId)
        : stations[0]) || stations[0];

    const powerKw = targetBooking?.powerKw ?? targetStation.maxPowerKw ?? 7.4;
    const ratePerKwh = targetBooking?.pricePerKwh ?? targetStation.pricePerKwh ?? 10.5;
    const baseCurrent =
      powerKw >= 30 ? 135.4 : powerKw >= 7 ? 31.8 : 14.2;
    const initialSoc = activeVehicle?.socPercent ?? 72;

    const session: ActiveChargingSession = {
      bookingId: targetBooking?.id || `VOLT-${Math.floor(10000 + Math.random() * 90000)}`,
      stationId: targetStation.id,
      stationName: targetBooking?.stationName || targetStation.name,
      hostName: targetBooking?.hostName || targetStation.hostName,
      hostPhone: targetBooking?.hostPhone || targetStation.hostPhone || "+919847011223",
      connectorType: targetBooking?.connectorType || targetStation.connectorTypes[0] || "Type-2 AC Wallbox",
      powerKw,
      ratePerKwh,
      voltageV: 231.2,
      currentA: baseCurrent,
      elapsedSeconds: 1,
      deliveredKwh: 0.12,
      liveCostInr: Number((0.12 * ratePerKwh).toFixed(2)),
      initialSoc,
      currentSoc: initialSoc,
      targetCutOffSoc: 80,
      isPaused: false,
    };

    set({
      activeSession: session,
      isChargingModalOpen: true,
      latestSettledReceipt: null,
    });
    void AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));

    if (targetBooking?.id) {
      apiClient
        .post(`/bookings/${targetBooking.id}/start-session`, {
          pin_code: (targetBooking.otpCode || "544555").slice(0, 4),
          start_meter_reading: 0.0,
        })
        .catch(() => {
          // Offline session start
        });
    }

    fireNativePushNotification(
      `Charging Started at ${session.stationName}`,
      `Delivering ${powerKw} kW @ ₹${ratePerKwh.toFixed(2)}/kWh to ${activeVehicle?.makeModel || "your EV"}.`
    );

    telemetryIntervalRef = setInterval(() => {
      const current = get().activeSession;
      if (!current || current.isPaused) return;

      const veh = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];
      const batteryCap = veh?.batteryCapacityKwh || 45.0;

      // Accelerate telemetry slightly so user sees kWh, ₹, and SOC% ticking up live every second
      const nextElapsed = current.elapsedSeconds + 1;
      const kwhStep = Number(Math.max(0.04, (current.powerKw / 3600) * 18).toFixed(3));
      const nextKwh = Number((current.deliveredKwh + kwhStep).toFixed(2));
      const nextCost = Number((nextKwh * current.ratePerKwh).toFixed(2));
      const jitterV = Number((229.4 + Math.random() * 4.2).toFixed(1));
      const jitterA = Number((baseCurrent + (Math.random() - 0.5) * 0.8).toFixed(1));
      const computedSoc = Math.min(
        100,
        Math.round(current.initialSoc + (nextKwh / batteryCap) * 100)
      );

      set({
        activeSession: {
          ...current,
          elapsedSeconds: nextElapsed,
          voltageV: jitterV,
          currentA: jitterA,
          deliveredKwh: nextKwh,
          liveCostInr: nextCost,
          currentSoc: computedSoc,
        },
      });
    }, 1000);
  },

  togglePauseChargingSession: () => {
    const current = get().activeSession;
    if (!current) return;
    const nextPaused = !current.isPaused;
    set({
      activeSession: {
        ...current,
        isPaused: nextPaused,
      },
    });
    get().showToast(
      nextPaused ? "Charging Paused" : "Charging Resumed",
      nextPaused
        ? "Power flow temporarily suspended."
        : `Delivering ${current.powerKw} kW at ${current.stationName}.`,
      "info"
    );
  },

  setTargetCutOffSoc: (target) => {
    const current = get().activeSession;
    if (current) {
      set({
        activeSession: { ...current, targetCutOffSoc: target },
      });
    }
    get().showToast(
      `Smart Cut-Off Set to ${target}%`,
      `Charger will auto-stop when your EV battery reaches ${target}% SOC.`,
      "info"
    );
  },

  openChargingModal: () => set({ isChargingModalOpen: true }),
  closeChargingModal: () => set({ isChargingModalOpen: false }),
  clearSettledReceipt: () => set({ latestSettledReceipt: null }),

  stopChargingSession: async () => {
    if (telemetryIntervalRef) {
      clearInterval(telemetryIntervalRef);
      telemetryIntervalRef = null;
    }
    const current = get().activeSession;
    if (!current) return null;

    const durationMins = Math.max(1, Math.round(current.elapsedSeconds / 60));
    const receipt = await get().completeChargingSession({
      bookingId: current.bookingId,
      stationName: current.stationName,
      hostName: current.hostName,
      energyKwh: current.deliveredKwh,
      durationMins,
      amount: current.liveCostInr,
      ratePerKwh: current.ratePerKwh,
      connectorType: current.connectorType,
      finalSocPercent: current.currentSoc,
    });

    set({
      activeSession: null,
      isChargingModalOpen: false,
      latestSettledReceipt: receipt,
    });
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);

    return receipt;
  },

  completeChargingSession: async ({
    bookingId,
    stationName,
    hostName,
    energyKwh,
    durationMins,
    amount,
    ratePerKwh = 10.5,
    connectorType = "Type-2 AC Wallbox",
    finalSocPercent,
  }) => {
    if (telemetryIntervalRef) {
      clearInterval(telemetryIntervalRef);
      telemetryIntervalRef = null;
    }

    const currentBookings = get().bookings;
    const matchedBooking = bookingId
      ? currentBookings.find((b) => b.id === bookingId)
      : undefined;
    const heldAmount = matchedBooking?.totalAmount ?? 0;

    if (bookingId) {
      try {
        await apiClient.post(`/bookings/${bookingId}/complete-session`, {
          end_meter_reading: energyKwh,
        });
      } catch {
        // Offline session completion
      }
    }

    const updatedBookings = bookingId
      ? currentBookings.filter((b) => b.id !== bookingId)
      : currentBookings;

    const activeVehicle = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];
    const randNum = Math.floor(1000 + Math.random() * 9000);

    const newRecord: ChargingHistoryRecord = {
      id: `HIST-${randNum}`,
      invoiceNumber: `INV-KL-2026-${randNum}`,
      station: stationName,
      hostName: hostName || "Spark Grid Kerala",
      date: "Today • Just Completed",
      energyKwh: Number(energyKwh.toFixed(2)),
      durationMins: Math.max(1, durationMins),
      amount: Number(amount.toFixed(2)),
      ratePerKwh,
      connectorType,
      vehiclePlate: activeVehicle?.plateNumber || "KL-07-CS-4921",
      status: "SETTLED",
    };
    const updatedHistory = [newRecord, ...get().chargingHistory];

    const newTx: WalletTransaction = {
      id: `TX-${Date.now()}`,
      title: `Charge: ${stationName}`,
      date: "Just now",
      amount: `-₹${amount.toFixed(2)}`,
      isCredit: false,
    };
    const updatedTxns = [newTx, ...get().transactions];

    const currentUser =
      get().user ||
      normalizeUserRecord({
        id: "usr_guest",
        email: "driver@voltmate.in",
        fullName: "EV Driver",
        role: "DRIVER",
        voltCreditsBalance: 250.0,
      });
    // Reconcile pre-authorized booking hold against actual session bill
    const netDelta = Number((heldAmount - amount).toFixed(2));
    const updatedUser: UserProfile = {
      ...currentUser,
      voltCreditsBalance: Math.max(
        0,
        Number((currentUser.voltCreditsBalance + netDelta).toFixed(2))
      ),
    };

    if (typeof finalSocPercent === "number") {
      await get().updatePrimaryVehicleSoc(finalSocPercent);
    }

    const notifTitle = `⚡ Charging Complete! ₹${amount.toFixed(2)} Settled`;
    const notifMsg = `Delivered ${energyKwh.toFixed(2)} kWh (₹${amount.toFixed(2)}) at ${stationName}. Invoice #${newRecord.invoiceNumber} ready.`;

    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: notifTitle,
      message: notifMsg,
      time: "Just now",
      read: false,
      category: "BOOKING",
    };

    // Credit P2P Host Earnings & Settlement Ledger automatically
    const newHostBalance = Number((get().hostEarningsBalance + amount).toFixed(2));
    const newHostWeekly = Number((get().hostWeeklyEarnings + amount).toFixed(2));
    const newHostKwh = Number((get().hostWeeklyKwh + energyKwh).toFixed(1));
    const newHostSessions = get().hostSessionsCount + 1;
    const hostLedgerEntry: WalletTransaction = {
      id: `HTX-SETTLE-${Date.now()}`,
      title: `Session #${newRecord.invoiceNumber} (${stationName} • ${energyKwh.toFixed(1)} kWh)`,
      date: "Just now",
      amount: `+₹${amount.toFixed(2)}`,
      isCredit: true,
    };
    const updatedHostTxns = [hostLedgerEntry, ...get().hostTransactions];
    const updatedHostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: newHostBalance,
      hostWeeklyEarnings: newHostWeekly,
      hostWeeklyKwh: newHostKwh,
      hostSessionsCount: newHostSessions,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings)),
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory)),
      AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(updatedHostState)),
    ]);

    set({
      bookings: updatedBookings,
      chargingHistory: updatedHistory,
      transactions: updatedTxns,
      user: updatedUser,
      hostEarningsBalance: newHostBalance,
      hostWeeklyEarnings: newHostWeekly,
      hostWeeklyKwh: newHostKwh,
      hostSessionsCount: newHostSessions,
      hostTransactions: updatedHostTxns,
      activeSession: null,
      latestSettledReceipt: newRecord,
      notifications: [newNotif, ...get().notifications],
    });

    get().showToast(notifTitle, notifMsg, "success");
    await fireNativePushNotification(notifTitle, notifMsg);

    return newRecord;
  },

  markNotificationsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
    get().showToast("Notifications Cleared", "All alerts marked as read.", "info");
  },

  triggerTestReminder: () => {
    const upcoming = get().bookings[0];
    const stationTitle = upcoming ? upcoming.stationName : "Spark EV Fast Hub (Infopark Phase 1)";
    const passCode = upcoming
      ? `${upcoming.otpCode.slice(0, 3)}-${upcoming.otpCode.slice(3)}`
      : "544-555";
    const title = `⏰ Slot Reminder: ${stationTitle}`;
    const msg = `Your charging slot starts in 15 minutes! Gate Pass #${passCode} is ready for plug-in.`;
    const reminderNotif: NotificationItem = {
      id: `NOTIF-REM-${Date.now()}`,
      title,
      message: msg,
      time: "Just now",
      read: false,
      category: "REMINDER",
    };
    set({
      notifications: [reminderNotif, ...get().notifications],
    });
    get().showToast(title, msg, "warning");
    fireNativePushNotification(title, msg);
  },

  snoozeReminder: (minutes) => {
    set({
      reminderSnoozedUntil: `${minutes} mins`,
    });
    get().showToast(
      `Reminder Snoozed (${minutes}m)`,
      `We will alert you again 5 minutes before your slot.`,
      "info"
    );
  },

  respondHostRequest: async (requestId, accept) => {
    const req = get().hostRequests.find((r) => r.id === requestId);
    if (!req) return;
    const generatedOtp =
      req.otpCode || Math.floor(100000 + Math.random() * 900000).toString();

    if (req.bookingId) {
      try {
        await apiClient.patch(`/bookings/${req.bookingId}/respond`, {
          accept,
        });
      } catch {
        // Proceed with local state update if offline
      }
    }

    const updatedRequests: HostRequestItem[] = accept
      ? get().hostRequests.map((r) =>
          r.id === requestId ? { ...r, status: "APPROVED", otpCode: generatedOtp } : r
        )
      : get().hostRequests.filter((r) => r.id !== requestId);

    // Also update matching Driver Booking status & Gate Pass PIN (do NOT credit host earnings until charging session completes)
    const updatedBookings = get().bookings.map((b) => {
      if (b.id === req.bookingId || `REQ-${b.id}` === requestId) {
        return {
          ...b,
          status: (accept ? "CONFIRMED" : "CANCELLED") as BookingRecord["status"],
          otpCode: generatedOtp,
        };
      }
      return b;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings));

    const hostState = {
      hostRequests: updatedRequests,
      hostEarningsBalance: get().hostEarningsBalance,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostWeeklyKwh: get().hostWeeklyKwh,
      hostSessionsCount: get().hostSessionsCount,
      hostTransactions: get().hostTransactions,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));

    set({
      bookings: updatedBookings,
      hostRequests: updatedRequests,
    });

    if (accept) {
      const title = `Gate Pass #${generatedOtp.slice(0, 3)}-${generatedOtp.slice(3)} Issued!`;
      const msg = `Approved ${req.driverName} • Earnings will settle upon session completion.`;
      get().showToast(title, msg, "success");
      await fireNativePushNotification(title, msg);
    } else {
      get().showToast(
        "Request Declined & Hold Released",
        `Declined slot request from ${req.driverName}. Driver's booking hold released.`,
        "warning"
      );
    }
  },

  withdrawHostEarnings: async (amount, upiId) => {
    const currentBal = get().hostEarningsBalance;
    if (currentBal < 100 || amount > currentBal) {
      get().showToast(
        "Insufficient Host Balance",
        `Available host earnings: ₹${currentBal.toFixed(2)}. Minimum payout request is ₹100.00.`,
        "warning"
      );
      return;
    }
    const withdrawAmt = Math.min(currentBal, Math.max(100, amount));
    let payoutId = `PAYOUT-${Date.now()}`;
    let statusLabel = "PENDING_APPROVAL";

    try {
      const payoutRes = await requestHostPayoutOnServer({
        amountInr: withdrawAmt,
        upiVpa: upiId,
      });
      payoutId = payoutRes.payout_id;
      statusLabel = payoutRes.status;
    } catch {
      // Offline queuing with PENDING_APPROVAL status
    }

    const newBal = Number((currentBal - withdrawAmt).toFixed(2));
    const newTx: WalletTransaction = {
      id: payoutId,
      title: `UPI Payout Request (${upiId}) • ${statusLabel}`,
      date: "Pending Approval",
      amount: `-₹${withdrawAmt.toFixed(2)}`,
      isCredit: false,
    };
    const updatedHostTxns = [newTx, ...get().hostTransactions];
    const hostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: newBal,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostWeeklyKwh: get().hostWeeklyKwh,
      hostSessionsCount: get().hostSessionsCount,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({
      hostEarningsBalance: newBal,
      hostTransactions: updatedHostTxns,
    });
    const title = `Payout Request Recorded (₹${withdrawAmt.toFixed(2)})`;
    const msg = `Queued for settlement to ${upiId} (Status: ${statusLabel}).`;
    get().showToast(title, msg, "info");
    await fireNativePushNotification(title, msg);
  },

  convertHostEarningsToWallet: async (amount) => {
    const currentBal = get().hostEarningsBalance;
    const transferAmt = Math.min(currentBal, Math.max(100, amount));
    const bonusAmt = Number((transferAmt * 1.1).toFixed(2));
    const newHostBal = Number((currentBal - transferAmt).toFixed(2));
    const hostTx: WalletTransaction = {
      id: `HTX-${Date.now()}`,
      title: `Converted to Driver Wallet (+10% Bonus)`,
      date: "Just now",
      amount: `-₹${transferAmt.toFixed(2)}`,
      isCredit: false,
    };
    const updatedHostTxns = [hostTx, ...get().hostTransactions];
    const hostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: newHostBal,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostWeeklyKwh: get().hostWeeklyKwh,
      hostSessionsCount: get().hostSessionsCount,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({
      hostEarningsBalance: newHostBal,
      hostTransactions: updatedHostTxns,
    });
    await get().topUpWallet(bonusAmt, "Host Earnings + 10% Bonus", false);
  },

  updateHostSchedule: async (schedule) => {
    try {
      await apiClient.put("/host/schedule", { schedule });
    } catch {
      // Offline persistence
    }
    const hostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: get().hostEarningsBalance,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostWeeklyKwh: get().hostWeeklyKwh,
      hostSessionsCount: get().hostSessionsCount,
      hostTransactions: get().hostTransactions,
      hostSchedule: schedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({ hostSchedule: schedule });
    const title = "Recurring Schedule Saved";
    const msg = "Your P2P charger availability matrix is now synced.";
    get().showToast(title, msg, "success");
    await fireNativePushNotification(title, msg);
  },

  deleteAccount: async () => {
    try {
      await apiClient.delete("/auth/me");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        get().showToast(
          "Cannot Delete Account",
          err.response?.data?.detail ||
            "Please complete or cancel active charging sessions and holds before deleting your account.",
          "warning"
        );
        throw err;
      }
    }
    await get().logout();
  },

  setPreferredMapLayer: async (layer) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MAP_PREF, layer);
    set({ preferredMapLayer: layer });
    get().showToast(
      "Default Map Layer Updated",
      `Switched radar view to ${
        layer === "standard"
          ? "Street Detail"
          : layer === "satellite"
          ? "Satellite Imagery"
          : "Clean Light / Hybrid"
      }.`,
      "info"
    );
  },

  logout: async () => {
    try {
      const rt = get().refreshToken;
      await Promise.allSettled([
        apiClient.post("/auth/logout", rt ? { refresh_token: rt } : {}),
        clearGoogleCredentialSession(),
      ]);
    } catch {
      // ignore offline logout
    }
    delete apiClient.defaults.headers.common["Authorization"];
    await Promise.all([
      clearSecureAuthTokens(),
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_USER),
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION),
    ]);
    setScopedUserId("guest");
    set({
      token: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,
      activeMode: "DRIVER",
      vehicles: DEFAULT_VEHICLES,
      bookings: [],
      chargingHistory: [],
      transactions: [],
      notifications: [],
      favoriteStationIds: [],
      hostRequests: [],
      hostEarningsBalance: 0.0,
      hostWeeklyEarnings: 0.0,
      hostWeeklyKwh: 0.0,
      hostSessionsCount: 0,
      hostTransactions: [],
      activeSession: null,
      isChargingModalOpen: false,
    });
  },
}));

