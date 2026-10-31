import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

export const TAB_BAR_SAFE_PADDING = 140;

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  upiId?: string;
  role?: "DRIVER" | "HOST" | "ADMIN";
  activeRole?: "DRIVER" | "HOST" | "ADMIN";
  kycVerified?: boolean;
  trustScore?: number;
  voltCreditsBalance: number;
}

export interface VehicleRecord {
  id: string;
  makeModel: string;
  year: string;
  plateNumber: string;
  batteryCapacityKwh: number;
  connectorType: "CCS2" | "TYPE_2" | "SOCKET_15A" | "BHARAT_DC001";
  connectorLabel: string;
  socPercent: number;
  rangeKm: number;
  isPrimary: boolean;
}

export interface ConnectorSpec {
  id: string;
  name: string;
  priceLabel: string;
  pricePerKwh: number;
  slotLabel: string;
  powerKw: number;
  plugImage: "TYPE_A" | "CHADEMO" | "TYPE_B";
}

export interface StationRecord {
  id: string;
  name: string;
  hostName: string;
  address: string;
  latitude: number;
  longitude: number;
  stationType: "P2P_HOME" | "PUBLIC_DC";
  connectorTypes: string[];
  connectorSpecs?: ConnectorSpec[];
  maxPowerKw: number;
  pricePerKwh: number;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  etaMins?: number;
  isAvailable: boolean;
}

export interface BookingRecord {
  id: string;
  stationId: string;
  stationName: string;
  address: string;
  hostName?: string;
  slotTime: string;
  slotDate?: string;
  connectorType: string;
  powerKw: number;
  pricePerKwh: number;
  estimatedKwh: number;
  totalAmount: number;
  otpCode: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface ChargingHistoryRecord {
  id: string;
  station: string;
  hostName?: string;
  date: string;
  energyKwh: number;
  durationMins: number;
  amount: number;
  ratePerKwh?: number;
  connectorType?: string;
  vehiclePlate?: string;
  status: string;
}

export interface WalletTransaction {
  id: string;
  title: string;
  date: string;
  amount: string;
  isCredit: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category?: "REMINDER" | "BOOKING" | "WALLET" | "HOST";
}

export interface HostRequestItem {
  id: string;
  driverName: string;
  vehicle: string;
  plateNumber: string;
  connector: string;
  slot: string;
  estEnergy: string;
  payout: string;
  payoutAmount: number;
  rating: string;
  otpCode?: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
}

export interface HostScheduleDay {
  day: string;
  slots: string;
  active: boolean;
}

export interface ToastPayload {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
}

const STORAGE_KEYS = {
  TOKEN: "@voltmate_jwt_token",
  USER: "@voltmate_user_v4_inr",
  VEHICLES: "@voltmate_vehicles_v4_inr",
  STATIONS: "@voltmate_stations_v4_inr",
  BOOKINGS: "@voltmate_bookings_v4_inr",
  HISTORY: "@voltmate_history_v4_inr",
  TXNS: "@voltmate_txns_v4_inr",
  FAVORITES: "@voltmate_favorites_v4_inr",
  HOST_STATE: "@voltmate_host_state_v4_inr",
  MAP_PREF: "@voltmate_map_pref_v4_inr",
};

const DEFAULT_VEHICLES: VehicleRecord[] = [
  {
    id: "v-nexon",
    makeModel: "Tata Nexon EV Empowered+",
    year: "2025",
    plateNumber: "KL-07-CS-4921",
    batteryCapacityKwh: 40.5,
    connectorType: "CCS2",
    connectorLabel: "CCS2 & Type-2",
    socPercent: 72,
    rangeKm: 245,
    isPrimary: true,
  },
  {
    id: "v-windsor",
    makeModel: "MG Windsor EV",
    year: "2025",
    plateNumber: "KL-07-DF-1092",
    batteryCapacityKwh: 38.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 & Type-2",
    socPercent: 84,
    rangeKm: 260,
    isPrimary: false,
  },
  {
    id: "v-be6e",
    makeModel: "Mahindra BE 6e",
    year: "2025",
    plateNumber: "KL-07-EV-2025",
    batteryCapacityKwh: 59.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC Fast",
    socPercent: 64,
    rangeKm: 310,
    isPrimary: false,
  },
];

export const DEFAULT_CONNECTOR_SPECS: ConnectorSpec[] = [
  {
    id: "conn-15a",
    name: "15A 3-Pin Socket",
    priceLabel: "₹8.50/kWh",
    pricePerKwh: 8.5,
    slotLabel: "Slot A • 3.3 kW AC",
    powerKw: 3.3,
    plugImage: "TYPE_A",
  },
  {
    id: "conn-type2",
    name: "Type-2 AC Wallbox",
    priceLabel: "₹10.50/kWh",
    pricePerKwh: 10.5,
    slotLabel: "Slot B • 7.4 kW AC",
    powerKw: 7.4,
    plugImage: "TYPE_B",
  },
  {
    id: "conn-ccs2",
    name: "CCS2 DC Fast",
    priceLabel: "₹16.50/kWh",
    pricePerKwh: 16.5,
    slotLabel: "Slot C • 50 kW DC",
    powerKw: 50.0,
    plugImage: "CHADEMO",
  },
];

const INITIAL_STATIONS: StationRecord[] = [
  {
    id: "st-lotus-greens",
    name: "Lotus Greens Villa P2P Socket",
    hostName: "Arun Nair",
    address: "Villa 14, Seaport-Airport Rd, Kakkanad • Host: Arun Nair",
    latitude: 10.0159,
    longitude: 76.3419,
    stationType: "P2P_HOME",
    connectorTypes: ["15A 3-Pin Socket", "Type-2 AC Wallbox", "CCS2 DC Fast"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 7.4,
    pricePerKwh: 8.5,
    rating: 4.9,
    reviewsCount: 56,
    distanceKm: 1.0,
    etaMins: 3,
    isAvailable: true,
  },
  {
    id: "st-spark-ev",
    name: "Spark EV Hub",
    hostName: "Spark Grid Kerala",
    address: "Infopark Phase 1, Kakkanad, Kochi",
    latitude: 10.0088,
    longitude: 76.3512,
    stationType: "P2P_HOME",
    connectorTypes: ["Type-2 AC Wallbox", "CCS2 DC Fast"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 22.0,
    pricePerKwh: 10.5,
    rating: 4.8,
    reviewsCount: 42,
    distanceKm: 1.8,
    etaMins: 4,
    isAvailable: true,
  },
  {
    id: "st-infopark-hub",
    name: "Infopark Green Plaza",
    hostName: "KSEB ChargeGrid",
    address: "Gate 2, Infopark Expressway, Kochi",
    latitude: 10.0235,
    longitude: 76.3345,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast", "Type-2 AC Wallbox"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 60.0,
    pricePerKwh: 16.5,
    rating: 4.7,
    reviewsCount: 118,
    distanceKm: 1.2,
    etaMins: 3,
    isAvailable: true,
  },
  {
    id: "st-edappally-hub",
    name: "Edappally Bypass Fast Hub",
    hostName: "Zeon Charging Kerala",
    address: "NH-66 Junction, Near Lulu Mall, Edappally, Kochi",
    latitude: 10.0261,
    longitude: 76.3125,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast", "Type-2 AC Wallbox"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 50.0,
    pricePerKwh: 16.5,
    rating: 4.9,
    reviewsCount: 89,
    distanceKm: 2.5,
    etaMins: 7,
    isAvailable: true,
  },
  {
    id: "st-kaloor-hub",
    name: "Kaloor Stadium Metro EV Bay",
    hostName: "KMRL EcoHub",
    address: "JLN Stadium South Gate, Kaloor, Kochi",
    latitude: 9.9985,
    longitude: 76.2998,
    stationType: "PUBLIC_DC",
    connectorTypes: ["15A 3-Pin Socket", "Type-2 AC Wallbox"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 11.0,
    pricePerKwh: 10.5,
    rating: 4.6,
    reviewsCount: 64,
    distanceKm: 3.5,
    etaMins: 9,
    isAvailable: true,
  },
];

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: "VOLT-99482",
    stationId: "st-spark-ev",
    stationName: "Spark EV Hub",
    address: "Infopark Phase 1, Kakkanad, Kochi",
    hostName: "Spark Grid Kerala",
    slotTime: "Today, 16:30 – 17:30",
    slotDate: "Today, Oct 31",
    connectorType: "Type-2 AC Wallbox",
    powerKw: 7.4,
    pricePerKwh: 10.5,
    estimatedKwh: 18.0,
    totalAmount: 189.0,
    otpCode: "544555",
    status: "UPCOMING",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_HISTORY: ChargingHistoryRecord[] = [
  {
    id: "HIST-8821",
    station: "Lotus Greens Villa P2P Socket",
    hostName: "Arun Nair",
    date: "28 Oct 2026 • 18:15",
    energyKwh: 21.8,
    durationMins: 45,
    amount: 185.0,
    ratePerKwh: 8.5,
    connectorType: "15A 3-Pin Socket",
    vehiclePlate: "KL-07-CS-4921",
    status: "SETTLED",
  },
  {
    id: "HIST-8790",
    station: "Infopark Green Plaza",
    hostName: "KSEB ChargeGrid",
    date: "22 Oct 2026 • 11:10",
    energyKwh: 14.5,
    durationMins: 28,
    amount: 240.0,
    ratePerKwh: 16.5,
    connectorType: "CCS2 DC Fast",
    vehiclePlate: "KL-07-CS-4921",
    status: "SETTLED",
  },
];

const INITIAL_TXNS: WalletTransaction[] = [
  { id: "TX-104", title: "UPI Top-Up (GPay • @okaxis)", date: "29 Oct, 09:40 AM", amount: "+₹500.00", isCredit: true },
  { id: "TX-103", title: "Charge: Lotus Greens Villa P2P", date: "28 Oct, 07:00 PM", amount: "-₹185.00", isCredit: false },
  { id: "TX-102", title: "P2P Host Payout Credited", date: "25 Oct, 08:15 PM", amount: "+₹340.00", isCredit: true },
  { id: "TX-101", title: "Charge: Infopark Green Plaza", date: "22 Oct, 11:40 AM", amount: "-₹240.00", isCredit: false },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NOTIF-1",
    title: "Slot Confirmed at Spark EV Hub",
    message: "Your Gate Pass #544-555 is active for Slot B (Type-2 AC 7.4kW) at Infopark Phase 1, Kakkanad.",
    time: "10 mins ago",
    read: false,
    category: "BOOKING",
  },
  {
    id: "NOTIF-2",
    title: "80% Smart Cut-Off Alert",
    message: "Tata Nexon EV (KL-07-CS-4921) reached 72% SOC (245 km range). Ready for your Kochi commute.",
    time: "1 hour ago",
    read: false,
    category: "REMINDER",
  },
  {
    id: "NOTIF-3",
    title: "UPI Wallet Top-Up Confirmed",
    message: "₹500.00 credited to your VoltMate Wallet via Google Pay (nidhinrajesh@okaxis).",
    time: "Yesterday",
    read: true,
    category: "WALLET",
  },
  {
    id: "NOTIF-4",
    title: "Host Payout Settled (+₹340.00)",
    message: "Your P2P Host earnings from Rahul Menon's charging session were settled to your ledger.",
    time: "2 days ago",
    read: true,
    category: "HOST",
  },
];

const INITIAL_HOST_REQUESTS: HostRequestItem[] = [
  {
    id: "REQ-901",
    driverName: "Rahul Menon",
    vehicle: "Tata Nexon EV Empowered+ • KL-07-CS-4921",
    plateNumber: "KL-07-CS-4921",
    connector: "Type-2 AC Wallbox • Slot B",
    slot: "Today, 16:30 – 17:30",
    estEnergy: "15.7 kWh",
    payout: "+₹165.00",
    payoutAmount: 165.0,
    rating: "4.9 ★",
    status: "PENDING",
  },
  {
    id: "REQ-902",
    driverName: "Sneha Varghese",
    vehicle: "MG Windsor EV • KL-07-DF-1092",
    plateNumber: "KL-07-DF-1092",
    connector: "15A 3-Pin Socket • Slot A",
    slot: "Today, 18:15 – 19:30",
    estEnergy: "14.0 kWh",
    payout: "+₹119.00",
    payoutAmount: 119.0,
    rating: "4.8 ★",
    status: "PENDING",
  },
];

const INITIAL_HOST_TXNS: WalletTransaction[] = [
  { id: "HTX-1", title: "Session #VOLT-99482 (Rahul Menon • KL-07)", date: "Today, 14:20", amount: "+₹165.00", isCredit: true },
  { id: "HTX-2", title: "Session #VOLT-99104 (Sneha Varghese • KL-07)", date: "Yesterday, 19:10", amount: "+₹240.00", isCredit: true },
  { id: "HTX-3", title: "Instant UPI Settlement (nidhinrajesh@okaxis)", date: "26 Oct 2026", amount: "-₹1,500.00", isCredit: false },
];

const INITIAL_HOST_SCHEDULE: HostScheduleDay[] = [
  { day: "Monday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Tuesday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Wednesday", slots: "Evening (18:00 – 23:00)", active: true },
  { day: "Thursday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Friday", slots: "24 Hours (00:00 – 23:59)", active: true },
  { day: "Saturday", slots: "24 Hours (00:00 – 23:59)", active: true },
  { day: "Sunday", slots: "Closed", active: false },
];

interface AuthState {
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
  hostTransactions: WalletTransaction[];
  hostSchedule: HostScheduleDay[];
  preferredMapLayer: "standard" | "satellite" | "hybrid";
  toast: ToastPayload;
  reminderSnoozedUntil: string | null;

  initializeAuth: () => Promise<void>;
  setAuth: (token: string, user: UserProfile) => Promise<void>;
  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateCredits: (delta: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  switchMode: (mode: "DRIVER" | "HOST") => void;
  topUpWallet: (amount: number, methodLabel?: string) => Promise<void>;
  addVehicle: (v: Omit<VehicleRecord, "id" | "isPrimary">) => Promise<void>;
  setPrimaryVehicle: (id: string) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  updatePrimaryVehicleSoc: (newSoc: number) => Promise<void>;
  addStation: (s: Omit<StationRecord, "id" | "rating" | "reviewsCount" | "distanceKm" | "isAvailable">) => Promise<void>;
  selectStation: (stationId: string) => void;
  toggleFavoriteStation: (stationId: string) => Promise<void>;
  createBooking: (b: Omit<BookingRecord, "id" | "otpCode" | "status" | "createdAt">) => Promise<BookingRecord>;
  cancelBooking: (bookingId: string) => Promise<void>;
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
  showToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
  hideToast: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  activeMode: "DRIVER",
  isLoading: true,
  vehicles: DEFAULT_VEHICLES,
  stations: INITIAL_STATIONS,
  bookings: INITIAL_BOOKINGS,
  chargingHistory: INITIAL_HISTORY,
  transactions: INITIAL_TXNS,
  notifications: INITIAL_NOTIFICATIONS,
  favoriteStationIds: ["st-lotus-greens"],
  selectedStationId: "st-lotus-greens",
  hostRequests: INITIAL_HOST_REQUESTS,
  hostEarningsBalance: 4850.0,
  hostWeeklyEarnings: 3420.0,
  hostTransactions: INITIAL_HOST_TXNS,
  hostSchedule: INITIAL_HOST_SCHEDULE,
  preferredMapLayer: "standard",
  toast: {
    visible: false,
    title: "",
    message: "",
    type: "success",
  },
  reminderSnoozedUntil: null,

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
    try {
      const [
        token,
        userJson,
        vehiclesJson,
        stationsJson,
        bookingsJson,
        historyJson,
        txnsJson,
        favsJson,
        hostStateJson,
        mapPref,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.VEHICLES),
        AsyncStorage.getItem(STORAGE_KEYS.STATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.TXNS),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.HOST_STATE),
        AsyncStorage.getItem(STORAGE_KEYS.MAP_PREF),
      ]);

      const vehicles = vehiclesJson ? JSON.parse(vehiclesJson) : DEFAULT_VEHICLES;
      const stations = stationsJson ? JSON.parse(stationsJson) : INITIAL_STATIONS;
      const bookings = bookingsJson ? JSON.parse(bookingsJson) : INITIAL_BOOKINGS;
      const chargingHistory = historyJson ? JSON.parse(historyJson) : INITIAL_HISTORY;
      const transactions = txnsJson ? JSON.parse(txnsJson) : INITIAL_TXNS;
      const favoriteStationIds = favsJson ? JSON.parse(favsJson) : ["st-lotus-greens"];
      const hostState = hostStateJson ? JSON.parse(hostStateJson) : null;

      if (token && userJson) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const parsedUser: UserProfile = JSON.parse(userJson);
        if (!parsedUser.phoneNumber) parsedUser.phoneNumber = "+91 98470 49210";
        if (!parsedUser.upiId) parsedUser.upiId = "nidhinrajesh@okaxis";
        if (typeof parsedUser.voltCreditsBalance !== "number" || parsedUser.voltCreditsBalance < 200) {
          parsedUser.voltCreditsBalance = 1450.0;
        }
        set({
          token,
          accessToken: token,
          isAuthenticated: true,
          user: parsedUser,
          vehicles,
          stations,
          bookings,
          chargingHistory,
          transactions,
          favoriteStationIds,
          hostRequests: hostState?.hostRequests || INITIAL_HOST_REQUESTS,
          hostEarningsBalance: hostState?.hostEarningsBalance ?? 4850.0,
          hostWeeklyEarnings: hostState?.hostWeeklyEarnings ?? 3420.0,
          hostTransactions: hostState?.hostTransactions || INITIAL_HOST_TXNS,
          hostSchedule: hostState?.hostSchedule || INITIAL_HOST_SCHEDULE,
          preferredMapLayer: (mapPref as any) || "standard",
          isLoading: false,
        });
      } else {
        set({
          vehicles,
          stations,
          bookings,
          chargingHistory,
          transactions,
          favoriteStationIds,
          preferredMapLayer: (mapPref as any) || "standard",
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuth: async (token, user) => {
    const normalizedUser: UserProfile = {
      ...user,
      role: user.role || user.activeRole || "DRIVER",
      fullName: user.fullName || "Nidhin R",
      phoneNumber: user.phoneNumber || "+91 98470 49210",
      upiId: user.upiId || "nidhinrajesh@okaxis",
      voltCreditsBalance:
        typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance >= 200
          ? user.voltCreditsBalance
          : 1450.0,
    };
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalizedUser));
    set({
      token,
      accessToken: token,
      isAuthenticated: true,
      user: normalizedUser,
    });
  },

  setAuthSession: async (accessToken, refreshToken, user) => {
    const normalizedUser: UserProfile = {
      ...user,
      role: user.role || user.activeRole || "DRIVER",
      fullName: user.fullName || "Nidhin R",
      phoneNumber: user.phoneNumber || "+91 98470 49210",
      upiId: user.upiId || "nidhinrajesh@okaxis",
      voltCreditsBalance:
        typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance >= 200
          ? user.voltCreditsBalance
          : 1450.0,
    };
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalizedUser));
    set({
      token: accessToken,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      user: normalizedUser,
    });
  },

  updateCredits: (delta) => {
    get().topUpWallet(delta, "Karma Grid Reward");
  },

  updateProfile: async (updates) => {
    const current = get().user || {
      id: "usr-local",
      email: "nidhinrajesh1998@gmail.com",
      fullName: "Nidhin R",
      phoneNumber: "+91 98470 49210",
      upiId: "nidhinrajesh@okaxis",
      role: "DRIVER" as const,
      voltCreditsBalance: 1450.0,
    };
    const updatedUser: UserProfile = { ...current, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    set({ user: updatedUser });
    get().showToast("Profile Updated", `Saved changes for ${updatedUser.fullName || updatedUser.email}.`, "success");
  },

  switchMode: (mode) => {
    set({ activeMode: mode });
    get().showToast(
      mode === "HOST" ? "Switched to Host Studio" : "Switched to Driver Mode",
      mode === "HOST"
        ? "Managing your Kochi P2P charger & ₹ INR payouts."
        : "Exploring nearby Kochi EV chargers & active sessions.",
      "info"
    );
  },

  topUpWallet: async (amount, methodLabel = "UPI Instant Intent") => {
    const current = get().user || {
      id: "usr-local",
      email: "nidhinrajesh1998@gmail.com",
      fullName: "Nidhin R",
      phoneNumber: "+91 98470 49210",
      upiId: "nidhinrajesh@okaxis",
      role: "DRIVER" as const,
      voltCreditsBalance: 1450.0,
    };
    const updatedUser: UserProfile = {
      ...current,
      voltCreditsBalance: Number((current.voltCreditsBalance + amount).toFixed(2)),
    };
    const newTx: WalletTransaction = {
      id: `TX-${Date.now()}`,
      title: `Wallet Top-Up (${methodLabel})`,
      date: "Just now",
      amount: `+₹${amount.toFixed(2)}`,
      isCredit: true,
    };
    const updatedTxns = [newTx, ...get().transactions];
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `₹${amount} Added via ${methodLabel}`,
      message: `Your new VoltMate Wallet balance is ₹${updatedUser.voltCreditsBalance.toFixed(2)}.`,
      time: "Just now",
      read: false,
      category: "WALLET",
    };
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
      AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
    ]);
    set({
      user: updatedUser,
      transactions: updatedTxns,
      notifications: [newNotif, ...get().notifications],
    });
    get().showToast(
      `+₹${amount.toFixed(0)} Wallet Top-Up Successful`,
      `Paid via ${methodLabel} • Balance: ₹${updatedUser.voltCreditsBalance.toFixed(2)}`,
      "success"
    );
  },

  addVehicle: async (v) => {
    const existing = get().vehicles.map((item) => ({ ...item, isPrimary: false }));
    const newVehicle: VehicleRecord = {
      ...v,
      id: `veh-${Date.now()}`,
      isPrimary: true,
    };
    const updated = [newVehicle, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
    get().showToast(
      "Vehicle Added to Garage",
      `${newVehicle.makeModel} (${newVehicle.plateNumber}) is now your active EV.`,
      "success"
    );
  },

  setPrimaryVehicle: async (id) => {
    const updated = get().vehicles.map((v) => ({
      ...v,
      isPrimary: v.id === id,
    }));
    const active = updated.find((v) => v.id === id);
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
    if (active) {
      get().showToast(
        "Active EV Switched",
        `${active.makeModel} • ${active.plateNumber} (${active.socPercent}% SOC)`,
        "info"
      );
    }
  },

  removeVehicle: async (id) => {
    const filtered = get().vehicles.filter((v) => v.id !== id);
    if (filtered.length > 0 && !filtered.some((v) => v.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    const finalVehicles = filtered.length > 0 ? filtered : DEFAULT_VEHICLES;
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(finalVehicles));
    set({ vehicles: finalVehicles });
    get().showToast("Vehicle Removed", "Your EV garage has been updated.", "info");
  },

  updatePrimaryVehicleSoc: async (newSoc) => {
    const clamped = Math.max(5, Math.min(100, Math.round(newSoc)));
    const updated = get().vehicles.map((v) =>
      v.isPrimary
        ? {
            ...v,
            socPercent: clamped,
            rangeKm: Math.round((clamped / 100) * 340),
          }
        : v
    );
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
  },

  addStation: async (s) => {
    const newStation: StationRecord = {
      ...s,
      id: `st-${Date.now()}`,
      connectorSpecs: DEFAULT_CONNECTOR_SPECS,
      rating: 5.0,
      reviewsCount: 1,
      distanceKm: 0.4,
      etaMins: 2,
      isAvailable: true,
    };
    const updated = [newStation, ...get().stations];
    await AsyncStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updated));
    set({ stations: updated, selectedStationId: newStation.id });
    get().showToast(
      "P2P Host Charger Published!",
      `${newStation.name} is now live on the Kochi radar at ₹${newStation.pricePerKwh.toFixed(2)}/kWh.`,
      "success"
    );
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
      isRemoving ? "Removed from Saved Stations" : "Station Saved",
      st ? st.name : "Updated your favorite stations.",
      "info"
    );
  },

  createBooking: async (b) => {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const booking: BookingRecord = {
      ...b,
      id: `VOLT-${Math.floor(10000 + Math.random() * 90000)}`,
      otpCode,
      status: "UPCOMING",
      createdAt: new Date().toISOString(),
    };
    const updated = [booking, ...get().bookings];
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `Booking Confirmed: ${b.stationName}`,
      message: `Slot ${b.slotTime} (${b.connectorType}) reserved • Gate Pass #${otpCode.slice(0, 3)}-${otpCode.slice(3)}.`,
      time: "Just now",
      read: false,
      category: "BOOKING",
    };
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    set({
      bookings: updated,
      notifications: [newNotif, ...get().notifications],
    });
    get().showToast(
      "Charging Slot Reserved!",
      `${b.stationName} • Gate Pass #${otpCode.slice(0, 3)}-${otpCode.slice(3)} ready.`,
      "success"
    );
    return booking;
  },

  cancelBooking: async (bookingId) => {
    const target = get().bookings.find((b) => b.id === bookingId);
    const updated = get().bookings.filter((b) => b.id !== bookingId);
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    set({ bookings: updated });
    get().showToast(
      "Reservation Cancelled",
      target ? `Cancelled slot at ${target.stationName}. No fee charged.` : "Slot released.",
      "warning"
    );
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
    const currentBookings = get().bookings;
    const updatedBookings = bookingId
      ? currentBookings.filter((b) => b.id !== bookingId)
      : currentBookings;

    const activeVehicle = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];

    const newRecord: ChargingHistoryRecord = {
      id: `HIST-${Math.floor(1000 + Math.random() * 9000)}`,
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

    const currentUser = get().user || {
      id: "usr-local",
      email: "nidhinrajesh1998@gmail.com",
      fullName: "Nidhin R",
      phoneNumber: "+91 98470 49210",
      upiId: "nidhinrajesh@okaxis",
      role: "DRIVER" as const,
      voltCreditsBalance: 1450.0,
    };
    const updatedUser: UserProfile = {
      ...currentUser,
      voltCreditsBalance: Math.max(0, Number((currentUser.voltCreditsBalance - amount).toFixed(2))),
    };

    if (typeof finalSocPercent === "number") {
      await get().updatePrimaryVehicleSoc(finalSocPercent);
    }

    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `Charging Complete • ₹${amount.toFixed(2)} Paid`,
      message: `Delivered ${energyKwh.toFixed(2)} kWh at ${stationName}. GST Invoice #${newRecord.id} generated.`,
      time: "Just now",
      read: false,
      category: "BOOKING",
    };

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings)),
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory)),
      AsyncStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(updatedTxns)),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)),
    ]);

    set({
      bookings: updatedBookings,
      chargingHistory: updatedHistory,
      transactions: updatedTxns,
      user: updatedUser,
      notifications: [newNotif, ...get().notifications],
    });

    get().showToast(
      `Session Settled • ₹${amount.toFixed(2)}`,
      `${energyKwh.toFixed(2)} kWh delivered to ${activeVehicle?.makeModel || "your EV"}.`,
      "success"
    );

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
    const stationTitle = upcoming ? upcoming.stationName : "Spark EV Hub (Infopark Phase 1)";
    const passCode = upcoming
      ? `${upcoming.otpCode.slice(0, 3)}-${upcoming.otpCode.slice(3)}`
      : "544-555";
    const reminderNotif: NotificationItem = {
      id: `NOTIF-REM-${Date.now()}`,
      title: `⏰ Slot Reminder: ${stationTitle}`,
      message: `Your charging slot starts in 15 minutes! Gate Pass #${passCode} is ready for plug-in.`,
      time: "Just now",
      read: false,
      category: "REMINDER",
    };
    set({
      notifications: [reminderNotif, ...get().notifications],
    });
    get().showToast(
      `⏰ Upcoming Slot in 15 mins`,
      `${stationTitle} • Gate Pass #${passCode} ready.`,
      "warning"
    );
  },

  snoozeReminder: (minutes) => {
    set({
      reminderSnoozedUntil: `${minutes} mins`,
    });
    get().showToast(
      `Reminder Snoozed (${minutes}m)`,
      `We will alert you again 5 minutes before your slot at Spark EV Hub.`,
      "info"
    );
  },

  respondHostRequest: async (requestId, accept) => {
    const req = get().hostRequests.find((r) => r.id === requestId);
    if (!req) return;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const updatedRequests: HostRequestItem[] = accept
      ? get().hostRequests.map((r) =>
          r.id === requestId ? { ...r, status: "APPROVED", otpCode: generatedOtp } : r
        )
      : get().hostRequests.filter((r) => r.id !== requestId);

    let newBalance = get().hostEarningsBalance;
    let newWeekly = get().hostWeeklyEarnings;
    let updatedHostTxns = get().hostTransactions;

    if (accept) {
      newBalance = Number((newBalance + req.payoutAmount).toFixed(2));
      newWeekly = Number((newWeekly + req.payoutAmount).toFixed(2));
      const newTx: WalletTransaction = {
        id: `HTX-${Date.now()}`,
        title: `Approved: ${req.driverName} (${req.plateNumber})`,
        date: "Just now",
        amount: `+₹${req.payoutAmount.toFixed(2)}`,
        isCredit: true,
      };
      updatedHostTxns = [newTx, ...updatedHostTxns];
    }

    const hostState = {
      hostRequests: updatedRequests,
      hostEarningsBalance: newBalance,
      hostWeeklyEarnings: newWeekly,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));

    set({
      hostRequests: updatedRequests,
      hostEarningsBalance: newBalance,
      hostWeeklyEarnings: newWeekly,
      hostTransactions: updatedHostTxns,
    });

    if (accept) {
      get().showToast(
        `Gate Pass #${generatedOtp.slice(0, 3)}-${generatedOtp.slice(3)} Issued!`,
        `Approved ${req.driverName} • +₹${req.payoutAmount.toFixed(2)} added to Host Ledger.`,
        "success"
      );
    } else {
      get().showToast(
        "Request Declined",
        `Declined slot request from ${req.driverName}.`,
        "warning"
      );
    }
  },

  withdrawHostEarnings: async (amount, upiId) => {
    const currentBal = get().hostEarningsBalance;
    const withdrawAmt = Math.min(currentBal, Math.max(100, amount));
    const newBal = Number((currentBal - withdrawAmt).toFixed(2));
    const newTx: WalletTransaction = {
      id: `HTX-${Date.now()}`,
      title: `Instant UPI Payout (${upiId})`,
      date: "Just now",
      amount: `-₹${withdrawAmt.toFixed(2)}`,
      isCredit: false,
    };
    const updatedHostTxns = [newTx, ...get().hostTransactions];
    const hostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: newBal,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({
      hostEarningsBalance: newBal,
      hostTransactions: updatedHostTxns,
    });
    get().showToast(
      `₹${withdrawAmt.toFixed(2)} Transferred to UPI`,
      `Settled instantly to ${upiId} (IMPS Ref #${Math.floor(100000 + Math.random() * 900000)}).`,
      "success"
    );
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
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({
      hostEarningsBalance: newHostBal,
      hostTransactions: updatedHostTxns,
    });
    await get().topUpWallet(bonusAmt, "Host Earnings + 10% Bonus");
  },

  updateHostSchedule: async (schedule) => {
    const hostState = {
      hostRequests: get().hostRequests,
      hostEarningsBalance: get().hostEarningsBalance,
      hostWeeklyEarnings: get().hostWeeklyEarnings,
      hostTransactions: get().hostTransactions,
      hostSchedule: schedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));
    set({ hostSchedule: schedule });
    get().showToast(
      "Recurring Schedule Saved",
      "Your Kochi P2P charger availability matrix is now live.",
      "success"
    );
  },

  setPreferredMapLayer: async (layer) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MAP_PREF, layer);
    set({ preferredMapLayer: layer });
    get().showToast(
      "Default Map Layer Updated",
      `Switched radar view to ${layer === "standard" ? "Street Map" : layer === "satellite" ? "Satellite Imagery" : "Traffic + Hybrid"}.`,
      "info"
    );
  },

  logout: async () => {
    delete api.defaults.headers.common["Authorization"];
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    set({
      token: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,
      activeMode: "DRIVER",
    });
  },
}));
