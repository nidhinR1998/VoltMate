import { ENABLE_DEMO_SEEDS } from "../services/api";
import { calcDistanceKm } from "../services/realTimeEvHunter";
import {
  repairMismatchedStationAddress,
  resolveLocalityFromCoordinates,
} from "../services/hybridMapService";

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
  city?: string;
  pincode?: string;
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
  city?: string;
  pincode?: string;
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
  gatewayRef?: string;
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

export const ACTIVE_INITIAL_STATIONS: StationRecord[] = INITIAL_STATIONS;

/**
 * Detects and purges any legacy seeded/demo station, booking, receipt, or request
 * (e.g., Lotus Greens Villa, Kakkanad/Kochi seed rows, PASS 544 555, VOLT-88412)
 * from persisted AsyncStorage or backend hydration in non-dev builds.
 */
export function isLegacySeedRecord(raw: any): boolean {
  if (ENABLE_DEMO_SEEDS || !raw || typeof raw !== "object") return false;
  const id = String(raw.id || raw.stationId || "").toLowerCase();
  if (
    [
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
      "p2p-host-lotus-greens",
      "volt-88412",
      "hist-8921",
      "hist-8840",
      "req-101",
    ].includes(id)
  ) {
    return true;
  }
  const textBlob = [
    raw.name,
    raw.title,
    raw.stationName,
    raw.station,
    raw.address,
    raw.otpCode,
    raw.gate_pass_code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    textBlob.includes("lotus greens") ||
    textBlob.includes("edachira") ||
    textBlob.includes("544555") ||
    textBlob.includes("544 555")
  ) {
    return true;
  }
  return false;
}

export function sanitizePersistedRecords<T>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isLegacySeedRecord(item));
}

/**
 * Vehicle Connector Compatibility Engine:
 * Ensures a vehicle only sees connectors it physically supports.
 * - Scooters / 2W / 15A vehicles (SOCKET_15A or batteryCapacityKwh < 10 without CCS2/Type-2)
 *   ONLY match 15A / 3-Pin / Domestic / LECCS connectors (never CCS2 or Type-2).
 * - Type-2 AC-only vehicles match Type-2 and 15A (never CCS2 DC).
 * - CCS2 vehicles match CCS2, Type-2, and 15A.
 */
export function isConnectorCompatibleWithVehicle(
  connectorName: string,
  vehicle?: Pick<
    VehicleRecord,
    "connectorType" | "connectorLabel" | "batteryCapacityKwh"
  > | null
): boolean {
  if (!vehicle) return true;
  const cUpper = (connectorName || "").toUpperCase();
  const labelUpper = (vehicle.connectorLabel || "").toUpperCase();
  const isScooterOr15A =
    vehicle.connectorType === "SOCKET_15A" ||
    (typeof vehicle.batteryCapacityKwh === "number" &&
      vehicle.batteryCapacityKwh < 10 &&
      !labelUpper.includes("CCS2") &&
      !labelUpper.includes("TYPE-2"));

  if (isScooterOr15A) {
    if (cUpper.includes("CCS") || cUpper.includes("TYPE-2") || cUpper.includes("TYPE 2")) {
      return false;
    }
    return (
      cUpper.includes("15A") ||
      cUpper.includes("3-PIN") ||
      cUpper.includes("SOCKET") ||
      cUpper.includes("DOMESTIC") ||
      cUpper.includes("LECCS")
    );
  }

  if (vehicle.connectorType === "TYPE_2" && !labelUpper.includes("CCS2")) {
    return !cUpper.includes("CCS");
  }

  return true;
}

export function getCompatibleConnectorsForVehicle(
  connectors: ConnectorSpec[],
  vehicle?: Pick<
    VehicleRecord,
    "connectorType" | "connectorLabel" | "batteryCapacityKwh"
  > | null
): ConnectorSpec[] {
  const list =
    Array.isArray(connectors) && connectors.length > 0
      ? connectors
      : DEFAULT_CONNECTOR_SPECS;
  if (!vehicle) return list;

  const compatible = list.filter((c) =>
    isConnectorCompatibleWithVehicle(c.name, vehicle)
  );
  if (compatible.length > 0) return compatible;

  if (
    vehicle.connectorType === "SOCKET_15A" ||
    (typeof vehicle.batteryCapacityKwh === "number" &&
      vehicle.batteryCapacityKwh < 10)
  ) {
    return [
      {
        id: "conn-15a-compat",
        name: "15A 3-Pin Socket (3.3 kW)",
        priceLabel: "₹8.50/kWh",
        pricePerKwh: 8.5,
        slotLabel: "1/1 Free • 3.3 kW",
        powerKw: 3.3,
        plugImage: "TYPE_A",
      },
    ];
  }
  return list;
}

export function filterStationForVehicle(
  station: StationRecord,
  vehicle?: Pick<
    VehicleRecord,
    "connectorType" | "connectorLabel" | "batteryCapacityKwh"
  > | null
): StationRecord {
  if (!vehicle) return station;
  const compatibleSpecs = getCompatibleConnectorsForVehicle(
    station.connectorSpecs,
    vehicle
  );
  const minPrice = Math.min(...compatibleSpecs.map((c) => c.pricePerKwh));
  const maxPower = Math.max(...compatibleSpecs.map((c) => c.powerKw));
  return {
    ...station,
    connectorSpecs: compatibleSpecs,
    connectorTypes: compatibleSpecs.map((c) => c.name),
    pricePerKwh: Number.isFinite(minPrice) ? minPrice : station.pricePerKwh,
    maxPowerKw: Number.isFinite(maxPower) ? maxPower : station.maxPowerKw,
  };
}

/**
 * ONE canonical station mapper used by Home carousel, Map sheet, Station details, and Booking.
 * Guarantees that a station always has ONE type (P2P_HOME or PUBLIC_DC), ONE set of connectors/prices/power,
 * and an address that matches its GPS coordinates.
 */
export function normalizeStationRecord(
  raw: any,
  refLat?: number,
  refLng?: number
): StationRecord {
  const lat = Number(raw?.latitude) || 12.1045;
  const lng = Number(raw?.longitude) || 75.2058;
  const locality = resolveLocalityFromCoordinates(lat, lng);
  const rawAddress = String(
    raw?.address || raw?.address_line || locality.formattedAddress
  ).trim();
  const repaired = repairMismatchedStationAddress({
    address: rawAddress,
    latitude: lat,
    longitude: lng,
  });

  const isP2p =
    raw?.stationType === "P2P_HOME" ||
    raw?.node_type === "P2P_HOME" ||
    Boolean(raw?.isUserHosted);
  const stationType: "P2P_HOME" | "PUBLIC_DC" = isP2p
    ? "P2P_HOME"
    : "PUBLIC_DC";

  const stationId = String(
    raw?.id || `st_${lat.toFixed(4)}_${lng.toFixed(4)}`
  );

  let connectorSpecs: ConnectorSpec[] = [];
  if (Array.isArray(raw?.connectorSpecs) && raw.connectorSpecs.length > 0) {
    connectorSpecs = raw.connectorSpecs.map((c: any, idx: number) => {
      const price = Number(c.pricePerKwh ?? c.pricePerKwhInr ?? 11.5);
      const power = Number(c.powerKw ?? 7.4);
      const name = String(c.name || c.type || "Type-2 AC (7.4 kW)");
      return {
        id: String(c.id || `${stationId}_conn_${idx}`),
        name,
        priceLabel: `₹${price.toFixed(2)}/kWh`,
        pricePerKwh: price,
        slotLabel: String(c.slotLabel || `Slot ${String.fromCharCode(65 + idx)} • ${power} kW`),
        powerKw: power,
        plugImage:
          c.plugImage ||
          (name.toUpperCase().includes("15A")
            ? "TYPE_A"
            : name.toUpperCase().includes("CCS")
            ? "CHADEMO"
            : "TYPE_B"),
      };
    });
  } else if (
    Array.isArray(raw?.connectors || raw?.connector_specs) &&
    (raw.connectors || raw.connector_specs).length > 0
  ) {
    const rawConns = raw.connectors || raw.connector_specs;
    connectorSpecs = rawConns.map((c: any, idx: number) => {
      const cType = String(c.type || c.name || "Type-2");
      const power = Number(c.powerKw ?? 7.4);
      const price = Number(c.pricePerKwhInr ?? c.pricePerKwh ?? 11.5);
      const avail = Number(c.availableCount ?? 1);
      const tot = Number(c.totalCount ?? 1);
      const fullName =
        cType.includes("kW")
          ? cType
          : cType.toUpperCase().includes("CCS")
          ? `CCS2 DC Fast (${power} kW)`
          : cType.toUpperCase().includes("TYPE")
          ? `Type-2 AC (${power} kW)`
          : cType.toUpperCase().includes("LECCS")
          ? `LECCS Fast Grid (${power} kW)`
          : `15A 3-Pin Socket (${power} kW)`;
      return {
        id: String(c.id || `${stationId}_c_${idx}`),
        name: fullName,
        priceLabel: `₹${price.toFixed(2)}/kWh`,
        pricePerKwh: price,
        slotLabel: `${avail}/${tot} Free • ${power} kW`,
        powerKw: power,
        plugImage: fullName.toUpperCase().includes("CCS")
          ? "CHADEMO"
          : fullName.toUpperCase().includes("TYPE")
          ? "TYPE_B"
          : "TYPE_A",
      };
    });
  } else {
    connectorSpecs = DEFAULT_CONNECTOR_SPECS;
  }

  const maxPowerKw = Math.max(...connectorSpecs.map((c) => c.powerKw), 3.3);
  const pricePerKwh = Math.min(
    ...connectorSpecs.map((c) => c.pricePerKwh),
    15.5
  );

  const hasRefCoords =
    typeof refLat === "number" &&
    typeof refLng === "number" &&
    Number.isFinite(refLat) &&
    Number.isFinite(refLng);
  const distanceKm = hasRefCoords
    ? calcDistanceKm(refLat!, refLng!, lat, lng)
    : Number(raw?.distanceKm ?? raw?.distance_km ?? 0.5);
  const etaMins = Math.max(2, Math.round(distanceKm * 2.2));

  return {
    id: stationId,
    name: String(raw?.name || raw?.title || "EV Charging Station").trim(),
    hostName: String(
      raw?.hostName || raw?.host_name || raw?.operator || "Public EV Grid"
    ).trim(),
    hostPhone: String(
      raw?.hostPhone || raw?.host_phone || raw?.phone || "+9118002098282"
    ).trim(),
    address: repaired.address,
    city: raw?.city || locality.city,
    pincode: raw?.pincode || locality.pincode,
    landmark: raw?.landmark,
    latitude: lat,
    longitude: lng,
    stationType,
    connectorTypes: connectorSpecs.map((c) => c.name),
    connectorSpecs,
    maxPowerKw,
    pricePerKwh,
    parkingFeePerHrInr: Number(
      raw?.parkingFeePerHrInr ?? raw?.parking_fee_per_hr ?? 15
    ),
    rating: Number(raw?.rating ?? raw?.host_trust_score ?? 4.7),
    reviewsCount: Number(raw?.reviewsCount ?? raw?.reviewCount ?? 24),
    distanceKm,
    etaMins,
    isAvailable: raw?.isAvailable !== false && raw?.isOnline !== false,
    isOnline: raw?.isOnline !== false,
    isUserHosted: Boolean(raw?.isUserHosted),
    autoApproveVerifiedDrivers: raw?.autoApproveVerifiedDrivers !== false,
    discomBoard: raw?.discomBoard || "KSEB",
    parkingBayNumber: raw?.parkingBayNumber,
    gateInstructions: raw?.gateInstructions || raw?.gate_instructions,
    amenities: raw?.amenities,
    lastSyncedAt: raw?.lastSyncedAt || new Date().toISOString(),
  };
}

/**
 * Pure tab partitioner for BookingsScreen:
 * - "Upcoming" strictly contains UPCOMING, CONFIRMED, and ACTIVE_CHARGING bookings.
 * - "History" contains all chargingHistory receipts plus any COMPLETED or CANCELLED bookings.
 */
export function partitionBookingsByTab(
  bookings: BookingRecord[],
  chargingHistory: ChargingHistoryRecord[]
): {
  upcomingBookings: BookingRecord[];
  historyRecords: ChargingHistoryRecord[];
} {
  const upcomingBookings = bookings.filter(
    (b) =>
      b.status === "UPCOMING" ||
      b.status === "CONFIRMED" ||
      b.status === "ACTIVE_CHARGING"
  );

  const historyFromBookings: ChargingHistoryRecord[] = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED")
    .filter(
      (b) =>
        !chargingHistory.some(
          (h) => h.id === b.id || h.invoiceNumber === b.id
        )
    )
    .map((b) => ({
      id: b.id,
      invoiceNumber: b.id,
      station: b.stationName,
      hostName: b.hostName || "VoltMate Host",
      date: b.slotTime,
      energyKwh: b.estimatedKwh,
      durationMins: 60,
      amount: b.totalAmount,
      ratePerKwh: b.pricePerKwh,
      connectorType: b.connectorType,
      status: b.status,
    }));

  return {
    upcomingBookings,
    historyRecords: [...chargingHistory, ...historyFromBookings],
  };
}
