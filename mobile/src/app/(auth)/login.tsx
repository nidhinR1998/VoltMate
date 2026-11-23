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
import { apiClient } from "../../services/api";
import { signInWithGoogleCredentialManager } from "../../services/googleAuthService";
import {
  findLocalAccountByEmail,
  generateAndStoreLocalOtp,
  isServerUnreachableError,
  toUserProfile,
  upsertLocalAccount,
  verifyLocalOtp,
  verifyLocalPassword,
} from "../../services/localAuthRegistry";
import { fireNativePushNotification } from "../../services/notificationService";
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

  // Password Reset Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<"SEND_OTP" | "CONFIRM">("SEND_OTP");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateEmail = (str: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
  };

  const handlePasswordLogin = async () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim() || !validateEmail(email)) {
      errs.email = "Enter a valid registered email address.";
    }
    if (!password || password.length < 8) {
      errs.password = "Password must be at least 8 characters long.";
    }
    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiClient.post("/auth/login/email-password", {
        email: cleanEmail,
        password,
      });
      const data = res.data;

      await upsertLocalAccount({
        email: data.email || cleanEmail,
        fullName: data.full_name,
        phone: data.phone || "",
        password,
        activeRole: data.active_role || "DRIVER",
        kycVerified: !!data.kyc_verified,
      });

      await setAuthSession(data.access_token, data.refresh_token, {
        id: data.user_id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || "",
        phoneNumber: data.phone || "",
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

      if (data.is_new_user) {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/home");
      }
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const localAcct = await findLocalAccountByEmail(cleanEmail);
        if (!localAcct) {
          Alert.alert(
            "Account Not Found",
            "No account found with this email address. Please tap 'Create Account' or 'Continue with Google' first."
          );
          return;
        }
        if (!verifyLocalPassword(cleanEmail, password, localAcct.passwordHash)) {
          Alert.alert(
            "Sign-In Failed",
            "Incorrect password for this account. Please try again or use 'Forgot Password'."
          );
          return;
        }
        await setAuthSession(
          `vm_local_jwt_${localAcct.userId}_${Date.now()}`,
          `vm_local_refresh_${localAcct.userId}_${Date.now()}`,
          toUserProfile(localAcct)
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        router.replace("/(driver)/home");
        return;
      }
      const msg =
        err.response?.data?.detail || "Invalid credentials. Please verify your email and password.";
      Alert.alert("Sign-In Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpLogin = async () => {
    if (!email.trim() || !validateEmail(email)) {
      setLoginErrors({ email: "Enter a valid registered email address to receive your login OTP." });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }
    setLoginErrors({});

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiClient.post("/auth/register/send-otp", {
        email: cleanEmail,
        purpose: "LOGIN",
      });
      const otpPreview = res.data?.otp_preview || "";
      if (otpPreview) {
        await fireNativePushNotification(
          `VoltMate Security Code: ${otpPreview}`,
          `Use ${otpPreview} to sign in to ${cleanEmail}. Valid for 5 minutes.`
        );
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.push({
        pathname: "/(auth)/otp-verify",
        params: { email: cleanEmail, mode: "LOGIN", otpPreview },
      });
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const localAcct = await findLocalAccountByEmail(cleanEmail);
        if (!localAcct) {
          Alert.alert(
            "Account Not Found",
            "No account found with this email address. Please create an account first."
          );
          return;
        }
        const localOtp = await generateAndStoreLocalOtp(cleanEmail);
        await fireNativePushNotification(
          `VoltMate Security Code: ${localOtp}`,
          `Use ${localOtp} to sign in to ${cleanEmail}. Valid for 10 minutes.`
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        router.push({
          pathname: "/(auth)/otp-verify",
          params: { email: cleanEmail, mode: "LOGIN", otpPreview: localOtp },
        });
        return;
      }
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
      const outcome = await signInWithGoogleCredentialManager();
      if (outcome.status === "CANCELLED") {
        return;
      }
      const { data } = outcome;
      await setAuthSession(data.accessToken, data.refreshToken, {
        id: data.userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        phoneNumber: data.phone,
        upiId: data.upiId,
        upiVpa: data.upiId,
        activeRole: data.activeRole,
        kycVerified: true,
        trustScore: 5.0,
        voltCreditsBalance: data.voltCreditsBalance,
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (data.isNewUser) {
        router.replace("/(auth)/garage-setup");
      } else {
        router.replace("/(driver)/home");
      }
    } catch (err: any) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert(
        "Google Sign-In Failed",
        err?.message || "Could not sign in with Google. Please try again."
      );
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
    const cleanEmail = resetEmail.trim().toLowerCase();
    try {
      await apiClient.post("/auth/register/send-otp", {
        email: cleanEmail,
        purpose: "PASSWORD_RESET",
      });
      setResetStep("CONFIRM");
      Alert.alert("Reset Code Sent", "Enter the 6-digit code sent to your email and your new password.");
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const localAcct = await findLocalAccountByEmail(cleanEmail);
        if (!localAcct) {
          Alert.alert("Account Not Found", "No account found with this email address.");
          return;
        }
        const localOtp = await generateAndStoreLocalOtp(cleanEmail);
        await fireNativePushNotification(
          `VoltMate Password Reset Code: ${localOtp}`,
          `Enter ${localOtp} to reset your password for ${cleanEmail}.`
        );
        setResetOtp(localOtp);
        setResetStep("CONFIRM");
        Alert.alert(
          "Reset Code Dispatched",
          `Your 6-digit security code (${localOtp}) has been dispatched. Enter your new password below.`
        );
        return;
      }
      Alert.alert(
        "Reset Error",
        err.response?.data?.detail || "Could not send password reset code."
      );
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
    const cleanEmail = resetEmail.trim().toLowerCase();
    try {
      await apiClient.post("/auth/password-reset/confirm", {
        email: cleanEmail,
        otp: resetOtp.trim(),
        new_password: resetNewPass,
      });
      await upsertLocalAccount({
        email: cleanEmail,
        password: resetNewPass,
      });
      Alert.alert("Password Updated", "Your password has been securely updated. You can now sign in.");
      setShowResetModal(false);
      setResetStep("SEND_OTP");
      setResetOtp("");
      setResetNewPass("");
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const ok = await verifyLocalOtp(cleanEmail, resetOtp.trim());
        if (!ok) {
          Alert.alert("Reset Failed", "Invalid or expired 6-digit security code.");
          return;
        }
        await upsertLocalAccount({
          email: cleanEmail,
          password: resetNewPass,
        });
        Alert.alert("Password Updated", "Your password has been securely updated. You can now sign in.");
        setShowResetModal(false);
        setResetStep("SEND_OTP");
        setResetOtp("");
        setResetNewPass("");
        return;
      }
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
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                  !!loginErrors.email && { borderColor: "#DC2626" },
                ]}
              >
                <Mail size={18} color={emailFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={email}
                  onChangeText={(txt) => {
                    setEmail(txt);
                    if (loginErrors.email) setLoginErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="rahul@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
              {loginErrors.email && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {loginErrors.email}
                </Text>
              )}
            </View>

            {/* Password Input */}
            {authMode === "PASSWORD" && (
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password *</Text>
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
                    !!loginErrors.password && { borderColor: "#DC2626" },
                  ]}
                >
                  <Lock size={18} color={passwordFocused ? "#111714" : "#757F7A"} />
                  <TextInput
                    value={password}
                    onChangeText={(txt) => {
                      setPassword(txt);
                      if (loginErrors.password) setLoginErrors((p) => ({ ...p, password: undefined }));
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password (8+ chars)"
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
                {loginErrors.password && (
                  <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                    {loginErrors.password}
                  </Text>
                )}
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
