import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Key,
  Car,
  MapPin,
  Camera,
  Info,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { SmartMeterScanner } from "../../components/ocr/SmartMeterScanner";
import { useSessionStore } from "../../store/useSessionStore";
import { apiClient } from "../../services/api";

export default function GatePassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { startSession } = useSessionStore();

  const bookingId = (params.bookingId as string) || "sim_booking_123";
  const gateCode = (params.gateCode as string) || "VM-7K9A2P";
  const pinCode = (params.pinCode as string) || "4921";
  const nodeTitle = (params.nodeTitle as string) || "Lotus Greens Villa 15A Socket";
  const society = (params.society as string) || "Lotus Greens Enclave";
  const instructions = (params.gateInstructions as string) || "Show Gate Pass to security at Gate 1 for Flat 14.";

  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStartSession = async (reading: number) => {
    setLoading(true);
    try {
      await apiClient.post(`/bookings/${bookingId}/start-session?driver_id=driver_current`, {
        pin_code: pinCode,
        start_meter_reading: reading,
      });

      startSession({
        bookingId,
        hostName: "Arun Kumar (Host)",
        hostPhone: "+91 98460 12345",
        vehicleModel: "Tata Nexon EV Max",
        batteryCapacityKwh: 40.5,
        initialSoc: 32.0,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.replace("/(driver)/active-charge");
    } catch (e) {
      // Local fallback
      startSession({
        bookingId,
        hostName: "Arun Kumar (Host)",
        hostPhone: "+91 98460 12345",
        vehicleModel: "Tata Nexon EV Max",
        batteryCapacityKwh: 40.5,
        initialSoc: 32.0,
      });
      router.replace("/(driver)/active-charge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <ScrollView className="flex-1 px-6 pt-4 pb-12" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#0F1622] items-center justify-center mr-4 border border-white/10"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-space font-bold text-white">
              Digital Gate Pass
            </Text>
            <Text className="text-emerald-volt font-mono text-xs font-bold">
              VERIFIED APARTMENT ENTRY CARD
            </Text>
          </View>
        </View>

        {/* Main Gate Pass Card (NoBrokerHood / MyGate Style) */}
        <GlassCard className="mb-6 border-2 border-[#00F59B]/50 p-5 shadow-2xl">
          {/* Top Pass Header */}
          <View className="flex-row justify-between items-center pb-4 border-b border-white/10 mb-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-mono tracking-widest uppercase">
                GATED SOCIETY ENTRY
              </Text>
              <Text className="text-white font-space font-bold text-lg">{society}</Text>
            </View>
            <View className="w-10 h-10 rounded-xl bg-[#00F59B]/10 border border-[#00F59B]/40 items-center justify-center">
              <ShieldCheck size={22} color="#00F59B" />
            </View>
          </View>

          {/* QR / Security Visual Frame */}
          <View className="items-center justify-center my-2 p-5 bg-[#06090E] rounded-2xl border border-white/10">
            <QrCode size={120} color="#00F59B" />
            <Text className="text-white font-mono text-3xl font-bold tracking-widest mt-4">
              {gateCode}
            </Text>
            <Text className="text-gray-400 font-jakarta text-[11px] mt-1 text-center">
              Present code or QR to apartment security at barrier
            </Text>
          </View>

          {/* Handshake Metadata Grid */}
          <View className="space-y-3 mt-4 pt-2">
            <View className="flex-row items-center">
              <Car size={16} color="#64748B" style={{ marginRight: 10 }} />
              <View>
                <Text className="text-gray-400 text-[10px]">AUTHORIZED VEHICLE</Text>
                <Text className="text-white font-mono text-xs font-bold">
                  KL-07-CD-4921 (Tata Nexon EV Max)
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <MapPin size={16} color="#64748B" style={{ marginRight: 10 }} />
              <View>
                <Text className="text-gray-400 text-[10px]">HOST PARKING BAY</Text>
                <Text className="text-white font-jakarta text-xs font-semibold">
                  Villa 14 / Basement Pillar B-04
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Key size={16} color="#00F59B" style={{ marginRight: 10 }} />
              <View>
                <Text className="text-gray-400 text-[10px]">CHARGER START PIN</Text>
                <Text className="text-[#00F59B] font-mono text-xl font-bold">
                  {pinCode}
                </Text>
              </View>
            </View>
          </View>

          {/* Host Instructions */}
          <View className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 flex-row items-start">
            <Info size={14} color="#00F59B" style={{ marginRight: 6, marginTop: 2 }} />
            <Text className="text-gray-300 text-xs italic flex-1 font-jakarta">
              "{instructions}"
            </Text>
          </View>
        </GlassCard>

        {/* Arrived at Socket Action CTA */}
        <NeonButton
          title="ARRIVED AT BAY • SCAN METER TO START"
          onPress={() => setShowScanner(true)}
          loading={loading}
          size="lg"
          icon={<Camera size={18} color="#06090E" />}
        />

        {/* Smart Meter Scanner Modal */}
        <SmartMeterScanner
          visible={showScanner}
          targetMode="METER_KWH"
          onClose={() => setShowScanner(false)}
          onScanComplete={handleStartSession}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
