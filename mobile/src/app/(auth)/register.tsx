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
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { apiClient } from "../../services/api";
import { signInWithGoogleCredentialManager } from "../../services/googleAuthService";
import {
  findLocalAccountByEmail,
  generateAndStoreLocalOtp,
  isServerUnreachableError,
} from "../../services/localAuthRegistry";
import { fireNativePushNotification } from "../../services/notificationService";
import { useAuthStore } from "../../store/useAuthStore";
import { GoogleIcon } from "../../components/ui/GoogleIcon";
import { COLORS, ELEVATION, SPACING, TYPOGRAPHY } from "../../theme/tokens";

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuthSession } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(3, score);
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong & Secure"];
  const strengthColors = ["#DC2626", "#D97706", "#059669", "#05E660"];

  const validateRegistrationFields = () => {
    const errs: typeof fieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const digitsOnlyPhone = phone.replace(/[\s-]/g, "");

    if (!trimmedName || trimmedName.length < 3 || !/^[A-Za-z\s.]{3,60}$/.test(trimmedName)) {
      errs.fullName = "Enter a valid full name (at least 3 letters, no numbers).";
    }
    if (
      !trimmedEmail ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)
    ) {
      errs.email = "Enter a valid email address (e.g. rahul@gmail.com).";
    }
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(digitsOnlyPhone)) {
      errs.phone = "Enter a valid 10-digit Indian mobile number starting with 6–9.";
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = "Password must be 8+ characters and include both letters & numbers.";
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegistrationFields()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    const cleanDigits = phone.replace(/[\s-]/g, "");
    const normalizedPhone = cleanDigits.startsWith("+91")
      ? cleanDigits
      : `+91${cleanDigits.slice(-10)}`;

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiClient.post("/auth/register/send-otp", {
        email: cleanEmail,
        purpose: "REGISTER",
      });
      const otpPreview = res.data?.otp_preview || "";
      if (otpPreview) {
        await fireNativePushNotification(
          `VoltMate Verification Code: ${otpPreview}`,
          `Enter ${otpPreview} to verify ${cleanEmail} and complete your EV profile.`
        );
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.push({
        pathname: "/(auth)/otp-verify",
        params: {
          email: cleanEmail,
          fullName: fullName.trim(),
          phone: normalizedPhone,
          password,
          mode: "REGISTER",
          otpPreview,
        },
      });
    } catch (err: any) {
      if (isServerUnreachableError(err)) {
        const existingLocal = await findLocalAccountByEmail(cleanEmail);
        if (existingLocal && existingLocal.passwordHash) {
          Alert.alert(
            "Account Already Exists",
            "An account with this email already exists on this device. Please sign in instead."
          );
          return;
        }
        const localOtp = await generateAndStoreLocalOtp(cleanEmail);
        await fireNativePushNotification(
          `VoltMate Verification Code: ${localOtp}`,
          `Enter ${localOtp} to verify ${cleanEmail} and complete your EV profile.`
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        router.push({
          pathname: "/(auth)/otp-verify",
          params: {
            email: cleanEmail,
            fullName: fullName.trim(),
            phone: normalizedPhone,
            password,
            mode: "REGISTER",
            otpPreview: localOtp,
          },
        });
        return;
      }
      const msg = err.response?.data?.detail || "Registration failed. Please check details.";
      Alert.alert("Registration Error", msg);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Set up your EV driver profile to discover & book charging stations
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Sign Up with Google */}
            <TouchableOpacity
              onPress={async () => {
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
                    err?.message || "Could not sign up with Google. Please try again."
                  );
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              activeOpacity={0.85}
              style={{
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
                marginBottom: 18,
              }}
            >
              <GoogleIcon size={20} />
              <Text style={{ color: "#111714", fontSize: 14, fontWeight: "700" }}>
                Sign up with Google
              </Text>
            </TouchableOpacity>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  nameFocused && styles.inputWrapperFocused,
                  !!fieldErrors.fullName && { borderColor: "#DC2626" },
                ]}
              >
                <User size={18} color={nameFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={fullName}
                  onChangeText={(txt) => {
                    setFullName(txt);
                    if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="e.g. Rahul Menon"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              {fieldErrors.fullName && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {fieldErrors.fullName}
                </Text>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                  !!fieldErrors.email && { borderColor: "#DC2626" },
                ]}
              >
                <Mail size={18} color={emailFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={email}
                  onChangeText={(txt) => {
                    setEmail(txt);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
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
              {fieldErrors.email && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {fieldErrors.email}
                </Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Indian Mobile Number (+91) *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  phoneFocused && styles.inputWrapperFocused,
                  !!fieldErrors.phone && { borderColor: "#DC2626" },
                ]}
              >
                <Phone size={18} color={phoneFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={phone}
                  onChangeText={(txt) => {
                    setPhone(txt);
                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder="+91 98470 12345"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={styles.textInput}
                />
              </View>
              {fieldErrors.phone && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {fieldErrors.phone}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password (8+ chars, letters & numbers) *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passFocused && styles.inputWrapperFocused,
                  !!fieldErrors.password && { borderColor: "#DC2626" },
                ]}
              >
                <Lock size={18} color={passFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={password}
                  onChangeText={(txt) => {
                    setPassword(txt);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="Create secure password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#757F7A" />
                  ) : (
                    <Eye size={18} color="#757F7A" />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {fieldErrors.password}
                </Text>
              )}

              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarWrap}>
                    {[0, 1, 2, 3].map((idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              idx <= strength ? strengthColors[strength] : "#E2E8E5",
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: strengthColors[strength] }]}>
                    {strengthLabels[strength]}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmFocused && styles.inputWrapperFocused,
                  !!fieldErrors.confirmPassword && { borderColor: "#DC2626" },
                ]}
              >
                <Lock size={18} color={confirmFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(txt) => {
                    setConfirmPassword(txt);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  placeholder="Re-enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                />
              </View>
              {fieldErrors.confirmPassword && (
                <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                  {fieldErrors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitBtn}
              accessibilityRole="button"
              accessibilityLabel="Continue and verify email"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Continue & verify email</Text>
                  <ArrowRight size={18} color={COLORS.textInverse} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Sign in</Text>
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
    backgroundColor: COLORS.mist,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
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
    marginBottom: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.ink,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...ELEVATION.level1,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.ink,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.mist,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.ink,
    padding: 0,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  strengthBarWrap: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    ...TYPOGRAPHY.captionSemibold,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.chipRadius,
    minHeight: 52,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    ...ELEVATION.level1,
  },
  submitBtnText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textInverse,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  footerLink: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.primary,
  },
});
