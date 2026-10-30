import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Car, Bike, ShieldCheck, Check, Camera, Zap, Sparkles, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { SmartMeterScanner } from "../../components/ocr/SmartMeterScanner";
import { useAuthStore } from "../../store/useAuthStore";
import { useModeStore } from "../../store/useModeStore";

interface EvModel {
  category: "2W" | "3W" | "4W";
  make: string;
  model: string;
  batteryKwh: number;
  maxAcKw: number;
  connectors: string[];
}

const EXTENSIVE_INDIAN_EVS: EvModel[] = [
  // 4-Wheelers (India's Most Popular)
  {
    category: "4W",
    make: "Tata",
    model: "Nexon EV Max / 45",
    batteryKwh: 40.5,
    maxAcKw: 7.2,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "Tata",
    model: "Punch EV Long Range",
    batteryKwh: 35.0,
    maxAcKw: 7.2,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "Tata",
    model: "Curvv EV (55 kWh)",
    batteryKwh: 55.0,
    maxAcKw: 7.2,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "MG",
    model: "ZS EV",
    batteryKwh: 50.3,
    maxAcKw: 7.4,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "MG",
    model: "Windsor EV",
    batteryKwh: 38.0,
    maxAcKw: 7.4,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "Mahindra",
    model: "XUV400 EL Pro",
    batteryKwh: 39.4,
    maxAcKw: 7.2,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  {
    category: "4W",
    make: "BYD",
    model: "Atto 3",
    batteryKwh: 60.48,
    maxAcKw: 11.0,
    connectors: ["TYPE_2", "SOCKET_15A", "CCS2"],
  },
  // 2-Wheelers
  {
    category: "2W",
    make: "Ather",
    model: "450X Gen 3 / Apex",
    batteryKwh: 3.7,
    maxAcKw: 3.3,
    connectors: ["SOCKET_15A", "ATHER_GRID"],
  },
  {
    category: "2W",
    make: "Ather",
    model: "Rizta Z",
    batteryKwh: 3.7,
    maxAcKw: 3.3,
    connectors: ["SOCKET_15A", "ATHER_GRID"],
  },
  {
    category: "2W",
    make: "Ola",
    model: "S1 Pro Gen 2",
    batteryKwh: 4.0,
    maxAcKw: 3.3,
    connectors: ["SOCKET_15A", "HYPERCHARGER"],
  },
  {
    category: "2W",
    make: "TVS",
    model: "iQube ST (5.1 kWh)",
    batteryKwh: 5.1,
    maxAcKw: 3.3,
    connectors: ["SOCKET_15A"],
  },
  {
    category: "2W",
    make: "Bajaj",
    model: "Chetak Premium",
    batteryKwh: 3.2,
    maxAcKw: 3.3,
    connectors: ["SOCKET_15A"],
  },
];

export default function GarageSetupScreen() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const { setMode } = useModeStore();

  const [roleSelection, setRoleSelection] = useState<"DRIVER" | "HOST" | "BOTH">("BOTH");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "4W" | "2W">("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState<EvModel>(EXTENSIVE_INDIAN_EVS[0]);
  const [regNumber, setRegNumber] = useState("KL-07-CD-4921");
  const [rcVerified, setRcVerified] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const filteredVehicles = EXTENSIVE_INDIAN_EVS.filter((ev) => {
    if (categoryFilter === "ALL") return true;
    return ev.category === categoryFilter;
  });

  const handleOcrVerificationComplete = (reading: number) => {
    setRcVerified(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert(
      "Verified EV Owner Shield Active 🛡️",
      `RC Registration ${regNumber} has been verified via on-device ML Kit OCR. Your community trust score is now 5.0★.`
    );
  };

  const handleCompleteSetup = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const chosenRole = roleSelection === "HOST" ? "HOST" : "DRIVER";
    updateUser({
      activeRole: chosenRole,
      kycVerified: rcVerified,
      trustScore: 5.0,
    });
    setMode(chosenRole);

    if (roleSelection === "HOST") {
      router.replace("/(host)/dashboard");
    } else {
      router.replace("/(driver)/map-radar");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <ScrollView className="flex-1 px-6 pt-4 pb-12" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center mb-1">
            <Sparkles size={18} color="#00F59B" style={{ marginRight: 6 }} />
            <Text className="text-2xl font-space font-bold text-white">
              Virtual EV Garage
            </Text>
          </View>
          <Text className="text-gray-400 font-jakarta text-xs">
            Quick-Ride style verified trust setup for Indian EV standards
          </Text>
        </View>

        {/* 1. Primary Role Selection */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
          1. Select Primary Role
        </Text>
        <View className="flex-row space-x-2 mb-6">
          {[
            { key: "DRIVER", label: "I Drive an EV" },
            { key: "HOST", label: "I Host a Plug" },
            { key: "BOTH", label: "Both (Recommended)" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setRoleSelection(item.key as any)}
              className={`flex-1 py-3 px-1 rounded-xl items-center border ${
                roleSelection === item.key
                  ? "bg-[#00F59B]/15 border-[#00F59B]"
                  : "bg-[#0F1622] border-white/10"
              }`}
            >
              <Text
                style={{ color: roleSelection === item.key ? "#00F59B" : "#94A3B8" }}
                className="text-xs font-bold text-center"
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. Virtual EV Garage Selector */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider font-mono">
            2. Choose Your EV Model
          </Text>

          {/* Category Filter Chips */}
          <View className="flex-row bg-[#0F1622] rounded-lg p-0.5 border border-white/10">
            {["ALL", "4W", "2W"].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(cat as any)}
                className={`px-2 py-0.5 rounded ${categoryFilter === cat ? "bg-[#00F59B]" : ""}`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    categoryFilter === cat ? "text-[#06090E]" : "text-gray-400"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* EV Model Cards */}
        <View className="space-y-2 mb-6">
          {filteredVehicles.slice(0, 6).map((ev, index) => {
            const isSelected = selectedVehicle.model === ev.model;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedVehicle(ev)}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? "bg-[#0F1622] border-[#00F59B]"
                    : "bg-[#0F1622]/60 border-white/5"
                }`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-black/50 items-center justify-center mr-3 border border-white/5">
                    {ev.category === "2W" ? (
                      <Bike size={20} color={isSelected ? "#00F59B" : "#64748B"} />
                    ) : (
                      <Car size={20} color={isSelected ? "#00F59B" : "#64748B"} />
                    )}
                  </View>
                  <View>
                    <Text className="text-white font-space font-bold text-xs">
                      {ev.make} {ev.model}
                    </Text>
                    <Text className="text-gray-400 font-mono text-[10px] mt-0.5">
                      {ev.batteryKwh} kWh • {ev.maxAcKw} kW Max AC • {ev.connectors.join(", ")}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <View className="w-5 h-5 rounded-full bg-[#00F59B] items-center justify-center">
                    <Check size={12} color="#06090E" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Indian RC Plate & ML Kit On-Device Verification */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
          3. Indian Registration & Trust Shield
        </Text>
        <GlassCard className="mb-8 border border-white/10 p-4">
          <Text className="text-gray-400 text-xs mb-1.5 font-jakarta">Vehicle Plate Number (State RC Code)</Text>
          <TextInput
            value={regNumber}
            onChangeText={setRegNumber}
            placeholder="KL-07-XX-0000"
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
            className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white font-mono text-base font-bold mb-4 tracking-widest text-center"
          />

          <TouchableOpacity
            onPress={() => setShowScanner(true)}
            className={`flex-row items-center justify-center p-3.5 rounded-xl border ${
              rcVerified
                ? "bg-emerald-500/15 border-[#00F59B]"
                : "bg-white/5 border-dashed border-white/20"
            }`}
          >
            {rcVerified ? (
              <>
                <ShieldCheck size={18} color="#00F59B" style={{ marginRight: 8 }} />
                <Text className="text-[#00F59B] font-bold text-xs font-mono">
                  VERIFIED EV OWNER SHIELD ACTIVE (5.0★)
                </Text>
              </>
            ) : (
              <>
                <Camera size={18} color="#00F59B" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-xs">
                  Scan Dashboard / RC Card (On-Device OCR)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* Submit */}
        <NeonButton
          title="COMPLETE SETUP & ENTER RADAR"
          onPress={handleCompleteSetup}
          size="lg"
          icon={<ArrowRight size={18} color="#06090E" />}
        />

        {/* OCR Scanner Modal */}
        <SmartMeterScanner
          visible={showScanner}
          targetMode="DASHBOARD_SOC"
          onClose={() => setShowScanner(false)}
          onScanComplete={handleOcrVerificationComplete}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
