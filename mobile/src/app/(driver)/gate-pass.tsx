import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
} from "../../store/useVoltMateEngine";
import {
  launchNativePhoneCall,
  launchNativeTurnByTurnMaps,
} from "../../services/notificationService";

export default function GatePassScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { bookings, stations, startChargingSession } = useVoltMateEngine();

  const booking =
    bookings.find((b) => b.id === bookingId) || bookings[0];
  const station =
    stations.find((s) => s.id === booking?.stationId) || stations[0];

  const otpFormatted = booking
    ? `${booking.otpCode.slice(0, 3)} - ${booking.otpCode.slice(3, 6)}`
    : "544 - 555";

  const handleSharePass = async () => {
    try {
      await Share.share({
        message: `VoltMate EV Digital Gate Pass\nStation: ${
          booking?.stationName || "Spark EV Fast Hub"
        }\nOTP Code: ${otpFormatted}\nSlot: ${
          booking?.slotTime || "Today, 16:30 – 17:30"
        }`,
      });
    } catch {
      // ignore
    }
  };

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
              : router.replace("/(driver)/bookings")
          }
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Access Pass</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleSharePass}>
          <Text style={styles.shareBtnText}>↗</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.passCard}>
        <View style={styles.statusPill}>
          <View style={styles.greenDot} />
          <Text style={styles.statusText}>
            VERIFIED ACCESS TOKEN • KERALA EV GRID
          </Text>
        </View>

        <Text style={styles.stationName}>
          {booking?.stationName || "Spark EV Fast Hub"}
        </Text>
        <Text style={styles.stationAddr}>
          {booking?.address || "Infopark Phase 1, Kakkanad, Kochi"}
        </Text>

        {/* Visual QR Matrix */}
        <View style={styles.qrFrame}>
          <View style={styles.qrPattern}>
            {Array.from({ length: 49 }).map((_, idx) => {
              const isCorner =
                idx < 3 ||
                (idx >= 4 && idx < 7) ||
                idx % 7 === 0 ||
                idx % 3 === 0 ||
                idx === 24;
              return (
                <View
                  key={idx}
                  style={[
                    styles.qrCell,
                    { backgroundColor: isCorner ? "#151C18" : "#E8ECEA" },
                  ]}
                />
              );
            })}
            <View style={styles.qrCenterBadge}>
              <Text style={styles.qrBolt}>⚡</Text>
            </View>
          </View>
        </View>

        <Text style={styles.otpLabel}>6-DIGIT CHARGER UNLOCK PIN</Text>
        <View style={styles.otpBox}>
          <Text style={styles.otpCodeText}>{otpFormatted}</Text>
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Reservation ID</Text>
            <Text style={styles.metaVal}>#{booking?.id || "VOLT-99482"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Time Slot</Text>
            <Text style={styles.metaVal}>
              {booking?.slotTime || "Today • 16:30 – 17:30"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Indian EV Connector</Text>
            <Text style={styles.metaVal}>
              {booking?.connectorType || "Type-2 AC Wallbox"} (₹
              {(booking?.pricePerKwh ?? 10.5).toFixed(2)}/kWh)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Pre-Authorized Hold</Text>
            <Text style={[styles.metaVal, { color: "#096B30" }]}>
              ₹{(booking?.totalAmount ?? 189.0).toFixed(2)} (VoltMate Wallet)
            </Text>
          </View>
        </View>
      </View>

      {/* Native Dialer & Turn-by-Turn Maps Row */}
      <View style={styles.secondaryActionRow}>
        <TouchableOpacity
          style={styles.callHostBtn}
          onPress={() =>
            launchNativePhoneCall(
              booking?.hostPhone || station?.hostPhone || "+919847011223"
            )
          }
        >
          <Text style={styles.callHostBtnTxt}>📞 Call Station / Host</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.openMapsBtn}
          onPress={() =>
            launchNativeTurnByTurnMaps(
              station.latitude,
              station.longitude,
              station.name
            )
          }
        >
          <Text style={styles.openMapsBtnTxt}>🗺️ Open Maps</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.startChargeBtn}
        onPress={() => startChargingSession(booking?.id, station?.id)}
      >
        <Text style={styles.startChargeBtnText}>
          ⚡ Start Live Charging Session
        </Text>
      </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  passCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 14,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#05E660",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.6,
  },
  stationName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#151C18",
    textAlign: "center",
  },
  stationAddr: {
    fontSize: 13,
    color: "#7C857F",
    marginTop: 4,
    marginBottom: 20,
    textAlign: "center",
  },
  qrFrame: {
    width: 196,
    height: 196,
    borderRadius: 24,
    backgroundColor: "#F5F7F6",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  qrPattern: {
    width: 154,
    height: 154,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  qrCell: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  qrCenterBadge: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  qrBolt: {
    fontSize: 20,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C857F",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  otpBox: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 22,
  },
  otpCodeText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#151C18",
    letterSpacing: 2,
  },
  metaList: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#EFF2F0",
    paddingTop: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaKey: {
    fontSize: 13,
    color: "#7C857F",
    fontWeight: "600",
  },
  metaVal: {
    fontSize: 13,
    color: "#151C18",
    fontWeight: "800",
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  callHostBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#16B374",
    alignItems: "center",
    justifyContent: "center",
  },
  callHostBtnTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  openMapsBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  openMapsBtnTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  startChargeBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#05E660",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  startChargeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
});
