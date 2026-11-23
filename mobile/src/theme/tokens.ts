import { Platform, TextStyle, ViewStyle, useColorScheme } from "react-native";

export const ICON_STROKE_WIDTH = 2;

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
  cardRadius: 20,
  cardRadiusLg: 20,
  cardRadiusLarge: 20,
  chipRadius: 999,
  touchTarget: 48,
  navSafePadding: 140,
} as const;

export const LIGHT_COLORS = {
  // Canonical "Volt Clean" Light Tokens
  ink: "#0E1A14",
  emerald700: "#0A6B47",
  emerald500: "#12A06A",
  volt: "#19E27D",
  mist: "#F4F7F5",
  surface: "#FFFFFF",
  surface2: "#EAF2EE",

  // Semantic & Legacy-Compatible Aliases (WCAG AA verified >= 4.5:1)
  primary: "#0A6B47",
  primaryPressed: "#075337",
  primaryDark: "#084C33",
  secondary: "#12A06A",
  primarySoft: "#EAF2EE",
  primaryLight: "#EAF2EE",
  primarySurface: "#F2F8F5",
  primaryBorder: "#A9DFC1",

  // Live / Charging / Positive Status ONLY (Volt #19E27D)
  neonLive: "#19E27D",
  neonLiveSoft: "rgba(25, 226, 125, 0.16)",

  // Text Hierarchy (WCAG AA >= 4.5:1 on Surface #FFFFFF and Mist #F4F7F5)
  textPrimary: "#0E1A14",
  textSecondary: "#5B6B63",
  textMuted: "#5B6B63",
  textInverse: "#FFFFFF",

  // Backgrounds & Surfaces
  bgCanvas: "#F4F7F5",
  background: "#F4F7F5",
  bgSurface: "#FFFFFF",
  bgSubtle: "#EAF2EE",
  surfaceSubtle: "#EAF2EE",
  surfaceMuted: "#EAF2EE",
  bgDark: "#0E1A14",
  bgDarkElevated: "#162820",
  overlay: "rgba(14, 26, 20, 0.48)",

  // Borders & Dividers
  border: "#D5E2DC",
  borderStrong: "#B3C7BE",
  borderFocus: "#0A6B47",

  // Semantic Status Colors
  success: "#0A6B47",
  successSoft: "#EAF2EE",
  successBg: "#EAF2EE",
  warning: "#E0A100",
  warningText: "#7A5200",
  warningSoft: "#FFF8E6",
  warningBg: "#FFF8E6",
  error: "#D64545",
  destructive: "#C53030",
  errorSoft: "#FDECEC",
  errorBg: "#FDECEC",
  destructiveSoft: "#FDECEC",
  info: "#2B7BE4",
  infoText: "#184E98",
  infoSoft: "#EAF3FE",
  infoBg: "#EAF3FE",
} as const;

export const DARK_COLORS = {
  // Canonical "Volt Clean" Dark Tokens
  ink: "#ECF3EF",
  emerald700: "#12A06A",
  emerald500: "#19E27D",
  volt: "#19E27D",
  mist: "#0B1410",
  surface: "#13211B",
  surface2: "#1B2E26",

  // Semantic & Legacy-Compatible Aliases (WCAG AA verified >= 4.5:1 on Dark Surface)
  primary: "#12A06A",
  primaryPressed: "#0E8457",
  primaryDark: "#13211B",
  secondary: "#19E27D",
  primarySoft: "#1B2E26",
  primaryLight: "#1B2E26",
  primarySurface: "#172921",
  primaryBorder: "#285943",

  // Live / Charging / Positive Status ONLY
  neonLive: "#19E27D",
  neonLiveSoft: "rgba(25, 226, 125, 0.18)",

  // Text Hierarchy
  textPrimary: "#ECF3EF",
  textSecondary: "#9FB0A7",
  textMuted: "#9FB0A7",
  textInverse: "#0B1410",

  // Backgrounds & Surfaces
  bgCanvas: "#0B1410",
  background: "#0B1410",
  bgSurface: "#13211B",
  bgSubtle: "#1B2E26",
  surfaceSubtle: "#1B2E26",
  surfaceMuted: "#1B2E26",
  bgDark: "#080F0C",
  bgDarkElevated: "#13211B",
  overlay: "rgba(5, 10, 8, 0.68)",

  // Borders & Dividers
  border: "#23382F",
  borderStrong: "#345245",
  borderFocus: "#19E27D",

  // Semantic Status Colors
  success: "#19E27D",
  successSoft: "#1B2E26",
  successBg: "#1B2E26",
  warning: "#E0A100",
  warningText: "#F6C945",
  warningSoft: "#2C2410",
  warningBg: "#2C2410",
  error: "#D64545",
  destructive: "#E05252",
  errorSoft: "#2E1618",
  errorBg: "#2E1618",
  destructiveSoft: "#2E1618",
  info: "#2B7BE4",
  infoText: "#68A6F8",
  infoSoft: "#132238",
  infoBg: "#132238",
} as const;

export const COLORS = LIGHT_COLORS;

export type ThemeMode = "light" | "dark" | "system";
export type ThemePalette = typeof LIGHT_COLORS | typeof DARK_COLORS;

export function getThemeColors(mode: "light" | "dark" = "light"): ThemePalette {
  return mode === "dark" ? DARK_COLORS : LIGHT_COLORS;
}

export function useThemeColors(overrideMode?: ThemeMode): ThemePalette {
  const sys = useColorScheme();
  const resolved =
    overrideMode === "dark" || (overrideMode !== "light" && sys === "dark")
      ? "dark"
      : "light";
  return getThemeColors(resolved);
}

// WCAG 2.1 Relative Luminance & Contrast Ratio Calculator
export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function verifyVoltCleanWcagContrast(): {
  allPass: boolean;
  pairs: Array<{
    name: string;
    ratio: number;
    minRequired: number;
    pass: boolean;
  }>;
} {
  const checks = [
    {
      name: "Light: Ink (#0E1A14) on Surface (#FFFFFF)",
      fg: LIGHT_COLORS.ink,
      bg: LIGHT_COLORS.surface,
      min: 4.5,
    },
    {
      name: "Light: Ink (#0E1A14) on Mist (#F4F7F5)",
      fg: LIGHT_COLORS.ink,
      bg: LIGHT_COLORS.mist,
      min: 4.5,
    },
    {
      name: "Light: Ink (#0E1A14) on Surface-2 (#EAF2EE)",
      fg: LIGHT_COLORS.ink,
      bg: LIGHT_COLORS.surface2,
      min: 4.5,
    },
    {
      name: "Light: Text-Secondary (#5B6B63) on Surface (#FFFFFF)",
      fg: LIGHT_COLORS.textSecondary,
      bg: LIGHT_COLORS.surface,
      min: 4.5,
    },
    {
      name: "Light: Text-Secondary (#5B6B63) on Mist (#F4F7F5)",
      fg: LIGHT_COLORS.textSecondary,
      bg: LIGHT_COLORS.mist,
      min: 4.5,
    },
    {
      name: "Light: White (#FFFFFF) on Emerald-700 Primary (#0A6B47)",
      fg: "#FFFFFF",
      bg: LIGHT_COLORS.emerald700,
      min: 4.5,
    },
    {
      name: "Light: White (#FFFFFF) on Destructive Button (#C53030)",
      fg: "#FFFFFF",
      bg: LIGHT_COLORS.destructive,
      min: 4.5,
    },
    {
      name: "Dark: Ink (#ECF3EF) on Dark Surface (#13211B)",
      fg: DARK_COLORS.ink,
      bg: DARK_COLORS.surface,
      min: 4.5,
    },
    {
      name: "Dark: Text-Secondary (#9FB0A7) on Dark Mist (#0B1410)",
      fg: DARK_COLORS.textSecondary,
      bg: DARK_COLORS.mist,
      min: 4.5,
    },
    {
      name: "Dark: Dark Text (#0B1410) on Emerald-500 (#19E27D)",
      fg: DARK_COLORS.textInverse,
      bg: DARK_COLORS.emerald500,
      min: 4.5,
    },
  ];

  const pairs = checks.map((c) => {
    const ratio = getContrastRatio(c.fg, c.bg);
    return {
      name: c.name,
      ratio,
      minRequired: c.min,
      pass: ratio >= c.min,
    };
  });
  return {
    allPass: pairs.every((p) => p.pass),
    pairs,
  };
}

export const HEADING_FONT_FAMILY = Platform.select({
  ios: "PlusJakartaSans-SemiBold",
  android: "sans-serif-medium",
  default: "Plus Jakarta Sans",
});

export const BODY_FONT_FAMILY = Platform.select({
  ios: "Inter",
  android: "sans-serif",
  default: "Inter",
});

const FONT_FAMILY = BODY_FONT_FAMILY;

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
    fontFamily: HEADING_FONT_FAMILY,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  h1: {
    fontFamily: HEADING_FONT_FAMILY,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: HEADING_FONT_FAMILY,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: HEADING_FONT_FAMILY,
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

export type SupportedLocale = "en" | "ml";

export const I18N_STRINGS: Record<
  SupportedLocale,
  Record<
    | "nearCity"
    | "bookSlot"
    | "gatePass"
    | "tripPlanner"
    | "topUp"
    | "startCharging"
    | "upcoming"
    | "history"
    | "walletBalance"
    | "addMoney"
    | "driverMode"
    | "hostStudio"
    | "noChargersNearby"
    | "noUpcomingBookings"
    | "noChargingHistory"
    | "noPayoutsYet"
    | "offlineBanner",
    string
  >
> = {
  en: {
    nearCity: "Near",
    bookSlot: "Book slot",
    gatePass: "Gate pass",
    tripPlanner: "Trip planner",
    topUp: "Top-up",
    startCharging: "Start charging",
    upcoming: "Upcoming",
    history: "History",
    walletBalance: "Wallet balance",
    addMoney: "Add money",
    driverMode: "Driver mode",
    hostStudio: "Host studio",
    noChargersNearby: "No chargers nearby",
    noUpcomingBookings: "No upcoming bookings",
    noChargingHistory: "No charging sessions yet",
    noPayoutsYet: "No host payouts yet",
    offlineBanner: "You are offline. Showing saved data.",
  },
  ml: {
    nearCity: "സമീപം",
    bookSlot: "സ്ലോട്ട് ബുക്ക് ചെയ്യുക",
    gatePass: "ഗേറ്റ് പാസ്",
    tripPlanner: "യാത്രാ പ്ലാനർ",
    topUp: "ടോപ്പ്-അപ്പ്",
    startCharging: "ചാർജിംഗ് തുടങ്ങുക",
    upcoming: "വരാനിരിക്കുന്നവ",
    history: "ചരിത്രം",
    walletBalance: "വാലറ്റ് ബാലൻസ്",
    addMoney: "പണം ചേർക്കുക",
    driverMode: "ഡ്രൈവർ മോഡ്",
    hostStudio: "ഹോസ്റ്റ് സ്റ്റുഡിയോ",
    noChargersNearby: "സമീപത്ത് ചാർജറുകളില്ല",
    noUpcomingBookings: "വരാനിരിക്കുന്ന ബുക്കിംഗുകളില്ല",
    noChargingHistory: "ചാർജിംഗ് സെഷനുകളൊന്നുമില്ല",
    noPayoutsYet: "ഇതുവരെ പേഔട്ടുകളൊന്നുമില്ല",
    offlineBanner: "നിങ്ങൾ ഓഫ്‌ലൈനിലാണ്.",
  },
};

export function t(
  key: keyof (typeof I18N_STRINGS)["en"],
  locale: SupportedLocale = "en"
): string {
  return I18N_STRINGS[locale]?.[key] || I18N_STRINGS.en[key];
}

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
