import { NativeModules, Platform } from "react-native";
import { apiClient, GOOGLE_WEB_CLIENT_ID } from "./api";
import { upsertLocalAccount } from "./localAuthRegistry";

export interface NativeGoogleAuthResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  upiId: string;
  voltCreditsBalance: number;
  activeRole: "DRIVER" | "HOST";
  isNewUser: boolean;
}

export class GoogleSignInError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "GoogleSignInError";
  }
}

/**
 * Launches Android Credential Manager ("Sign in with Google"), obtains a cryptographic
 * Google ID token issued for our Web OAuth 2.0 Client ID (serverClientId), and verifies
 * it server-side via POST /api/v1/auth/google.
 *
 * No fallback to client-supplied email or fake tokens is permitted.
 */
export async function signInWithGoogleCredentialManager(): Promise<
  | { status: "SUCCESS"; data: NativeGoogleAuthResult }
  | { status: "CANCELLED" }
> {
  if (
    Platform.OS !== "android" ||
    !NativeModules.GoogleAccountPicker?.signInWithGoogle
  ) {
    throw new GoogleSignInError(
      "UNSUPPORTED_PLATFORM",
      "Google Credential Manager Sign-In is only available on Android devices with Google Play Services."
    );
  }

  let idToken = "";
  try {
    const nativeRes = await NativeModules.GoogleAccountPicker.signInWithGoogle(
      GOOGLE_WEB_CLIENT_ID
    );
    idToken = (nativeRes?.idToken || "").trim();
  } catch (err: any) {
    const code = String(err?.code || "");
    if (code === "CANCELLED") {
      return { status: "CANCELLED" };
    }
    if (code === "NO_GOOGLE_ACCOUNT") {
      throw new GoogleSignInError(
        "NO_GOOGLE_ACCOUNT",
        "No Google account was found on this device. Please add a Google account in your Android Settings and try again."
      );
    }
    if (code === "NETWORK_ERROR") {
      throw new GoogleSignInError(
        "NETWORK_ERROR",
        "Network error while contacting Google Play Services. Please check your internet connection and try again."
      );
    }
    throw new GoogleSignInError(
      code || "CREDENTIAL_ERROR",
      err?.message ||
        "Google Sign-In could not be completed. Ensure Google Play Services is active and your OAuth SHA-1 fingerprint is registered."
    );
  }

  if (!idToken) {
    throw new GoogleSignInError(
      "EMPTY_ID_TOKEN",
      "Google Sign-In did not return a verifiable ID token."
    );
  }

  try {
    const authRes = await apiClient.post("/auth/google", {
      id_token: idToken,
    });
    const d = authRes.data;
    const emailPrefix =
      String(d.email || "driver")
        .split("@")[0]
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase() || "driver";

    await upsertLocalAccount({
      email: d.email,
      fullName: d.full_name,
      phone: d.phone || "",
      activeRole: d.active_role || "DRIVER",
      kycVerified: Boolean(d.kyc_verified ?? true),
    });

    return {
      status: "SUCCESS",
      data: {
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        userId: d.user_id,
        fullName: d.full_name,
        email: d.email,
        phone: d.phone || "",
        upiId: d.upi_id || `${emailPrefix}@okaxis`,
        voltCreditsBalance:
          typeof d.volt_credits_balance === "number"
            ? d.volt_credits_balance
            : 0,
        activeRole: d.active_role || "DRIVER",
        isNewUser: Boolean(d.is_new_user),
      },
    };
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    if (!err?.response) {
      throw new GoogleSignInError(
        "NETWORK_ERROR",
        "Unable to reach the VoltMate authentication server. Please check your internet connection and try again."
      );
    }
    if (status === 403) {
      throw new GoogleSignInError(
        "ACCOUNT_DISABLED",
        detail || "This account has been disabled. Please contact VoltMate Support."
      );
    }
    if (status === 401 || status === 400) {
      throw new GoogleSignInError(
        "TOKEN_VERIFICATION_FAILED",
        detail || "Google ID token verification failed on the server."
      );
    }
    throw new GoogleSignInError(
      "SERVER_ERROR",
      detail || "Google Sign-In failed on the server. Please try again."
    );
  }
}

export async function clearGoogleCredentialSession(): Promise<void> {
  try {
    if (
      Platform.OS === "android" &&
      NativeModules.GoogleAccountPicker?.clearGoogleCredentialState
    ) {
      await NativeModules.GoogleAccountPicker.clearGoogleCredentialState();
    }
  } catch {
    // Best-effort clear of Android Credential Manager state
  }
}
