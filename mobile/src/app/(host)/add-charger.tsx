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
import { useAuthStore, TAB_BAR_SAFE_PADDING } from "../../store/useAuthStore";

export default function AddChargerScreen() {
  const router = useRouter();
  const { addStation, user } = useAuthStore();

  const [name, setName] = useState("Green Valley Villa P2P Wallbox");
  const [address, setAddress] = useState(
    "Plot 18, Edachira Rd, Kakkanad, Kochi"
  );
  const [parkingInstructions, setParkingInstructions] = useState(
    "Gate 2 covered porch • Ring bell #18 or enter Gate Pass PIN"
  );
  const [powerKw, setPowerKw] = useState("7.4");
  const [pricePerKwh, setPricePerKwh] = useState("10.50");
  const [connector, setConnector] = useState("Type-2 AC Wallbox");

  const handlePublish = async () => {
    await addStation({
      name: name.trim() || "Kochi Home P2P Charger",
      hostName: user?.fullName || "Nidhin R",
      address: `${address.trim()} • ${parkingInstructions.trim()}`,
      latitude: 10.0159 + (Math.random() - 0.5) * 0.015,
      longitude: 76.3419 + (Math.random() - 0.5) * 0.015,
      stationType: "P2P_HOME",
      connectorTypes: [connector, "15A 3-Pin Socket"],
      maxPowerKw: parseFloat(powerKw) || 7.4,
      pricePerKwh: parseFloat(pricePerKwh) || 10.5,
    });
    router.replace("/(host)/dashboard");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(host)/dashboard")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Register P2P Charger</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Station Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Lotus Greens Villa P2P Socket"
        />

        <Text style={styles.label}>Street Address (Kochi / Kerala)</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Infopark Road, Kakkanad"
        />

        <Text style={styles.label}>Parking Bay & Gate Instructions</Text>
        <TextInput
          style={styles.input}
          value={parkingInstructions}
          onChangeText={setParkingInstructions}
          placeholder="Covered porch bay • Enter 6-digit OTP at gate"
        />

        <Text style={styles.label}>Primary Indian Connector Type</Text>
        <View style={styles.connRow}>
          {[
            { label: "15A 3-Pin Socket", kw: "3.3", rate: "8.50" },
            { label: "Type-2 AC Wallbox", kw: "7.4", rate: "10.50" },
            { label: "CCS2 DC Fast", kw: "30.0", rate: "16.50" },
          ].map((c) => (
            <TouchableOpacity
              key={c.label}
              style={[
                styles.connChip,
                connector === c.label && styles.connChipActive,
              ]}
              onPress={() => {
                setConnector(c.label);
                setPowerKw(c.kw);
                setPricePerKwh(c.rate);
              }}
            >
              <Text
                style={[
                  styles.connText,
                  connector === c.label && styles.connTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max Power (kW)</Text>
            <TextInput
              style={styles.input}
              value={powerKw}
              onChangeText={setPowerKw}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Tariff (₹ INR / kWh)</Text>
            <TextInput
              style={styles.input}
              value={pricePerKwh}
              onChangeText={setPricePerKwh}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.ksebHintBox}>
          <Text style={styles.ksebHintTxt}>
            💡 KSEB Domestic EV Guideline: Recommended P2P rates are ₹8.50/kWh for 15A sockets and ₹10.50/kWh for 7.4kW Type-2 Wallboxes.
          </Text>
        </View>

        <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
          <Text style={styles.publishBtnText}>Publish Station on Radar</Text>
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
    paddingTop: 18,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
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
    marginBottom: 16,
  },
  connChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    alignItems: "center",
    paddingHorizontal: 4,
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
  ksebHintBox: {
    backgroundColor: "#EAFBF0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  ksebHintTxt: {
    fontSize: 11,
    color: "#096B30",
    fontWeight: "700",
    lineHeight: 16,
  },
  publishBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
});
