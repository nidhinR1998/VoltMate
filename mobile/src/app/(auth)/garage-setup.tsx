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
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Car,
  Bike,
  ShieldCheck,
  Check,
  Camera,
  Zap,
  Sparkles,
  ArrowRight,
  Home,
  CheckCircle2,
  Sliders,
  X,
  ScanLine,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../store/useAuthStore";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

interface VehicleOption {
  id: string;
  category: "2W" | "4W";
  make: string;
  model: string;
  batteryKwh: number;
  maxAcKw: number;
  connectorBadges: { label: string; icon: string; color: string }[];
}

const INDIAN_EVS: VehicleOption[] = [
  // 4-Wheelers
  {
    id: "nexon",
    category: "4W",
    make: "Tata",
    model: "Nexon EV Max / 45",
    batteryKwh: 40.5,
    maxAcKw: 7.2,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 AC", icon: "⚡", color: "#00E5FF" },
      { label: "CCS2 DC", icon: "🚀", color: "#3B82F6" },
    ],
  },
  {
    id: "punch",
    category: "4W",
    make: "Tata",
    model: "Punch EV Long Range",
    batteryKwh: 35.0,
    maxAcKw: 7.2,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 AC", icon: "⚡", color: "#00E5FF" },
      { label: "CCS2 DC", icon: "🚀", color: "#3B82F6" },
    ],
  },
  {
    id: "curvv",
    category: "4W",
    make: "Tata",
    model: "Curvv EV (55 kWh)",
    batteryKwh: 55.0,
    maxAcKw: 7.2,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 AC", icon: "⚡", color: "#00E5FF" },
      { label: "CCS2 DC", icon: "🚀", color: "#3B82F6" },
    ],
  },
  {
    id: "windsor",
    category: "4W",
    make: "MG",
    model: "Windsor EV",
    batteryKwh: 38.0,
    maxAcKw: 7.4,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 AC", icon: "⚡", color: "#00E5FF" },
      { label: "CCS2 DC", icon: "🚀", color: "#3B82F6" },
    ],
  },
  {
    id: "be6e",
    category: "4W",
    make: "Mahindra",
    model: "BE 6e Electric SUV",
    batteryKwh: 59.0,
    maxAcKw: 11.0,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 AC", icon: "⚡", color: "#00E5FF" },
      { label: "CCS2 DC", icon: "🚀", color: "#3B82F6" },
    ],
  },
  // 2-Wheelers
  {
    id: "ather450x",
    category: "2W",
    make: "Ather",
    model: "450X Gen 3 / Apex",
    batteryKwh: 3.7,
    maxAcKw: 3.3,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Ather Dot", icon: "⚡", color: "#00E5FF" },
    ],
  },
  {
    id: "olas1pro",
    category: "2W",
    make: "Ola Electric",
    model: "S1 Pro Gen 2",
    batteryKwh: 4.0,
    maxAcKw: 3.3,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Hypercharger", icon: "⚡", color: "#00E5FF" },
    ],
  },
  {
    id: "tvseqube",
    category: "2W",
    make: "TVS",
    model: "iQube ST (5.1 kWh)",
    batteryKwh: 5.1,
    maxAcKw: 3.3,
    connectorBadges: [
      { label: "15A 3-Pin", icon: "🔌", color: "#00F59B" },
      { label: "Type-2 Adapter", icon: "⚡", color: "#00E5FF" },
    ],
  },
  {
    id: "chetak",
    category: "2W",
    make: "Bajaj",
    model: "Chetak 3201 Special",
    batteryKwh: 3.2,
    maxAcKw: 3.3,
    connectorBadges: [{ label: "15A 3-Pin", icon: "🔌", color: "#00F59B" }],
  },
];

export default function GarageSetupScreen() {
  const router = useRouter();
  const { setMode } = useModeStore();

  // Roles: "DRIVER" | "HOST" | "BOTH"
  const [selectedRole, setSelectedRole] = useState<"DRIVER" | "HOST" | "BOTH">("DRIVER");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // for "BOTH" mode

  // Vehicle Selection State
  const [selectedCategory, setSelectedCategory] = useState<"4W" | "2W">("4W");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption>(INDIAN_EVS[0]);
  const [rcNumber, setRcNumber] = useState("KL-07-CS-4921");
  const [isRcVerified, setIsRcVerified] = useState(true);

  // Host Setup State
  const [plugType, setPlugType] = useState<"15A" | "7.4kW">("15A");
  const [discom, setDiscom] = useState("KSEB (Kerala)");
  const [locality, setLocality] = useState("Kakkanad, Kochi");
  const [tariffInr, setTariffInr] = useState("8.50");

  // Camera / OCR Modal
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filteredVehicles = INDIAN_EVS.filter((v) => v.category === selectedCategory);

  const handleSimulateOcr = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setRcNumber("KL-07-EA-8819");
      setIsRcVerified(true);
      setShowOcrModal(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert(
        "Vahan RC Verified!",
        "Extracted: Tata Nexon EV Max (KL-07-EA-8819)\nClass: Battery Electric Vehicle (Zero Emission)\nDigilocker Status: Verified"
      );
    }, 1500);
  };

  const handleCompleteSetup = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (selectedRole === "HOST") {
      setMode("HOST");
      router.replace("/(host)/dashboard");
    } else {
      setMode("DRIVER");
      router.replace("/(driver)/map-radar");
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
          <Text style={styles.title}>
            Welcome to <Text style={{ color: "#00F59B" }}>VoltMate</Text>
          </Text>
          <Text style={styles.subtitle}>
            Customize your experience: drive, host an idle plug, or both
          </Text>
        </View>

        {/* Role Selector Cards */}
        <View style={styles.roleGrid}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedRole("DRIVER");
            }}
            style={[
              styles.roleCard,
              selectedRole === "DRIVER" && styles.roleCardActiveDriver,
            ]}
          >
            <Car
              size={24}
              color={selectedRole === "DRIVER" ? "#00F59B" : "#64748B"}
            />
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === "DRIVER" && { color: "#FFFFFF" },
              ]}
            >
              I Drive an EV
            </Text>
            <Text style={styles.roleCardSub}>Find & book community plugs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedRole("HOST");
            }}
            style={[
              styles.roleCard,
              selectedRole === "HOST" && styles.roleCardActiveHost,
            ]}
          >
            <Home
              size={24}
              color={selectedRole === "HOST" ? "#FFB800" : "#64748B"}
            />
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === "HOST" && { color: "#FFFFFF" },
              ]}
            >
              I Host a Plug
            </Text>
            <Text style={styles.roleCardSub}>Earn from idle socket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedRole("BOTH");
            }}
            style={[
              styles.roleCard,
              selectedRole === "BOTH" && styles.roleCardActiveBoth,
            ]}
          >
            <Sparkles
              size={24}
              color={selectedRole === "BOTH" ? "#00E5FF" : "#64748B"}
            />
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === "BOTH" && { color: "#FFFFFF" },
              ]}
            >
              Both
            </Text>
            <Text style={styles.roleCardSub}>Driver + Home Host</Text>
          </TouchableOpacity>
        </View>

        {/* Both Mode: Step Indicator */}
        {selectedRole === "BOTH" && (
          <View style={styles.stepIndicatorRow}>
            <TouchableOpacity
              onPress={() => setCurrentStep(1)}
              style={[styles.stepPill, currentStep === 1 && styles.stepPillActive]}
            >
              <Text
                style={[
                  styles.stepPillText,
                  currentStep === 1 && { color: "#00F59B", fontWeight: "700" },
                ]}
              >
                1. Your EV Car
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrentStep(2)}
              style={[styles.stepPill, currentStep === 2 && styles.stepPillActive]}
            >
              <Text
                style={[
                  styles.stepPillText,
                  currentStep === 2 && { color: "#FFB800", fontWeight: "700" },
                ]}
              >
                2. Your Home Plug
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION A: EV DRIVER SETUP (Shown if DRIVER or BOTH Step 1) */}
        {(selectedRole === "DRIVER" || (selectedRole === "BOTH" && currentStep === 1)) && (
          <View style={styles.sectionWrap}>
            {/* Category Filter Tabs: 4W vs 2W */}
            <View style={styles.categoryToggle}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory("4W");
                  const first4w = INDIAN_EVS.find((v) => v.category === "4W");
                  if (first4w) setSelectedVehicle(first4w);
                }}
                style={[
                  styles.categoryTab,
                  selectedCategory === "4W" && styles.categoryTabActive,
                ]}
              >
                <Car size={16} color={selectedCategory === "4W" ? "#00F59B" : "#64748B"} />
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === "4W" && { color: "#00F59B", fontWeight: "700" },
                  ]}
                >
                  4-Wheelers (Cars/SUVs)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory("2W");
                  const first2w = INDIAN_EVS.find((v) => v.category === "2W");
                  if (first2w) setSelectedVehicle(first2w);
                }}
                style={[
                  styles.categoryTab,
                  selectedCategory === "2W" && styles.categoryTabActive,
                ]}
              >
                <Bike size={16} color={selectedCategory === "2W" ? "#00F59B" : "#64748B"} />
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === "2W" && { color: "#00F59B", fontWeight: "700" },
                  ]}
                >
                  2-Wheelers (Scooters)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle Selection List */}
            <Text style={styles.subheading}>Select Your Primary Vehicle</Text>
            <View style={styles.vehicleList}>
              {filteredVehicles.map((v) => {
                const isSelected = selectedVehicle.id === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedVehicle(v);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.vehicleCard,
                      isSelected && styles.vehicleCardSelected,
                    ]}
                  >
                    <View style={styles.vehicleCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleMake}>{v.make}</Text>
                        <Text style={styles.vehicleModel}>{v.model}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkIconSelected}>
                          <Check size={14} color="#06090E" strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={styles.checkIconUnselected} />
                      )}
                    </View>

                    {/* Specs */}
                    <Text style={styles.vehicleSpecs}>
                      {v.batteryKwh} kWh Battery • {v.maxAcKw} kW Max AC
                    </Text>

                    {/* Connector Badges (Human-Readable) */}
                    <View style={styles.badgesRow}>
                      {v.connectorBadges.map((badge, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.connectorBadge,
                            { borderColor: `${badge.color}50`, backgroundColor: `${badge.color}15` },
                          ]}
                        >
                          <Text style={{ fontSize: 11, marginRight: 3 }}>{badge.icon}</Text>
                          <Text style={[styles.connectorBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* RC Registration & Camera Scanner Box */}
            <View style={styles.rcBox}>
              <View style={styles.rcHeaderRow}>
                <View>
                  <Text style={styles.rcLabel}>VAHAN RC NUMBER</Text>
                  <TextInput
                    value={rcNumber}
                    onChangeText={setRcNumber}
                    placeholder="KL-07-XX-0000"
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    style={styles.rcInput}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setShowOcrModal(true)}
                  style={styles.scanBtn}
                >
                  <Camera size={16} color="#00F59B" />
                  <Text style={styles.scanBtnText}>Scan RC</Text>
                </TouchableOpacity>
              </View>

              {isRcVerified && (
                <View style={styles.verifiedRow}>
                  <ShieldCheck size={14} color="#00F59B" />
                  <Text style={styles.verifiedText}>
                    ✔ Vahan RC Verified — Electric Vehicle
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* SECTION B: HOST PLUG SETUP (Shown if HOST or BOTH Step 2) */}
        {(selectedRole === "HOST" || (selectedRole === "BOTH" && currentStep === 2)) && (
          <View style={styles.sectionWrap}>
            <Text style={styles.subheading}>Host Charging Plug Setup</Text>

            {/* Socket Type Selector */}
            <View style={styles.hostFormCard}>
              <Text style={styles.formLabel}>Select Socket / Charger Type</Text>
              <View style={styles.socketTypeRow}>
                <TouchableOpacity
                  onPress={() => setPlugType("15A")}
                  style={[
                    styles.socketOption,
                    plugType === "15A" && styles.socketOptionActive,
                  ]}
                >
                  <Text style={styles.socketIcon}>🔌</Text>
                  <Text style={styles.socketTitle}>15A Domestic Plug</Text>
                  <Text style={styles.socketSub}>3.3 kW • 3-Pin Socket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPlugType("7.4kW")}
                  style={[
                    styles.socketOption,
                    plugType === "7.4kW" && styles.socketOptionActive,
                  ]}
                >
                  <Text style={styles.socketIcon}>⚡</Text>
                  <Text style={styles.socketTitle}>7.4kW Wallbox</Text>
                  <Text style={styles.socketSub}>Type-2 Fast AC</Text>
                </TouchableOpacity>
              </View>

              {/* State DISCOM */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>State Electricity Utility (DISCOM)</Text>
                <View style={styles.inputWrapper}>
                  <Zap size={16} color="#FFB800" />
                  <TextInput
                    value={discom}
                    onChangeText={setDiscom}
                    style={styles.formInput}
                  />
                </View>
              </View>

              {/* Locality */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Home Locality & Society</Text>
                <View style={styles.inputWrapper}>
                  <Home size={16} color="#FFB800" />
                  <TextInput
                    value={locality}
                    onChangeText={setLocality}
                    style={styles.formInput}
                  />
                </View>
              </View>

              {/* Tariff Per Unit */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Energy Rate (₹/kWh)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    value={tariffInr}
                    onChangeText={setTariffInr}
                    keyboardType="numeric"
                    style={styles.formInput}
                  />
                  <Text style={styles.rateSuffix}>per unit</Text>
                </View>
                <Text style={styles.rateHelper}>
                  Recommended: ₹8.50 - ₹10.00/kWh for KSEB domestic slab
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Finish Button */}
        {selectedRole === "BOTH" && currentStep === 1 ? (
          <TouchableOpacity
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.85}
            style={styles.nextStepBtn}
          >
            <Text style={styles.nextStepBtnText}>Continue to Home Plug Setup</Text>
            <ArrowRight size={18} color="#06090E" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleCompleteSetup}
            activeOpacity={0.85}
            style={styles.finishBtn}
          >
            <Text style={styles.finishBtnText}>
              {selectedRole === "HOST"
                ? "Activate Host Plug & Enter Dashboard"
                : "Complete Garage Setup & Start Driving"}
            </Text>
            <ArrowRight size={18} color="#06090E" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* OCR Scanner Modal */}
      <Modal
        visible={showOcrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOcrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan RC Card / Dashboard</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Viewfinder box */}
            <View style={styles.viewfinder}>
              <ScanLine size={48} color="#00F59B" />
              <Text style={styles.viewfinderText}>
                Align vehicle registration plate or RC card within frame
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSimulateOcr}
              disabled={isScanning}
              style={styles.captureBtn}
            >
              {isScanning ? (
                <ActivityIndicator color="#06090E" />
              ) : (
                <Text style={styles.captureBtnText}>Scan with AI OCR</Text>
              )}
            </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#0F1622",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  roleCardActiveDriver: {
    borderColor: "#00F59B",
    backgroundColor: "rgba(0, 245, 155, 0.1)",
  },
  roleCardActiveHost: {
    borderColor: "#FFB800",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
  },
  roleCardActiveBoth: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(0, 229, 255, 0.1)",
  },
  roleCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  roleCardSub: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },
  stepIndicatorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  stepPill: {
    flex: 1,
    backgroundColor: "#0F1622",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  stepPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  stepPillText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  sectionWrap: {
    marginBottom: 24,
  },
  categoryToggle: {
    flexDirection: "row",
    backgroundColor: "#0F1622",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  categoryTabText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  subheading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  vehicleList: {
    gap: 10,
    marginBottom: 16,
  },
  vehicleCard: {
    backgroundColor: "#0F1622",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  vehicleCardSelected: {
    borderColor: "#00F59B",
    backgroundColor: "rgba(0, 245, 155, 0.05)",
  },
  vehicleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vehicleMake: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  vehicleModel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  checkIconSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#00F59B",
    alignItems: "center",
    justifyContent: "center",
  },
  checkIconUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  vehicleSpecs: {
    fontSize: 12,
    color: "#94A3B8",
    marginVertical: 8,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  connectorBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  connectorBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rcBox: {
    backgroundColor: "#0F1622",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  rcHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rcLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rcInput: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    padding: 0,
    marginTop: 2,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
    gap: 6,
  },
  scanBtnText: {
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "700",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  verifiedText: {
    fontSize: 12,
    color: "#00F59B",
    fontWeight: "700",
  },
  hostFormCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  formLabel: {
    fontSize: 12,
    color: "#CBD5E1",
    fontWeight: "600",
    marginBottom: 8,
  },
  socketTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  socketOption: {
    flex: 1,
    backgroundColor: "#06090E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  socketOptionActive: {
    borderColor: "#FFB800",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
  },
  socketIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  socketTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  socketSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
  },
  formInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    padding: 0,
  },
  currencyPrefix: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 15,
  },
  rateSuffix: {
    color: "#64748B",
    fontSize: 11,
  },
  rateHelper: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  nextStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00E5FF",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  nextStepBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  finishBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1622",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  viewfinder: {
    height: 180,
    backgroundColor: "#06090E",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(0, 245, 155, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginBottom: 20,
  },
  viewfinderText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  captureBtn: {
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  captureBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
});
