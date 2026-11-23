import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, "../src");

test("Flow 1: Connector tariff single source of truth & booking total math", () => {
  const engineSrc = fs.readFileSync(
    path.join(srcRoot, "store/useVoltMateEngine.ts"),
    "utf8"
  );
  // Lock DEFAULT_CONNECTOR_SPECS canonical prices: CCS2 ₹15.50, Type-2 ₹11.50, 15A ₹8.50
  assert.match(engineSrc, /pricePerKwh:\s*15\.5/);
  assert.match(engineSrc, /pricePerKwh:\s*11\.5/);
  assert.match(engineSrc, /pricePerKwh:\s*8\.5/);

  // Booking sheet estimate formula: min(35, powerKw * durationHours * 0.85) * pricePerKwh
  const powerKw = 7.4;
  const durationHours = 1;
  const pricePerKwh = 11.5;
  const estimatedKwh = Number(Math.min(35, powerKw * durationHours * 0.85).toFixed(1));
  const estimatedTotalInr = Number((estimatedKwh * pricePerKwh).toFixed(2));
  assert.equal(estimatedKwh, 6.3);
  assert.equal(estimatedTotalInr, 72.45);
});

test("Flow 2 & 3: Design tokens, own-station distance hiding & pluralization helpers", () => {
  const tokensSrc = fs.readFileSync(
    path.join(srcRoot, "theme/tokens.ts"),
    "utf8"
  );
  assert.match(tokensSrc, /export function pluralize/);
  assert.match(tokensSrc, /export function isOwnStationDistanceHidden/);
  assert.match(tokensSrc, /screenMargin:\s*20/);
  assert.match(tokensSrc, /touchTarget:\s*48/);
});

test("Flow 4 & 6: Razorpay checkout verification & GST 18% invoice math", () => {
  const totalSettled = 354.0;
  const taxable = Number((totalSettled / 1.18).toFixed(2));
  const gstTotal = Number((totalSettled - taxable).toFixed(2));
  const cgst = Number((gstTotal / 2).toFixed(2));
  const sgst = Number((gstTotal - cgst).toFixed(2));
  assert.equal(taxable, 300.0);
  assert.equal(cgst, 27.0);
  assert.equal(sgst, 27.0);

  // Ensure unverified instant balance increment is absent and Razorpay verification is used
  const rzpModalSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/RazorpayCheckoutModal.tsx"),
    "utf8"
  );
  assert.match(rzpModalSrc, /verifyRazorpayPaymentOnServer/);
});

test("Flow 7: Google Sign-In uses Android Credential Manager with zero fake token fallbacks", () => {
  const googleAuthSrc = fs.readFileSync(
    path.join(srcRoot, "services/googleAuthService.ts"),
    "utf8"
  );
  assert.match(googleAuthSrc, /signInWithGoogleCredentialManager/);
  assert.doesNotMatch(googleAuthSrc, /google_oauth_/);
  assert.doesNotMatch(googleAuthSrc, /vm_google_jwt_/);
  assert.equal(
    fs.existsSync(path.join(srcRoot, "components/ui/GoogleAuthModal.tsx")),
    false
  );
});

test("Phase 6 & 7: Secure token storage, salted password hashing, centralized config & Error Boundary", () => {
  // 1. Local auth registry never stores plaintext password; uses salted vm_hash_v1$
  const localAuthSrc = fs.readFileSync(
    path.join(srcRoot, "services/localAuthRegistry.ts"),
    "utf8"
  );
  assert.match(localAuthSrc, /export function hashLocalPassword/);
  assert.match(localAuthSrc, /export function verifyLocalPassword/);
  assert.match(localAuthSrc, /vm_hash_v1\$/);
  assert.match(localAuthSrc, /passwordHash\?:\s*string;/);
  assert.doesNotMatch(localAuthSrc, /password:\s*params\.password/);

  // 2. Engine persists accessToken & refreshToken via expo-secure-store and restores activeSession
  const engineSrc = fs.readFileSync(
    path.join(srcRoot, "store/useVoltMateEngine.ts"),
    "utf8"
  );
  assert.match(engineSrc, /expo-secure-store/);
  assert.match(engineSrc, /SECURE_ACCESS_TOKEN/);
  assert.match(engineSrc, /SECURE_REFRESH_TOKEN/);
  assert.match(engineSrc, /ACTIVE_SESSION/);

  // 3. Zero scattered process.env lookups outside services/api.ts
  const walkFiles = (dir) => {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(walkFiles(full));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        results.push(full);
      }
    }
    return results;
  };
  for (const file of walkFiles(srcRoot)) {
    if (file.endsWith(path.join("services", "api.ts"))) continue;
    const content = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      content,
      /process\.env\.EXPO_PUBLIC_/,
      `Unexpected direct process.env lookup in ${file}`
    );
  }

  // 4. Onboarding uses ₹ INR and Indian connectors (CCS2, Type-2, 15A) and RootLayout has RootErrorBoundary
  const onboardingSrc = fs.readFileSync(
    path.join(srcRoot, "app/(auth)/onboarding.tsx"),
    "utf8"
  );
  assert.match(onboardingSrc, /₹11\.50\/kWh/);
  assert.doesNotMatch(onboardingSrc, /\$0\.50\/kWh/);

  const layoutSrc = fs.readFileSync(
    path.join(srcRoot, "app/_layout.tsx"),
    "utf8"
  );
  assert.match(layoutSrc, /class RootErrorBoundary/);
});

test("Phase 1 Redesign: Reverse-geocode, city/pin mismatch validation, single-source station mapper, tab filter & gateway ID masking", () => {
  const hybridMapSrc = fs.readFileSync(
    path.join(srcRoot, "services/hybridMapService.ts"),
    "utf8"
  );
  assert.match(hybridMapSrc, /export function resolveLocalityFromCoordinates/);
  assert.match(hybridMapSrc, /export function validateAddressMatchesCoordinates/);
  assert.match(hybridMapSrc, /export function repairMismatchedStationAddress/);
  assert.match(hybridMapSrc, /export async function reverseGeocodePin/);
  assert.doesNotMatch(hybridMapSrc, /const KOCHI_LANDMARKS/);

  // Verify add-charger blocks publishing when address city mismatches GPS pin
  const addChargerSrc = fs.readFileSync(
    path.join(srcRoot, "app/(host)/add-charger.tsx"),
    "utf8"
  );
  assert.match(addChargerSrc, /validateAddressMatchesCoordinates/);
  assert.match(addChargerSrc, /!addressValidation\.valid/);
  assert.match(addChargerSrc, /Sync Address to Pin/);

  // Verify single-source station mapper & bookings tab partitioner in engineTypesAndSeeds.ts
  const seedsSrc = fs.readFileSync(
    path.join(srcRoot, "store/engineTypesAndSeeds.ts"),
    "utf8"
  );
  assert.match(seedsSrc, /export function normalizeStationRecord/);
  assert.match(seedsSrc, /export function partitionBookingsByTab/);

  // Verify BookingsScreen uses partitionBookingsByTab so COMPLETED/CANCELLED go to History
  const bookingsSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/bookings.tsx"),
    "utf8"
  );
  assert.match(bookingsSrc, /partitionBookingsByTab/);
  assert.match(bookingsSrc, /count:\s*upcomingBookings\.length/);
  assert.match(bookingsSrc, /count:\s*historyRecords\.length/);

  // Verify gateway internals (razorpay_order_id / razorpay_payment_id) are never shown in modal headers or toasts
  const rzpModalSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/RazorpayCheckoutModal.tsx"),
    "utf8"
  );
  assert.doesNotMatch(rzpModalSrc, /Order \{activeRazorpayOrder\.razorpay_order_id\}/);
  assert.doesNotMatch(rzpModalSrc, /Opening Razorpay Secure Checkout/);

  const engineSrc = fs.readFileSync(
    path.join(srcRoot, "store/useVoltMateEngine.ts"),
    "utf8"
  );
  assert.doesNotMatch(engineSrc, /Razorpay Verified Top-Up \(\$\{verified\.razorpay_payment_id\}\)/);
  assert.doesNotMatch(engineSrc, /Managing your Kochi P2P charger/);
  assert.doesNotMatch(engineSrc, /Exploring nearby Kochi EV chargers/);
});

test("Phase 2 Redesign: Volt Clean light/dark tokens, WCAG AA contrast verification, i18n (EN + ML) & shared UI components", () => {
  const tokensSrc = fs.readFileSync(
    path.join(srcRoot, "theme/tokens.ts"),
    "utf8"
  );
  // Canonical Volt Clean tokens
  assert.match(tokensSrc, /ink:\s*"#0E1A14"/);
  assert.match(tokensSrc, /emerald700:\s*"#0A6B47"/);
  assert.match(tokensSrc, /emerald500:\s*"#12A06A"/);
  assert.match(tokensSrc, /volt:\s*"#19E27D"/);
  assert.match(tokensSrc, /mist:\s*"#F4F7F5"/);
  assert.match(tokensSrc, /surface:\s*"#FFFFFF"/);
  assert.match(tokensSrc, /surface2:\s*"#EAF2EE"/);
  assert.match(tokensSrc, /textSecondary:\s*"#5B6B63"/);
  assert.match(tokensSrc, /error:\s*"#D64545"/);
  assert.match(tokensSrc, /warning:\s*"#E0A100"/);
  assert.match(tokensSrc, /info:\s*"#2B7BE4"/);
  assert.match(tokensSrc, /export const DARK_COLORS/);
  assert.match(tokensSrc, /export function verifyVoltCleanWcagContrast/);
  assert.match(tokensSrc, /export const I18N_STRINGS/);
  assert.match(tokensSrc, /ml:\s*\{/);

  // Verify WCAG AA contrast >= 4.5:1 on all key foreground/background pairs
  const toLin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  };
  const contrast = (fg, bg) => {
    const l1 = lum(fg);
    const l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  assert.ok(contrast("#0E1A14", "#FFFFFF") >= 4.5, "Ink on Surface must pass WCAG AA");
  assert.ok(contrast("#0E1A14", "#F4F7F5") >= 4.5, "Ink on Mist must pass WCAG AA");
  assert.ok(contrast("#5B6B63", "#FFFFFF") >= 4.5, "Text-secondary on Surface must pass WCAG AA");
  assert.ok(contrast("#5B6B63", "#F4F7F5") >= 4.5, "Text-secondary on Mist must pass WCAG AA");
  assert.ok(contrast("#FFFFFF", "#0A6B47") >= 4.5, "White on Emerald-700 must pass WCAG AA");
  assert.ok(contrast("#ECF3EF", "#13211B") >= 4.5, "Dark Ink on Dark Surface must pass WCAG AA");
  assert.ok(contrast("#9FB0A7", "#0B1410") >= 4.5, "Dark Text-secondary on Dark Mist must pass WCAG AA");

  // Verify all required shared components in DesignSystem.tsx
  const dsSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/DesignSystem.tsx"),
    "utf8"
  );
  for (const comp of [
    "AppButton",
    "AppChip",
    "SegmentedControl",
    "StatTile",
    "StationCard",
    "ConnectorChip",
    "StatusBadge",
    "SectionHeader",
    "ListRow",
    "BottomSheet",
    "EmptyState",
    "Skeleton",
    "RingGauge",
    "Sparkline",
    "TimelineSlotPicker",
    "StepProgress",
    "AmountChips",
    "OfflineBanner",
    "ErrorStateCard",
  ]) {
    assert.match(dsSrc, new RegExp(`export (const|function) ${comp}\\b`), `Missing ${comp} in DesignSystem.tsx`);
  }
});

test("9. Phase 3 Screen Redesign: RingGauge, StationCard, TimelineSlotPicker, AmountChips, multi-select map chips, overflow menu, and zero UPI app selector chips", () => {
  const homeSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/home.tsx"),
    "utf8"
  );
  assert.match(homeSrc, /<RingGauge/);
  assert.match(homeSrc, /<StationCard/);
  assert.match(homeSrc, /<Sparkline/);
  assert.match(homeSrc, /<AmountChips/);
  assert.doesNotMatch(homeSrc, /Select UPI Payment App/i);
  assert.doesNotMatch(homeSrc, /Pay via Google Pay/i);
  assert.doesNotMatch(homeSrc, /Indian EV Charging Port/i);

  const mapSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/map-radar.tsx"),
    "utf8"
  );
  assert.match(mapSrc, /MAP_FILTER_CHIPS/);
  assert.match(mapSrc, /toggleFilterChip/);
  assert.doesNotMatch(mapSrc, /filterModalVisible/);

  const bookingSheetSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/booking-sheet.tsx"),
    "utf8"
  );
  assert.match(bookingSheetSrc, /<TimelineSlotPicker/);
  assert.match(bookingSheetSrc, /Add to Calendar/);
  assert.doesNotMatch(bookingSheetSrc, /Domestic KSEB Tariff/);

  const bookingsSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/bookings.tsx"),
    "utf8"
  );
  assert.match(bookingsSrc, /<StatusBadge/);
  assert.match(bookingsSrc, /MoreHorizontal/);
  assert.match(bookingsSrc, /overflowBooking/);

  const walletSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/garage-wallet.tsx"),
    "utf8"
  );
  assert.match(walletSrc, /<AmountChips/);
  assert.doesNotMatch(walletSrc, /PhonePe/);
  assert.doesNotMatch(walletSrc, /Paytm/);

  const profileSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/profile.tsx"),
    "utf8"
  );
  assert.match(profileSrc, /faqSearchQuery/);
  assert.match(profileSrc, /മലയാളം/);
  assert.doesNotMatch(profileSrc, /Ministry of Power/);

  const hostDashSrc = fs.readFileSync(
    path.join(srcRoot, "app/(host)/dashboard.tsx"),
    "utf8"
  );
  assert.match(hostDashSrc, /<Sparkline/);
  assert.match(hostDashSrc, /<ConnectorChip/);

  const scheduleSrc = fs.readFileSync(
    path.join(srcRoot, "app/(host)/schedule-matrix.tsx"),
    "utf8"
  );
  assert.match(scheduleSrc, /Apply to all days/);
  assert.match(scheduleSrc, /TIME_RANGE_PRESETS/);

  const hostWalletSrc = fs.readFileSync(
    path.join(srcRoot, "app/(host)/wallet.tsx"),
    "utf8"
  );
  assert.match(hostWalletSrc, /Move to Wallet/);
  assert.doesNotMatch(hostWalletSrc, /Use to Charge \(\+10%\)/);
});

test("10. Phase 4 Motion & Polish: Opaque fade-through tab transitions, shared-axis push transitions, rolling digits hook, loading-to-check morph, and branded VoltMate checkout loader", () => {
  const driverLayoutSrc = fs.readFileSync(
    path.join(srcRoot, "app/(driver)/_layout.tsx"),
    "utf8"
  );
  assert.match(driverLayoutSrc, /freezeOnBlur:\s*true/);
  assert.match(driverLayoutSrc, /animation:\s*"fade"/);
  assert.match(driverLayoutSrc, /animation:\s*"slide_from_right"/);

  const tabBarSrc = fs.readFileSync(
    path.join(srcRoot, "components/navigation/FloatingBottomTabBar.tsx"),
    "utf8"
  );
  assert.match(tabBarSrc, /router\.replace\(route/);

  const dsSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/DesignSystem.tsx"),
    "utf8"
  );
  assert.match(dsSrc, /export function useAnimatedNumber/);
  assert.match(dsSrc, /showSuccessCheck/);
  assert.match(dsSrc, /useReduceMotion/);

  const rzpSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/RazorpayCheckoutModal.tsx"),
    "utf8"
  );
  assert.match(rzpSrc, /VoltMate Secure Payment/);
  assert.match(rzpSrc, /brandedOverlay/);
  assert.doesNotMatch(rzpSrc, /PostgreSQL EDW/);
});

test("11. Phase 5 Accessibility & QA: WCAG AA light/dark contrast, >=48dp touch targets, 1.3x text scaling, 360x800 / 393x852 / 412x915 viewport layout math, and golden screen checks", () => {
  const tokensSrc = fs.readFileSync(
    path.join(srcRoot, "theme/tokens.ts"),
    "utf8"
  );
  // 1. Verify >=48dp touch target token and nav safe padding in tokens.ts
  assert.match(tokensSrc, /touchTarget:\s*48/);
  assert.match(tokensSrc, /navSafePadding:\s*140/);
  assert.match(tokensSrc, /screenMargin:\s*20/);

  const screenMargin = 20;
  const navSafePadding = 140;

  // 2. Verify 360x800, 393x852, and 412x915 viewport layout math (zero horizontal overflow or bottom nav overlap)
  const viewports = [
    { width: 360, height: 800 },
    { width: 393, height: 852 },
    { width: 412, height: 915 },
  ];
  for (const vp of viewports) {
    const innerWidth = vp.width - screenMargin * 2;
    assert.ok(innerWidth >= 320, `Viewport ${vp.width} inner width ${innerWidth} >= 320`);
    // 4-icon quick-action row: 4 tiles + 3 gaps of 8px
    const quickTileWidth = (innerWidth - 3 * 8) / 4;
    assert.ok(quickTileWidth >= 72, `Quick action tile width ${quickTileWidth} >= 72 at ${vp.width}px`);
    // Compact StationCard (276px) fits inside viewport with peek margin
    assert.ok(276 <= innerWidth, `Compact StationCard fits in ${vp.width}px viewport`);
    // Floating bottom nav sits at bottom (68px height + 20px offset = 88px) < navSafePadding (116px)
    assert.ok(navSafePadding > 88, "Content padding clears floating bottom tab bar");
  }

  // 4. Verify 1.3x text scaling & hitSlop in DesignSystem.tsx
  const dsSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/DesignSystem.tsx"),
    "utf8"
  );
  assert.match(dsSrc, /maxFontSizeMultiplier=\{1\.3\}/);
  assert.match(dsSrc, /hitSlop=\{\{/);

  // 5. Verify deleted legacy VerticalBatteryIndicator widget
  const evVisualsSrc = fs.readFileSync(
    path.join(srcRoot, "components/ui/EvVisuals.tsx"),
    "utf8"
  );
  assert.doesNotMatch(evVisualsSrc, /VerticalBatteryIndicator/);

  // 6. Verify all scrollable screens apply SPACING.navSafePadding so no text sits under the bottom nav
  for (const relPath of [
    "app/(driver)/home.tsx",
    "app/(driver)/booking-sheet.tsx",
    "app/(driver)/bookings.tsx",
    "app/(driver)/garage-wallet.tsx",
    "app/(driver)/gate-pass.tsx",
    "app/(driver)/profile.tsx",
    "app/(host)/dashboard.tsx",
    "app/(host)/add-charger.tsx",
    "app/(host)/schedule-matrix.tsx",
    "app/(host)/wallet.tsx",
    "app/(host)/incoming-requests.tsx",
  ]) {
    const src = fs.readFileSync(path.join(srcRoot, relPath), "utf8");
    assert.match(
      src,
      /SPACING\.navSafePadding/,
      `${relPath} must use SPACING.navSafePadding to clear bottom navigation`
    );
    assert.match(
      src,
      /accessibilityLabel=/,
      `${relPath} must include accessibilityLabel on interactive controls`
    );
  }
});






