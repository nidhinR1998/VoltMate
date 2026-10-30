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
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GoogleIcon } from "../../components/ui/GoogleIcon";
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const validateEmail = (str: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
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
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email to receive a secure login OTP.");
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Sparkles size={28} color="#00F59B" />
            </View>
            <Text style={styles.brandTitle}>
              Volt<Text style={{ color: "#00F59B" }}>Mate</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              India's Peer-to-Peer Community EV Charging Network
            </Text>
          </View>

          {/* Auth Card */}
          <View style={styles.authCard}>
            {/* Google 1-Tap Button */}
            <TouchableOpacity
              onPress={handleGoogleOneTap}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.googleBtn}
            >
              <GoogleIcon size={20} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Visual Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Auth Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAuthMode("PASSWORD");
                }}
                style={[
                  styles.modePill,
                  authMode === "PASSWORD" && styles.modePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.modePillText,
                    authMode === "PASSWORD" && styles.modePillTextActive,
                  ]}
                >
                  Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAuthMode("OTP");
                }}
                style={[
                  styles.modePill,
                  authMode === "OTP" && styles.modePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.modePillText,
                    authMode === "OTP" && styles.modePillTextActive,
                  ]}
                >
                  Passwordless OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                ]}
              >
                <Mail size={18} color={emailFocused ? "#00F59B" : "#64748B"} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="name@example.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Password Field (when mode is PASSWORD) */}
            {authMode === "PASSWORD" && (
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAuthMode("OTP");
                    }}
                  >
                    <Text style={styles.forgotText}>Use OTP Instead</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock size={18} color={passwordFocused ? "#00F59B" : "#64748B"} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password"
                    placeholderTextColor="#64748B"
                    secureTextEntry={!showPassword}
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#64748B" />
                    ) : (
                      <Eye size={18} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Primary Submit Button */}
            <TouchableOpacity
              onPress={authMode === "PASSWORD" ? handlePasswordLogin : handleSendOtpLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#06090E" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {authMode === "PASSWORD" ? "Sign In to VoltMate" : "Send 6-Digit OTP"}
                  </Text>
                  <ArrowRight size={18} color="#06090E" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Footer: Register Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account yet? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>Register Free</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#0F1622",
    borderWidth: 1.5,
    borderColor: "rgba(0, 245, 155, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  authCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  googleBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#06090E",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  modePillActive: {
    backgroundColor: "#0F1622",
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.4)",
  },
  modePillText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  modePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: "#CBD5E1",
    fontWeight: "600",
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 11,
    color: "#00F59B",
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: "#00F59B",
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  footerLink: {
    color: "#00F59B",
    fontSize: 13,
    fontWeight: "700",
  },
});
