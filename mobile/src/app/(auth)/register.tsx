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

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+44 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong & Secure"];
  const strengthColors = ["#DC2626", "#D97706", "#059669", "#05E660"];

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Invalid Email", "Please provide a valid email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password Policy", "Please choose a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/register/send-otp", {
        email: email.trim(),
        purpose: "REGISTER",
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.push({
        pathname: "/(auth)/otp-verify",
        params: {
          email: email.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          password,
          mode: "REGISTER",
        },
      });
    } catch (err: any) {
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
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  nameFocused && styles.inputWrapperFocused,
                ]}
              >
                <User size={18} color={nameFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Alex Morgan"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Email Address */}
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
                  placeholder="alex@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View
                style={[
                  styles.inputWrapper,
                  phoneFocused && styles.inputWrapperFocused,
                ]}
              >
                <Phone size={18} color={phoneFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder="+44 7700 900077"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password (min. 8 characters)</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passFocused && styles.inputWrapperFocused,
                ]}
              >
                <Lock size={18} color={passFocused ? "#111714" : "#757F7A"} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
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

            {/* Submit */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#111714" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Continue & Verify Email</Text>
                  <ArrowRight size={18} color="#111714" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Sign In</Text>
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
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
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
    marginBottom: 18,
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    padding: 22,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
    fontSize: 11,
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    borderRadius: 26,
    paddingVertical: 15,
    gap: 8,
    marginTop: 8,
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
});
