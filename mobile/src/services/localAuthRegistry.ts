import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "../store/useVoltMateEngine";

const LOCAL_ACCOUNT_DIRECTORY_KEY = "@voltmate_account_directory_v1";
const LOCAL_OTP_STORE_KEY = "@voltmate_otp_store_v1";

export interface LocalAccountRecord {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  upiId: string;
  passwordHash?: string;
  activeRole: "DRIVER" | "HOST";
  kycVerified: boolean;
  voltCreditsBalance: number;
  createdAt: string;
}

export function hashLocalPassword(email: string, plainPassword: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const input = `voltmate_salt_v1:${cleanEmail}:${plainPassword}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `vm_hash_v1$${hex1}${hex2}`;
}

export function verifyLocalPassword(
  email: string,
  plainPassword: string,
  storedHash?: string
): boolean {
  if (!storedHash) return true;
  if (!storedHash.startsWith("vm_hash_v1$")) {
    return storedHash === plainPassword;
  }
  return hashLocalPassword(email, plainPassword) === storedHash;
}

interface LocalOtpEntry {
  email: string;
  otp: string;
  expiresAt: number;
}

export function isServerUnreachableError(err: any): boolean {
  if (!err) return true;
  const status = err?.response?.status;
  // Network error (no response) or 502 / 503 / 504 cloud host suspended / gateway timeout
  if (!err.response || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return false;
}

export function deriveDisplayNameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "Driver")
    .replace(/[0-9]+/g, " ")
    .replace(/[._-]+/g, " ")
    .trim();
  if (!local) return "VoltMate Driver";
  return local
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function deterministicUserId(email: string): string {
  const clean = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `usr_${clean}`;
}

async function loadDirectory(): Promise<Record<string, LocalAccountRecord>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ACCOUNT_DIRECTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveDirectory(dir: Record<string, LocalAccountRecord>): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_ACCOUNT_DIRECTORY_KEY, JSON.stringify(dir));
  } catch {}
}

export async function findLocalAccountByEmail(
  email: string
): Promise<LocalAccountRecord | null> {
  const clean = email.trim().toLowerCase();
  const dir = await loadDirectory();
  return dir[clean] || null;
}

export async function upsertLocalAccount(params: {
  email: string;
  fullName?: string;
  phone?: string;
  password?: string;
  activeRole?: "DRIVER" | "HOST";
  kycVerified?: boolean;
}): Promise<{ account: LocalAccountRecord; isNewUser: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const dir = await loadDirectory();
  const existing = dir[cleanEmail];
  const prefix = cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "") || "driver";

  const hashedPwd = params.password
    ? hashLocalPassword(cleanEmail, params.password)
    : undefined;

  if (existing) {
    const updated: LocalAccountRecord = {
      ...existing,
      fullName: params.fullName?.trim() || existing.fullName,
      phone: params.phone?.trim() || existing.phone,
      passwordHash: hashedPwd || existing.passwordHash,
      kycVerified: params.kycVerified ?? existing.kycVerified,
    };
    dir[cleanEmail] = updated;
    await saveDirectory(dir);
    return { account: updated, isNewUser: false };
  }

  const created: LocalAccountRecord = {
    userId: deterministicUserId(cleanEmail),
    email: cleanEmail,
    fullName: params.fullName?.trim() || deriveDisplayNameFromEmail(cleanEmail),
    phone: params.phone?.trim() || "",
    upiId: `${prefix}@okaxis`,
    passwordHash: hashedPwd,
    activeRole: params.activeRole || "DRIVER",
    kycVerified: params.kycVerified ?? true,
    voltCreditsBalance: 250.0,
    createdAt: new Date().toISOString(),
  };
  dir[cleanEmail] = created;
  await saveDirectory(dir);
  return { account: created, isNewUser: true };
}

export async function generateAndStoreLocalOtp(email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const raw = await AsyncStorage.getItem(LOCAL_OTP_STORE_KEY);
    const map: Record<string, LocalOtpEntry> = raw ? JSON.parse(raw) : {};
    map[cleanEmail] = {
      email: cleanEmail,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    await AsyncStorage.setItem(LOCAL_OTP_STORE_KEY, JSON.stringify(map));
  } catch {}
  return otp;
}

export async function verifyLocalOtp(email: string, otpInput: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const raw = await AsyncStorage.getItem(LOCAL_OTP_STORE_KEY);
    if (!raw) return false;
    const map: Record<string, LocalOtpEntry> = JSON.parse(raw);
    const entry = map[cleanEmail];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) return false;
    if (entry.otp !== otpInput.trim()) return false;
    delete map[cleanEmail];
    await AsyncStorage.setItem(LOCAL_OTP_STORE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function toUserProfile(acct: LocalAccountRecord): UserProfile {
  return {
    id: acct.userId,
    email: acct.email,
    fullName: acct.fullName,
    name: acct.fullName,
    phone: acct.phone,
    phoneNumber: acct.phone,
    upiId: acct.upiId,
    upiVpa: acct.upiId,
    activeRole: acct.activeRole,
    role: acct.activeRole,
    kycVerified: acct.kycVerified,
    trustScore: 5.0,
    voltCreditsBalance: acct.voltCreditsBalance,
  };
}
