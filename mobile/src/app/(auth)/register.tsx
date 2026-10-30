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
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { apiClient } from "../../services/api";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // Live password strength
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong & Secure"];
  const strengthColors = ["#EF4444", "#F59E0B", "#10B981", "#00F59B"];

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Invalid Email", "Please provide a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Short Password", "Please choose a password with at least 6 characters.");
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
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Create <Text style={{ color: "#00F59B" }}>Account</Text>
            </Text>
            <Text style={styles.subtitle}>
              Join India's verified peer-to-peer EV community
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
                <User size={18} color={nameFocused ? "#00F59B" : "#64748B"} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Rahul Kumar"
                  placeholderTextColor="#64748B"
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
                <Mail size={18} color={emailFocused ? "#00F59B" : "#64748B"} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="rahul@example.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile (for OTP & Passes)</Text>
              <View
                style={[
                  styles.inputWrapper,
                  phoneFocused && styles.inputWrapperFocused,
                ]}
              >
                <Phone size={18} color={phoneFocused ? "#00F59B" : "#64748B"} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder="+91 98460 12345"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passFocused && styles.inputWrapperFocused,
                ]}
              >
                <Lock size={18} color={passFocused ? "#00F59B" : "#64748B"} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="Create secure password"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password strength meter */}
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
                              idx <= strength ? strengthColors[strength] : "#1E293B",
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
                <ActivityIndicator color="#06090E" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Verify Email via OTP</Text>
                  <ArrowRight size={18} color="#06090E" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered? </Text>
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
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F1622",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  formCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 20,
    marginBottom: 20,
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
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
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
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
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
