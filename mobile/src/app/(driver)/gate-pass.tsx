import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Rect } from "react-native-svg";
import {
  ArrowLeft,
  ShieldCheck,
  Phone,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../store/useAuthStore";

export default function GatePassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const {
    vehicles,
    selectedVehicleId,
    bookings,
    activeBookingId,
    startChargingSession,
  } = useAuthStore();
  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const currentBooking =
    bookings.find((b) => b.id === (params.bookingId || activeBookingId)) ||
    bookings[0];

  const stationName = currentBooking?.stationName || "Pall Mall Station";
  const stationAddress =
    currentBooking?.stationAddress || "1 White Hall Palace, Street 5, Kakkanad";
  const slotLabel = currentBooking?.slotLabel || "Slot B";
  const connectorName = currentBooking?.connectorName || "CHAdeMO";
  const timeWindow = currentBooking?.timeWindow || "16:30 – 17:30";
  const gatePassCode = currentBooking?.gatePassCode || "#849-201";

  const handleCallHost = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Linking.openURL("tel:+919847012345").catch(() => {});
  };

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
          <Text style={styles.topTitle}>Digital Access Pass</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Pass Ticket Card */}
        <View style={styles.passCard}>
          <View style={styles.verifiedPill}>
            <ShieldCheck size={15} color="#0D7A38" />
            <Text style={styles.verifiedPillText}>
              VERIFIED GATE ENTRY PASS
            </Text>
          </View>

          <Text style={styles.stationName}>{stationName}</Text>
          <Text style={styles.stationAddress}>
            {stationAddress} • {slotLabel}
          </Text>

          {/* QR Code Box */}
          <View style={styles.qrContainer}>
            <Svg width={150} height={150} viewBox="0 0 100 100">
              <Rect x="5" y="5" width="26" height="26" rx="4" fill="#151C18" />
              <Rect x="10" y="10" width="16" height="16" rx="2" fill="#FFFFFF" />
              <Rect x="14" y="14" width="8" height="8" fill="#05E660" />

              <Rect x="69" y="5" width="26" height="26" rx="4" fill="#151C18" />
              <Rect x="74" y="10" width="16" height="16" rx="2" fill="#FFFFFF" />
              <Rect x="78" y="14" width="8" height="8" fill="#151C18" />

              <Rect x="5" y="69" width="26" height="26" rx="4" fill="#151C18" />
              <Rect x="10" y="74" width="16" height="16" rx="2" fill="#FFFFFF" />
              <Rect x="14" y="78" width="8" height="8" fill="#151C18" />

              <Rect x="38" y="12" width="8" height="8" fill="#151C18" />
              <Rect x="50" y="12" width="10" height="8" fill="#151C18" />
              <Rect x="38" y="26" width="16" height="8" fill="#151C18" />
              <Rect x="12" y="38" width="14" height="8" fill="#151C18" />
              <Rect x="34" y="42" width="28" height="14" rx="3" fill="#05E660" />
              <Rect x="42" y="46" width="12" height="6" fill="#151C18" />
              <Rect x="68" y="40" width="18" height="8" fill="#151C18" />
              <Rect x="38" y="64" width="12" height="12" fill="#151C18" />
              <Rect x="58" y="68" width="14" height="8" fill="#151C18" />
              <Rect x="76" y="64" width="14" height="24" fill="#151C18" />
              <Rect x="44" y="82" width="22" height="8" fill="#151C18" />
            </Svg>
          </View>

          <Text style={styles.pinLabel}>GATE ACCESS CODE</Text>
          <Text style={styles.pinValue}>{gatePassCode}</Text>

          <View style={styles.divider} />

          {/* Vehicle & Slot Info */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailVal}>
                {currentBooking?.vehicleName ||
                  `${activeVehicle.brand} ${activeVehicle.model}`}
              </Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Plate Number</Text>
              <Text style={styles.detailVal}>
                {currentBooking?.plateNumber || activeVehicle.plateNumber}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsGrid, { marginTop: 12 }]}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Connector</Text>
              <Text style={styles.detailVal}>
                {connectorName} ({slotLabel})
              </Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Time Window</Text>
              <Text style={styles.detailVal}>{timeWindow}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleCallHost}
            style={styles.secondaryActionBtn}
          >
            <Phone size={16} color="#151C18" />
            <Text style={styles.secondaryActionText}>Call Station</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              startChargingSession({
                bookingId: currentBooking?.id,
                stationId: currentBooking?.stationId || "st-pall-mall",
                stationName,
                connectorName,
                slotLabel,
                powerKw: currentBooking?.powerKw || 50,
                pricePerKwh: currentBooking?.pricePerKwh || 0.5,
              });
              router.push({
                pathname: "/(driver)/active-charge",
                params: {
                  stationId: currentBooking?.stationId || "st-pall-mall",
                  stationName,
                  connectorName,
                  slotLabel,
                  powerKw: String(currentBooking?.powerKw || 50),
                },
              });
            }}
            style={styles.primaryActionBtn}
          >
            <Zap size={16} color="#151C18" fill="#151C18" />
            <Text style={styles.primaryActionText}>Start Charging</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 18,
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
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  passCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 20,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    marginBottom: 14,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A38",
  },
  stationName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111714",
  },
  stationAddress: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: "#F7F9F8",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.8,
  },
  pinValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#151C18",
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#E8ECEA",
    marginVertical: 18,
  },
  detailsGrid: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#757F7A",
  },
  detailVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryActionBtn: {
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
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  primaryActionBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
});
