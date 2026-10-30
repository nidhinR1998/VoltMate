import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Zap,
  QrCode,
  Clock,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Receipt,
  Car,
  Calendar,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSessionStore } from "../../store/useSessionStore";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

export default function BookingsScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const { isSessionActive, telemetry, activeBookingId, hostName } = useSessionStore();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  const pastReceipts = [
    {
      id: "REC-9402",
      date: "28 Oct 2026, 06:30 PM",
      host: "Lotus Greens Villa (Arun K.)",
      location: "Kakkanad, Kochi",
      units: "14.2 kWh",
      duration: "1h 45m",
      amount: "₹120.70",
      status: "COMPLETED",
      paymentMethod: "VoltCredits (₹0 Fee)",
    },
    {
      id: "REC-8921",
      date: "25 Oct 2026, 09:15 AM",
      host: "Infopark Phase 2 DC Hub",
      location: "Infopark Expressway",
      units: "28.5 kWh",
      duration: "35m",
      amount: "₹513.00",
      status: "COMPLETED",
      paymentMethod: "UPI Direct",
    },
    {
      id: "REC-7814",
      date: "21 Oct 2026, 08:00 PM",
      host: "Skyline Imperial Bay 15A Socket",
      location: "Marine Drive, Kochi",
      units: "11.0 kWh",
      duration: "1h 20m",
      amount: "₹93.50",
      status: "COMPLETED",
      paymentMethod: "VoltCredits",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            My <Text style={{ color: accentColor }}>Bookings</Text>
          </Text>
          <Text style={styles.subtitle}>
            Live charging passes, security check-ins & receipts
          </Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("ACTIVE");
            }}
            style={[
              styles.tabPill,
              activeTab === "ACTIVE" && { backgroundColor: `${accentColor}25`, borderColor: accentColor },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "ACTIVE" && { color: accentColor, fontWeight: "700" },
              ]}
            >
              Active Passes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("HISTORY");
            }}
            style={[
              styles.tabPill,
              activeTab === "HISTORY" && { backgroundColor: `${accentColor}25`, borderColor: accentColor },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "HISTORY" && { color: accentColor, fontWeight: "700" },
              ]}
            >
              Charging Receipts
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "ACTIVE" ? (
          <View style={styles.activeSection}>
            {/* Live Active Charge Banner if Session Active */}
            {isSessionActive && (
              <TouchableOpacity
                onPress={() => router.push("/(driver)/active-charge")}
                activeOpacity={0.85}
                style={[styles.liveChargeCard, { borderColor: accentColor }]}
              >
                <View style={styles.liveBadgeRow}>
                  <View style={[styles.pulseDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.liveText, { color: accentColor }]}>
                    LIVE CHARGING IN PROGRESS
                  </Text>
                  <Text style={styles.socBadge}>
                    {telemetry.currentSocPercent.toFixed(0)}% SOC
                  </Text>
                </View>

                <View style={styles.liveDetailsRow}>
                  <View>
                    <Text style={styles.liveHostName}>{hostName}</Text>
                    <Text style={styles.liveStatsText}>
                      {telemetry.deliveredKwh.toFixed(1)} kWh • ₹{telemetry.liveCostInr.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.viewCockpitBtn, { backgroundColor: accentColor }]}>
                    <Text style={styles.viewCockpitText}>Open Cockpit</Text>
                    <ChevronRight size={16} color="#06090E" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Active Gate Pass Card */}
            <View style={styles.gatePassCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeBadge}>
                  <Zap size={13} color="#00F59B" />
                  <Text style={styles.typeBadgeText}>P2P RESERVED</Text>
                </View>
                <View style={styles.timerBadge}>
                  <Clock size={12} color="#FFB800" />
                  <Text style={styles.timerBadgeText}>Arrive in 18 mins</Text>
                </View>
              </View>

              <Text style={styles.stationTitle}>Lotus Greens Villa 15A Socket</Text>
              <View style={styles.locationRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.locationText}>Kakkanad, Kochi • Bay B-14</Text>
              </View>

              {/* Society Security Pass Box */}
              <View style={styles.securityBox}>
                <View style={styles.securityLeft}>
                  <Text style={styles.securityLabel}>SOCIETY ENTRY CODE</Text>
                  <Text style={styles.securityCode}>#849-201</Text>
                  <Text style={styles.securitySub}>Show to Security Guard</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(driver)/gate-pass")}
                  style={styles.qrBtn}
                >
                  <QrCode size={28} color="#00F59B" />
                  <Text style={styles.qrBtnText}>View Pass</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => router.push("/(driver)/gate-pass")}
                  style={[styles.primaryActionBtn, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.primaryActionText}>Open Digital Gate Pass</Text>
                  <ChevronRight size={16} color="#06090E" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Helper Card */}
            <View style={styles.helperCard}>
              <ShieldCheck size={18} color="#00F59B" />
              <View style={styles.helperTextWrapper}>
                <Text style={styles.helperTitle}>Zero-Wait Society Access</Text>
                <Text style={styles.helperSub}>
                  Your digital gate pass includes auto-approved MyGate society clearance for your EV plate number.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Past Receipts */
          <View style={styles.historySection}>
            {pastReceipts.map((rec) => (
              <View key={rec.id} style={styles.receiptCard}>
                <View style={styles.receiptTop}>
                  <View>
                    <Text style={styles.receiptHost}>{rec.host}</Text>
                    <Text style={styles.receiptDate}>{rec.date}</Text>
                  </View>
                  <Text style={styles.receiptAmount}>{rec.amount}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Energy</Text>
                    <Text style={styles.metricValue}>{rec.units}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{rec.duration}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Payment</Text>
                    <Text style={styles.metricValueHighlight}>{rec.paymentMethod}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
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
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#0F1622",
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  activeSection: {
    gap: 16,
  },
  liveChargeCard: {
    backgroundColor: "rgba(0, 245, 155, 0.08)",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
  },
  socBadge: {
    backgroundColor: "#06090E",
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveHostName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  liveStatsText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  viewCockpitBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  viewCockpitText: {
    color: "#06090E",
    fontWeight: "700",
    fontSize: 12,
  },
  gatePassCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,184,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timerBadgeText: {
    color: "#FFB800",
    fontSize: 11,
    fontWeight: "700",
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#06090E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  securityLeft: {},
  securityLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  securityCode: {
    fontSize: 24,
    fontWeight: "900",
    color: "#00F59B",
    letterSpacing: 1,
    marginVertical: 2,
  },
  securitySub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  qrBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,245,155,0.08)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
  },
  qrBtnText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  primaryActionText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 14,
  },
  helperCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(15,22,34,0.6)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  helperTextWrapper: {
    flex: 1,
  },
  helperTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  helperSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  historySection: {
    gap: 12,
  },
  receiptCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
  },
  receiptTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  receiptHost: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  receiptDate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00F59B",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
  },
  receiptMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  metricValueHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00E5FF",
    marginTop: 2,
  },
});
