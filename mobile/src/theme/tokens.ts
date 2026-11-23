import { Platform, TextStyle, ViewStyle } from "react-native";

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenMargin: 20,
  cardPadding: 16,
  cardRadius: 18,
  cardRadiusLg: 20,
  cardRadiusLarge: 20,
  chipRadius: 999,
  touchTarget: 48,
  navSafePadding: 140,
} as const;

export const COLORS = {
  // Brand & Primary Actions (Deep Green — WCAG AA compliant with white text)
  primary: "#0B6E3F",
  primaryPressed: "#085430",
  primaryDark: "#074D2B",
  primarySoft: "#E8F6EE",
  primaryLight: "#E8F6EE",
  primarySurface: "#F2FAF5",
  primaryBorder: "#A9DFC1",

  // Live / Charging Status ONLY (Neon Green)
  neonLive: "#05E660",
  neonLiveSoft: "rgba(5, 230, 96, 0.16)",

  // Text Hierarchy (WCAG AA >= 4.5:1 on white and canvas)
  textPrimary: "#111714",
  textSecondary: "#414D46",
  textMuted: "#56635C",
  textInverse: "#FFFFFF",

  // Backgrounds & Surfaces
  bgCanvas: "#F4F6F5",
  background: "#F4F6F5",
  bgSurface: "#FFFFFF",
  surface: "#FFFFFF",
  bgSubtle: "#EBF0ED",
  surfaceSubtle: "#F4F7F5",
  surfaceMuted: "#EBF0ED",
  bgDark: "#111714",
  bgDarkElevated: "#1B2620",
  overlay: "rgba(15, 23, 19, 0.48)",

  // Borders & Dividers
  border: "#D8E0DC",
  borderStrong: "#B5C2BC",
  borderFocus: "#0B6E3F",

  // Semantic Colors
  success: "#0B6E3F",
  successSoft: "#E8F6EE",
  successBg: "#E8F6EE",
  warning: "#B54708",
  warningSoft: "#FEF0C7",
  warningBg: "#FEF0C7",
  error: "#D92D20",
  errorSoft: "#FEE4E2",
  errorBg: "#FEE4E2",
  destructive: "#D92D20",
  destructiveSoft: "#FEE4E2",
  info: "#175CD3",
  infoSoft: "#EFF8FF",
  infoBg: "#EFF8FF",
} as const;

const FONT_FAMILY = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "Inter",
});

export const TYPOGRAPHY: Record<
  | "display"
  | "h1"
  | "h2"
  | "title"
  | "body"
  | "bodyMedium"
  | "bodySemibold"
  | "caption"
  | "captionSemibold"
  | "tabular",
  TextStyle
> = {
  display: {
    fontFamily: FONT_FAMILY,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bodySemibold: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  captionSemibold: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
};

// Strictly 2 Elevation Levels across the entire app
export const ELEVATION: Record<"level1" | "level2", ViewStyle> = {
  level1: {
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  level2: {
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const CANONICAL_TARIFF_RATES_INR = {
  CCS2: 15.5,
  TYPE_2: 11.5,
  LECCS: 10.0,
  SOCKET_15A: 8.5,
} as const;

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatInr(amount: number, decimals = 2): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatGatePassPin(pin?: string | number | null, separator = " "): string {
  const clean = String(pin ?? "544555").replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  return `${clean.slice(0, 3)}${separator}${clean.slice(3, 6)}`;
}

export function formatDurationClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function calculateGstBreakdown(totalInr: number): {
  totalSettledInr: number;
  taxableValueInr: number;
  totalGstInr: number;
  cgstInr: number;
  sgstInr: number;
} {
  const total = Number((Number.isFinite(totalInr) ? totalInr : 0).toFixed(2));
  const taxable = Number((total / 1.18).toFixed(2));
  const gstTotal = Number((total - taxable).toFixed(2));
  const cgst = Number((gstTotal / 2).toFixed(2));
  const sgst = Number((gstTotal - cgst).toFixed(2));
  return {
    totalSettledInr: total,
    taxableValueInr: taxable,
    totalGstInr: gstTotal,
    cgstInr: cgst,
    sgstInr: sgst,
  };
}

export function deriveMaxRangeKm(
  batteryCapacityKwh: number,
  explicitMaxRangeKm?: number
): number {
  if (explicitMaxRangeKm && explicitMaxRangeKm > 0) {
    return Math.round(explicitMaxRangeKm);
  }
  const cap = Number.isFinite(batteryCapacityKwh) ? batteryCapacityKwh : 40.5;
  return cap < 10 ? 110 : Math.round(cap * 7.8);
}

export function deriveRangeFromSocKm(socPercent: number, maxRangeKm: number): number {
  const clampedSoc = Math.max(5, Math.min(100, Math.round(socPercent)));
  return Math.round((clampedSoc / 100) * maxRangeKm);
}

export function estimateBookingKwhAndTotal(
  powerKw: number,
  durationHours: number,
  pricePerKwh: number
): { estimatedKwh: number; estimatedTotalInr: number } {
  const estimatedKwh = Number(
    Math.min(35, powerKw * durationHours * 0.85).toFixed(1)
  );
  const estimatedTotalInr = Number((estimatedKwh * pricePerKwh).toFixed(2));
  return { estimatedKwh, estimatedTotalInr };
}

export function isOwnStationDistanceHidden(
  isUserHosted?: boolean,
  distanceKm?: number
): boolean {
  if (isUserHosted) return true;
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0.05
  ) {
    return true;
  }
  return false;
}
