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
  ArrowRight,
  Check,
  X,
  Car,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

const WEEKLY_DATA = [
  { day: "Mon", kwh: 14.2, earnings: 14 },
  { day: "Tue", kwh: 22.0, earnings: 21 },
  { day: "Wed", kwh: 18.5, earnings: 18 },
  { day: "Thu", kwh: 28.0, earnings: 28 },
  { day: "Fri", kwh: 35.4, earnings: 34 },
  { day: "Sat", kwh: 42.1, earnings: 42 },
  { day: "Sun", kwh: 31.0, earnings: 30 },
];

export default function HostDashboardScreen() {
  const router = useRouter();
  const { setMode } = useModeStore();
  const [isOnline, setIsOnline] = useState(true);
  const [requestStatus, setRequestStatus] = useState<"PENDING" | "ACCEPTED" | "DECLINED">("PENDING");

  const totalKwh = 191.2;
  const totalEarnings = 186.0;
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
      val ? "Station Online" : "Station Paused",
      val
        ? "Your charging station is now live and bookable on the map!"
        : "Your station is hidden from the map for maintenance."
    );
  };

  const handleAcceptRequest = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRequestStatus("ACCEPTED");
    Alert.alert(
      "Booking Approved!",
      "Driver has been issued Digital Gate Pass #849-201. Your smart relay will activate when they check in."
    );
  };

  const handleDeclineRequest = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setRequestStatus("DECLINED");
    Alert.alert("Request Declined", "The driver has been notified to choose another station.");
  };

  const handleSwitchToDriver = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setMode("DRIVER");
    router.replace("/(driver)/home");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Host Studio</Text>
            <Text style={styles.subtitle}>
              Pall Mall Bay A • Type A & CHAdeMO
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={handleSwitchToDriver}
              style={styles.driverModeBtn}
            >
              <Car size={15} color="#FFFFFF" />
              <Text style={styles.driverModeBtnText}>Driver App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(host)/incoming-requests")}
              style={styles.alertBtn}
            >
              <Bell size={18} color="#111714" />
              {requestStatus === "PENDING" && <View style={styles.alertDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Master Charger Online / Offline Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <View style={styles.statusIconBox}>
              {isOnline ? (
                <PlayCircle size={22} color="#05E660" />
              ) : (
                <PauseCircle size={22} color="#DC2626" />
              )}
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>
                {isOnline ? "Station Online & Accepting Guests" : "Station Paused / Maintenance"}
              </Text>
              <Text style={styles.toggleSub}>
                {isOnline
                  ? "Visible on map • Auto-accepting verified EV bookings"
                  : "Hidden from map • No new bookings accepted"}
              </Text>
            </View>
          </View>

          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: "#DCE2DF", true: "#05E660" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Live Incoming Booking Request Card */}
        {requestStatus === "PENDING" && (
          <View style={styles.incomingRequestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestBadge}>
                <Clock size={12} color="#047835" />
                <Text style={styles.requestBadgeText}>NEW BOOKING REQUEST</Text>
              </View>
              <Text style={styles.payoutBadge}>+$18.50</Text>
            </View>

            <View style={styles.driverProfileRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>J</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.driverName}>James Carter</Text>
                  <ShieldCheck size={14} color="#05E660" />
                  <Text style={styles.trustScore}>★ 4.9 (18 charges)</Text>
                </View>
                <Text style={styles.driverCarText}>Tesla Model X • Verified EV</Text>
              </View>
            </View>

            <View style={styles.requestDetailsBox}>
              <View>
                <Text style={styles.detailLabel}>REQUESTED SLOT</Text>
                <Text style={styles.detailValue}>16:30 – 18:00 (1.5 hrs)</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>CONNECTOR</Text>
                <Text style={styles.detailValue}>CHAdeMO • Slot B</Text>
              </View>
            </View>

            <View style={styles.requestActionsRow}>
              <TouchableOpacity
                onPress={handleDeclineRequest}
                style={styles.declineBtn}
              >
                <X size={16} color="#DC2626" />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAcceptRequest}
                style={styles.acceptBtn}
              >
                <Check size={16} color="#111714" strokeWidth={2.5} />
                <Text style={styles.acceptBtnText}>Accept & Issue Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Primary KPI Metrics Trio */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <TrendingUp size={16} color="#111714" />
            <Text style={styles.kpiLabel}>THIS WEEK</Text>
            <Text style={styles.kpiValue}>${totalEarnings.toFixed(0)}</Text>
          </View>

          <View style={styles.kpiCard}>
            <Zap size={16} color="#111714" />
            <Text style={styles.kpiLabel}>ENERGY</Text>
            <Text style={styles.kpiValue}>
              {totalKwh.toFixed(0)} <Text style={{ fontSize: 11, color: "#757F7A" }}>kWh</Text>
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Leaf size={16} color="#047835" />
            <Text style={styles.kpiLabel}>CO2 SAVED</Text>
            <Text style={styles.kpiValue}>
              {co2OffsetKg.toFixed(0)} <Text style={{ fontSize: 11, color: "#757F7A" }}>kg</Text>
            </Text>
          </View>
        </View>

        {/* Weekly Earnings & Energy Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Weekly Energy Output</Text>
              <Text style={styles.chartSubtitle}>7-Day Station Utilization (kWh)</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ 4.9 (56 Reviews)</Text>
            </View>
          </View>

          <Svg width={width - 72} height={140} style={{ alignSelf: "center", marginTop: 8 }}>
            {WEEKLY_DATA.map((item, idx) => {
              const maxKwh = 45;
              const barHeight = (item.kwh / maxKwh) * 90;
              const xPos = idx * ((width - 72) / 7) + 8;
              const yPos = 110 - barHeight;

              return (
                <G key={idx}>
                  <Rect
                    x={xPos}
                    y={20}
                    width={22}
                    height={90}
                    rx={8}
                    fill="#F2F4F3"
                  />
                  <Rect
                    x={xPos}
                    y={yPos}
                    width={22}
                    height={barHeight}
                    rx={8}
                    fill={idx === 5 ? "#05E660" : "#151C18"}
                  />
                  <SvgText
                    x={xPos + 11}
                    y={yPos - 5}
                    fill="#757F7A"
                    fontSize={8}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.kwh}
                  </SvgText>
                  <SvgText
                    x={xPos + 11}
                    y={128}
                    fill="#111714"
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
        <Text style={styles.sectionHeader}>STATION MANAGEMENT</Text>
        <View style={styles.modulesList}>
          <TouchableOpacity
            onPress={() => router.push("/(host)/add-charger")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={styles.moduleIconCircle}>
                <PlusCircle size={20} color="#05E660" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>Add New Charger / Connector</Text>
                <Text style={styles.moduleSub}>Configure Type A, CHAdeMO or Type B slots</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#757F7A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(host)/schedule-matrix")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={styles.moduleIconCircle}>
                <Calendar size={20} color="#05E660" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>7-Day Availability Schedule</Text>
                <Text style={styles.moduleSub}>Set recurring open hours & auto-approval</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#757F7A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(host)/wallet")}
            style={styles.moduleItem}
          >
            <View style={styles.moduleLeft}>
              <View style={styles.moduleIconCircle}>
                <Wallet size={20} color="#05E660" />
              </View>
              <View>
                <Text style={styles.moduleTitle}>Earnings & Payouts</Text>
                <Text style={styles.moduleSub}>Instant bank settlement & transaction ledger</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#757F7A" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
    fontWeight: "600",
  },
  driverModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#151C18",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  driverModeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  alertBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9E6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  alertDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    position: "absolute",
    top: 9,
    right: 9,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  statusIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  toggleSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
    lineHeight: 15,
  },
  incomingRequestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#151C18",
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
    backgroundColor: "rgba(5, 230, 96, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  requestBadgeText: {
    color: "#047835",
    fontSize: 10,
    fontWeight: "800",
  },
  payoutBadge: {
    color: "#111714",
    fontSize: 15,
    fontWeight: "800",
  },
  driverProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: {
    color: "#05E660",
    fontSize: 16,
    fontWeight: "800",
  },
  driverName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111714",
  },
  trustScore: {
    fontSize: 11,
    color: "#757F7A",
    fontWeight: "600",
  },
  driverCarText: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  requestDetailsBox: {
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EBF0ED",
  },
  detailLabel: {
    fontSize: 9,
    color: "#757F7A",
    fontWeight: "700",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111714",
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
    backgroundColor: "#FEE2E2",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 6,
  },
  declineBtnText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    borderRadius: 22,
    paddingVertical: 12,
    gap: 6,
  },
  acceptBtnText: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 13,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  kpiLabel: {
    fontSize: 9,
    color: "#757F7A",
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111714",
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
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
    color: "#111714",
  },
  chartSubtitle: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ratingText: {
    color: "#111714",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  modulesList: {
    gap: 10,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  moduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  moduleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  moduleSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
});
