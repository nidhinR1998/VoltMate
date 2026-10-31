import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";

export default function GarageSetupScreen() {
  const router = useRouter();
  const { addVehicle } = useAuthStore();

  const [makeModel, setMakeModel] = useState("Tata Nexon EV Empowered+");
  const [year, setYear] = useState("2025");
  const [plateNumber, setPlateNumber] = useState("KL-07-CS-4921");
  const [batteryCap, setBatteryCap] = useState("40.5");
  const [connectorLabel, setConnectorLabel] = useState("CCS2 & Type-2");

  const handleCompleteSetup = async () => {
    await addVehicle({
      makeModel: makeModel.trim() || "Tata Nexon EV Empowered+",
      year: year.trim() || "2025",
      plateNumber: plateNumber.trim().toUpperCase() || "KL-07-CS-4921",
      batteryCapacityKwh: parseFloat(batteryCap) || 40.5,
      connectorType: connectorLabel.includes("15A")
        ? "SOCKET_15A"
        : connectorLabel.includes("Type-2 AC")
        ? "TYPE_2"
        : "CCS2",
      connectorLabel,
      socPercent: 72,
      rangeKm: 245,
    });
    router.replace("/(driver)/home");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.overline}>STEP 2 OF 2 • INDIAN EV GARAGE</Text>
      <Text style={styles.title}>Configure Your EV</Text>
      <Text style={styles.subtitle}>
        We match your vehicle port with compatible 15A, Type-2 & CCS2 chargers across Kerala.
      </Text>

      <View style={styles.previewBox}>
        <EvCarHeroRender model={makeModel} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Vehicle Model</Text>
        <TextInput
          style={styles.input}
          value={makeModel}
          onChangeText={setMakeModel}
          placeholder="Tata Nexon EV Empowered+"
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Reg. Plate Number</Text>
            <TextInput
              style={styles.input}
              value={plateNumber}
              onChangeText={setPlateNumber}
              placeholder="KL-07-CS-4921"
              autoCapitalize="characters"
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.label}>Battery (kWh)</Text>
            <TextInput
              style={styles.input}
              value={batteryCap}
              onChangeText={setBatteryCap}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Preferred Indian Charging Port</Text>
        <View style={styles.connRow}>
          {["CCS2 & Type-2", "Type-2 AC Wallbox", "15A 3-Pin Socket"].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.connChip,
                connectorLabel === c && styles.connChipActive,
              ]}
              onPress={() => setConnectorLabel(c)}
            >
              <Text
                style={[
                  styles.connText,
                  connectorLabel === c && styles.connTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleCompleteSetup}>
          <Text style={styles.saveBtnText}>Save & Launch Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F3",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 60,
  },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B746E",
    marginTop: 4,
    marginBottom: 14,
  },
  previewBox: {
    alignItems: "center",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#151C18",
    marginBottom: 14,
  },
  connRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  connChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    alignItems: "center",
  },
  connChipActive: {
    backgroundColor: "#151C18",
  },
  connText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5C6460",
    textAlign: "center",
  },
  connTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  saveBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
});
