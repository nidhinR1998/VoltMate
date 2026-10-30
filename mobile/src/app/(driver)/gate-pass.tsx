import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Rect, Path, G } from "react-native-svg";
import {
  ArrowLeft,
  ShieldCheck,
  Phone,
  Navigation,
  Camera,
  CheckCircle2,
  Copy,
  Zap,
  MapPin,
  Clock,
  X,
  ScanLine,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useSessionStore } from "../../store/useSessionStore";

const { width } = Dimensions.get("window");

// Vector QR Code Generator for security gate scanning
const SocietyQrCode: React.FC<{ size?: number }> = ({ size = 180 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Rect width="100" height="100" fill="#FFFFFF" rx="8" />
    {/* QR Corner Markers */}
    <Rect x="8" y="8" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="12" y="12" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="16" y="16" width="10" height="10" fill="#000000" rx="2" />

    <Rect x="66" y="8" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="70" y="12" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="74" y="16" width="10" height="10" fill="#000000" rx="2" />

    <Rect x="8" y="66" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="12" y="70" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="16" y="74" width="10" height="10" fill="#000000" rx="2" />

    {/* QR Data Grid Matrix */}
    <Rect x="40" y="12" width="6" height="6" fill="#000000" />
    <Rect x="50" y="12" width="6" height="6" fill="#000000" />
    <Rect x="40" y="24" width="6" height="6" fill="#000000" />
    <Rect x="50" y="24" width="10" height="6" fill="#000000" />
    <Rect x="12" y="42" width="8" height="6" fill="#000000" />
    <Rect x="26" y="42" width="6" height="6" fill="#000000" />
    <Rect x="38" y="42" width="24" height="6" fill="#000000" />
    <Rect x="68" y="42" width="6" height="6" fill="#000000" />
    <Rect x="80" y="42" width="8" height="6" fill="#000000" />
    <Rect x="44" y="54" width="12" height="6" fill="#000000" />
    <Rect x="62" y="54" width="8" height="6" fill="#000000" />
    <Rect x="40" y="66" width="6" height="12" fill="#000000" />
    <Rect x="52" y="66" width="8" height="6" fill="#000000" />
    <Rect x="66" y="66" width="10" height="6" fill="#000000" />
    <Rect x="82" y="66" width="6" height="12" fill="#000000" />
    <Rect x="52" y="78" width="14" height="6" fill="#000000" />
    <Rect x="72" y="78" width="8" height="6" fill="#000000" />
  </Svg>
);

export default function GatePassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { startSession } = useSessionStore();

  const stationTitle = (params.stationTitle as string) || "Lotus Greens Villa 15A Socket";
  const society = (params.society as string) || "Tranquil Towers, Kakkanad — Basement Bay B-14";
  const gateCode = (params.gateCode as string) || "#849-201";
  const hostPhone = "+91 98460 12345";

  const [showOcrModal, setShowOcrModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleCallHost = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Linking.openURL(`tel:${hostPhone}`).catch(() => {});
  };

  const handleOpenMaps = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const url = "https://www.google.com/maps/search/?api=1&query=Kakkanad+Kochi";
    Linking.openURL(url).catch(() => {});
  };

  const handleStartChargingFlow = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setShowOcrModal(true);
  };

  const handleConfirmMeterReading = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowOcrModal(false);

      // Start the live charging session in state
      startSession({
        bookingId: "VM-ACT-9901",
        hostName: "Arun Kumar (Verified Host)",
        hostPhone: "+91 98460 12345",
        vehicleModel: "Tata Nexon EV Max",
        batteryCapacityKwh: 40.5,
        initialSoc: 42.0,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Push to active charge screen
      router.push("/(driver)/active-charge");
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Society Gate Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main High-Contrast Gate Pass Card */}
        <View style={styles.passCard}>
          {/* Card Top Pill */}
          <View style={styles.passTopRow}>
            <View style={styles.approvedPill}>
              <CheckCircle2 size={12} color="#00F59B" />
              <Text style={styles.approvedText}>MYGATE PRE-APPROVED</Text>
            </View>
            <Text style={styles.passExpiry}>Valid for next 45 mins</Text>
          </View>

          {/* Location & Host */}
          <Text style={styles.passTitle}>{stationTitle}</Text>
          <View style={styles.locationRow}>
            <MapPin size={13} color="#64748B" />
            <Text style={styles.locationText}>{society}</Text>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrWrapper}>
            <SocietyQrCode size={190} />
            <Text style={styles.qrHelper}>Show QR Code to Society Security Camera</Text>
          </View>

          {/* 6-Digit Gate Code */}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>OR TELL GUARD ENTRY CODE</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{gateCode}</Text>
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  Alert.alert("Code Copied", `${gateCode} copied to clipboard.`);
                }}
                style={styles.copyBtn}
              >
                <Copy size={16} color="#00F59B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.vehiclePlateTag}>
              Registered to Plate: <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>KL-07-CS-4921</Text>
            </Text>
          </View>

          {/* Contact Host & Navigate Quick Row */}
          <View style={styles.quickContactRow}>
            <TouchableOpacity onPress={handleCallHost} style={styles.contactBtn}>
              <Phone size={15} color="#00F59B" />
              <Text style={styles.contactBtnText}>Call Host (Masked)</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleOpenMaps} style={styles.contactBtn}>
              <Navigation size={15} color="#00E5FF" />
              <Text style={[styles.contactBtnText, { color: "#00E5FF" }]}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Big Action Button */}
        <TouchableOpacity
          onPress={handleStartChargingFlow}
          activeOpacity={0.85}
          style={styles.startChargeBtn}
        >
          <Zap size={20} color="#06090E" />
          <Text style={styles.startChargeBtnText}>
            Arrived at Plug → Scan Meter & Start
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Meter Reading Scanner Modal */}
      <Modal visible={showOcrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Smart Meter Check-In</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Take a photo of the host's DISCOM digital sub-meter before plugging in to verify starting energy reading.
            </Text>

            <View style={styles.viewfinder}>
              <ScanLine size={48} color="#00F59B" />
              <Text style={styles.viewfinderText}>
                Align KSEB Digital kWh Display within frame
              </Text>
              <View style={styles.simulatedMeterBox}>
                <Text style={styles.simulatedMeterLabel}>SIMULATED METER OCR</Text>
                <Text style={styles.simulatedMeterValue}>01482.4 kWh</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleConfirmMeterReading}
              disabled={isScanning}
              style={styles.confirmMeterBtn}
            >
              {isScanning ? (
                <ActivityIndicator color="#06090E" />
              ) : (
                <Text style={styles.confirmMeterBtnText}>
                  Confirm 1482.4 kWh & Energize Plug
                </Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F1622",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  passCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0, 245, 155, 0.3)",
    padding: 20,
    marginBottom: 20,
  },
  passTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  approvedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  approvedText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  passExpiry: {
    fontSize: 11,
    color: "#94A3B8",
  },
  passTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  qrWrapper: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  qrHelper: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 12,
    textAlign: "center",
  },
  codeBox: {
    backgroundColor: "#06090E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 16,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  codeText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#00F59B",
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    padding: 6,
    borderRadius: 8,
  },
  vehiclePlateTag: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  quickContactRow: {
    flexDirection: "row",
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6,
  },
  contactBtnText: {
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "700",
  },
  startChargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 18,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startChargeBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1622",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
    marginBottom: 16,
  },
  viewfinder: {
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
    marginTop: 8,
    textAlign: "center",
  },
  simulatedMeterBox: {
    backgroundColor: "#0F1622",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  simulatedMeterLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
  },
  simulatedMeterValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00F59B",
    letterSpacing: 1,
  },
  confirmMeterBtn: {
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmMeterBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
});
