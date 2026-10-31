import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, SafeAreaView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { OtpInputGrid } from "../../components/ui/OtpInputGrid";
import { apiClient } from "../../services/api";
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

      await setAuthSession(data.access_token, data.refresh_token, {
        id: data.user_id,
        fullName: data.full_name,
        email: data.email,
        activeRole: data.active_role,
        kycVerified: false,
        trustScore: 5.0,
        voltCreditsBalance: 100,
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
          `⚡ VoltMate Verification Code: ${freshOtp}`,
          `Your fresh 6-digit verification code for ${email} is ${freshOtp}.`
        );
      }
      Alert.alert(
        "Code Sent",
        freshOtp
          ? `A fresh 6-digit verification code (${freshOtp}) has been dispatched.`
          : "A fresh 6-digit verification code has been sent to your email."
      );
    } catch {
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
                ⚡ Security Code Dispatched: {liveOtpCode} (Tap to Verify Instantly)
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
          <ShieldCheck size={14} color="#047835" />
          <Text style={styles.footerText}>
            HMAC-SHA256 Cryptographic Verification
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 26,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111714",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#757F7A",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  emailHighlight: {
    color: "#111714",
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
  },
  footerText: {
    color: "#047835",
    fontSize: 11,
    fontWeight: "700",
  },
});
