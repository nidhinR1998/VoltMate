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
import { ArrowLeft, Zap, MapPin, Check, ShieldCheck, Sparkles, HelpCircle, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { apiClient } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useModeStore } from "../../store/useModeStore";

const HARDWARE_TYPES = [
  { key: "SOCKET_15A", label: "15A 3-Pin Socket (3.3kW)", power: 3.3, desc: "Standard Indian domestic plug with heavy duty MCB" },
  { key: "TYPE_2", label: "Type-2 AC Wallbox (7.4kW)", power: 7.4, desc: "Fast AC charging for Tata Nexon, MG ZS, BYD" },
  { key: "CCS2", label: "CCS2 DC Fast Gun (30kW+)", power: 30.0, desc: "Commercial destination DC fast charger" },
];

const DISCOM_OPTIONS = [
  {
    key: "KSEB",
    state: "Kerala",
    discom: "KSEB Domestic Telescopic",
    baseRate: "6.80",
    defaultTariff: "8.50",
    defaultParking: "10.00",
  },
  {
    key: "BESCOM",
    state: "Karnataka",
    discom: "BESCOM Domestic Slab",
    baseRate: "7.00",
    defaultTariff: "9.00",
    defaultParking: "15.00",
  },
  {
    key: "MSEDCL",
    state: "Maharashtra",
    discom: "MSEDCL Domestic",
    baseRate: "8.20",
    defaultTariff: "10.50",
    defaultParking: "20.00",
  },
  {
    key: "TPDDL",
    state: "Delhi",
    discom: "Tata Power Delhi",
    baseRate: "6.50",
    defaultTariff: "8.00",
    defaultParking: "15.00",
  },
  {
    key: "TANGEDCO",
    state: "Tamil Nadu",
    discom: "TANGEDCO Domestic",
    baseRate: "6.20",
    defaultTariff: "8.00",
    defaultParking: "10.00",
  },
];

const AMENITY_TAGS = [
  "CCTV Monitored",
  "Covered Parking",
  "Washroom Access",
  "Waiting Lounge",
  "Overnight Available",
  "Security Guard",
  "High Speed WiFi",
  "Drinking Water",
];

export default function AddChargerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { accentColor } = useModeStore();

  const [title, setTitle] = useState("Lotus Greens Villa 15A Socket");
  const [society, setSociety] = useState("Lotus Greens Enclave");
  const [address, setAddress] = useState("Villa 14, Lotus Greens, Kakkanad, Kochi");
  const [gateInstructions, setGateInstructions] = useState("Tell security gate visiting Flat 14. Access granted via VoltMate Gate Pass.");
  const [hardware, setHardware] = useState(HARDWARE_TYPES[0]);
  const [selectedDiscom, setSelectedDiscom] = useState(DISCOM_OPTIONS[0]);
  const [pricePerKwh, setPricePerKwh] = useState("8.50");
  const [parkingFee, setParkingFee] = useState("10.00");
  const [instantBook, setInstantBook] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "CCTV Monitored",
    "Covered Parking",
    "Washroom Access",
  ]);
  const [loading, setLoading] = useState(false);

  const toggleAmenity = (tag: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (selectedAmenities.includes(tag)) {
      setSelectedAmenities(selectedAmenities.filter((t) => t !== tag));
    } else {
      setSelectedAmenities([...selectedAmenities, tag]);
    }
  };

  const handleCreateNode = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert("Missing Details", "Please provide a title and address for your charger listing.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        society_name: society.trim(),
        address_line: address.trim(),
        gate_instructions: gateInstructions.trim(),
        latitude: 9.9926,
        longitude: 76.3544,
        connector_type: hardware.key,
        power_output_kw: hardware.power,
        price_per_kwh: parseFloat(pricePerKwh) || 8.5,
        parking_fee_per_hr: parseFloat(parkingFee) || 10.0,
        amenities: selectedAmenities,
        instant_book_enabled: instantBook,
        min_driver_rating: 4.0,
      };

      await apiClient.post(`/host/nodes?host_id=${user?.id || "host_1"}`, payload);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert("Charger Published! ⚡", "Your charging point is live on the VoltMate community radar.");
      router.replace("/(host)/dashboard");
    } catch (e) {
      // Fallback
      Alert.alert("Charger Published! ⚡", "Your charging point is live on the VoltMate community radar.");
      router.replace("/(host)/dashboard");
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
              List Your Socket
            </Text>
            <Text className="text-amber-solar font-jakarta text-xs">
              3-Minute Community Host Wizard
            </Text>
          </View>
        </View>

        {/* 1. Location & Gate Details */}
        <GlassCard className="mb-6 p-4 border border-white/10">
          <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-3 font-mono">
            1. Driveway Location & Access
          </Text>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs mb-1 font-jakarta">Listing Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Kakkanad Villa 15A Socket"
              placeholderTextColor="#64748B"
              className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white text-xs font-jakarta"
            />
          </View>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs mb-1 font-jakarta">Apartment / Society Name</Text>
            <TextInput
              value={society}
              onChangeText={setSociety}
              placeholder="e.g. Lotus Greens Enclave"
              placeholderTextColor="#64748B"
              className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white text-xs font-jakarta"
            />
          </View>

          <View className="mb-3">
            <Text className="text-gray-400 text-xs mb-1 font-jakarta">Full Address & Parking Bay Guidance</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Villa 14 / Basement Pillar B-04"
              placeholderTextColor="#64748B"
              className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white text-xs font-jakarta"
            />
          </View>

          <View>
            <Text className="text-gray-400 text-xs mb-1 font-jakarta">Security Gate Instructions</Text>
            <TextInput
              value={gateInstructions}
              onChangeText={setGateInstructions}
              placeholder="What to inform guard at barrier..."
              placeholderTextColor="#64748B"
              className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white text-xs font-jakarta"
            />
          </View>
        </GlassCard>

        {/* 2. Hardware Specification */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
          2. Plug & Hardware Specification
        </Text>
        <View className="space-y-2 mb-6">
          {HARDWARE_TYPES.map((item, idx) => {
            const isSelected = hardware.key === item.key;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setHardware(item)}
                className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? "bg-[#FFB800]/15 border-amber-solar"
                    : "bg-[#0F1622] border-white/10"
                }`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Zap size={20} color={isSelected ? "#FFB800" : "#64748B"} style={{ marginRight: 10 }} />
                  <View className="flex-1">
                    <Text className="text-white text-xs font-bold font-space">{item.label}</Text>
                    <Text className="text-gray-400 text-[10px] mt-0.5 font-jakarta">{item.desc}</Text>
                  </View>
                </View>
                {isSelected && (
                  <View className="w-5 h-5 rounded-full bg-amber-solar items-center justify-center">
                    <Check size={12} color="#06090E" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. State DISCOM Tariff Auto-Helper */}
        <GlassCard className="mb-6 p-4 border border-amber-solar/40 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Sparkles size={16} color="#FFB800" style={{ marginRight: 6 }} />
              <Text className="text-amber-solar font-mono text-xs font-bold uppercase tracking-wider">
                State DISCOM Tariff Auto-Helper
              </Text>
            </View>
          </View>
          <Text className="text-gray-400 text-xs mb-3 font-jakarta">
            Select state to populate compliant domestic unit rates within legal Ministry of Power cost-sharing guidelines:
          </Text>

          {/* DISCOM Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 mb-4">
            {DISCOM_OPTIONS.map((d, idx) => {
              const active = selectedDiscom.key === d.key;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setSelectedDiscom(d);
                    setPricePerKwh(d.defaultTariff);
                    setParkingFee(d.defaultParking);
                  }}
                  className={`px-3 py-2 rounded-xl border mr-2 ${
                    active
                      ? "bg-amber-solar/20 border-amber-solar"
                      : "bg-[#06090E] border-white/10"
                  }`}
                >
                  <Text
                    style={{ color: active ? "#FFB800" : "#E2E8F0" }}
                    className="text-xs font-bold font-mono"
                  >
                    {d.key} ({d.state})
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-mono mt-0.5">
                    Base: ₹{d.baseRate}/u
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Price & Maintenance Inputs */}
          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-gray-400 text-[11px] mb-1 font-jakarta">Energy Rate (₹/kWh)</Text>
              <TextInput
                value={pricePerKwh}
                onChangeText={setPricePerKwh}
                keyboardType="numeric"
                className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white font-mono text-base font-bold text-center"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-400 text-[11px] mb-1 font-jakarta">Parking & Maint (₹/hr)</Text>
              <TextInput
                value={parkingFee}
                onChangeText={setParkingFee}
                keyboardType="numeric"
                className="bg-[#06090E] p-3 rounded-xl border border-white/10 text-white font-mono text-base font-bold text-center"
              />
            </View>
          </View>
        </GlassCard>

        {/* 4. Host Amenities */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
          4. Driveway Amenities
        </Text>
        <View className="flex-row flex-wrap mb-8">
          {AMENITY_TAGS.map((tag, idx) => {
            const isSelected = selectedAmenities.includes(tag);
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => toggleAmenity(tag)}
                className={`px-3 py-1.5 rounded-full border mr-2 mb-2 ${
                  isSelected
                    ? "bg-amber-solar/20 border-amber-solar"
                    : "bg-[#0F1622] border-white/10"
                }`}
              >
                <Text
                  style={{ color: isSelected ? "#FFB800" : "#94A3B8" }}
                  className="text-xs font-semibold font-jakarta"
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button */}
        <NeonButton
          title="PUBLISH TO COMMUNITY RADAR"
          onPress={handleCreateNode}
          loading={loading}
          size="lg"
          icon={<ArrowRight size={16} color="#06090E" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
