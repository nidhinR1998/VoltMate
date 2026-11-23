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
  landmark?: string;
  latitude: number;
  longitude: number;
  stationType: "P2P_HOME" | "PUBLIC_DC";
  connectorTypes: string[];
  connectorSpecs: ConnectorSpec[];
  maxPowerKw: number;
  pricePerKwh: number;
  parkingFeePerHrInr?: number;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  etaMins?: number;
  isAvailable: boolean;
  isOnline?: boolean;
  isUserHosted?: boolean;
  autoApproveVerifiedDrivers?: boolean;
  discomBoard?: "KSEB" | "BESCOM" | "TNEB" | "MSEDCL";
  parkingBayNumber?: string;
  gateInstructions?: string;
  amenities?: string[];
  lastSyncedAt?: string;
}

export interface HostStationUpsertInput {
  id?: string;
  title?: string;
  name?: string;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  hostName?: string;
  hostPhone?: string;
  discomBoard?: "KSEB" | "BESCOM" | "TNEB" | "MSEDCL";
  parkingBayNumber?: string;
  gateInstructions?: string;
  amenities?: string[];
  connectorTypes?: string[];
  connectorSpecs?: ConnectorSpec[];
  maxPowerKw?: number;
  pricePerKwh?: number;
  connectors?: Array<{
    name: string;
    powerKw: number;
    pricePerKwh: number;
  }>;
  parkingFeePerHrInr?: number;
  isOnline?: boolean;
  autoApproveVerifiedDrivers?: boolean;
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
  bookingId?: string;
  stationId?: string;
  stationName?: string;
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

export function normalizeUserRecord(user: UserProfile): UserProfile {
  const emailClean = (user.email || "driver@voltmate.in").toLowerCase().trim();
  const emailPrefix = emailClean.split("@")[0].replace(/[^a-z0-9]/g, "") || "driver";
  const resolvedName =
    (user.fullName || user.name || "").trim() ||
    emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  const resolvedPhone = (user.phoneNumber || user.phone || "").trim();
  const resolvedUpi = (user.upiId || user.upiVpa || `${emailPrefix}@okaxis`).trim();
  const resolvedBalance =
    typeof user.voltCreditsBalance === "number" && user.voltCreditsBalance >= 0
      ? user.voltCreditsBalance
      : 250.0;

  return {
    ...user,
    id: user.id || `usr_${emailPrefix}`,
    email: emailClean,
    role: user.role || user.activeRole || "DRIVER",
    activeRole: user.activeRole || user.role || "DRIVER",
    name: resolvedName,
    fullName: resolvedName,
    phone: resolvedPhone,
    phoneNumber: resolvedPhone,
    upiVpa: resolvedUpi,
    upiId: resolvedUpi,
    voltCreditsBalance: resolvedBalance,
  };
}

export const DEFAULT_VEHICLES: VehicleRecord[] = [
  {
    id: "v1",
    makeModel: "Tata Nexon.ev Empowered+ 45",
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
    makeModel: "MG Windsor EV Essence",
    year: "2025",
    plateNumber: "KL-07-DF-1092",
    batteryCapacityKwh: 38.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC & Type-2 AC",
    socPercent: 64,
    rangeKm: 195,
    maxRangeKm: 305,
    isPrimary: false,
  },
  {
    id: "v3",
    makeModel: "Mahindra BE 6 Pack Three",
    year: "2025",
    plateNumber: "KL-01-EV-6009",
    batteryCapacityKwh: 59.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC Fast & Type-2 AC",
    socPercent: 80,
    rangeKm: 356,
    maxRangeKm: 445,
    isPrimary: false,
  },
  {
    id: "v4",
    makeModel: "Tata Curvv.ev Empowered+ 55",
    year: "2025",
    plateNumber: "KL-11-CR-5501",
    batteryCapacityKwh: 55.0,
    connectorType: "CCS2",
    connectorLabel: "CCS2 DC & Type-2 AC",
    socPercent: 76,
    rangeKm: 323,
    maxRangeKm: 425,
    isPrimary: false,
  },
  {
    id: "v5",
    makeModel: "Ather 450X Gen 3 (3.7 kWh)",
    year: "2025",
    plateNumber: "KL-07-BX-8821",
    batteryCapacityKwh: 3.7,
    connectorType: "SOCKET_15A",
    connectorLabel: "LECCS Fast Grid & 15A Socket",
    socPercent: 88,
    rangeKm: 97,
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

export const INITIAL_STATIONS: StationRecord[] = [
  {
    id: "kl_pnr_chargemod_sahakarana",
    name: "chargeMOD Fast Hub — New Bus Stand Rd Payyanur",
    hostName: "chargeMOD",
    hostPhone: "+919072312328",
    address: "Near Payyanur Co-Operative (Sahakarana) Hospital, New Bus Stand Rd, Payyanur",
    latitude: 12.1045,
    longitude: 75.2058,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (7.4 kW)", "15A 3-Pin (3.3 kW)"],
    connectorSpecs: [
      {
        id: "pnr-cm-1",
        name: "CCS2 DC Fast (60 kW)",
        priceLabel: "₹15.50/kWh",
        pricePerKwh: 15.5,
        slotLabel: "2/2 Free • 60 kW",
        powerKw: 60.0,
        plugImage: "CHADEMO",
      },
      {
        id: "pnr-cm-2",
        name: "Type-2 AC (7.4 kW)",
        priceLabel: "₹11.50/kWh",
        pricePerKwh: 11.5,
        slotLabel: "1/1 Free • 7.4 kW",
        powerKw: 7.4,
        plugImage: "TYPE_B",
      },
      {
        id: "pnr-cm-3",
        name: "15A 3-Pin Socket (3.3 kW)",
        priceLabel: "₹8.50/kWh",
        pricePerKwh: 8.5,
        slotLabel: "1/1 Free • 3.3 kW",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
    ],
    maxPowerKw: 60.0,
    pricePerKwh: 11.5,
    rating: 4.5,
    reviewsCount: 24,
    distanceKm: 0.2,
    etaMins: 2,
    isAvailable: true,
    isOnline: true,
    discomBoard: "KSEB",
  },
  {
    id: "kl_pnr_kseb_substation",
    name: "KSEB Public EV Station (KSEB13-CB114) — Payyanur",
    hostName: "KSEB e-Mobility",
    hostPhone: "+9118004251553",
    address: "KSEB Electrical Section / Perumba Bypass Rd, Payyanur, Kerala 670307",
    latitude: 12.1066,
    longitude: 75.2098,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (22 kW)", "15A 3-Pin (3.3 kW)"],
    connectorSpecs: [
      {
        id: "pnr-kseb-1",
        name: "CCS2 DC Fast (60 kW)",
        priceLabel: "₹14.50/kWh",
        pricePerKwh: 14.5,
        slotLabel: "2/2 Free • 60 kW",
        powerKw: 60.0,
        plugImage: "CHADEMO",
      },
      {
        id: "pnr-kseb-2",
        name: "Type-2 AC (22 kW)",
        priceLabel: "₹10.50/kWh",
        pricePerKwh: 10.5,
        slotLabel: "1/1 Free • 22 kW",
        powerKw: 22.0,
        plugImage: "TYPE_B",
      },
    ],
    maxPowerKw: 60.0,
    pricePerKwh: 10.5,
    rating: 4.6,
    reviewsCount: 38,
    distanceKm: 0.4,
    etaMins: 2,
    isAvailable: true,
    isOnline: true,
    discomBoard: "KSEB",
  },
  {
    id: "kl_pnr_tata_kvr",
    name: "Tata Power EZ Charge — KVR Tata Service Payyanur",
    hostName: "Tata Power",
    hostPhone: "+9118002098282",
    address: "KVR Motors Tata Service Centre (46C9+F48), NH 66 Perumba–Vellur, Payyanur",
    latitude: 12.1211,
    longitude: 75.2178,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (50 kW)", "Type-2 AC (7.4 kW)"],
    connectorSpecs: [
      {
        id: "pnr-tata-1",
        name: "CCS2 DC Fast (50 kW)",
        priceLabel: "₹16.00/kWh",
        pricePerKwh: 16.0,
        slotLabel: "2/2 Free • 50 kW",
        powerKw: 50.0,
        plugImage: "CHADEMO",
      },
      {
        id: "pnr-tata-2",
        name: "Type-2 AC (7.4 kW)",
        priceLabel: "₹12.00/kWh",
        pricePerKwh: 12.0,
        slotLabel: "1/1 Free • 7.4 kW",
        powerKw: 7.4,
        plugImage: "TYPE_B",
      },
    ],
    maxPowerKw: 50.0,
    pricePerKwh: 12.0,
    rating: 4.6,
    reviewsCount: 31,
    distanceKm: 1.8,
    etaMins: 4,
    isAvailable: true,
    isOnline: true,
    discomBoard: "KSEB",
  },
  {
    id: "kl_pnr_goec_cheruthazham",
    name: "GOEC SuperFast Hub — NH 66 Cheruthazham / Pilathara",
    hostName: "GOEC",
    hostPhone: "+919778687615",
    address: "NH 66 Cheruthazham, Near Pilathara, Payyanur, Kerala 670309",
    latitude: 12.0886,
    longitude: 75.2527,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (22 kW)"],
    connectorSpecs: [
      {
        id: "pnr-goec-1",
        name: "CCS2 DC Fast (60 kW)",
        priceLabel: "₹16.50/kWh",
        pricePerKwh: 16.5,
        slotLabel: "2/2 Free • 60 kW",
        powerKw: 60.0,
        plugImage: "CHADEMO",
      },
      {
        id: "pnr-goec-2",
        name: "Type-2 AC (22 kW)",
        priceLabel: "₹12.50/kWh",
        pricePerKwh: 12.5,
        slotLabel: "1/1 Free • 22 kW",
        powerKw: 22.0,
        plugImage: "TYPE_B",
      },
    ],
    maxPowerKw: 60.0,
    pricePerKwh: 12.5,
    rating: 4.8,
    reviewsCount: 42,
    distanceKm: 5.2,
    etaMins: 9,
    isAvailable: true,
    isOnline: true,
    discomBoard: "KSEB",
  },
  {
    id: "s1",
    name: "KSEB Infopark Substation DC Fast Hub",
    hostName: "KSEB e-Mobility",
    hostPhone: "+9118004251553",
    address: "Infopark Expressway, Kakkanad, Kochi",
    latitude: 10.0104,
    longitude: 76.3612,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (60 kW)", "Type-2 AC (22 kW)", "15A 3-Pin (3.3 kW)"],
    connectorSpecs: [
      {
        id: "s1-ccs2",
        name: "CCS2 DC Fast (60 kW)",
        priceLabel: "₹15.50/kWh",
        pricePerKwh: 15.5,
        slotLabel: "Slot A • 60 kW DC",
        powerKw: 60.0,
        plugImage: "CHADEMO",
      },
      {
        id: "s1-type2",
        name: "Type-2 AC (22 kW)",
        priceLabel: "₹11.50/kWh",
        pricePerKwh: 11.5,
        slotLabel: "Slot B • 22 kW AC",
        powerKw: 22.0,
        plugImage: "TYPE_B",
      },
      {
        id: "s1-15a",
        name: "15A 3-Pin Socket (3.3 kW)",
        priceLabel: "₹8.50/kWh",
        pricePerKwh: 8.5,
        slotLabel: "Slot C • 3.3 kW AC",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
    ],
    maxPowerKw: 60.0,
    pricePerKwh: 15.5,
    rating: 4.8,
    reviewsCount: 94,
    distanceKm: 0.8,
    etaMins: 3,
    isAvailable: true,
    isOnline: true,
    discomBoard: "KSEB",
  },
  {
    id: "s2",
    name: "chargeMOD Seaport-Airport Rd Hub",
    hostName: "chargeMOD Kerala",
    hostPhone: "+919847022334",
    address: "Seaport-Airport Rd, Near Collectorate, Kakkanad, Kochi",
    latitude: 10.0159,
    longitude: 76.3419,
    stationType: "PUBLIC_DC",
    connectorTypes: ["CCS2 DC Fast (30 kW)", "Type-2 AC (7.4 kW)", "15A 3-Pin (3.3 kW)"],
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
        name: "Type-2 AC (7.4 kW)",
        priceLabel: "₹11.50/kWh",
        pricePerKwh: 11.5,
        slotLabel: "Slot B • 7.4 kW AC",
        powerKw: 7.4,
        plugImage: "TYPE_B",
      },
      {
        id: "s2-ccs2",
        name: "CCS2 DC Fast (30 kW)",
        priceLabel: "₹15.50/kWh",
        pricePerKwh: 15.5,
        slotLabel: "Slot C • 30 kW DC",
        powerKw: 30.0,
        plugImage: "CHADEMO",
      },
    ],
    maxPowerKw: 30.0,
    pricePerKwh: 11.5,
    rating: 4.7,
    reviewsCount: 68,
    distanceKm: 1.1,
    etaMins: 3,
    isAvailable: true,
    isOnline: true,
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

export const INITIAL_HOST_SCHEDULE: HostScheduleDay[] = [
  { day: "Monday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Tuesday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Wednesday", slots: "Evening (18:00 – 23:00)", active: true },
  { day: "Thursday", slots: "Daytime (09:00 – 18:00)", active: true },
  { day: "Friday", slots: "24 Hours (00:00 – 23:59)", active: true },
  { day: "Saturday", slots: "24 Hours (00:00 – 23:59)", active: true },
  { day: "Sunday", slots: "Closed (Reserved for private use)", active: false },
];
