import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore, TAB_BAR_SAFE_PADDING } from "../../store/useAuthStore";

export default function IncomingRequestsScreen() {
  const router = useRouter();
  const { hostRequests, respondHostRequest } = useAuthStore();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(host)/dashboard")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Incoming Slot Requests</Text>
        <View style={{ width: 44 }} />
      </View>

      {hostRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySub}>
            New P2P charging requests from nearby Kochi EV drivers will appear here.
          </Text>
        </View>
      ) : (
        hostRequests.map((r) => (
          <View key={r.id} style={styles.requestCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{r.driverName}</Text>
                <Text style={styles.vehicleText}>{r.vehicle}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{r.rating}</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Requested Slot</Text>
                <Text style={styles.infoVal}>{r.slot}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Indian Connector</Text>
                <Text style={styles.infoVal}>{r.connector}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Est. Energy</Text>
                <Text style={styles.infoVal}>{r.estEnergy}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Host Payout (₹ INR)</Text>
                <Text style={[styles.infoVal, { color: "#096B30" }]}>
                  {r.payout}
                </Text>
              </View>
            </View>

            {r.status === "APPROVED" ? (
              <View style={styles.approvedBanner}>
                <Text style={styles.approvedText}>
                  ✓ APPROVED • Gate Pass #{r.otpCode?.slice(0, 3) || "544"}-
                  {r.otpCode?.slice(3) || "555"} Issued to {r.driverName}
                </Text>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => respondHostRequest(r.id, false)}
                >
                  <Text style={styles.declineText}>✕ Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => respondHostRequest(r.id, true)}
                >
                  <Text style={styles.approveText}>✓ Approve & Issue Pass</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: "#7C857F",
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  vehicleText: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: "#F5F7F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  infoBox: {
    backgroundColor: "#F5F7F6",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoKey: {
    fontSize: 12,
    color: "#7C857F",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  approvedBanner: {
    backgroundColor: "#EAFBF0",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  approvedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#E0E4E1",
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B746E",
  },
  approveBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  approveText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
});
