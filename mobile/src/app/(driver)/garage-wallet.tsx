import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Car,
  Wallet,
  Plus,
  Check,
  Trash2,
  X,
  CreditCard,
  Smartphone,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthStore, GarageVehicle } from "../../store/useAuthStore";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";

const EV_MODEL_PRESETS = [
  { brand: "Tesla", model: "Model X", year: "2018", energyKwh: 68.2, rangeKm: 70, port: "Type A" },
  { brand: "Tesla", model: "Model 3", year: "2025", energyKwh: 60.0, rangeKm: 280, port: "Type B" },
  { brand: "Tata", model: "Nexon EV", year: "2025", energyKwh: 40.5, rangeKm: 245, port: "Type B" },
  { brand: "MG", model: "Windsor EV", year: "2025", energyKwh: 38.0, rangeKm: 215, port: "CHAdeMO" },
  { brand: "Hyundai", model: "IONIQ 5", year: "2025", energyKwh: 72.6, rangeKm: 340, port: "Type B" },
];

export default function GarageWalletScreen() {
  const router = useRouter();
  const {
    vehicles,
    selectedVehicleId,
    selectVehicle,
    addVehicle,
    removeVehicle,
  } = useAuthStore();

  const [walletBalance, setWalletBalance] = useState(142.5);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(EV_MODEL_PRESETS[1]);
  const [plateInput, setPlateInput] = useState("KL-07-EV-9021");
  const [topUpAmount, setTopUpAmount] = useState(50);

  const handleSaveVehicle = () => {
    if (!plateInput.trim()) {
      Alert.alert("Required", "Please enter a registration plate number.");
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const newVeh: GarageVehicle = {
      id: `v-${Date.now()}`,
      brand: selectedPreset.brand,
      model: selectedPreset.model,
      year: selectedPreset.year,
      plateNumber: plateInput.toUpperCase().trim(),
      batteryPercent: 80,
      rangeKm: selectedPreset.rangeKm,
      travelTimeEst: "2h 15m",
      energyKwh: selectedPreset.energyKwh,
      chargingPort: selectedPreset.port,
      connectorType: selectedPreset.port as any,
      isPrimary: true,
    };
    addVehicle(newVeh);
    setShowAddVehicleModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#151C18" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Vehicles & Wallet</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <View>
              <Text style={styles.walletLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.walletAmount}>
                ${walletBalance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Wallet size={22} color="#05E660" />
            </View>
          </View>

          <Text style={styles.walletSub}>
            Zero platform fee on direct station bookings and instant settlements.
          </Text>

          <TouchableOpacity
            onPress={() => setShowTopUpModal(true)}
            activeOpacity={0.85}
            style={styles.topUpBtn}
          >
            <Plus size={16} color="#151C18" strokeWidth={2.5} />
            <Text style={styles.topUpBtnText}>Add Funds to Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicles Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            My Vehicles ({vehicles.length})
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddVehicleModal(true)}
            style={styles.addVehiclePill}
          >
            <Plus size={14} color="#151C18" />
            <Text style={styles.addVehiclePillText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {vehicles.map((v) => {
          const isSelected = v.id === selectedVehicleId;
          return (
            <TouchableOpacity
              key={v.id}
              activeOpacity={0.85}
              onPress={() => selectVehicle(v.id)}
              style={[
                styles.vehicleCard,
                isSelected && styles.vehicleCardSelected,
              ]}
            >
              <View style={styles.vehicleHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <ConnectorPlugIllustration variant={v.chargingPort} size={46} />
                  <View>
                    <Text style={styles.vehicleName}>
                      {v.brand} {v.model} ({v.year})
                    </Text>
                    <Text style={styles.vehiclePlate}>
                      {v.plateNumber} • {v.chargingPort}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {isSelected && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                  {vehicles.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeVehicle(v.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={15} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.vehicleStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Battery</Text>
                  <Text style={styles.statVal}>{v.batteryPercent}%</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Range</Text>
                  <Text style={styles.statVal}>{v.rangeKm} km</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Capacity</Text>
                  <Text style={styles.statVal}>{v.energyKwh} kWh</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddVehicleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddVehicleModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Electric Vehicle</Text>
              <TouchableOpacity
                onPress={() => setShowAddVehicleModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>SELECT EV MODEL</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 16 }}
            >
              {EV_MODEL_PRESETS.map((p, idx) => {
                const isSel =
                  p.model === selectedPreset.model &&
                  p.brand === selectedPreset.brand;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedPreset(p)}
                    style={[styles.presetChip, isSel && styles.presetChipActive]}
                  >
                    <Text
                      style={[
                        styles.presetChipTitle,
                        isSel && { color: "#05E660" },
                      ]}
                    >
                      {p.brand} {p.model}
                    </Text>
                    <Text style={styles.presetChipSub}>
                      {p.energyKwh} kWh • {p.port}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>LICENSE PLATE</Text>
            <TextInput
              value={plateInput}
              onChangeText={setPlateInput}
              placeholder="KL-07-EV-9021"
              placeholderTextColor="#757F7A"
              style={styles.textInput}
            />

            <TouchableOpacity
              onPress={handleSaveVehicle}
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>Save Vehicle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top Up Modal */}
      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity
                onPress={() => setShowTopUpModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountsRow}>
              {[20, 50, 100, 200].map((amt) => {
                const isSel = topUpAmount === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setTopUpAmount(amt)}
                    style={[styles.amountPill, isSel && styles.amountPillActive]}
                  >
                    <Text
                      style={[
                        styles.amountPillText,
                        isSel && { color: "#05E660" },
                      ]}
                    >
                      ${amt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                } catch {}
                setWalletBalance((prev) => prev + topUpAmount);
                setShowTopUpModal(false);
              }}
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>
                Confirm Top-up (${topUpAmount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 112,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111714",
  },
  walletCard: {
    backgroundColor: "#151C18",
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
  },
  walletTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9BA39F",
    letterSpacing: 0.8,
  },
  walletAmount: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletSub: {
    fontSize: 12,
    color: "#9BA39F",
    marginTop: 10,
    marginBottom: 16,
  },
  topUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    gap: 6,
  },
  topUpBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  addVehiclePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4E8E6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addVehiclePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
  },
  vehicleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
  },
  vehicleCardSelected: {
    borderColor: "#151C18",
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111714",
  },
  vehiclePlate: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: "#05E660",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#151C18",
  },
  deleteBtn: {
    padding: 6,
  },
  vehicleStatsRow: {
    flexDirection: "row",
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#757F7A",
  },
  statVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 23, 20, 0.42)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 38,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111714",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  presetChipActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  presetChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111714",
  },
  presetChipSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  textInput: {
    backgroundColor: "#F7F9F8",
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 18,
  },
  primaryModalBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryModalBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#151C18",
  },
  amountsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  amountPill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F7F9F8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  amountPillActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  amountPillText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111714",
  },
});
