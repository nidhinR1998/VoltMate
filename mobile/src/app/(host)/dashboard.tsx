import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import {
  Zap,
  TrendingUp,
  Leaf,
  PlusCircle,
  Calendar,
  Bell,
  Wallet,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Car,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

const WEEKLY_DATA = [
  { day: "Mon", kwh: 14.2, earnings: 140 },
  { day: "Tue", kwh: 22.0, earnings: 210 },
  { day: "Wed", kwh: 18.5, earnings: 180 },
  { day: "Thu", kwh: 28.0, earnings: 275 },
  { day: "Fri", kwh: 35.4, earnings: 340 },
  { day: "Sat", kwh: 42.1, earnings: 415 },
  { day: "Sun", kwh: 31.0, earnings: 300 },
];

export default function HostDashboardScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const [isOnline, setIsOnline] = useState(true);

  // Incoming Booking Request State
  const [requestStatus, setRequestStatus] = useState<"PENDING" | "ACCEPTED" | "DECLINED">("PENDING");

  const totalKwh = 191.2;
  const totalEarnings = 1860.0;
  const co2OffsetKg = 156.8;

  const handleToggleOnline = (val: boolean) => {
    setIsOnline(val);
    try {
      Haptics.notificationAsync(
        val
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch {}
    Alert.alert(
      val ? "Charger Online ⚡" : "Charger Offline / Paused",
      val
        ? "Your charger is now live and bookable on the community map!"
        : "Your charger is hidden from the community radar for vacation or maintenance."
    );
  };

  const handleAcceptRequest = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRequestStatus("ACCEPTED");
    Alert.alert(
      "Booking Approved! 🎉",
      "Rahul K. has been issued Digital Gate Pass #849-201. Your smart relay will activate when he checks in."
    );
  };

  const handleDeclineRequest = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setRequestStatus("DECLINED");
    Alert.alert("Request Declined", "The driver has been notified to choose another host.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.headerTitleRow}>
              <Sparkles size={18} color="#FFB800" />
              <Text style={styles.title}>Host Command Center</Text>
            </View>
            <Text style={styles.subtitle}>
              Villa 14 • 15A Smart Socket (MCB 16A • KSEB Tariff)
            </Text>
          </View>

          {/* Pending Alerts Pill */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/incoming-requests")}
            style={styles.alertBtn}
          >
            <Bell size={18} color="#FFB800" />
            {requestStatus === "PENDING" && <View style={styles.alertDot} />}
          </TouchableOpacity>
        </View>

        {/* Master Charger Online / Offline Toggle Card */}
        <View style={[styles.toggleCard, !isOnline && styles.toggleCardOffline]}>
          <View style={styles.toggleLeft}>
            {isOnline ? (
              <PlayCircle size={28} color="#00F59B" />
            ) : (
              <PauseCircle size={28} color="#FF3B5C" />
            )}
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>
                {isOnline ? "Charger Online & Accepting Guests" : "Charger Paused / Maintenance"}
              </Text>
              <Text style={styles.toggleSub}>
                {isOnline
                  ? "Visible on Kochi community radar • Auto-accepting ad-hoc passes"
                  : "Hidden from radar • No bookings will be accepted"}
              </Text>
            </View>
          </View>

          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: "#1E293B", true: "#FFB800" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Live Incoming Booking Request Card */}
        {requestStatus === "PENDING" && (
          <View style={styles.incomingRequestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestBadge}>
                <Clock size={12} color="#FFB800" />
                <Text style={styles.requestBadgeText}>NEW BOOKING REQUEST (2m ago)</Text>
              </View>
              <Text style={styles.payoutBadge}>Est. Payout: ₹86</Text>
            </View>

            <View style={styles.driverProfileRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>R</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.driverName}>Rahul K.</Text>
                  <ShieldCheck size={14} color="#00F59B" />
                  <Text style={styles.trustScore}>5.0 ★ (18 trips)</Text>
                </View>
                <Text style={styles.driverCarText}>Tata Nexon EV Max • Verified RC (KL-07-CS-4921)</Text>
              </View>
            </View>

            <View style={styles.requestDetailsBox}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>REQUESTED SLOT</Text>
                <Text style={styles.detailValue}>03:00 PM – 05:00 PM (2 hrs)</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ESTIMATED ENERGY</Text>
                <Text style={styles.detailValue}>~6.6 kWh (15A Plug)</Text>
              </View>
            </View>

            {/* Accept / Decline Action Buttons */}
            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                onPress={handleDeclineRequest}
                style={styles.declineBtn}
              >
                <X size={16} color="#FF3B5C" />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAcceptRequest}
                style={styles.acceptBtn}
              >
                <Check size={16} color="#06090E" />
                <Text style={styles.acceptBtnText}>Accept & Issue Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Primary KPI Metrics Trio */}
        <View style={styles.kpiRow}>
          {/* Earnings */}
          <View style={styles.kpiCard}>
            <TrendingUp size={16} color="#FFB800" />
            <Text style={styles.kpiLabel}>THIS WEEK</Text>
            <Text style={styles.kpiValue}>₹{totalEarnings.toFixed(0)}</Text>
          </View>

          {/* Energy Shared */}
          <View style={styles.kpiCard}>
            <Zap size={16} color="#00E5FF" />
            <Text style={styles.kpiLabel}>ENERGY</Text>
            <Text style={styles.kpiValue}>
              {totalKwh.toFixed(0)} <Text style={{ fontSize: 11 }}>kWh</Text>
            </Text>
          </View>

          {/* CO2 Offset */}
          <View style={styles.kpiCard}>
            <Leaf size={16} color="#00F59B" />
            <Text style={styles.kpiLabel}>CO2 SAVED</Text>
            <Text style={styles.kpiValue}>
              {co2OffsetKg.toFixed(0)} <Text style={{ fontSize: 11 }}>kg</Text>
            </Text>
          </View>
        </View>

        {/* Weekly Earnings & Energy Bar Chart (Built with react-native-svg) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Weekly Energy & Earnings</Text>
              <Text style={styles.chartSubtitle}>7-Day Community Grid Output</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>4.9 ★ (38 Reviews)</Text>
            </View>
          </View>

          {/* Clean SVG Bar Chart */}
          <Svg width={width - 72} height={140} style={{ alignSelf: "center", marginTop: 8 }}>
            {WEEKLY_DATA.map((item, idx) => {
              const maxKwh = 45;
              const barHeight = (item.kwh / maxKwh) * 90;
              const xPos = idx * ((width - 72) / 7) + 8;
              const yPos = 110 - barHeight;

              return (
                <G key={idx}>
                  {/* Background Track */}
                  <Rect
                    x={xPos}
                    y={20}
                    width={22}
                    height={90}
                    rx={6}
                    fill="#06090E"
                  />
                  {/* Active Bar */}
                  <Rect
                    x={xPos}
                    y={yPos}
                    width={22}
                    height={barHeight}
                    rx={6}
                    fill="#FFB800"
                  />
                  {/* kWh Value */}
                  <SvgText
                    x={xPos + 11}
                    y={yPos - 4}
                    fill="#94A3B8"
                    fontSize={8}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.kwh}
                  </SvgText>
                  {/* Day Label */}
                  <SvgText
                    x={xPos + 11}
                    y={128}
                    fill="#CBD5E1"
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.day}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>

        {/* Host Control Modules Quick Actions */}
        <Text style={styles.sectionHeader}>Host Control Modules</Text>
        <View style={styles.modulesList}>
          {/* Add Charger */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/add-charger")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={[styles.moduleIconCircle, { backgroundColor: "rgba(255, 184, 0, 0.15)" }]}>
                <PlusCircle size={20} color="#FFB800" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>Add New Charger / Socket</Text>
                <Text style={styles.moduleSub}>3-minute listing wizard with DISCOM tariff helper</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          {/* Schedule Matrix */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/schedule-matrix")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={[styles.moduleIconCircle, { backgroundColor: "rgba(0, 229, 255, 0.15)" }]}>
                <Calendar size={20} color="#00E5FF" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>7-Day Availability Matrix</Text>
                <Text style={styles.moduleSub}>Auto-open daytime slots while you're away at work</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          {/* Wallet & UPI Payouts */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/wallet")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={[styles.moduleIconCircle, { backgroundColor: "rgba(0, 245, 155, 0.15)" }]}>
                <Wallet size={20} color="#00F59B" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>VoltCredits & UPI Payouts</Text>
                <Text style={styles.moduleSub}>Zero-fee instant settlement to your bank VPA</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#FFB800",
    marginTop: 2,
    fontWeight: "600",
  },
  alertBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0F1622",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B5C",
    position: "absolute",
    top: 9,
    right: 9,
    borderWidth: 1.5,
    borderColor: "#06090E",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 184, 0, 0.35)",
    marginBottom: 18,
  },
  toggleCardOffline: {
    borderColor: "rgba(255, 59, 92, 0.35)",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toggleSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 15,
  },
  incomingRequestCard: {
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#FFB800",
    padding: 16,
    marginBottom: 18,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  requestBadgeText: {
    color: "#FFB800",
    fontSize: 10,
    fontWeight: "800",
  },
  payoutBadge: {
    color: "#00F59B",
    fontSize: 13,
    fontWeight: "800",
  },
  driverProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: {
    color: "#FFB800",
    fontSize: 16,
    fontWeight: "800",
  },
  driverName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  trustScore: {
    fontSize: 11,
    color: "#FFB800",
    fontWeight: "600",
  },
  driverCarText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  requestDetailsBox: {
    backgroundColor: "#06090E",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  requestActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 92, 0.4)",
    gap: 6,
  },
  declineBtnText: {
    color: "#FF3B5C",
    fontWeight: "700",
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  acceptBtnText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 13,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0F1622",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  kpiLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: "#0F1622",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  chartSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: "#FFB800",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modulesList: {
    gap: 10,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1622",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  moduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  moduleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  moduleSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
});
