import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
} from "../../store/useVoltMateEngine";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";

export default function HostDashboardScreen() {
  const router = useRouter();
  const {
    stations,
    hostRequests,
    hostWeeklyEarnings,
    hostEarningsBalance,
    hostWeeklyKwh,
    hostSessionsCount,
    approveHostRequest,
    declineHostRequest,
    switchMode,
    showToast,
  } = useVoltMateEngine();

  const [isOnline, setIsOnline] = useState(true);
  const myStation = stations[0];
  const pendingCount = hostRequests.filter(
    (r) => r.status === "PENDING"
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.overline}>P2P HOST STUDIO • KERALA GRID</Text>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {myStation.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.driverModeBtn}
          onPress={() => {
            switchMode("DRIVER");
            router.push("/(driver)/home");
          }}
        >
          <Text style={styles.driverModeBtnText}>🚘 Driver Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Availability Status Card */}
      <View style={styles.statusCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.liveRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isOnline ? "#05E660" : "#9CA3AF" },
              ]}
            />
            <Text style={styles.statusTag}>
              {isOnline ? "ACCEPTING BOOKINGS" : "OFFLINE"}
            </Text>
          </View>
          <Text style={styles.statusTitle}>
            {isOnline ? "Your Kochi Charger is Live" : "Station Paused"}
          </Text>
          <Text style={styles.statusSub}>{myStation.address}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={(val) => {
            setIsOnline(val);
            showToast(
              val ? "Charger Online" : "Charger Offline",
              val
                ? "Your P2P socket is visible to nearby Kochi EV drivers."
                : "New slot bookings temporarily paused.",
              val ? "success" : "warning"
            );
          }}
          trackColor={{ false: "#D5DBD7", true: "#05E660" }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Earnings & Utilization Metrics (₹ INR) */}
      <View style={styles.metricsRow}>
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => router.push("/(host)/wallet")}
        >
          <Text style={styles.metricLabel}>THIS WEEK (₹ INR)</Text>
          <Text style={styles.metricBig}>
            ₹{hostWeeklyEarnings.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.metricSub}>
            Available: ₹{hostEarningsBalance.toFixed(0)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => router.push("/(host)/incoming-requests")}
        >
          <Text style={styles.metricLabel}>SESSIONS HOSTED</Text>
          <Text style={styles.metricBig}>{hostSessionsCount}</Text>
          <Text style={styles.metricSub}>{hostWeeklyKwh} kWh dispensed</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Booking Requests Queue */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          Incoming Slot Requests ({pendingCount})
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(host)/incoming-requests")}
        >
          <Text style={styles.linkText}>View All →</Text>
        </TouchableOpacity>
      </View>

      {hostRequests.map((req) => (
        <View key={req.id} style={styles.reqCard}>
          <View style={styles.reqTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reqDriverName}>{req.driverName}</Text>
              <Text style={styles.reqVehicle}>{req.vehicle}</Text>
            </View>
            <View style={styles.payoutBadge}>
              <Text style={styles.payoutBadgeTxt}>{req.payout}</Text>
            </View>
          </View>
          <Text style={styles.reqSlotMeta}>
            🕒 {req.slot} • 🔌 {req.connector} ({req.estEnergy})
          </Text>

          {req.status === "PENDING" ? (
            <View style={styles.reqActionsRow}>
              <TouchableOpacity
                style={styles.acceptReqBtn}
                onPress={() => approveHostRequest(req.id)}
              >
                <Text style={styles.acceptReqBtnTxt}>
                  ✓ Accept & Issue Pass
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineReqBtn}
                onPress={() => declineHostRequest(req.id)}
              >
                <Text style={styles.declineReqBtnTxt}>✕ Decline</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.approvedBanner}>
              <Text style={styles.approvedBannerTxt}>
                ✓ APPROVED • Gate Pass #{req.otpCode?.slice(0, 3) || "544"}-
                {req.otpCode?.slice(3) || "555"} Active
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Active Indian Connectors List + Add New Charger / Connector Row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Configured Indian Connectors</Text>
        <TouchableOpacity onPress={() => router.push("/(host)/add-charger")}>
          <Text style={styles.linkText}>+ Add Socket</Text>
        </TouchableOpacity>
      </View>

      {myStation.connectorSpecs.map((c) => (
        <View key={c.id} style={styles.connectorCard}>
          <ConnectorPlugIllustration type={c.name} size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={styles.connectorName}>{c.name}</Text>
            <Text style={styles.connectorMeta}>
              {c.priceLabel} • {c.slotLabel}
            </Text>
          </View>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>READY</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addConnectorRowBtn}
        onPress={() => router.push("/(host)/add-charger")}
      >
        <Text style={styles.addConnectorRowTxt}>
          ➕ Add New Charger / Connector (15A 3-Pin or Type-2 7.4kW)
        </Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push("/(host)/incoming-requests")}
        >
          <Text style={styles.actionIcon}>📥</Text>
          <Text style={styles.actionTitle}>Booking Queue</Text>
          <Text style={styles.actionSub}>{pendingCount} pending approvals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push("/(host)/schedule-matrix")}
        >
          <Text style={styles.actionIcon}>🗓️</Text>
          <Text style={styles.actionTitle}>Availability</Text>
          <Text style={styles.actionSub}>Edit 7-day hours</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push("/(host)/wallet")}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionTitle}>Earnings & UPI</Text>
          <Text style={styles.actionSub}>
            ₹{hostEarningsBalance.toFixed(0)} available
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionTile, styles.actionTileGreen]}
          onPress={() => router.push("/(host)/add-charger")}
        >
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionTitle}>Add Charger</Text>
          <Text style={[styles.actionSub, { color: "#151C18" }]}>
            Register new socket
          </Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  driverModeBtn: {
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
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.6,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  statusSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
  },
  metricLabel: {
    fontSize: 11,
    color: "#7C857F",
    fontWeight: "800",
  },
  metricBig: {
    fontSize: 28,
    fontWeight: "800",
    color: "#151C18",
    marginVertical: 6,
  },
  metricSub: {
    fontSize: 12,
    color: "#096B30",
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151C18",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  reqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  reqTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reqDriverName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  reqVehicle: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  payoutBadge: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  payoutBadgeTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  reqSlotMeta: {
    fontSize: 12,
    color: "#4B534E",
    fontWeight: "600",
    marginVertical: 10,
  },
  reqActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  acceptReqBtn: {
    flex: 1.5,
    backgroundColor: "#05E660",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  acceptReqBtnTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  declineReqBtn: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  declineReqBtnTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B746E",
  },
  approvedBanner: {
    backgroundColor: "#EAFBF0",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  approvedBannerTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  connectorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  connectorName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  connectorMeta: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  readyBadge: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  addConnectorRowBtn: {
    backgroundColor: "#EAFBF0",
    borderWidth: 1.5,
    borderColor: "#16B374",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  addConnectorRowTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  actionTile: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
  },
  actionTileGreen: {
    backgroundColor: "#05E660",
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  actionSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
});
