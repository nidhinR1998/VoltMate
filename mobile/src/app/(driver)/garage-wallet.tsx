import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore, TAB_BAR_SAFE_PADDING } from "../../store/useAuthStore";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";

const INDIAN_EV_PRESETS = [
  { makeModel: "Tata Punch EV Empowered+", cap: "35.0", conn: "CCS2 & Type-2", range: 265 },
  { makeModel: "Tata Curvv EV 55", cap: "55.0", conn: "CCS2 DC Fast", range: 380 },
  { makeModel: "Mahindra BE 6e", cap: "59.0", conn: "CCS2 DC Fast", range: 410 },
  { makeModel: "BYD Atto 3 Dynamic", cap: "49.9", conn: "CCS2 & Type-2", range: 345 },
  { makeModel: "Ather 450X Apex", cap: "3.7", conn: "15A 3-Pin Socket", range: 110 },
  { makeModel: "Ola S1 Pro Gen 2", cap: "4.0", conn: "15A 3-Pin Socket", range: 135 },
];

export default function GarageWalletScreen() {
  const router = useRouter();
  const {
    user,
    vehicles,
    transactions,
    topUpWallet,
    addVehicle,
    setPrimaryVehicle,
    removeVehicle,
  } = useAuthStore();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [makeModel, setMakeModel] = useState("Tata Punch EV Empowered+");
  const [year, setYear] = useState("2025");
  const [plateNumber, setPlateNumber] = useState("KL-07-EV-8821");
  const [batteryCapacity, setBatteryCapacity] = useState("35.0");
  const [connectorLabel, setConnectorLabel] = useState<string>("CCS2 & Type-2");
  const [upiMethod, setUpiMethod] = useState<"GPay" | "PhonePe" | "Paytm">("GPay");

  const handleSaveVehicle = async () => {
    if (!makeModel.trim()) return;
    const capNum = parseFloat(batteryCapacity) || 40.5;
    await addVehicle({
      makeModel: makeModel.trim(),
      year: year.trim() || "2025",
      plateNumber: plateNumber.trim().toUpperCase() || "KL-07-EV-2026",
      batteryCapacityKwh: capNum,
      connectorType: connectorLabel.includes("15A")
        ? "SOCKET_15A"
        : connectorLabel.includes("Type-2 AC")
        ? "TYPE_2"
        : "CCS2",
      connectorLabel,
      socPercent: 80,
      rangeKm: Math.round(capNum * 6.5),
    });
    setAddModalVisible(false);
  };

  const confirmDeleteVehicle = (id: string, modelName: string) => {
    Alert.alert(
      "Remove EV from Garage",
      `Are you sure you want to remove ${modelName} from your VoltMate garage?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeVehicle(id),
        },
      ]
    );
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
            router.canGoBack() ? router.back() : router.replace("/(driver)/profile")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>EV Garage & Wallet</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add EV</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Card (₹ INR + Instant UPI Top-Up) */}
      <View style={styles.walletCard}>
        <View style={styles.walletTopLine}>
          <View>
            <Text style={styles.walletLabel}>VOLTMATE CREDITS BALANCE (₹ INR)</Text>
            <Text style={styles.walletBalance}>
              ₹{(user?.voltCreditsBalance ?? 1450.0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.upiVerifiedTag}>
            <Text style={styles.upiVerifiedTxt}>UPI: {user?.upiId || "nidhinrajesh@okaxis"}</Text>
          </View>
        </View>

        <View style={styles.upiSelectorRow}>
          {(["GPay", "PhonePe", "Paytm"] as const).map((app) => (
            <TouchableOpacity
              key={app}
              style={[
                styles.upiMethodChip,
                upiMethod === app && styles.upiMethodChipActive,
              ]}
              onPress={() => setUpiMethod(app)}
            >
              <Text
                style={[
                  styles.upiMethodChipTxt,
                  upiMethod === app && styles.upiMethodChipTxtActive,
                ]}
              >
                {app === "GPay" ? "⚡ GPay" : app === "PhonePe" ? "💜 PhonePe" : "💙 Paytm"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.topUpRow}>
          {[200, 500, 1000, 2000].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.topUpChip}
              onPress={() => topUpWallet(amt, `${upiMethod} UPI`)}
            >
              <Text style={styles.topUpChipText}>+₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vehicles List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My Electric Vehicles ({vehicles.length})</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addLinkTxt}>+ Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {vehicles.map((v) => (
        <TouchableOpacity
          key={v.id}
          style={[styles.vehicleCard, v.isPrimary && styles.vehicleCardActive]}
          onPress={() => setPrimaryVehicle(v.id)}
          activeOpacity={0.9}
        >
          <View style={styles.vehicleTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                {v.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>ACTIVE EV</Text>
                  </View>
                ) : (
                  <View style={styles.tapToSwitchBadge}>
                    <Text style={styles.tapToSwitchTxt}>TAP TO SET ACTIVE</Text>
                  </View>
                )}
                <Text style={styles.plateTag}>{v.plateNumber}</Text>
              </View>
              <Text style={styles.vehicleName}>{v.makeModel}</Text>
              <Text style={styles.vehicleSub}>
                {v.year} • {v.connectorLabel} • {v.batteryCapacityKwh} kWh
              </Text>
              <Text style={styles.vehicleRange}>
                ⚡ {v.socPercent}% SOC • {v.rangeKm} km Est. Range
              </Text>
            </View>
            <View style={styles.carThumb}>
              <EvCarHeroRender model={v.makeModel} />
            </View>
          </View>

          {vehicles.length > 1 && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => confirmDeleteVehicle(v.id, v.makeModel)}
            >
              <Text style={styles.removeBtnText}>🗑 Remove Vehicle</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}

      {/* Recent Wallet Transactions */}
      <Text style={styles.sectionTitle}>Recent ₹ INR Wallet Ledger</Text>
      <View style={styles.txListCard}>
        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View>
              <Text style={styles.txTitle}>{tx.title}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                { color: tx.isCredit ? "#096B30" : "#151C18" },
              ]}
            >
              {tx.amount}
            </Text>
          </View>
        ))}
      </View>

      {/* Add Vehicle Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Indian Electric Vehicle</Text>
            <Text style={styles.modalHint}>Tap an Indian EV preset or enter custom details</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScrollRow}
            >
              {INDIAN_EV_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.makeModel}
                  style={[
                    styles.presetChip,
                    makeModel === preset.makeModel && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    setMakeModel(preset.makeModel);
                    setBatteryCapacity(preset.cap);
                    setConnectorLabel(preset.conn);
                  }}
                >
                  <Text
                    style={[
                      styles.presetChipTxt,
                      makeModel === preset.makeModel && styles.presetChipTxtActive,
                    ]}
                  >
                    {preset.makeModel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Vehicle Make & Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tata Nexon EV, Mahindra BE 6e"
              placeholderTextColor="#9CA3AF"
              value={makeModel}
              onChangeText={setMakeModel}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Kerala / India Reg. Plate</Text>
                <TextInput
                  style={styles.input}
                  placeholder="KL-07-CS-4921"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.inputLabel}>Battery (kWh)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="40.5"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={batteryCapacity}
                  onChangeText={setBatteryCapacity}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Indian Charging Connector</Text>
            <View style={styles.connRow}>
              {["CCS2 & Type-2", "Type-2 AC Wallbox", "15A 3-Pin Socket"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.connOption,
                    connectorLabel === c && styles.connOptionActive,
                  ]}
                  onPress={() => setConnectorLabel(c)}
                >
                  <Text
                    style={[
                      styles.connOptionText,
                      connectorLabel === c && styles.connOptionTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveVehicle}
              >
                <Text style={styles.saveModalText}>Save Vehicle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  addBtn: {
    backgroundColor: "#151C18",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  walletCard: {
    backgroundColor: "#151C18",
    borderRadius: 26,
    padding: 22,
    marginBottom: 22,
  },
  walletTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8E9892",
    letterSpacing: 0.8,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 6,
  },
  upiVerifiedTag: {
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  upiVerifiedTxt: {
    color: "#05E660",
    fontSize: 10,
    fontWeight: "800",
  },
  upiSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  upiMethodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#26302A",
  },
  upiMethodChipActive: {
    backgroundColor: "#10241B",
    borderWidth: 1,
    borderColor: "#05E660",
  },
  upiMethodChipTxt: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
  },
  upiMethodChipTxtActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  topUpRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  topUpChip: {
    flex: 1,
    backgroundColor: "#05E660",
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  topUpChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
  },
  addLinkTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
    marginBottom: 12,
  },
  vehicleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  vehicleCardActive: {
    borderColor: "#16B374",
    backgroundColor: "#F9FEFB",
  },
  vehicleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  primaryBadge: {
    backgroundColor: "#05E660",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#151C18",
  },
  tapToSwitchBadge: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tapToSwitchTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6B746E",
  },
  plateTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  vehicleSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  vehicleRange: {
    fontSize: 12,
    fontWeight: "700",
    color: "#096B30",
    marginTop: 6,
  },
  carThumb: {
    width: 125,
    height: 85,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: 0.56 }],
  },
  removeBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  txListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F4F2",
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  txDate: {
    fontSize: 12,
    color: "#8A928D",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  modalHint: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
    marginBottom: 12,
  },
  presetScrollRow: {
    gap: 8,
    paddingBottom: 12,
  },
  presetChip: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  presetChipActive: {
    backgroundColor: "#151C18",
  },
  presetChipTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
  },
  presetChipTxtActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  inputLabel: {
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
    color: "#151C18",
    fontWeight: "600",
    marginBottom: 12,
  },
  connRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  connOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#F5F7F6",
    alignItems: "center",
  },
  connOptionActive: {
    backgroundColor: "#05E660",
  },
  connOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5C6460",
    textAlign: "center",
  },
  connOptionTextActive: {
    color: "#151C18",
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  saveModalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
