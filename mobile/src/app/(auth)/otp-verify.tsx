import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, SafeAreaView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { OtpInputGrid } from "../../components/ui/OtpInputGrid";
import { COLORS, ELEVATION, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import { apiClient } from "../../services/api";
import {
  findLocalAccountByEmail,
  generateAndStoreLocalOtp,
  isServerUnreachableError,
  toUserProfile,
  upsertLocalAccount,
  verifyLocalOtp,
} from "../../services/localAuthRegistry";
import { fireNativePushNotification } from "../../services/notificationService";
import { useAuthStore } from "../../store/useAuthStore";

export default function OtpVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setAuthSession } = useAuthStore();

  const email = (params.email as string) || "";
  const mode = (params.mode as string) || "REGISTER";
  const fullName = (params.fullName as string) || "";
  const phone = (params.phone as string) || "";
  const password = (params.password as string) || "";
  const [liveOtpCode, setLiveOtpCode] = useState<string>((params.otpPreview as string) || "");

  const [isError, setIsError] = useState(false);

  const handleVerifyOtp = async (otpCode: string) => {
    setIsError(false);

    try {
      let endpoint = "/auth/register/verify-otp";
      let payload: any = {
        email,
        otp: otpCode,
        full_name: fullName || email.split("@")[0] || "Alex Morgan",
        phone: phone || null,
        password: password || null,
        role: "DRIVER",
      };

      if (mode === "LOGIN") {
        endpoint = "/auth/login/email-otp";
        payload = { email, otp: otpCode };
      }

      const res = await apiClient.post(endpoint, payload);
      const data = res.data;

      await upsertLocalAccount({
        email: data.email || email,
        fullName: data.full_name || fullName,
        phone: data.phone || phone,
        password: password || undefined,
        activeRole: data.active_role || "DRIVER",
        kycVerified: !!data.kyc_verified,
      });

      await setAuthSession(data.access_token, data.refresh_token, {
        id: data.user_id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || phone || "",
        phoneNumber: data.phone || phone || "",
        upiId: data.upi_id || `${data.email.split("@")[0]}@okaxis`,
        activeRole: data.active_role,
        kycVerified: !!data.kyc_verified,
        trustScore: 5.0,
        voltCreditsBalance:
          typeof data.volt_credits_balance === "number"
            ? data.volt_credits_balance
            : 250,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      if (data.is_new_user || mode === "REGISTER") {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/home");
      }
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const isLocalValid =
          (liveOtpCode && otpCode.trim() === liveOtpCode.trim()) ||
          (await verifyLocalOtp(email, otpCode));

        if (!isLocalValid) {
          setIsError(true);
          Alert.alert(
            "Verification Failed",
            "Invalid 6-digit verification code. Please check your code and try again."
          );
          return;
        }

        const { account, isNewUser } = await upsertLocalAccount({
          email,
          fullName: fullName || undefined,
          phone: phone || undefined,
          password: password || undefined,
          activeRole: "DRIVER",
          kycVerified: true,
        });

        await setAuthSession(
          `vm_local_jwt_${account.userId}_${Date.now()}`,
          `vm_local_refresh_${account.userId}_${Date.now()}`,
          toUserProfile(account)
        );

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        if (isNewUser || mode === "REGISTER") {
          router.replace("/(auth)/garage-setup");
        } else {
          router.replace("/(driver)/home");
        }
        return;
      }

      setIsError(true);
      const msg =
        err.response?.data?.detail || "Invalid 6-digit verification code. Please try again.";
      Alert.alert("Verification Failed", msg);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await apiClient.post("/auth/register/send-otp", {
        email,
        purpose: mode,
      });
      const freshOtp = res.data?.otp_preview || "";
      if (freshOtp) {
        setLiveOtpCode(freshOtp);
        await fireNativePushNotification(
          `VoltMate Verification Code: ${freshOtp}`,
          `Your fresh 6-digit verification code for ${email} is ${freshOtp}.`
        );
      }
      Alert.alert(
        "Code Sent",
        freshOtp
          ? `A fresh 6-digit verification code (${freshOtp}) has been dispatched.`
          : "A fresh 6-digit verification code has been sent to your email."
      );
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const freshOtp = await generateAndStoreLocalOtp(email);
        setLiveOtpCode(freshOtp);
        await fireNativePushNotification(
          `VoltMate Verification Code: ${freshOtp}`,
          `Your fresh 6-digit verification code for ${email} is ${freshOtp}.`
        );
        Alert.alert(
          "Code Sent",
          `A fresh 6-digit verification code (${freshOtp}) has been dispatched.`
        );
        return;
      }
      Alert.alert("Error", "Could not dispatch fresh OTP. Please wait before retrying.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBox}>
              <ShieldCheck size={30} color="#05E660" />
            </View>
            <Text style={styles.title}>Verify Security Code</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit verification code sent to{"\n"}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
          </View>

          {liveOtpCode ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleVerifyOtp(liveOtpCode)}
              style={{
                backgroundColor: "#E8F9F0",
                borderWidth: 1,
                borderColor: "#16B374",
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginBottom: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#047835", fontSize: 13, fontWeight: "800" }}>
                Security Code Dispatched: {liveOtpCode} (Tap to Verify Instantly)
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.card}>
            <OtpInputGrid
              length={6}
              onComplete={handleVerifyOtp}
              onResend={handleResendOtp}
              isError={isError}
            />
          </View>
        </View>

        <View style={styles.footerBadge}>
          <ShieldCheck size={14} color={COLORS.primary} />
          <Text style={styles.footerText}>
            Encrypted 6-digit security verification
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.mist,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    justifyContent: "space-between",
  },
  backBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.ink,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  emailHighlight: {
    color: COLORS.ink,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    ...ELEVATION.level1,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: SPACING.chipRadius,
    gap: 6,
  },
  footerText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
});
