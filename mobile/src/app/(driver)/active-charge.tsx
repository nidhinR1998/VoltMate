import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import {
  Zap,
  ShieldCheck,
  Phone,
  MessageSquare,
  AlertOctagon,
  CheckCircle2,
  Star,
  Clock,
  BatteryCharging,
  ArrowRight,
  ArrowLeft,
  X,
  Receipt,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { useSessionStore } from "../../store/useSessionStore";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

export default function ActiveChargeScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const {
    hostName,
    vehicleModel,
    telemetry,
    updateTelemetry,
    endSession,
  } = useSessionStore();

  const [soc, setSoc] = useState(42);
  const [elapsedSecs, setElapsedSecs] = useState(862); // 14 mins 22 secs
  const [voltage, setVoltage] = useState(231.4);
  const [current, setCurrent] = useState(14.2);
  const [powerKw, setPowerKw] = useState(3.28);
  const [deliveredKwh, setDeliveredKwh] = useState(2.16);
  const [liveCost, setLiveCost] = useState(18.40);

  // Post Charge Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [rating, setRating] = useState(5);

  // Live Telemetry Simulation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs((prev) => prev + 1);
      setDeliveredKwh((prev) => {
        const next = prev + 0.0009; // incremental kWh
        setLiveCost(Number((next * 8.5).toFixed(2)));
        return Number(next.toFixed(3));
      });

      // Slowly increase SOC% every 15 seconds
      if (Math.random() > 0.8) {
        setSoc((prev) => Math.min(100, prev + 1));
      }

      // Small voltage micro-fluctuation
      setVoltage(Number((230 + (Math.random() * 2.5 - 1.2)).toFixed(1)));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopCharging = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setShowReceiptModal(true);
  };

  const handleFinishAndSettle = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    endSession();
    setShowReceiptModal(false);
    // Navigate to bookings receipts tab
    router.replace("/(driver)/bookings");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Active Charging Cockpit</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveIndicatorDot} />
          <Text style={styles.liveIndicatorText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Host Info Header */}
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.vehicleTitle}>{vehicleModel}</Text>
            <Text style={styles.hostSubtitle}>Connected to {hostName}</Text>
          </View>
          <View style={styles.energizedPill}>
            <Zap size={12} color="#00F59B" />
            <Text style={styles.energizedText}>RELAY ENERGIZED</Text>
          </View>
        </View>

        {/* Glowing Animated Circular Battery Gauge */}
        <View style={styles.gaugeContainer}>
          <Svg width={220} height={220} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#00F59B" />
                <Stop offset="100%" stopColor="#00E5FF" />
              </LinearGradient>
            </Defs>
            {/* Background Track */}
            <Circle
              cx="50"
              cy="50"
              r="40"
              stroke="#0F1622"
              strokeWidth="9"
              fill="none"
            />
            {/* Animated Active Track */}
            <Circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gaugeGrad)"
              strokeWidth="9"
              fill="none"
              strokeDasharray={`${(soc / 100) * 251.2} 251.2`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </Svg>

          {/* Central Battery Details */}
          <View style={styles.gaugeCenterText}>
            <BatteryCharging size={28} color="#00F59B" />
            <Text style={styles.socLargeText}>{soc}%</Text>
            <Text style={styles.socLabel}>STATE OF CHARGE</Text>
          </View>
        </View>

        {/* Live Telemetry Grid */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryCell}>
              <Text style={styles.cellLabel}>ELAPSED TIME</Text>
              <Text style={styles.cellValue}>{formatTimer(elapsedSecs)}</Text>
            </View>
            <View style={[styles.telemetryCell, { alignItems: "flex-end" }]}>
              <Text style={styles.cellLabel}>ENERGY DELIVERED</Text>
              <Text style={[styles.cellValue, { color: "#00F59B" }]}>
                {deliveredKwh.toFixed(2)} kWh
              </Text>
            </View>
          </View>

          <View style={styles.cellDivider} />

          <View style={styles.telemetryRow}>
            <View style={styles.telemetryCell}>
              <Text style={styles.cellLabel}>VOLTAGE / CURRENT</Text>
              <Text style={styles.cellValueSmall}>{voltage} V • {current} A</Text>
            </View>
            <View style={[styles.telemetryCell, { alignItems: "flex-end" }]}>
              <Text style={styles.cellLabel}>CHARGING POWER</Text>
              <Text style={styles.cellValueSmall}>{powerKw} kW AC</Text>
            </View>
          </View>

          <View style={styles.cellDivider} />

          <View style={styles.telemetryRow}>
            <View style={styles.telemetryCell}>
              <Text style={styles.cellLabel}>ENERGY TARIFF</Text>
              <Text style={styles.cellValueSmall}>₹8.50 / kWh</Text>
            </View>
            <View style={[styles.telemetryCell, { alignItems: "flex-end" }]}>
              <Text style={styles.cellLabel}>LIVE METER COST</Text>
              <Text style={[styles.cellValue, { color: "#FFFFFF" }]}>
                ₹{liveCost.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stop Charging Button */}
        <TouchableOpacity
          onPress={handleStopCharging}
          activeOpacity={0.85}
          style={styles.stopChargeBtn}
        >
          <AlertOctagon size={20} color="#FFFFFF" />
          <Text style={styles.stopChargeBtnText}>
            Stop Charging & Settle via UPI / VoltCredits
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Post-Charge Receipt & 5-Star Rating Modal */}
      <Modal visible={showReceiptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.receiptHeader}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={32} color="#00F59B" />
              </View>
              <Text style={styles.receiptModalTitle}>Charging Session Complete!</Text>
              <Text style={styles.receiptModalSub}>
                Smart relay disconnected. Safe to unplug your EV.
              </Text>
            </View>

            {/* Bill Summary */}
            <View style={styles.billBox}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Units Consumed</Text>
                <Text style={styles.billVal}>{deliveredKwh.toFixed(2)} kWh</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Tariff Slab</Text>
                <Text style={styles.billVal}>₹8.50 / kWh</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Platform Fee (VoltMate)</Text>
                <Text style={[styles.billVal, { color: "#00F59B" }]}>₹0.00 (Zero Fee)</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billRowTotal}>
                <Text style={styles.billTotalLabel}>Total Amount Due</Text>
                <Text style={styles.billTotalVal}>₹{liveCost.toFixed(2)}</Text>
              </View>
            </View>

            {/* 5-Star Host Rating */}
            <Text style={styles.ratingHeading}>Rate Host Experience ({hostName})</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(s);
                  }}
                  style={styles.starBtn}
                >
                  <Star
                    size={28}
                    color={s <= rating ? "#FFB800" : "#64748B"}
                    fill={s <= rating ? "#FFB800" : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Settle & Close Button */}
            <TouchableOpacity
              onPress={handleFinishAndSettle}
              activeOpacity={0.85}
              style={styles.settleBtn}
            >
              <Text style={styles.settleBtnText}>
                Pay ₹{liveCost.toFixed(2)} via UPI & View Receipt
              </Text>
              <ArrowRight size={18} color="#06090E" />
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
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00F59B",
  },
  liveIndicatorText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  hostSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  energizedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 245, 155, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  energizedText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    position: "relative",
  },
  gaugeCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  socLargeText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginTop: 2,
  },
  socLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  telemetryCard: {
    backgroundColor: "#0F1622",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    marginVertical: 16,
  },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  telemetryCell: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cellValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  cellValueSmall: {
    fontSize: 13,
    fontWeight: "700",
    color: "#CBD5E1",
    marginTop: 2,
  },
  cellDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 12,
  },
  stopChargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 18,
    paddingVertical: 15,
    gap: 8,
    marginTop: 10,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  stopChargeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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
  receiptHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  receiptModalSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  billBox: {
    backgroundColor: "#06090E",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 20,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  billVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  billDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },
  billRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  billTotalVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00F59B",
  },
  ratingHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#CBD5E1",
    textAlign: "center",
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 18,
    paddingVertical: 15,
    gap: 8,
  },
  settleBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
});
