import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
  ImageBackground,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useVoltMateEngine,
  DEFAULT_CONNECTOR_SPECS,
  TAB_BAR_SAFE_PADDING,
  BookingRecord,
} from "../../store/useVoltMateEngine";
import {
  ConnectorPlugIllustration,
  STATION_HERO_BANNER_IMAGE,
} from "../../components/ui/EvVisuals";
import {
  launchNativePhoneCall,
  launchNativeTurnByTurnMaps,
} from "../../services/notificationService";

const DATE_OPTIONS = [
  "Today, Oct 31",
  "Tomorrow, Nov 1",
  "Mon, Nov 2",
  "Tue, Nov 3",
];

const TIME_OPTIONS = [
  "Now (Immediate)",
  "10:00 – 11:00",
  "11:00 – 12:00",
  "14:00 – 15:00",
  "16:30 – 17:30",
  "19:00 – 20:00",
  "Overnight 22:00 – 06:00",
];

export default function BookingSheetScreen() {
  const router = useRouter();
  const { stationId, connectorId } = useLocalSearchParams<{
    stationId?: string;
    connectorId?: string;
  }>();

  const {
    stations,
    selectedStationId,
    favoriteStationIds,
    toggleFavoriteStation,
    createBooking,
    startChargingSession,
  } = useVoltMateEngine();

  const station =
    stations.find((s) => s.id === (stationId || selectedStationId)) ||
    stations[0];
  const connectors = station?.connectorSpecs || DEFAULT_CONNECTOR_SPECS;

  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(
    connectorId || connectors[0].id
  );
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [reservedBookingModal, setReservedBookingModal] =
    useState<BookingRecord | null>(null);

  const isFavorite = favoriteStationIds.includes(station.id);
  const chosenConnector =
    connectors.find((c) => c.id === selectedConnectorId) || connectors[0];

  const estimatedKwh = Number(
    Math.min(35, chosenConnector.powerKw * durationHours * 0.85).toFixed(1)
  );
  const estimatedTotalInr = Number(
    (estimatedKwh * chosenConnector.pricePerKwh).toFixed(2)
  );

  const handleShareStation = async () => {
    try {
      await Share.share({
        message: `Charge at ${station.name} (${station.address}) on VoltMate Kerala — starting at ₹${station.pricePerKwh.toFixed(2)}/kWh!`,
      });
    } catch {
      // ignore
    }
  };

  const handleConfirmBooking = async () => {
    const created = await createBooking({
      stationId: station.id,
      stationName: station.name,
      address: station.address,
      hostName: station.hostName,
      hostPhone: station.hostPhone,
      slotTime: `${selectedDate} • ${selectedTime}`,
      slotDate: selectedDate,
      connectorType: chosenConnector.name,
      powerKw: chosenConnector.powerKw,
      pricePerKwh: chosenConnector.pricePerKwh,
      estimatedKwh,
      totalAmount: estimatedTotalInr,
    });
    setReservedBookingModal(created);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Hero Banner with Station Photography & Back Button */}
      <ImageBackground
        source={STATION_HERO_BANNER_IMAGE}
        style={styles.heroBanner}
        imageStyle={styles.heroBannerImg}
      >
        <View style={styles.heroOverlay}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(driver)/map-radar")
            }
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.heroBadgePill}>
            <Text style={styles.heroBadgeText}>
              {station.stationType === "P2P_HOME"
                ? `🏠 P2P Host • ${station.hostName}`
                : `⚡ Public Fast Hub • ${station.hostName}`}
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* Main Details Sheet */}
      <View style={styles.bodyWrap}>
        <View style={styles.stationTopRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.stationTitle}>{station.name}</Text>
            <Text style={styles.stationAddr}>{station.address}</Text>

            <View style={styles.ratingRow}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingNum}>{station.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>
                ({station.reviewsCount} Verified Reviews)
              </Text>
            </View>

            <View style={styles.chipsRow}>
              <View style={styles.grayChip}>
                <Text style={styles.grayChipText}>{station.distanceKm} km</Text>
              </View>
              <TouchableOpacity
                style={styles.grayChip}
                onPress={() =>
                  launchNativeTurnByTurnMaps(
                    station.latitude,
                    station.longitude,
                    station.name
                  )
                }
              >
                <Text style={styles.grayChipText}>🗺️ Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.grayChip, { backgroundColor: "#EAFBF0" }]}
                onPress={() => launchNativePhoneCall(station.hostPhone)}
              >
                <Text style={[styles.grayChipText, { color: "#096B30" }]}>
                  📞 Call Host
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionCirclesRow}>
            <TouchableOpacity
              style={styles.shareDarkCircle}
              onPress={handleShareStation}
            >
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.favLightCircle}
              onPress={() => toggleFavoriteStation(station.id)}
            >
              <Text
                style={[
                  styles.heartIcon,
                  isFavorite && { color: "#E03131" },
                ]}
              >
                {isFavorite ? "♥" : "♡"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Indian Connectors Section */}
        <Text style={styles.sectionTitle}>Available Indian EV Connectors</Text>

        {connectors.map((c) => {
          const isSelected = c.id === selectedConnectorId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.connectorCard,
                isSelected && styles.connectorCardSelected,
              ]}
              onPress={() => setSelectedConnectorId(c.id)}
              activeOpacity={0.85}
            >
              <ConnectorPlugIllustration type={c.name} size="md" />
              <View style={styles.connectorInfoCol}>
                <Text style={styles.connectorName}>{c.name}</Text>
                <View style={styles.connectorMetaRow}>
                  <Text style={styles.metaText}>⚡ {c.priceLabel}</Text>
                  <Text style={styles.metaText}>⛽ {c.slotLabel}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && <Text style={styles.radioCheckTxt}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Choose Date & Time */}
        <Text style={styles.sectionTitle}>Choose Date & Time Slot</Text>

        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimePill}
            onPress={() => setDateModalVisible(true)}
          >
            <Text style={styles.dateTimeText}>{selectedDate}</Text>
            <Text style={styles.dateTimeIcon}>📅</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimePill}
            onPress={() => setTimeModalVisible(true)}
          >
            <Text style={styles.dateTimeText} numberOfLines={1}>
              {selectedTime}
            </Text>
            <Text style={styles.dateTimeIcon}>🕒</Text>
          </TouchableOpacity>
        </View>

        {/* Duration Selector */}
        <View style={styles.durationRow}>
          {[0.5, 1, 1.5, 2].map((hrs) => (
            <TouchableOpacity
              key={hrs}
              style={[
                styles.durationChip,
                durationHours === hrs && styles.durationChipActive,
              ]}
              onPress={() => setDurationHours(hrs)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  durationHours === hrs && styles.durationChipTextActive,
                ]}
              >
                {hrs === 0.5 ? "30 mins" : `${hrs} hr${hrs > 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Estimate Bill Box */}
        <View style={styles.estimateCard}>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>Selected Connector</Text>
            <Text style={styles.estimateVal}>{chosenConnector.name}</Text>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>KSEB / P2P Tariff Rate</Text>
            <Text style={styles.estimateVal}>
              ₹{chosenConnector.pricePerKwh.toFixed(2)}/kWh
            </Text>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>Est. Energy Delivered</Text>
            <Text style={styles.estimateVal}>~{estimatedKwh} kWh</Text>
          </View>
          <View style={[styles.estimateRow, styles.estimateTotalRow]}>
            <Text style={styles.estimateTotalLabel}>
              Estimated Session Total
            </Text>
            <Text style={styles.estimateTotalVal}>
              ₹{estimatedTotalInr.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Confirm Booking Button */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmBooking}
          activeOpacity={0.9}
        >
          <Text style={styles.confirmBtnText}>
            Confirm Booking • ₹{estimatedTotalInr.toFixed(2)}
          </Text>
        </TouchableOpacity>

        {/* Instant Start Charging Button */}
        <TouchableOpacity
          style={styles.instantChargeBtn}
          onPress={() => startChargingSession(undefined, station.id)}
          activeOpacity={0.9}
        >
          <Text style={styles.instantChargeBtnText}>
            ⚡ Start Live Charging Session Immediately
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Charging Date</Text>
            {DATE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.pickerOption,
                  selectedDate === d && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedDate(d);
                  setDateModalVisible(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{d}</Text>
                {selectedDate === d && <Text style={styles.checkTxt}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={timeModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Time Slot</Text>
            {TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.pickerOption,
                  selectedTime === t && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedTime(t);
                  setTimeModalVisible(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{t}</Text>
                {selectedTime === t && <Text style={styles.checkTxt}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Slot Reserved! Popup Modal */}
      <Modal
        visible={!!reservedBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReservedBookingModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reservedPopupCard}>
            <View style={styles.reservedBadgeCircle}>
              <Text style={styles.reservedBadgeIcon}>✓</Text>
            </View>
            <Text style={styles.reservedPopupTitle}>Slot Reserved!</Text>
            <Text style={styles.reservedPopupSub}>
              {reservedBookingModal?.stationName} •{" "}
              {reservedBookingModal?.slotTime}
            </Text>

            <View style={styles.reservedOtpBox}>
              <Text style={styles.reservedOtpLabel}>
                DIGITAL GATE PASS PIN
              </Text>
              <Text style={styles.reservedOtpDigits}>
                #{reservedBookingModal?.otpCode.slice(0, 3)}-
                {reservedBookingModal?.otpCode.slice(3)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.popupStartChargeBtn}
              onPress={() => {
                const targetId = reservedBookingModal?.id;
                setReservedBookingModal(null);
                startChargingSession(targetId);
              }}
            >
              <Text style={styles.popupStartChargeTxt}>
                ⚡ Start Live Charging Session
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupGatePassBtn}
              onPress={() => {
                const targetId = reservedBookingModal?.id;
                setReservedBookingModal(null);
                router.push({
                  pathname: "/(driver)/gate-pass",
                  params: { bookingId: targetId },
                });
              }}
            >
              <Text style={styles.popupGatePassTxt}>
                🎟️ View Digital Gate Pass
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F3",
  },
  content: {
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  heroBanner: {
    height: 195,
    backgroundColor: "#DCE3DF",
  },
  heroBannerImg: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(21, 28, 24, 0.25)",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  heroBadgePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(21, 28, 24, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: "#05E660",
    fontSize: 12,
    fontWeight: "800",
  },
  bodyWrap: {
    paddingHorizontal: 22,
    marginTop: -18,
    backgroundColor: "#FAF8F3",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 22,
  },
  stationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  stationTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.4,
  },
  stationAddr: {
    fontSize: 13,
    color: "#7C857F",
    fontWeight: "500",
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginBottom: 12,
  },
  starIcon: {
    fontSize: 14,
    color: "#151C18",
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  reviewsText: {
    fontSize: 12,
    color: "#7C857F",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  grayChip: {
    backgroundColor: "#E4E8E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  grayChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C3530",
  },
  actionCirclesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  shareDarkCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  favLightCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E6EAE7",
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: {
    fontSize: 20,
    color: "#151C18",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
    marginTop: 4,
  },
  connectorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  connectorCardSelected: {
    borderColor: "#10241B",
    borderWidth: 2,
    backgroundColor: "#F6FEF9",
  },
  connectorInfoCol: {
    flex: 1,
  },
  connectorName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 6,
  },
  connectorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#5C6460",
    fontWeight: "700",
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#16B374",
    backgroundColor: "#16B374",
  },
  radioCheckTxt: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  dateTimePill: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#BBC2BE",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
    flex: 1,
  },
  dateTimeIcon: {
    fontSize: 15,
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  durationChipActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
  },
  durationChipTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  estimateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  estimateLabel: {
    fontSize: 13,
    color: "#6B746E",
    fontWeight: "600",
  },
  estimateVal: {
    fontSize: 13,
    color: "#151C18",
    fontWeight: "800",
  },
  estimateTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  estimateTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  estimateTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#096B30",
  },
  confirmBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#05E660",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 12,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  instantChargeBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  instantChargeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#05E660",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 14,
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#F5F7F6",
    marginBottom: 10,
  },
  pickerOptionActive: {
    borderWidth: 1.5,
    borderColor: "#151C18",
    backgroundColor: "#EAFBF0",
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#151C18",
  },
  checkTxt: {
    fontSize: 16,
    fontWeight: "900",
    color: "#151C18",
  },
  reservedPopupCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 26,
    alignItems: "center",
  },
  reservedBadgeCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  reservedBadgeIcon: {
    fontSize: 28,
    fontWeight: "900",
    color: "#151C18",
  },
  reservedPopupTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#151C18",
  },
  reservedPopupSub: {
    fontSize: 13,
    color: "#6B746E",
    marginTop: 4,
    textAlign: "center",
  },
  reservedOtpBox: {
    width: "100%",
    backgroundColor: "#10241B",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginVertical: 18,
  },
  reservedOtpLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A7F3D0",
    letterSpacing: 0.8,
  },
  reservedOtpDigits: {
    fontSize: 28,
    fontWeight: "900",
    color: "#05E660",
    marginTop: 4,
    letterSpacing: 1.5,
  },
  popupStartChargeBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  popupStartChargeTxt: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  popupGatePassBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  popupGatePassTxt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
