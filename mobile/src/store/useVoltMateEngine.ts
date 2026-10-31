import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/api";
import {
  fireNativePushNotification,
  initializeNativeNotifications,
  launchNativeUpiPayment,
} from "../services/notificationService";

export const TAB_BAR_SAFE_PADDING = 145;

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  upiVpa?: string;
  upiId?: string;
  role?: "DRIVER" | "HOST" | "ADMIN";
  activeRole?: "DRIVER" | "HOST" | "ADMIN";
  mapStyle?: "standard" | "satellite" | "hybrid";
  notificationsEnabled?: boolean;
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
  maxRangeKm?: number;
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
  hostPhone: string;
  address: string;
  latitude: number;
  longitude: number;
  stationType: "P2P_HOME" | "PUBLIC_DC";
  connectorTypes: string[];
  connectorSpecs: ConnectorSpec[];
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
  hostPhone?: string;
  slotTime: string;
  slotDate?: string;
  connectorType: string;
  powerKw: number;
  pricePerKwh: number;
  estimatedKwh: number;
  totalAmount: number;
  otpCode: string;
  status: "UPCOMING" | "CONFIRMED" | "ACTIVE_CHARGING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface ChargingHistoryRecord {
  id: string;
  invoiceNumber: string;
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
  estKwhNum: number;
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

export interface ActiveChargingSession {
  bookingId: string;
  stationId: string;
  stationName: string;
  hostName: string;
  hostPhone: string;
  connectorType: string;
  powerKw: number;
  ratePerKwh: number;
  voltageV: number;
  currentA: number;
  elapsedSeconds: number;
  deliveredKwh: number;
  liveCostInr: number;
  initialSoc: number;
  currentSoc: number;
  targetCutOffSoc: 80 | 90 | 100;
  isPaused: boolean;
}

export interface ToastPayload {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
}

const STORAGE_KEYS = {
  TOKEN: "@voltmate_jwt_token",
  USER: "@voltmate_user_v5_engine",
  VEHICLES: "@voltmate_vehicles_v5_engine",
  STATIONS: "@voltmate_stations_v5_engine",
  BOOKINGS: "@voltmate_bookings_v5_engine",
  HISTORY: "@voltmate_history_v5_engine",
  TXNS: "@voltmate_txns_v5_engine",
  FAVORITES: "@voltmate_favorites_v5_engine",
  HOST_STATE: "@voltmate_host_state_v5_engine",
  MAP_PREF: "@voltmate_map_pref_v5_engine",
};

const DEFAULT_VEHICLES: VehicleRecord[] = [
  {
    id: "v1",
    makeModel: "Tata Nexon EV Empowered+",
    year: "2025",
    plateNumber: "KL-07-CS-4921",
    batteryCapacityKwh: 45.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC & Type-2 AC",
    socPercent: 72,
    rangeKm: 252,
    maxRangeKm: 350,
    isPrimary: true,
  },
  {
    id: "v2",
    makeModel: "MG Windsor EV",
    year: "2025",
    plateNumber: "KL-07-DF-1092",
    batteryCapacityKwh: 38.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC & Type-2 AC",
    socPercent: 64,
    rangeKm: 198,
    maxRangeKm: 310,
    isPrimary: false,
  },
  {
    id: "v3",
    makeModel: "Ather 450X Gen 3",
    year: "2025",
    plateNumber: "KL-07-BX-8821",
    batteryCapacityKwh: 3.7,
    connectorType: "SOCKET_15A",
    connectorLabel: "15A 3-Pin Socket",
    socPercent: 88,
    rangeKm: 96,
    maxRangeKm: 110,
    isPrimary: false,
  },
];

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
    priceLabel: "₹10.50/kWh",
    pricePerKwh: 10.5,
    slotLabel: "Slot B • 7.4 kW AC",
    powerKw: 7.4,
    plugImage: "TYPE_B",
  },
  {
    id: "conn-ccs2",
    name: "CCS2 DC Fast (60 kW)",
    priceLabel: "₹16.50/kWh",
    pricePerKwh: 16.5,
    slotLabel: "Slot C • 60 kW DC",
    powerKw: 60.0,
    plugImage: "CHADEMO",
  },
];

const INITIAL_STATIONS: StationRecord[] = [
  {
    id: "s1",
    name: "Lotus Greens Villa P2P Socket",
    hostName: "Arun Nair",
    hostPhone: "+919847011223",
    address: "Villa 14, Seaport-Airport Rd, Kakkanad • Host: Arun Nair",
    latitude: 10.0159,
    longitude: 76.3419,
    stationType: "P2P_HOME",
    connectorTypes: ["15A 3-Pin Domestic (3.3 kW)", "Type-2 AC Wallbox (7.4 kW)"],
    connectorSpecs: [
      {
        id: "s1-15a",
        name: "15A 3-Pin Domestic (3.3 kW)",
        priceLabel: "₹8.50/kWh",
        pricePerKwh: 8.5,
        slotLabel: "Slot A • 3.3 kW AC",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
      {
        id: "s1-type2",
        name: "Type-2 AC Wallbox (7.4 kW)",
        priceLabel: "₹10.50/kWh",
        pricePerKwh: 10.5,
        slotLabel: "Slot B • 7.4 kW AC",
        powerKw: 7.4,
        plugImage: "TYPE_B",
      },
      {
        id: "s1-ccs2",
        name: "CCS2 DC Fast (50 kW)",
        priceLabel: "₹16.50/kWh",
        pricePerKwh: 16.5,
        slotLabel: "Slot C • 50 kW DC",
        powerKw: 50.0,
        plugImage: "CHADEMO",
      },
    ],
    maxPowerKw: 7.4,
    pricePerKwh: 8.5,
    rating: 4.9,
    reviewsCount: 56,
    distanceKm: 1.0,
    etaMins: 3,
    isAvailable: true,
  },
  {
    id: "s2",
    name: "Spark EV Fast Hub",
    hostName: "Spark Grid Kerala",
    hostPhone: "+919847022334",
    address: "Infopark Phase 1, Kakkanad, Kochi",
    latitude: 10.0088,
    longitude: 76.3618,
    stationType: "P2P_HOME",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (22 kW)", "15A 3-Pin (3.3 kW)"],
    connectorSpecs: [
      {
        id: "s2-15a",
        name: "15A 3-Pin (3.3 kW)",
        priceLabel: "₹9.00/kWh",
        pricePerKwh: 9.0,
        slotLabel: "Slot A • 3.3 kW AC",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
      {
        id: "s2-type2",
        name: "Type-2 AC (22 kW)",
        priceLabel: "₹12.50/kWh",
        pricePerKwh: 12.5,
        slotLabel: "Slot B • 22 kW AC",
        powerKw: 22.0,
        plugImage: "TYPE_B",
      },
      {
        id: "s2-ccs2",
        name: "CCS2 DC Fast (60 kW)",
        priceLabel: "₹16.50/kWh",
        pricePerKwh: 16.5,
        slotLabel: "Slot C • 60 kW DC",
        powerKw: 60.0,
        plugImage: "CHADEMO",
      },
    ],
    maxPowerKw: 60.0,
    pricePerKwh: 10.5,
    rating: 4.8,
    reviewsCount: 42,
    distanceKm: 1.8,
    etaMins: 4,
    isAvailable: true,
  },
  {
    id: "s3",
    name: "Infopark Green Plaza Hub",
    hostName: "KSEB e-Mobility",
    hostPhone: "+919847033445",
    address: "Gate 2, Infopark Expressway, Kochi",
    latitude: 10.0232,
    longitude: 76.3468,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Dual (50 kW)", "Type-2 AC (7.4 kW)"],
    connectorSpecs: [
      {
        id: "s3-type2",
        name: "Type-2 AC (7.4 kW)",
        priceLabel: "₹10.00/kWh",
        pricePerKwh: 10.0,
        slotLabel: "Slot A • 7.4 kW AC",
        powerKw: 7.4,
        plugImage: "TYPE_B",
      },
      {
        id: "s3-ccs2",
        name: "CCS2 DC Dual (50 kW)",
        priceLabel: "₹15.50/kWh",
        pricePerKwh: 15.5,
        slotLabel: "Slot B • 50 kW DC",
        powerKw: 50.0,
        plugImage: "CHADEMO",
      },
      {
        id: "s3-15a",
        name: "15A 3-Pin Socket (3.3 kW)",
        priceLabel: "₹8.50/kWh",
        pricePerKwh: 8.5,
        slotLabel: "Slot C • 3.3 kW AC",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
    ],
    maxPowerKw: 50.0,
    pricePerKwh: 15.5,
    rating: 4.7,
    reviewsCount: 118,
    distanceKm: 1.2,
    etaMins: 3,
    isAvailable: true,
  },
  {
    id: "s4",
    name: "Edappally Lulu Corridor DC Hub",
    hostName: "Zeon Charging Kerala",
    hostPhone: "+919847044556",
    address: "NH 66 Edappally Toll, Near Lulu Mall, Kochi",
    latitude: 10.0274,
    longitude: 76.3082,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Ultra (60 kW)", "Type-2 AC (7.4 kW)"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 60.0,
    pricePerKwh: 17.0,
    rating: 4.9,
    reviewsCount: 89,
    distanceKm: 2.5,
    etaMins: 7,
    isAvailable: true,
  },
  {
    id: "s5",
    name: "Adimali Eastern Ghat Fast Plaza",
    hostName: "HighRange EV Grid",
    hostPhone: "+919847055667",
    address: "NH 85 Kochi–Munnar Highway, Adimali",
    latitude: 10.0124,
    longitude: 76.9535,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (50 kW)", "15A 3-Pin Homestay Plug (3.3 kW)"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 50.0,
    pricePerKwh: 16.0,
    rating: 4.8,
    reviewsCount: 64,
    distanceKm: 68.0,
    etaMins: 95,
    isAvailable: true,
  },
  {
    id: "s6",
    name: "Kollam Bypass Highway Plaza",
    hostName: "KSEB South Corridor",
    hostPhone: "+919847066778",
    address: "NH 66 Kochi–Trivandrum Corridor, Kollam",
    latitude: 8.8932,
    longitude: 76.6141,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (11 kW)"],
    connectorSpecs: DEFAULT_CONNECTOR_SPECS,
    maxPowerKw: 60.0,
    pricePerKwh: 16.5,
    rating: 4.7,
    reviewsCount: 73,
    distanceKm: 132.0,
    etaMins: 165,
    isAvailable: true,
  },
];

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: "VOLT-99482",
    stationId: "s2",
    stationName: "Spark EV Fast Hub",
    address: "Infopark Phase 1, Kakkanad, Kochi",
    hostName: "Spark Grid Kerala",
    hostPhone: "+919847022334",
    slotTime: "Today, 16:30 – 17:30",
    slotDate: "Today, Oct 31",
    connectorType: "Type-2 AC Wallbox (7.4 kW)",
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
    invoiceNumber: "INV-KL-2026-8821",
    station: "Lotus Greens Villa P2P Socket",
    hostName: "Arun Nair",
    date: "28 Oct 2026 • 18:15",
    energyKwh: 21.8,
    durationMins: 45,
    amount: 185.3,
    ratePerKwh: 8.5,
    connectorType: "15A 3-Pin Domestic (3.3 kW)",
    vehiclePlate: "KL-07-CS-4921",
    status: "SETTLED",
  },
  {
    id: "HIST-8790",
    invoiceNumber: "INV-KL-2026-8790",
    station: "Infopark Green Plaza Hub",
    hostName: "KSEB e-Mobility",
    date: "22 Oct 2026 • 11:10",
    energyKwh: 15.5,
    durationMins: 28,
    amount: 240.25,
    ratePerKwh: 15.5,
    connectorType: "CCS2 DC Dual (50 kW)",
    vehiclePlate: "KL-07-CS-4921",
    status: "SETTLED",
  },
];

const INITIAL_TXNS: WalletTransaction[] = [
  { id: "TX-104", title: "UPI Top-Up (GPay • @okaxis)", date: "29 Oct, 09:40 AM", amount: "+₹500.00", isCredit: true },
  { id: "TX-103", title: "Charge: Lotus Greens Villa P2P", date: "28 Oct, 07:00 PM", amount: "-₹185.30", isCredit: false },
  { id: "TX-102", title: "P2P Host Payout Credited", date: "25 Oct, 08:15 PM", amount: "+₹340.00", isCredit: true },
  { id: "TX-101", title: "Charge: Infopark Green Plaza Hub", date: "22 Oct, 11:40 AM", amount: "-₹240.25", isCredit: false },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NOTIF-1",
    title: "Slot Confirmed at Spark EV Fast Hub",
    message: "Gate Pass #544-555 is active for Slot B (Type-2 AC 7.4kW) at Infopark Phase 1, Kakkanad.",
    time: "10 mins ago",
    read: false,
    category: "BOOKING",
  },
  {
    id: "NOTIF-2",
    title: "80% Smart Cut-Off Alert",
    message: "Tata Nexon EV (KL-07-CS-4921) is at 72% SOC (252 km range). Ready for your Kochi commute.",
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
    estKwhNum: 15.7,
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
    estKwhNum: 14.0,
    payout: "+₹119.00",
    payoutAmount: 119.0,
    rating: "4.8 ★",
    status: "PENDING",
  },
  {
    id: "REQ-903",
    driverName: "Karthik Nair",
    vehicle: "Ather 450X Gen 3 • KL-07-BX-8821",
    plateNumber: "KL-07-BX-8821",
    connector: "15A 3-Pin Socket • Slot A",
    slot: "Tomorrow, 09:30 – 10:30",
    estEnergy: "3.2 kWh",
    estKwhNum: 3.2,
    payout: "+₹45.00",
    payoutAmount: 45.0,
    rating: "5.0 ★",
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
  { day: "Sunday", slots: "Closed (Reserved for private use)", active: false },
];

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
  toast: ToastPayload;
  reminderSnoozedUntil: string | null;
  activeSession: ActiveChargingSession | null;
  isChargingModalOpen: boolean;
  latestSettledReceipt: ChargingHistoryRecord | null;

  initializeAuth: () => Promise<void>;
  setAuth: (token: string, user: UserProfile) => Promise<void>;
  setAuthSession: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateCredits: (delta: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  switchMode: (mode: "DRIVER" | "HOST") => void;
  topUpWallet: (amount: number, methodLabel?: string, launchUpiIntent?: boolean) => Promise<void>;
  topUpWalletInr: (amountInr: number, mode?: "UPI_APP" | "INSTANT_WALLET", appName?: string) => Promise<void>;
  addVehicle: (v: Omit<VehicleRecord, "id" | "isPrimary">) => Promise<void>;
  setPrimaryVehicle: (id: string) => Promise<void>;
  setActiveVehicle: (id: string) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  updatePrimaryVehicleSoc: (newSoc: number) => Promise<void>;
  adjustActiveVehicleSoc: (deltaPercent: number) => Promise<void>;
  addStation: (s: Omit<StationRecord, "id" | "rating" | "reviewsCount" | "distanceKm" | "isAvailable" | "hostPhone" | "connectorSpecs"> & { hostPhone?: string }) => Promise<void>;
  selectStation: (stationId: string) => void;
  toggleFavoriteStation: (stationId: string) => Promise<void>;
  createBooking: (b: Omit<BookingRecord, "id" | "otpCode" | "status" | "createdAt">) => Promise<BookingRecord>;
  cancelBooking: (bookingId: string) => Promise<void>;
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
  approveHostRequest: (requestId: string) => Promise<void>;
  declineHostRequest: (requestId: string) => Promise<void>;
  withdrawHostEarnings: (amount: number, upiId: string) => Promise<void>;
  convertHostEarningsToWallet: (amount: number) => Promise<void>;
  updateHostSchedule: (schedule: HostScheduleDay[]) => Promise<void>;
  setPreferredMapLayer: (layer: "standard" | "satellite" | "hybrid") => Promise<void>;
  showToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
  hideToast: () => void;
  logout: () => Promise<void>;
}

export const useVoltMateEngine = create<VoltMateEngineState>((set, get) => ({
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  user: {
    id: "usr-nidhin",
    email: "nidhinrajesh1998@gmail.com",
    name: "Nidhin R",
    fullName: "Nidhin R",
    phone: "+91 98470 49210",
    phoneNumber: "+91 98470 49210",
    upiVpa: "nidhinrajesh@okaxis",
    upiId: "nidhinrajesh@okaxis",
    role: "DRIVER",
    activeRole: "DRIVER",
    mapStyle: "standard",
    notificationsEnabled: true,
    kycVerified: true,
    voltCreditsBalance: 1450.0,
  },
  activeMode: "DRIVER",
  isLoading: true,
  vehicles: DEFAULT_VEHICLES,
  stations: INITIAL_STATIONS,
  bookings: INITIAL_BOOKINGS,
  chargingHistory: INITIAL_HISTORY,
  transactions: INITIAL_TXNS,
  notifications: INITIAL_NOTIFICATIONS,
  favoriteStationIds: ["s1"],
  selectedStationId: "s1",
  hostRequests: INITIAL_HOST_REQUESTS,
  hostEarningsBalance: 4850.0,
  hostWeeklyEarnings: 3420.0,
  hostWeeklyKwh: 312.5,
  hostSessionsCount: 14,
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
  activeSession: null,
  isChargingModalOpen: false,
  latestSettledReceipt: null,

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
      const favoriteStationIds = favsJson ? JSON.parse(favsJson) : ["s1"];
      const hostState = hostStateJson ? JSON.parse(hostStateJson) : null;

      if (token && userJson) {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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
          hostWeeklyKwh: hostState?.hostWeeklyKwh ?? 312.5,
          hostSessionsCount: hostState?.hostSessionsCount ?? 14,
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
      name: user.fullName || user.name || "Nidhin R",
      fullName: user.fullName || user.name || "Nidhin R",
      phone: user.phoneNumber || user.phone || "+91 98470 49210",
      phoneNumber: user.phoneNumber || user.phone || "+91 98470 49210",
      upiVpa: user.upiId || user.upiVpa || "nidhinrajesh@okaxis",
      upiId: user.upiId || user.upiVpa || "nidhinrajesh@okaxis",
      voltCreditsBalance:
        typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance >= 200
          ? user.voltCreditsBalance
          : 1450.0,
    };
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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
      name: user.fullName || user.name || "Nidhin R",
      fullName: user.fullName || user.name || "Nidhin R",
      phone: user.phoneNumber || user.phone || "+91 98470 49210",
      phoneNumber: user.phoneNumber || user.phone || "+91 98470 49210",
      upiVpa: user.upiId || user.upiVpa || "nidhinrajesh@okaxis",
      upiId: user.upiId || user.upiVpa || "nidhinrajesh@okaxis",
      voltCreditsBalance:
        typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance >= 200
          ? user.voltCreditsBalance
          : 1450.0,
    };
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
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
      id: "usr-nidhin",
      email: "nidhinrajesh1998@gmail.com",
      fullName: "Nidhin R",
      phoneNumber: "+91 98470 49210",
      upiId: "nidhinrajesh@okaxis",
      role: "DRIVER" as const,
      voltCreditsBalance: 1450.0,
    };
    const updatedUser: UserProfile = {
      ...current,
      ...updates,
      name: updates.fullName || updates.name || current.fullName,
      fullName: updates.fullName || updates.name || current.fullName,
      phone: updates.phoneNumber || updates.phone || current.phoneNumber,
      phoneNumber: updates.phoneNumber || updates.phone || current.phoneNumber,
      upiVpa: updates.upiId || updates.upiVpa || current.upiId,
      upiId: updates.upiId || updates.upiVpa || current.upiId,
    };

    try {
      await apiClient.patch("/auth/me", {
        full_name: updatedUser.fullName,
        phone_number: updatedUser.phoneNumber,
      });
    } catch {
      // Offline / cellular fallback persisted locally
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    set({ user: updatedUser });
    const msg = `Profile & UPI VPA (${updatedUser.upiId}) saved for ${updatedUser.fullName}.`;
    get().showToast("Profile Updated", msg, "success");
    await fireNativePushNotification("VoltMate Profile Updated", msg);
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

  topUpWalletInr: async (amountInr, mode = "UPI_APP", appName = "Google Pay UPI") => {
    if (mode === "UPI_APP") {
      await launchNativeUpiPayment(amountInr, "voltmate.escrow@okaxis", "VoltMate Energy");
    }
    await get().topUpWallet(amountInr, appName, false);
  },

  topUpWallet: async (amount, methodLabel = "UPI Instant Intent", launchUpiIntent = true) => {
    if (launchUpiIntent && methodLabel.toUpperCase().includes("UPI")) {
      await launchNativeUpiPayment(amount, "voltmate.escrow@okaxis", "VoltMate Energy");
    }
    const current = get().user || {
      id: "usr-nidhin",
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
    const toastTitle = `+₹${amount.toFixed(0)} Wallet Top-Up Successful`;
    const toastMsg = `Paid via ${methodLabel} • Balance: ₹${updatedUser.voltCreditsBalance.toFixed(2)}`;
    get().showToast(toastTitle, toastMsg, "success");
    await fireNativePushNotification(toastTitle, toastMsg);
  },

  addVehicle: async (v) => {
    const existing = get().vehicles.map((item) => ({ ...item, isPrimary: false }));
    const newVehicle: VehicleRecord = {
      ...v,
      id: `veh-${Date.now()}`,
      maxRangeKm: Math.round((v.rangeKm / Math.max(10, v.socPercent)) * 100),
      isPrimary: true,
    };
    try {
      await apiClient.post("/vehicles", {
        make_model: newVehicle.makeModel,
        plate_number: newVehicle.plateNumber,
        battery_capacity_kwh: newVehicle.batteryCapacityKwh,
      });
    } catch {
      // Persisted locally when offline
    }
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

  setActiveVehicle: async (id) => {
    await get().setPrimaryVehicle(id);
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
    const updated = get().vehicles.map((v) => {
      if (!v.isPrimary) return v;
      const maxRange = v.maxRangeKm || (v.batteryCapacityKwh < 10 ? 110 : 350);
      return {
        ...v,
        socPercent: clamped,
        rangeKm: Math.round((clamped / 100) * maxRange),
      };
    });
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(updated));
    set({ vehicles: updated });
  },

  adjustActiveVehicleSoc: async (deltaPercent) => {
    const active = get().vehicles.find((v) => v.isPrimary) || get().vehicles[0];
    if (!active) return;
    const nextSoc = Math.max(5, Math.min(100, active.socPercent + deltaPercent));
    await get().updatePrimaryVehicleSoc(nextSoc);
  },

  addStation: async (s) => {
    const newStation: StationRecord = {
      ...s,
      id: `st-${Date.now()}`,
      hostPhone: s.hostPhone || "+919847049210",
      connectorSpecs: [
        {
          id: `spec-${Date.now()}-1`,
          name: s.connectorTypes[0] || "Type-2 AC Wallbox (7.4 kW)",
          priceLabel: `₹${s.pricePerKwh.toFixed(2)}/kWh`,
          pricePerKwh: s.pricePerKwh,
          slotLabel: `Slot A • ${s.maxPowerKw} kW`,
          powerKw: s.maxPowerKw,
          plugImage: s.connectorTypes[0]?.includes("15A") ? "TYPE_A" : "TYPE_B",
        },
        ...DEFAULT_CONNECTOR_SPECS.slice(1),
      ],
      rating: 5.0,
      reviewsCount: 1,
      distanceKm: 0.4,
      etaMins: 2,
      isAvailable: true,
    };
    const updated = [newStation, ...get().stations];
    await AsyncStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(updated));
    set({ stations: updated, selectedStationId: newStation.id });
    const msg = `${newStation.name} is now live on the Kochi radar at ₹${newStation.pricePerKwh.toFixed(2)}/kWh.`;
    get().showToast("P2P Host Charger Published!", msg, "success");
    await fireNativePushNotification("P2P Charger Published!", msg);
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
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const st = get().stations.find((s) => s.id === b.stationId);
    const booking: BookingRecord = {
      ...b,
      id: `VOLT-${Math.floor(10000 + Math.random() * 90000)}`,
      hostPhone: b.hostPhone || st?.hostPhone || "+919847011223",
      otpCode,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };
    try {
      await apiClient.post("/bookings", {
        station_id: b.stationId,
        slot_time: b.slotTime,
        connector_type: b.connectorType,
      });
    } catch {
      // Offline / local ACID persistence
    }
    const updated = [booking, ...get().bookings];
    const passFormatted = `#${otpCode.slice(0, 3)}-${otpCode.slice(3)}`;
    const notifTitle = `Slot Reserved: ${b.stationName}`;
    const notifMsg = `Slot ${b.slotTime} (${b.connectorType}) confirmed • Gate Pass ${passFormatted} ready.`;
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
      notifications: [newNotif, ...get().notifications],
    });
    get().showToast("Charging Slot Reserved!", notifMsg, "success");
    await fireNativePushNotification(notifTitle, notifMsg);
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

    fireNativePushNotification(
      `⚡ Charging Started at ${session.stationName}`,
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

    const currentUser = get().user || {
      id: "usr-nidhin",
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

  approveHostRequest: async (requestId) => {
    await get().respondHostRequest(requestId, true);
  },

  declineHostRequest: async (requestId) => {
    await get().respondHostRequest(requestId, false);
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
    let newKwh = get().hostWeeklyKwh;
    let newCount = get().hostSessionsCount;
    let updatedHostTxns = get().hostTransactions;

    if (accept) {
      newBalance = Number((newBalance + req.payoutAmount).toFixed(2));
      newWeekly = Number((newWeekly + req.payoutAmount).toFixed(2));
      newKwh = Number((newKwh + (req.estKwhNum || 14.5)).toFixed(1));
      newCount += 1;
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
      hostWeeklyKwh: newKwh,
      hostSessionsCount: newCount,
      hostTransactions: updatedHostTxns,
      hostSchedule: get().hostSchedule,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HOST_STATE, JSON.stringify(hostState));

    set({
      hostRequests: updatedRequests,
      hostEarningsBalance: newBalance,
      hostWeeklyEarnings: newWeekly,
      hostWeeklyKwh: newKwh,
      hostSessionsCount: newCount,
      hostTransactions: updatedHostTxns,
    });

    if (accept) {
      const title = `Gate Pass #${generatedOtp.slice(0, 3)}-${generatedOtp.slice(3)} Issued!`;
      const msg = `Approved ${req.driverName} • +₹${req.payoutAmount.toFixed(2)} added to Host Ledger.`;
      get().showToast(title, msg, "success");
      await fireNativePushNotification(title, msg);
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
    const title = `₹${withdrawAmt.toFixed(2)} Transferred to UPI`;
    const msg = `Settled instantly to ${upiId} (IMPS Ref #${Math.floor(100000 + Math.random() * 900000)}).`;
    get().showToast(title, msg, "success");
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
    const msg = "Your Kochi P2P charger availability matrix is now live.";
    get().showToast(title, msg, "success");
    await fireNativePushNotification(title, msg);
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
    delete apiClient.defaults.headers.common["Authorization"];
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

