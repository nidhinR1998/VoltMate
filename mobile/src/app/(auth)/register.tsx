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
import { User as UserIcon, Mail, Phone, Lock, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { apiClient } from "../../services/api";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Live password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0 (weak) to 3 (unbreakable)
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Weak (Min 8 chars)", "Fair", "Strong", "Unbreakable Shield"];
  const strengthColors = ["#EF4444", "#F59E0B", "#10B981", "#00F59B"];

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Invalid Email", "Please provide a valid email address for OTP verification.");
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
      const msg = err.response?.data?.detail || "Registration failed. Please check your details.";
      Alert.alert("Registration Error", msg);
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
          className="px-6 pt-6 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#0F1622] items-center justify-center mb-6 border border-white/10"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <Text className="text-3xl font-space font-bold text-white mb-1">
            Join the Community
          </Text>
          <Text className="text-gray-400 font-jakarta text-xs mb-6">
            Share sockets, find highway corridors, and earn VoltCredits
          </Text>

          <GlassCard className="mb-6 p-5 border border-white/10">
            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Full Name</Text>
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10">
                <UserIcon size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Karthik Menon"
                  placeholderTextColor="#64748B"
                  className="flex-1 text-white text-xs font-jakarta"
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Email Address</Text>
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10">
                <Mail size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="karthik@example.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-white text-xs font-jakarta"
                />
              </View>
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Phone Number (+91)</Text>
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10">
                <Phone size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98460 12345"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  className="flex-1 text-white text-xs font-mono font-bold"
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-gray-300 text-xs font-medium mb-1.5 font-jakarta">Password</Text>
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3.5 py-3 border border-white/10 mb-2">
                <Lock size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 chars, 1 number & 1 symbol"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  className="flex-1 text-white text-xs font-jakarta"
                />
              </View>

              {/* Live Password Strength Bars */}
              {password.length > 0 && (
                <View className="space-y-1 mt-1.5">
                  <View className="flex-row space-x-1.5 h-1.5">
                    {[0, 1, 2].map((lvl) => (
                      <View
                        key={lvl}
                        style={{
                          backgroundColor:
                            strength > lvl ? strengthColors[strength] : "rgba(255,255,255,0.1)",
                        }}
                        className="flex-1 rounded-full"
                      />
                    ))}
                  </View>
                  <Text
                    style={{ color: strengthColors[strength] }}
                    className="text-[10px] font-mono text-right mt-1"
                  >
                    {strengthLabels[strength]}
                  </Text>
                </View>
              )}
            </View>

            <NeonButton
              title="CREATE & DISPATCH OTP"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              icon={<ArrowRight size={16} color="#06090E" />}
            />
          </GlassCard>

          <View className="flex-row justify-center items-center">
            <Text className="text-gray-400 text-xs font-jakarta">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-[#00F59B] text-xs font-bold font-jakarta">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
