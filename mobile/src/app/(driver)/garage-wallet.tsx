import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Car,
  Wallet,
  Zap,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Home,
  CheckCircle2,
  X,
  CreditCard,
  Trash2,
  Star,
  Check,
  Smartphone,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";
import { useAuthStore } from "../../store/useAuthStore";

const { width } = Dimensions.get("window");

interface Vehicle {
  id: string;
  category: "4W" | "2W" | "3W";
  name: string;
  plateNumber: string;
  batteryKwh: number;
  currentSoc: number;
  rangeKm: number;
  connectors: string[];
  isPrimary: boolean;
}

const EV_PRESETS = [
  { name: "Tata Nexon EV Max", category: "4W", batteryKwh: 40.5, rangeKm: 280, connectors: ["15A Domestic", "Type-2 AC", "CCS2 DC"] },
  { name: "Tata Punch.ev Long Range", category: "4W", batteryKwh: 35.0, rangeKm: 260, connectors: ["15A Domestic", "Type-2 AC", "CCS2 DC"] },
  { name: "Tata Curvv.ev 55", category: "4W", batteryKwh: 55.0, rangeKm: 410, connectors: ["15A Domestic", "Type-2 AC", "CCS2 DC"] },
  { name: "MG Windsor EV", category: "4W", batteryKwh: 38.0, rangeKm: 275, connectors: ["15A Domestic", "Type-2 AC", "CCS2 DC"] },
  { name: "MG Comet EV", category: "4W", batteryKwh: 17.3, rangeKm: 160, connectors: ["15A Domestic", "Type-2 AC"] },
  { name: "Mahindra BE 6e", category: "4W", batteryKwh: 59.0, rangeKm: 440, connectors: ["15A Domestic", "Type-2 AC", "CCS2 DC"] },
  { name: "Ather 450X Gen 3", category: "2W", batteryKwh: 3.7, rangeKm: 105, connectors: ["15A Domestic", "Ather Dot AC"] },
  { name: "Ather Rizta Z", category: "2W", batteryKwh: 3.7, rangeKm: 110, connectors: ["15A Domestic", "Ather Dot AC"] },
  { name: "Ola S1 Pro Gen 2", category: "2W", batteryKwh: 4.0, rangeKm: 140, connectors: ["15A Domestic", "Ola Hypercharger"] },
  { name: "TVS iQube ST", category: "2W", batteryKwh: 5.1, rangeKm: 125, connectors: ["15A Domestic"] },
  { name: "Bajaj Chetak Premium", category: "2W", batteryKwh: 3.2, rangeKm: 115, connectors: ["15A Domestic"] },
];

export default function GarageWalletScreen() {
  const router = useRouter();
  const { accentColor, toggleMode } = useModeStore();
  const { user } = useAuthStore();

  const [voltCredits, setVoltCredits] = useState(485);
  const [autoRecharge, setAutoRecharge] = useState(true);

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "V1",
      category: "4W",
      name: "Tata Nexon EV Max",
      plateNumber: "KL-07-CS-4921",
      batteryKwh: 40.5,
      currentSoc: 68,
      rangeKm: 284,
      connectors: ["15A Domestic", "Type-2 AC (7.2kW)", "CCS2 DC (50kW)"],
      isPrimary: true,
    },
    {
      id: "V2",
      category: "2W",
      name: "Ather 450X Gen 3",
      plateNumber: "KL-07-DF-1092",
      batteryKwh: 3.7,
      currentSoc: 92,
      rangeKm: 98,
      connectors: ["15A Domestic", "Ather Dot AC"],
      isPrimary: false,
    },
  ]);

  // Modals state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Add vehicle form state
  const [selectedPreset, setSelectedPreset] = useState(EV_PRESETS[0]);
  const [customPlate, setCustomPlate] = useState("KL-07-");
  const [customSoc, setCustomSoc] = useState(80);
  const [isPrimaryNew, setIsPrimaryNew] = useState(false);

  // Top Up form state
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState(500);
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleSwitchToHost = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    toggleMode();
    router.replace("/(host)/dashboard");
  };

  const handleSetPrimary = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setVehicles((prev) =>
      prev.map((v) => ({
        ...v,
        isPrimary: v.id === id,
      }))
    );
  };

  const handleDeleteVehicle = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    if (vehicles.length <= 1) {
      Alert.alert("Cannot Remove", "You must keep at least one registered EV in your garage.");
      return;
    }
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSaveNewVehicle = () => {
    if (!customPlate.trim() || customPlate.length < 6) {
      Alert.alert("Invalid Plate", "Please enter a valid registration plate number (e.g., KL-07-CS-4921).");
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const newVehicle: Vehicle = {
      id: `V${Date.now()}`,
      category: selectedPreset.category as any,
      name: selectedPreset.name,
      plateNumber: customPlate.toUpperCase().trim(),
      batteryKwh: selectedPreset.batteryKwh,
      currentSoc: customSoc,
      rangeKm: Math.round((selectedPreset.rangeKm * customSoc) / 100),
      connectors: selectedPreset.connectors,
      isPrimary: isPrimaryNew || vehicles.length === 0,
    };

    setVehicles((prev) => {
      if (newVehicle.isPrimary) {
        return [newVehicle, ...prev.map((v) => ({ ...v, isPrimary: false }))];
      }
      return [...prev, newVehicle];
    });

    setShowAddVehicleModal(false);
    setCustomPlate("KL-07-");
  };

  const handleExecuteTopUp = () => {
    setIsProcessingPayment(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setTimeout(() => {
      setIsProcessingPayment(false);
      setVoltCredits((prev) => prev + selectedTopUpAmount);
      setTopUpSuccess(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setTimeout(() => {
        setTopUpSuccess(false);
        setShowTopUpModal(false);
      }, 1600);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Garage & <Text style={{ color: accentColor }}>Wallet</Text>
          </Text>
          <Text style={styles.subtitle}>
            Manage electric vehicles, VoltCredits & Host mode
          </Text>
        </View>

        {/* VoltCredits Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <View>
              <Text style={styles.walletLabel}>VOLTCREDITS BALANCE</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceCurrency}>₹</Text>
                <Text style={styles.balanceAmount}>{voltCredits}</Text>
                <View style={styles.zeroFeeBadge}>
                  <Text style={styles.zeroFeeText}>0% Platform Fee</Text>
                </View>
              </View>
            </View>
            <View style={styles.walletIconCircle}>
              <Wallet size={24} color="#00F59B" />
            </View>
          </View>

          <Text style={styles.walletNote}>
            1 VoltCredit = ₹1.00 directly accepted across 10,000+ P2P hosts and public hubs in India.
          </Text>

          <View style={styles.walletButtonsRow}>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                setShowTopUpModal(true);
              }}
              style={styles.rechargeBtn}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#06090E" />
              <Text style={styles.rechargeBtnText}>Top-up via UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setAutoRecharge(!autoRecharge);
              }}
              style={[
                styles.autoRechargeBtn,
                autoRecharge && { borderColor: "rgba(0,245,155,0.4)" },
              ]}
              activeOpacity={0.8}
            >
              <RefreshCw
                size={14}
                color={autoRecharge ? "#00F59B" : "#64748B"}
              />
              <Text
                style={[
                  styles.autoRechargeText,
                  autoRecharge && { color: "#00F59B" },
                ]}
              >
                Auto {autoRecharge ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Switch to Host Mode Banner */}
        <TouchableOpacity
          onPress={handleSwitchToHost}
          activeOpacity={0.85}
          style={styles.hostBanner}
        >
          <View style={styles.hostBannerContent}>
            <View style={styles.hostIconCircle}>
              <Home size={22} color="#FFB800" />
            </View>
            <View style={styles.hostTextWrap}>
              <Text style={styles.hostTitle}>Have an idle home plug?</Text>
              <Text style={styles.hostSub}>
                Switch to Host Mode. Share your driveway and earn ₹3,500+/mo passive UPI payouts.
              </Text>
            </View>
          </View>
          <View style={styles.switchPill}>
            <Text style={styles.switchPillText}>Switch</Text>
            <ArrowUpRight size={14} color="#FFB800" />
          </View>
        </TouchableOpacity>

        {/* My EV Vehicles Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Electric Vehicles ({vehicles.length})</Text>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowAddVehicleModal(true);
            }}
            style={styles.addVehicleBtn}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#00F59B" />
            <Text style={styles.addVehicleText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {vehicles.map((v) => (
          <View key={v.id} style={styles.vehicleCard}>
            <View style={styles.vehicleTop}>
              <View style={styles.vehicleTitleWrap}>
                <Car size={20} color={v.isPrimary ? "#00F59B" : "#94A3B8"} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehiclePlate}>{v.plateNumber}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {v.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <CheckCircle2 size={12} color="#00F59B" />
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSetPrimary(v.id)}
                    style={styles.makePrimaryBtn}
                  >
                    <Star size={12} color="#94A3B8" />
                    <Text style={styles.makePrimaryText}>Set Primary</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleDeleteVehicle(v.id)}
                  style={styles.deleteVehicleBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Battery & Range Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Battery Capacity</Text>
                <Text style={styles.statValue}>{v.batteryKwh} kWh</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Current SOC</Text>
                <Text style={styles.statValueHighlight}>{v.currentSoc}%</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Est. Range</Text>
                <Text style={styles.statValue}>{v.rangeKm} km</Text>
              </View>
            </View>

            {/* Supported Connectors */}
            <View style={styles.connectorsWrap}>
              {v.connectors.map((c, i) => (
                <View key={i} style={styles.connectorPill}>
                  <Zap size={10} color="#00F59B" />
                  <Text style={styles.connectorPillText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* KYC & Identity Badge */}
        <View style={styles.kycCard}>
          <ShieldCheck size={24} color="#00F59B" />
          <View style={styles.kycTextWrap}>
            <Text style={styles.kycTitle}>Vahan & Digilocker Verified</Text>
            <Text style={styles.kycSub}>
              Your driving license and EV registration are verified for instant gated society access across India.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ===================== ADD VEHICLE MODAL ===================== */}
      <Modal
        visible={showAddVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Car size={22} color="#00F59B" />
                <Text style={styles.modalTitle}>Add Electric Vehicle</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddVehicleModal(false)}
                style={styles.closeBtn}
              >
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Preset Selector */}
              <Text style={styles.fieldLabel}>SELECT POPULAR INDIAN EV MODEL</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
              >
                {EV_PRESETS.map((preset, idx) => {
                  const isSelected = selectedPreset.name === preset.name;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        setSelectedPreset(preset);
                      }}
                      style={[
                        styles.presetChip,
                        isSelected && { borderColor: "#00F59B", backgroundColor: "rgba(0,245,155,0.15)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && { color: "#00F59B", fontWeight: "700" },
                        ]}
                      >
                        {preset.name}
                      </Text>
                      <Text style={styles.presetChipSub}>
                        {preset.batteryKwh} kWh • {preset.category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Registration Number Input */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>REGISTRATION NUMBER</Text>
              <TextInput
                value={customPlate}
                onChangeText={setCustomPlate}
                placeholder="e.g. KL-07-CS-4921"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
                style={styles.inputField}
              />

              {/* Current Battery SOC */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <Text style={styles.fieldLabel}>CURRENT BATTERY SOC</Text>
                <Text style={{ color: "#00F59B", fontWeight: "800", fontSize: 16 }}>
                  {customSoc}%
                </Text>
              </View>
              <View style={styles.socButtonsRow}>
                {[20, 50, 80, 100].map((soc) => (
                  <TouchableOpacity
                    key={soc}
                    onPress={() => setCustomSoc(soc)}
                    style={[
                      styles.socButton,
                      customSoc === soc && { backgroundColor: "#00F59B", borderColor: "#00F59B" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.socButtonText,
                        customSoc === soc && { color: "#06090E", fontWeight: "800" },
                      ]}
                    >
                      {soc}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Supported Plugs Summary */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>FACTORY CONNECTORS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {selectedPreset.connectors.map((c, i) => (
                  <View key={i} style={styles.connectorPill}>
                    <Zap size={10} color="#00F59B" />
                    <Text style={styles.connectorPillText}>{c}</Text>
                  </View>
                ))}
              </View>

              {/* Primary Toggle */}
              <TouchableOpacity
                onPress={() => setIsPrimaryNew(!isPrimaryNew)}
                style={styles.primaryToggleRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    isPrimaryNew && { backgroundColor: "#00F59B", borderColor: "#00F59B" },
                  ]}
                >
                  {isPrimaryNew && <Check size={14} color="#06090E" />}
                </View>
                <Text style={styles.primaryToggleLabel}>Set as primary vehicle for radar search</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveNewVehicle}
              style={styles.saveVehicleBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.saveVehicleBtnText}>Save Vehicle to Garage</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================== TOP-UP UPI MODAL ===================== */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!isProcessingPayment) setShowTopUpModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {topUpSuccess ? (
              <View style={styles.successStateWrap}>
                <View style={styles.successIconCircle}>
                  <Check size={36} color="#00F59B" />
                </View>
                <Text style={styles.successTitle}>Top-up Successful!</Text>
                <Text style={styles.successSub}>
                  ₹{selectedTopUpAmount} VoltCredits credited immediately to your wallet.
                </Text>
              </View>
            ) : (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CreditCard size={22} color="#00F59B" />
                    <Text style={styles.modalTitle}>Top-up VoltCredits</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowTopUpModal(false)}
                    style={styles.closeBtn}
                  >
                    <X size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Amount Selection */}
                <Text style={styles.fieldLabel}>SELECT RECHARGE AMOUNT</Text>
                <View style={styles.topUpAmountsRow}>
                  {[200, 500, 1000, 2000].map((amt) => {
                    const isSelected = selectedTopUpAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setSelectedTopUpAmount(amt);
                        }}
                        style={[
                          styles.amountCard,
                          isSelected && { borderColor: "#00F59B", backgroundColor: "rgba(0,245,155,0.12)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.amountText,
                            isSelected && { color: "#00F59B", fontWeight: "900" },
                          ]}
                        >
                          ₹{amt}
                        </Text>
                        <Text style={styles.amountSub}>+{amt} Credits</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* UPI Method Selection */}
                <Text style={[styles.fieldLabel, { marginTop: 18 }]}>PAY VIA INSTANT UPI (0% FEE)</Text>
                <View style={{ gap: 8, marginTop: 6 }}>
                  {[
                    { id: "gpay", label: "Google Pay", sub: "Instant 1-Tap UPI Intent" },
                    { id: "phonepe", label: "PhonePe", sub: "Direct UPI Auto-Routing" },
                    { id: "paytm", label: "Paytm UPI", sub: "BHIM / UPI ID verification" },
                  ].map((app) => {
                    const isSelected = selectedUpiApp === app.id;
                    return (
                      <TouchableOpacity
                        key={app.id}
                        onPress={() => setSelectedUpiApp(app.id)}
                        style={[
                          styles.upiOption,
                          isSelected && { borderColor: "rgba(0,245,155,0.4)", backgroundColor: "#06090E" },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Smartphone size={18} color={isSelected ? "#00F59B" : "#94A3B8"} />
                          <View>
                            <Text style={styles.upiLabel}>{app.label}</Text>
                            <Text style={styles.upiSub}>{app.sub}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && { borderColor: "#00F59B", backgroundColor: "#00F59B" },
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Summary Info */}
                <View style={styles.topUpSummaryCard}>
                  <Text style={styles.topUpSummaryText}>
                    ⚡ 1 VoltCredit = ₹1.00 directly accepted at all P2P host driveways with zero transaction charges.
                  </Text>
                </View>

                {/* Proceed Button */}
                <TouchableOpacity
                  onPress={handleExecuteTopUp}
                  disabled={isProcessingPayment}
                  style={[styles.saveVehicleBtn, isProcessingPayment && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveVehicleBtnText}>
                    {isProcessingPayment ? "Connecting to UPI..." : `Proceed to Pay ₹${selectedTopUpAmount}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.25)",
    padding: 20,
    marginBottom: 16,
  },
  walletTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    gap: 4,
  },
  balanceCurrency: {
    fontSize: 22,
    fontWeight: "800",
    color: "#00F59B",
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  zeroFeeBadge: {
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  zeroFeeText: {
    color: "#00F59B",
    fontSize: 11,
    fontWeight: "700",
  },
  walletIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,245,155,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.2)",
  },
  walletNote: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
    marginVertical: 14,
  },
  walletButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rechargeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 12,
    gap: 6,
  },
  rechargeBtnText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 13,
  },
  autoRechargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  autoRechargeText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
  },
  hostBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,184,0,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.3)",
    padding: 16,
    marginBottom: 24,
  },
  hostBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  hostIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,184,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hostTextWrap: {
    flex: 1,
  },
  hostTitle: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 14,
  },
  hostSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  switchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,184,0,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.4)",
  },
  switchPillText: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addVehicleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,245,155,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
    gap: 4,
  },
  addVehicleText: {
    color: "#00F59B",
    fontWeight: "700",
    fontSize: 12,
  },
  vehicleCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 12,
  },
  vehicleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  vehiclePlate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  primaryBadgeText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "700",
  },
  makePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  makePrimaryText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  deleteVehicleBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#06090E",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  statCol: {},
  statLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  statValueHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#00F59B",
    marginTop: 2,
  },
  connectorsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  connectorPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  connectorPillText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  kycCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0,245,155,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.2)",
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  kycTextWrap: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00F59B",
    marginBottom: 2,
  },
  kycSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1622",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  presetChip: {
    backgroundColor: "#06090E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  presetChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  presetChipSub: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },
  inputField: {
    backgroundColor: "#06090E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  socButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  socButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  socButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryToggleLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  saveVehicleBtn: {
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  saveVehicleBtnText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 14,
  },

  /* Top Up Modal */
  topUpAmountsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  amountCard: {
    flex: 1,
    backgroundColor: "#06090E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    alignItems: "center",
  },
  amountText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  amountSub: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 2,
  },
  upiOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1622",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  upiLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  upiSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#06090E",
  },
  topUpSummaryCard: {
    backgroundColor: "rgba(0,245,155,0.06)",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.15)",
  },
  topUpSummaryText: {
    color: "#00F59B",
    fontSize: 11,
    lineHeight: 16,
  },
  successStateWrap: {
    alignItems: "center",
    paddingVertical: 30,
  },
  successIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,245,155,0.15)",
    borderWidth: 2,
    borderColor: "#00F59B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  successSub: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
});
