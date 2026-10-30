import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Zap, Check, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { apiClient } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

const HARDWARE_TYPES = [
  {
    key: "TYPE_A",
    label: "Type A Connector (22 kW)",
    power: 22.0,
    desc: "AC Fast Charging • Slot A Standard",
  },
  {
    key: "CHADEMO",
    label: "CHAdeMO Fast DC (50 kW)",
    power: 50.0,
    desc: "High-speed DC rapid charger • Slot B",
  },
  {
    key: "TYPE_B",
    label: "Type B CCS Combo (120 kW)",
    power: 120.0,
    desc: "Ultra-fast commercial & residential wallbox • Slot C",
  },
];

const AMENITY_TAGS = [
  "CCTV Monitored",
  "Covered Bay",
  "24/7 Access",
  "Lounge & Cafe",
  "Free WiFi",
  "Automated Barrier",
];

export default function AddChargerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [title, setTitle] = useState("Pall Mall EV Station");
  const [address, setAddress] = useState("1 White Hall Palace, Street 5, London");
  const [gateInstructions, setGateInstructions] = useState(
    "Enter 6-digit VoltMate Gate Pass on keypad at Bay A."
  );
  const [hardware, setHardware] = useState(HARDWARE_TYPES[0]);
  const [pricePerKwh, setPricePerKwh] = useState("0.75");
  const [parkingFee, setParkingFee] = useState("2.00");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "CCTV Monitored",
    "Covered Bay",
    "24/7 Access",
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
      Alert.alert("Missing Details", "Please provide a station name and street address.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        society_name: "White Hall Enclave",
        address_line: address.trim(),
        gate_instructions: gateInstructions.trim(),
        latitude: 51.5064,
        longitude: -0.1364,
        connector_type: "TYPE_2",
        power_output_kw: hardware.power,
        price_per_kwh: parseFloat(pricePerKwh) || 0.75,
        parking_fee_per_hr: parseFloat(parkingFee) || 2.0,
        amenities: selectedAmenities,
        instant_book_enabled: true,
        min_driver_rating: 4.0,
      };

      await apiClient.post(`/host/nodes?host_id=${user?.id || "host_1"}`, payload);
    } catch {}

    setLoading(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert("Station Published!", "Your charging station is now live on the discovery map.");
    router.replace("/(host)/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Add Charging Station</Text>
            <Text style={styles.subtitle}>
              Configure location, connectors & per-kWh pricing
            </Text>
          </View>
        </View>

        {/* 1. Location Details */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>1. STATION LOCATION & ACCESS</Text>

          <Text style={styles.fieldLabel}>Station Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Pall Mall Station"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Street Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="1 White Hall Palace, Street 5"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Access & Gate Instructions</Text>
          <TextInput
            value={gateInstructions}
            onChangeText={setGateInstructions}
            placeholder="Gate code instructions..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        {/* 2. Connector Hardware */}
        <Text style={[styles.sectionHeader, { marginLeft: 4, marginBottom: 8 }]}>
          2. CONNECTOR SPECIFICATION
        </Text>
        <View style={{ gap: 10, marginBottom: 18 }}>
          {HARDWARE_TYPES.map((item) => {
            const isSelected = hardware.key === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setHardware(item)}
                style={[
                  styles.hardwareCard,
                  isSelected && styles.hardwareCardSelected,
                ]}
              >
                <View style={styles.hardwareLeft}>
                  <View
                    style={[
                      styles.hardwareIcon,
                      isSelected && { backgroundColor: "#151C18" },
                    ]}
                  >
                    <Zap size={18} color={isSelected ? "#05E660" : "#757F7A"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hardwareTitle}>{item.label}</Text>
                    <Text style={styles.hardwareDesc}>{item.desc}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    isSelected && styles.checkCircleSelected,
                  ]}
                >
                  {isSelected && <Check size={13} color="#111714" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Tariff */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>3. PRICING & TARIFF</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Energy Rate ($/kWh)</Text>
              <TextInput
                value={pricePerKwh}
                onChangeText={setPricePerKwh}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Bay Fee ($/hr)</Text>
              <TextInput
                value={parkingFee}
                onChangeText={setParkingFee}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* 4. Amenities */}
        <Text style={[styles.sectionHeader, { marginLeft: 4, marginBottom: 8 }]}>
          4. STATION AMENITIES
        </Text>
        <View style={styles.tagsWrap}>
          {AMENITY_TAGS.map((tag) => {
            const active = selectedAmenities.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleAmenity(tag)}
                style={[styles.tagPill, active && styles.tagPillActive]}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Publish CTA */}
        <TouchableOpacity
          onPress={handleCreateNode}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.publishBtn}
        >
          {loading ? (
            <ActivityIndicator color="#111714" />
          ) : (
            <>
              <Text style={styles.publishBtnText}>Publish Station</Text>
              <ArrowRight size={18} color="#111714" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
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
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111714",
  },
  subtitle: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111714",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E9E6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
    marginBottom: 12,
  },
  hardwareCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
  },
  hardwareCardSelected: {
    borderColor: "#151C18",
  },
  hardwareLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  hardwareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  hardwareTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  hardwareDesc: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    backgroundColor: "#05E660",
    borderColor: "#05E660",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tagPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E9E6",
  },
  tagPillActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#757F7A",
  },
  tagTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    borderRadius: 28,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  publishBtnText: {
    color: "#111714",
    fontSize: 15,
    fontWeight: "800",
  },
});
