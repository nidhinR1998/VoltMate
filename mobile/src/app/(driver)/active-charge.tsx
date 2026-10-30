import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  ArrowLeft,
  Zap,
  Pause,
  Play,
  Square,
  Clock,
  Check,
  ShieldCheck,
  MapPin,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../store/useAuthStore";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";

export default function ActiveChargeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stationName?: string;
    connectorName?: string;
    slotLabel?: string;
    powerKw?: string;
    priceLabel?: string;
  }>();

  const {
    vehicles,
    selectedVehicleId,
    activeSession,
    bookings,
    activeBookingId,
    completeChargingSession,
  } = useAuthStore();
  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const fallbackBooking = bookings.find((b) => b.id === activeBookingId) || bookings[0];

  const stationName =
    params.stationName ||
    activeSession?.stationName ||
    fallbackBooking?.stationName ||
    "Pall Mall Station";
  const connectorName =
    params.connectorName ||
    activeSession?.connectorName ||
    fallbackBooking?.connectorName ||
    "CHAdeMO";
  const slotLabel =
    params.slotLabel ||
    activeSession?.slotLabel ||
    fallbackBooking?.slotLabel ||
    "Slot B";
  const nominalPowerKw = parseFloat(
    params.powerKw ||
      String(activeSession?.powerKw || fallbackBooking?.powerKw || "50.0")
  );
  const pricePerKwh =
    activeSession?.pricePerKwh || fallbackBooking?.pricePerKwh || 0.5;

  const [isPaused, setIsPaused] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState<number>(
    activeVehicle?.batteryPercent || 72
  );
  const [deliveredKwh, setDeliveredKwh] = useState<number>(14.6);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(1120); // 18m 40s
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setDeliveredKwh((prev) => +(prev + 0.03).toFixed(2));
      setBatteryPercent((prev) => {
        const next = prev < 99 ? +(prev + 0.08).toFixed(1) : 100;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentPowerKw = isPaused
    ? 0.0
    : batteryPercent >= 85
    ? +(nominalPowerKw * 0.48).toFixed(1)
    : nominalPowerKw;

  const remainingMins = Math.max(
    2,
    Math.round(((100 - batteryPercent) * 0.65 * 60) / Math.max(7, nominalPowerKw))
  );
  const currentCost = +(deliveredKwh * pricePerKwh).toFixed(2);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}m ${String(remSecs).padStart(2, "0")}s`;
  };

  const handleStopSession = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsPaused(true);
    completeChargingSession({
      finalBatteryPercent: Math.round(batteryPercent),
      deliveredKwh: +deliveredKwh.toFixed(2),
      durationFormatted: formatDuration(elapsedSeconds),
      totalCost: currentCost,
    });
    setShowReceiptModal(true);
  };

  // SVG Ring Parameters
  const size = 236;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    circumference - (Math.min(100, batteryPercent) / 100) * circumference;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#151C18" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.livePill}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isPaused ? "#F59E0B" : "#05E660" },
              ]}
            />
            <Text style={styles.livePillText}>
              {isPaused ? "SESSION PAUSED" : "CHARGING ACTIVE"}
            </Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Vehicle & Station Summary */}
        <View style={styles.stationHeaderBlock}>
          <Text style={styles.vehicleTitle}>
            {activeVehicle.brand} {activeVehicle.model}
          </Text>
          <View style={styles.stationSubRow}>
            <MapPin size={13} color="#757F7A" />
            <Text style={styles.stationSubText}>
              {stationName} • {connectorName} ({slotLabel})
            </Text>
          </View>
        </View>

        {/* ===================== ANIMATED CIRCULAR CHARGING GAUGE ===================== */}
        <View style={styles.gaugeWrapper}>
          <View style={styles.gaugeCard}>
            <Svg width={size} height={size}>
              <Defs>
                <LinearGradient id="chargeRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#05E660" />
                  <Stop offset="100%" stopColor="#00C853" />
                </LinearGradient>
              </Defs>

              {/* Background Track Ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#E8ECEA"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Animated Electric Green Progress Arc */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#chargeRingGrad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={progressOffset}
                fill="none"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>

            {/* Center Telemetry Display */}
            <View style={styles.gaugeCenterContent}>
              <View style={styles.boltCircle}>
                <Zap size={20} color="#05E660" fill="#05E660" />
              </View>
              <Text style={styles.socValueText}>
                {Math.round(batteryPercent)}%
              </Text>
              <Text style={styles.socSubLabel}>
                {remainingMins} mins remaining
              </Text>
            </View>
          </View>
        </View>

        {/* ===================== 4-CARD TELEMETRY GRID ===================== */}
        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>Energy Delivered</Text>
            <View style={styles.telemetryValueRow}>
              <Text style={styles.telemetryNumber}>
                {deliveredKwh.toFixed(1)}
              </Text>
              <Text style={styles.telemetryUnit}> kWh</Text>
            </View>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>Charging Power</Text>
            <View style={styles.telemetryValueRow}>
              <Text style={styles.telemetryNumber}>{currentPowerKw}</Text>
              <Text style={styles.telemetryUnit}> kW</Text>
            </View>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>Session Duration</Text>
            <Text style={styles.telemetryTimeText}>
              {formatDuration(elapsedSeconds)}
            </Text>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>Current Cost</Text>
            <View style={styles.telemetryValueRow}>
              <Text style={styles.telemetryNumber}>${currentCost}</Text>
            </View>
          </View>
        </View>

        {/* Connected Port Card */}
        <View style={styles.connectedPortCard}>
          <ConnectorPlugIllustration variant={connectorName} size={46} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.portCardTitle}>
              {connectorName} • {slotLabel}
            </Text>
            <Text style={styles.portCardSub}>
              Smart Relay Locked • Auto-cutoff at 100%
            </Text>
          </View>
          <ShieldCheck size={20} color="#05E660" />
        </View>

        {/* ===================== SESSION CONTROL BUTTONS ===================== */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsPaused(!isPaused);
            }}
            activeOpacity={0.85}
            style={styles.pauseBtn}
          >
            {isPaused ? (
              <Play size={17} color="#151C18" fill="#151C18" />
            ) : (
              <Pause size={17} color="#151C18" />
            )}
            <Text style={styles.pauseBtnText}>
              {isPaused ? "Resume" : "Pause"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStopSession}
            activeOpacity={0.88}
            style={styles.stopPrimaryBtn}
          >
            <Square size={16} color="#151C18" fill="#151C18" />
            <Text style={styles.stopPrimaryText}>Stop Charging</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===================== SESSION COMPLETED RECEIPT MODAL ===================== */}
      <Modal
        visible={showReceiptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.receiptIconCircle}>
              <Check size={28} color="#151C18" strokeWidth={2.6} />
            </View>
            <Text style={styles.receiptTitle}>Charging Complete</Text>
            <Text style={styles.receiptSub}>
              {stationName} • {connectorName} ({slotLabel})
            </Text>

            <View style={styles.receiptBreakdownCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Energy Delivered</Text>
                <Text style={styles.receiptRowValue}>
                  {deliveredKwh.toFixed(2)} kWh
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Final Battery Level</Text>
                <Text style={styles.receiptRowValue}>
                  {Math.round(batteryPercent)}%
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Session Duration</Text>
                <Text style={styles.receiptRowValue}>
                  {formatDuration(elapsedSeconds)}
                </Text>
              </View>
              <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.receiptTotalLabel}>Total Settled</Text>
                <Text style={styles.receiptTotalValue}>${currentCost}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowReceiptModal(false);
                router.replace("/(driver)/home");
              }}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Back to Home Dashboard</Text>
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
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 10 : 18,
    paddingBottom: 42,
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
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 7,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  livePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#151C18",
    letterSpacing: 0.5,
  },
  stationHeaderBlock: {
    alignItems: "center",
    marginBottom: 18,
  },
  vehicleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111714",
  },
  stationSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  stationSubText: {
    fontSize: 13,
    color: "#757F7A",
  },
  gaugeWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  gaugeCard: {
    width: 268,
    height: 268,
    borderRadius: 134,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 5,
    position: "relative",
  },
  gaugeCenterContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  boltCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  socValueText: {
    fontSize: 42,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -1,
  },
  socSubLabel: {
    fontSize: 12,
    color: "#757F7A",
    fontWeight: "500",
    marginTop: 2,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  telemetryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  telemetryLabel: {
    fontSize: 12,
    color: "#757F7A",
    fontWeight: "500",
    marginBottom: 6,
  },
  telemetryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  telemetryNumber: {
    fontSize: 26,
    fontWeight: "600",
    color: "#111714",
  },
  telemetryUnit: {
    fontSize: 14,
    color: "#757F7A",
    fontWeight: "500",
  },
  telemetryTimeText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111714",
    marginTop: 2,
  },
  connectedPortCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 22,
  },
  portCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  portCardSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#151C18",
    gap: 8,
  },
  pauseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  stopPrimaryBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    gap: 8,
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  stopPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
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
  receiptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111714",
    textAlign: "center",
  },
  receiptSub: {
    fontSize: 13,
    color: "#757F7A",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  receiptBreakdownCard: {
    backgroundColor: "#F7F9F8",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEA",
  },
  receiptRowLabel: {
    fontSize: 13,
    color: "#757F7A",
  },
  receiptRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111714",
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  receiptTotalValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#05E660",
  },
  doneBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#151C18",
  },
});
