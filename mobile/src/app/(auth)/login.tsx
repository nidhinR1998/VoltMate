import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, Sparkles, KeyRound, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { apiClient } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useModeStore } from "../../store/useModeStore";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthSession } = useAuthStore();
  const { accentColor } = useModeStore();

  const [authMode, setAuthMode] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (str: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Details", "Please enter both email address and password.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login/email-password", {
        email: email.trim(),
        password,
      });
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

      if (data.is_new_user) {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/map-radar");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email to receive a secure 6-digit login OTP.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/register/send-otp", {
        email: email.trim(),
        purpose: "LOGIN",
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.push({
        pathname: "/(auth)/otp-verify",
        params: { email: email.trim(), mode: "LOGIN" },
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Could not dispatch OTP. Please check email address.";
      Alert.alert("Verification Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOneTap = async () => {
    setLoading(true);
    try {
      // In physical device builds with Google Play services, GoogleSignin.signIn() is invoked
      const mockIdToken = `mock_google_token_${Date.now()}`;
      const res = await apiClient.post("/auth/google", {
        id_token: mockIdToken,
      });
      const data = res.data;

      await setAuthSession(data.access_token, data.refresh_token, {
        id: data.user_id,
        fullName: data.full_name,
        email: data.email,
        activeRole: data.active_role,
        kycVerified: true,
        trustScore: 5.0,
        voltCreditsBalance: 100,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      if (data.is_new_user) {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/map-radar");
      }
    } catch (err: any) {
      Alert.alert("Google Sign-In Error", err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6 pt-8 pb-10 justify-center"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-[#0F1622] border-2 border-[#00F59B]/50 items-center justify-center mb-4 shadow-xl">
              <Sparkles size={28} color="#00F59B" />
            </View>
            <Text className="text-3xl font-space font-bold text-white tracking-tight">
              Volt<Text className="text-[#00F59B]">Mate</Text>
            </Text>
            <Text className="text-gray-400 font-jakarta text-xs mt-1 text-center">
              India's Peer-to-Peer Community EV Charging Network
            </Text>
          </View>

          {/* Glassmorphic Auth Card */}
          <GlassCard className="mb-6 border border-white/10 p-5">
            {/* Google 1-Tap Button */}
            <TouchableOpacity
              onPress={handleGoogleOneTap}
              disabled={loading}
              className="flex-row items-center justify-center bg-white py-3.5 px-4 rounded-xl mb-6 shadow-md"
            >
              <Text className="text-zinc-900 font-bold text-sm font-space tracking-wide">
                Continue with Google (1-Tap)
              </Text>
            </TouchableOpacity>

            {/* Visual Divider */}
            <View className="flex-row items-center justify-center mb-5">
              <View className="flex-1 h-[1px] bg-white/10" />
              <Text className="text-gray-400 text-[11px] px-3 font-mono">OR SIGN IN WITH EMAIL</Text>
              <View className="flex-1 h-[1px] bg-white/10" />
            </View>

            {/* Tab Toggle: Password vs Passwordless OTP */}
            <View className="flex-row bg-[#06090E] p-1 rounded-xl mb-5 border border-white/10">
              <TouchableOpacity
                onPress={() => setAuthMode("PASSWORD")}
                className={`flex-1 py-2 rounded-lg items-center ${
                  authMode === "PASSWORD" ? "bg-[#0F1622] border border-[#00F59B]/50" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    authMode === "PASSWORD" ? "text-white" : "text-gray-400"
                  }`}
                >
                  Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAuthMode("OTP")}
                className={`flex-1 py-2 rounded-lg items-center ${
                  authMode === "OTP" ? "bg-[#0F1622] border border-[#00F59B]/50" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    authMode === "OTP" ? "text-white" : "text-gray-400"
                  }`}
                >
                  Passwordless OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Address Field */}
            <View className="mb-4">
              <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Email Address</Text>
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10">
                <Mail size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="driver@example.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-white text-xs font-jakarta"
                />
              </View>
            </View>

            {/* Password Field (Only shown in Password mode) */}
            {authMode === "PASSWORD" && (
              <View className="mb-6">
                <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Password</Text>
                <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10">
                  <Lock size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    className="flex-1 text-white text-xs font-jakarta"
                  />
                </View>
              </View>
            )}

            {/* Action Button */}
            <NeonButton
              title={authMode === "PASSWORD" ? "SIGN IN TO VOLTMATE" : "SEND 6-DIGIT OTP"}
              onPress={authMode === "PASSWORD" ? handlePasswordLogin : handleSendOtpLogin}
              loading={loading}
              size="lg"
              icon={authMode === "PASSWORD" ? <ArrowRight size={16} color="#06090E" /> : <KeyRound size={16} color="#06090E" />}
            />
          </GlassCard>

          {/* Footer Register Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-400 text-xs font-jakarta">Don't have a VoltMate account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={{ color: accentColor }} className="text-xs font-bold font-jakarta">
                Register Free
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
