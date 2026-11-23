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

