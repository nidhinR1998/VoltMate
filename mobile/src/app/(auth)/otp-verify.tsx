import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { OtpInputGrid } from "../../components/ui/OtpInputGrid";
import { apiClient } from "../../services/api";
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

  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async (otpCode: string) => {
    setIsError(false);
    setLoading(true);

    try {
      let endpoint = "/auth/register/verify-otp";
      let payload: any = {
        email,
        otp: otpCode,
        full_name: fullName || email.split("@")[0].title(),
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
        router.replace("/(driver)/map-radar");
      }
    } catch (err: any) {
      setIsError(true);
      const msg = err.response?.data?.detail || "Invalid 6-digit verification code. Please try again.";
      Alert.alert("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await apiClient.post("/auth/register/send-otp", {
        email,
        purpose: mode,
      });
      Alert.alert("OTP Dispatched", "A fresh 6-digit security code has been sent to your email.");
    } catch (err: any) {
      Alert.alert("Error", "Could not dispatch fresh OTP. Please wait before retrying.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <View className="flex-1 px-6 pt-6 pb-10 justify-between">
        <View>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#0F1622] items-center justify-center mb-8 border border-white/10"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Heading */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-[#0F1622] border-2 border-[#00F59B] items-center justify-center mb-4 shadow-xl">
              <ShieldCheck size={32} color="#00F59B" />
            </View>
            <Text className="text-2xl font-space font-bold text-white text-center">
              Verify Security Code
            </Text>
            <Text className="text-gray-400 font-jakarta text-xs text-center mt-2 px-6">
              Enter the 6-digit verification code sent to:{"\n"}
              <Text className="text-[#00F59B] font-mono font-bold">{email}</Text>
            </Text>
          </View>

          {/* 6-box input grid */}
          <GlassCard className="items-center py-6 px-4 border border-white/10">
            <OtpInputGrid
              length={6}
              onComplete={handleVerifyOtp}
              onResend={handleResendOtp}
              isError={isError}
            />
          </GlassCard>
        </View>

        {/* Security badge footer */}
        <View className="items-center">
          <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <ShieldCheck size={14} color="#00F59B" style={{ marginRight: 6 }} />
            <Text className="text-gray-400 font-mono text-[10px]">
              HMAC-SHA256 Cryptographic OTP • Self-Hosted & Zero Cost
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
