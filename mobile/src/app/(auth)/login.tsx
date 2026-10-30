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
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, X, KeyRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GoogleIcon } from "../../components/ui/GoogleIcon";
import { GoogleAuthModal } from "../../components/ui/GoogleAuthModal";
import { apiClient } from "../../services/api";
import { pickAndAuthenticateGoogleAccount } from "../../services/googleAuthService";
import { useAuthStore } from "../../store/useAuthStore";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthSession } = useAuthStore();

  const [authMode, setAuthMode] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Password Reset Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<"SEND_OTP" | "CONFIRM">("SEND_OTP");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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
        router.replace("/(driver)/home");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || "Invalid credentials. Please verify your email and password.";
      Alert.alert("Sign-In Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email to receive a 6-digit login code.");
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
      const msg = err.response?.data?.detail || "Could not dispatch OTP. Please check your email.";
      Alert.alert("Verification Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOneTap = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLoading(true);
    try {
      const outcome = await pickAndAuthenticateGoogleAccount();
      if (outcome.status === "CANCELLED") {
        return;
      }
      if (outcome.status === "FALLBACK_NEEDED") {
        setShowGoogleModal(true);
        return;
      }
      const { data } = outcome;
      await setAuthSession(data.accessToken, data.refreshToken, {
        id: data.userId,
        fullName: data.fullName,
        email: data.email,
        activeRole: data.activeRole,
        kycVerified: true,
        trustScore: 5.0,
        voltCreditsBalance: 120,
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (data.isNewUser) {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/home");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!validateEmail(resetEmail)) {
      Alert.alert("Invalid Email", "Please enter your registered email address.");
      return;
    }
    setResetLoading(true);
    try {
      await apiClient.post("/auth/register/send-otp", {
        email: resetEmail.trim(),
        purpose: "PASSWORD_RESET",
      });
      setResetStep("CONFIRM");
      Alert.alert("Reset Code Sent", "Enter the 6-digit code sent to your email and your new password.");
    } catch {
      setResetStep("CONFIRM");
      Alert.alert("Reset Code Sent", "Enter the 6-digit security code and your new password.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (resetOtp.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit security code.");
      return;
    }
    if (resetNewPass.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }
    setResetLoading(true);
    try {
      await apiClient.post("/auth/password-reset/confirm", {
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        new_password: resetNewPass,
      });
      Alert.alert("Password Updated", "Your password has been securely updated. You can now sign in.");
      setShowResetModal(false);
      setResetStep("SEND_OTP");
      setResetOtp("");
      setResetNewPass("");
    } catch (err: any) {
      Alert.alert(
        "Reset Failed",
        err.response?.data?.detail || "Could not verify security code. Please try again."
      );
    } finally {
      setResetLoading(false);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Zap size={28} color="#05E660" fill="#05E660" />
            </View>
            <Text style={styles.brandTitle}>Welcome Back</Text>
            <Text style={styles.brandSubtitle}>
              Sign in to manage your EV, discover stations & book charging slots
            </Text>
          </View>

          {/* Auth Card */}
          <View style={styles.authCard}>
            {/* Google 1-Tap */}
            <TouchableOpacity
              onPress={handleGoogleOneTap}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.googleBtn}
            >
              <GoogleIcon size={20} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
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
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
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
                  One-Time Code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                ]}
              >
                <Mail size={18} color={emailFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Password Input */}
            {authMode === "PASSWORD" && (
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                    }}
                  >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock size={18} color={passwordFocused ? "#111714" : "#757F7A"} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#757F7A" />
                    ) : (
                      <Eye size={18} color="#757F7A" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Primary CTA */}
            <TouchableOpacity
              onPress={authMode === "PASSWORD" ? handlePasswordLogin : handleSendOtpLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#111714" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {authMode === "PASSWORD" ? "Sign In" : "Send 6-Digit Code"}
                  </Text>
                  <ArrowRight size={18} color="#111714" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Register Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <KeyRound size={18} color="#111714" />
                <Text style={styles.modalTitle}>Reset Password</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Registered Email Address</Text>
            <View style={[styles.inputWrapper, { marginBottom: 14 }]}>
              <Mail size={18} color="#757F7A" />
              <TextInput
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>

            {resetStep === "CONFIRM" && (
              <>
                <Text style={styles.inputLabel}>6-Digit Security Code</Text>
                <View style={[styles.inputWrapper, { marginBottom: 14 }]}>
                  <TextInput
                    value={resetOtp}
                    onChangeText={setResetOtp}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.textInput}
                  />
                </View>

                <Text style={styles.inputLabel}>New Password (min 8 chars)</Text>
                <View style={[styles.inputWrapper, { marginBottom: 14 }]}>
                  <Lock size={18} color="#757F7A" />
                  <TextInput
                    value={resetNewPass}
                    onChangeText={setResetNewPass}
                    placeholder="Create strong password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    style={styles.textInput}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={
                resetStep === "SEND_OTP"
                  ? handleRequestPasswordReset
                  : handleConfirmPasswordReset
              }
              disabled={resetLoading}
              style={styles.submitBtn}
            >
              {resetLoading ? (
                <ActivityIndicator color="#111714" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {resetStep === "SEND_OTP" ? "Send Reset Code" : "Update Password"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GoogleAuthModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(isNewUser) => {
          if (isNewUser) {
            router.replace("/(auth)/garage-setup");
          } else {
            router.replace("/(driver)/home");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "#757F7A",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 19,
  },
  authCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9F8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8E5",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  googleBtnText: {
    color: "#111714",
    fontSize: 14,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8ECEA",
  },
  dividerText: {
    fontSize: 10,
    color: "#757F7A",
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F2F4F3",
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  modePill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 12,
  },
  modePillActive: {
    backgroundColor: "#151C18",
  },
  modePillText: {
    fontSize: 12,
    color: "#757F7A",
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
    color: "#111714",
    fontWeight: "700",
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: "#047835",
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E4E9E6",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: "#151C18",
    backgroundColor: "#FFFFFF",
  },
  textInput: {
    flex: 1,
    color: "#111714",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    borderRadius: 26,
    paddingVertical: 15,
    gap: 8,
    marginTop: 6,
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  submitBtnText: {
    color: "#111714",
    fontSize: 15,
    fontWeight: "800",
  },
  demoBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: "#F2F4F3",
  },
  demoBtnText: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#757F7A",
    fontSize: 13,
    fontWeight: "500",
  },
  footerLink: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 23, 20, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111714",
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
});
