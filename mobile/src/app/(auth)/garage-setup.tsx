import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Car, Check, ArrowRight, Home, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../store/useAuthStore";
import { useModeStore } from "../../store/useModeStore";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";

interface VehiclePreset {
  id: string;
  make: string;
  model: string;
  year: string;
  batteryPercent: number;
  rangeKm: number;
  energyKwh: number;
  chargingPort: "Type A" | "CHAdeMO" | "Type B";
}

const EV_PRESETS: VehiclePreset[] = [
  {
    id: "model-x",
    make: "Tesla",
    model: "Model X",
    year: "2018",
    batteryPercent: 72,
    rangeKm: 70,
    energyKwh: 68.2,
    chargingPort: "Type A",
  },
  {
    id: "model-3",
    make: "Tesla",
    model: "Model 3 Long Range",
    year: "2023",
    batteryPercent: 84,
    rangeKm: 410,
    energyKwh: 75.0,
    chargingPort: "Type B",
  },
  {
    id: "ioniq-5",
    make: "Hyundai",
    model: "IONIQ 5 AWD",
    year: "2024",
    batteryPercent: 66,
    rangeKm: 315,
    energyKwh: 72.6,
    chargingPort: "CHAdeMO",
  },
  {
    id: "nexon-ev",
    make: "Tata",
    model: "Nexon EV Empowered",
    year: "2024",
    batteryPercent: 78,
    rangeKm: 280,
    energyKwh: 40.5,
    chargingPort: "Type B",
  },
];

export default function GarageSetupScreen() {
  const router = useRouter();
  const { setMode } = useModeStore();
  const { addVehicle, selectVehicle } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<"DRIVER" | "HOST">("DRIVER");
  const [selectedPreset, setSelectedPreset] = useState<VehiclePreset>(EV_PRESETS[0]);
  const [plateNumber, setPlateNumber] = useState("EV-2026-X");

  const handleCompleteSetup = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    addVehicle({
      id: selectedPreset.id,
      model: selectedPreset.model,
      make: selectedPreset.make,
      year: selectedPreset.year,
      batteryPercent: selectedPreset.batteryPercent,
      rangeKm: selectedPreset.rangeKm,
      timeEstimate: "1h 20m",
      energyKwh: selectedPreset.energyKwh,
      chargingPort: selectedPreset.chargingPort,
      plate: plateNumber.trim() || "EV-2026-X",
    });
    selectVehicle(selectedPreset.id);

    if (selectedRole === "HOST") {
      setMode("HOST");
      router.replace("/(host)/dashboard");
    } else {
      setMode("DRIVER");
      router.replace("/(driver)/home");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Garage</Text>
          <Text style={styles.subtitle}>
            Select your primary vehicle or configure your charger host profile
          </Text>
        </View>

        {/* Role Selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setSelectedRole("DRIVER");
            }}
            style={[
              styles.roleCard,
              selectedRole === "DRIVER" && styles.roleCardActive,
            ]}
          >
            <Car
              size={22}
              color={selectedRole === "DRIVER" ? "#05E660" : "#757F7A"}
            />
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === "DRIVER" && { color: "#FFFFFF" },
              ]}
            >
              EV Driver
            </Text>
            <Text
              style={[
                styles.roleCardSub,
                selectedRole === "DRIVER" && { color: "#D1D5DB" },
              ]}
            >
              Find & book chargers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setSelectedRole("HOST");
            }}
            style={[
              styles.roleCard,
              selectedRole === "HOST" && styles.roleCardActive,
            ]}
          >
            <Home
              size={22}
              color={selectedRole === "HOST" ? "#05E660" : "#757F7A"}
            />
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === "HOST" && { color: "#FFFFFF" },
              ]}
            >
              Station Host
            </Text>
            <Text
              style={[
                styles.roleCardSub,
                selectedRole === "HOST" && { color: "#D1D5DB" },
              ]}
            >
              Share your EV plug
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Studio Preview */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewMake}>
                {selectedPreset.make} {selectedPreset.year}
              </Text>
              <Text style={styles.previewModel}>{selectedPreset.model}</Text>
            </View>
            <View style={styles.portBadge}>
              <Text style={styles.portBadgeText}>{selectedPreset.chargingPort}</Text>
            </View>
          </View>
          <View style={{ alignItems: "center", marginVertical: 8 }}>
            <EvCarHeroRender width={220} height={125} />
          </View>
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specVal}>{selectedPreset.batteryPercent}%</Text>
              <Text style={styles.specLab}>Battery</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specVal}>{selectedPreset.rangeKm} km</Text>
              <Text style={styles.specLab}>Est. Range</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specVal}>{selectedPreset.energyKwh} kWh</Text>
              <Text style={styles.specLab}>Capacity</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Presets */}
        <Text style={styles.sectionTitle}>Choose Your EV Model</Text>
        <View style={styles.listWrap}>
          {EV_PRESETS.map((v) => {
            const isSelected = selectedPreset.id === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSelectedPreset(v);
                }}
                activeOpacity={0.85}
                style={[
                  styles.vehicleOption,
                  isSelected && styles.vehicleOptionSelected,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>
                    {v.make} {v.model} ({v.year})
                  </Text>
                  <Text style={styles.optionSub}>
                    {v.energyKwh} kWh • Port: {v.chargingPort}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <Check size={13} color="#111714" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Registration Plate */}
        <View style={styles.plateCard}>
          <Text style={styles.plateLabel}>VEHICLE REGISTRATION / PLATE</Text>
          <TextInput
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="EV-2026-X"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            style={styles.plateInput}
          />
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          onPress={handleCompleteSetup}
          activeOpacity={0.85}
          style={styles.finishBtn}
        >
          <Text style={styles.finishBtnText}>
            {selectedRole === "HOST"
              ? "Launch Host Studio"
              : "Complete Setup & Open Cockpit"}
          </Text>
          <ArrowRight size={18} color="#111714" />
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
    paddingTop: 22,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E6EAE8",
    alignItems: "center",
  },
  roleCardActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  roleCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
    marginTop: 8,
  },
  roleCardSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  previewMake: {
    fontSize: 12,
    color: "#757F7A",
    fontWeight: "600",
  },
  previewModel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111714",
    marginTop: 2,
  },
  portBadge: {
    backgroundColor: "rgba(5, 230, 96, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  portBadgeText: {
    color: "#047835",
    fontSize: 11,
    fontWeight: "800",
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F9F8",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  specItem: {
    flex: 1,
    alignItems: "center",
  },
  specVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  specLab: {
    fontSize: 10,
    color: "#757F7A",
    marginTop: 2,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8E5",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111714",
    marginBottom: 10,
  },
  listWrap: {
    gap: 10,
    marginBottom: 18,
  },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
  },
  vehicleOptionSelected: {
    borderColor: "#151C18",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  optionSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    backgroundColor: "#05E660",
    borderColor: "#05E660",
  },
  plateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 20,
  },
  plateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  plateInput: {
    backgroundColor: "#F7F9F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
    borderWidth: 1,
    borderColor: "#E4E9E6",
  },
  finishBtn: {
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
  finishBtnText: {
    color: "#111714",
    fontSize: 15,
    fontWeight: "800",
  },
});
