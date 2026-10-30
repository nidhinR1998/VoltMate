import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Share,
  Platform,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Star,
  Heart,
  Forward,
  Calendar,
  Clock,
  DollarSign,
  Fuel,
  Check,
  Zap,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  ConnectorPlugIllustration,
  getStationAssetImage,
} from "../../components/ui/EvVisuals";
import { useAuthStore } from "../../store/useAuthStore";

interface ConnectorOption {
  id: string;
  name: "Type A" | "CHAdeMO" | "Type B";
  priceLabel: string;
  pricePerKwh: number;
  slotLabel: string;
  powerKw: number;
}

const CONNECTOR_OPTIONS: ConnectorOption[] = [
  {
    id: "conn-type-a",
    name: "Type A",
    priceLabel: "$1.00/ kWh",
    pricePerKwh: 10.0,
    slotLabel: "Slot A",
    powerKw: 22.0,
  },
  {
    id: "conn-chademo",
    name: "CHAdeMO",
    priceLabel: "$0.5/ kWh",
    pricePerKwh: 8.5,
    slotLabel: "Slot B",
    powerKw: 50.0,
  },
  {
    id: "conn-type-b",
    name: "Type B",
    priceLabel: "$0.75/ kWh",
    pricePerKwh: 9.5,
    slotLabel: "Slot C",
    powerKw: 60.0,
  },
];

const DATE_OPTIONS = [
  "Thu, May 30",
  "Fri, May 31",
  "Sat, Jun 01",
  "Sun, Jun 02",
  "Mon, Jun 03",
];

const TIME_OPTIONS = [
  "14:00",
  "15:00",
  "16:30",
  "17:30",
  "18:30",
  "20:00",
];

export default function BookingSheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stationId?: string;
    stationName?: string;
    stationAddress?: string;
    distanceKm?: string;
    driveMins?: string;
    rating?: string;
    reviews?: string;
  }>();

  const {
    savedStationIds,
    toggleSavedStation,
    stations,
    createBooking,
    startChargingSession,
  } = useAuthStore();

  const stationId = params.stationId || "st-pall-mall";
  const matchedStation = stations.find((s) => s.id === stationId);
  const stationName =
    params.stationName || matchedStation?.title || "Pall Mall Station";
  const stationAddress =
    params.stationAddress ||
    matchedStation?.address ||
    "1 White Hall Palace, Street 5, Kakkanad";
  const distanceKm =
    params.distanceKm || String(matchedStation?.distanceKm ?? "1.8");
  const driveMins =
    params.driveMins || String(matchedStation?.driveMins ?? "3");
  const rating = params.rating || String(matchedStation?.rating ?? "4.5");
  const reviews = params.reviews || String(matchedStation?.reviews ?? "56");

  const isFavorite = savedStationIds.includes(stationId);

  const connectorOptions = matchedStation?.connectorSpecs || CONNECTOR_OPTIONS;

  const [selectedConnectorId, setSelectedConnectorId] =
    useState<string>("conn-chademo");
  const [selectedDate, setSelectedDate] = useState<string>("Thu, May 30");
  const [selectedTime, setSelectedTime] = useState<string>("16:30");

  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [createdGatePassCode, setCreatedGatePassCode] =
    useState<string>("#849-201");

  const activeConnector =
    connectorOptions.find((c) => c.id === selectedConnectorId) ||
    connectorOptions[1] ||
    CONNECTOR_OPTIONS[1];

  const heroImageSource = getStationAssetImage(stationName);

  const handleShareStation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `${stationName} — ${stationAddress} (${distanceKm} km away). Book EV charging on VoltMate!`,
      });
    } catch {}
  };

  const handleConfirmBooking = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const [hrStr, minStr] = selectedTime.split(":");
    const nextHr = String((parseInt(hrStr || "16", 10) + 1) % 24).padStart(
      2,
      "0"
    );
    const timeWindow = `${selectedTime} – ${nextHr}:${minStr || "30"}`;
    const bk = createBooking({
      stationId,
      stationName,
      stationAddress,
      connectorName: activeConnector.name,
      slotLabel: activeConnector.slotLabel,
      powerKw: activeConnector.powerKw,
      pricePerKwh: activeConnector.pricePerKwh,
      priceLabel: activeConnector.priceLabel,
      dateLabel: selectedDate,
      timeWindow,
    });
    setCreatedBookingId(bk.id);
    setCreatedGatePassCode(bk.gatePassCode);
    setShowSuccessModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== HERO STATION COVER BANNER (FROM /mobile/assets/) ===================== */}
        <View style={styles.heroBannerContainer}>
          <Image
            source={heroImageSource}
            style={styles.heroBannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              "rgba(242, 244, 243, 0.05)",
              "rgba(242, 244, 243, 0.55)",
              "#F2F4F3",
            ]}
            locations={[0, 0.68, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Floating Circular Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#151C18" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ===================== STATION HEADER DETAILS ===================== */}
        <View style={styles.contentPadding}>
          <Text style={styles.stationTitle}>{stationName}</Text>
          <Text style={styles.stationAddress}>{stationAddress}</Text>

          <View style={styles.metaActionsRow}>
            <View style={{ flex: 1 }}>
              {/* Rating */}
              <View style={styles.ratingRow}>
                <Star size={14} color="#151C18" fill="#151C18" />
                <Text style={styles.ratingBold}>{rating}</Text>
                <Text style={styles.ratingCount}>({reviews} Reviews)</Text>
              </View>

              {/* Distance & Time Pills */}
              <View style={styles.pillsRow}>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>{distanceKm} km</Text>
                </View>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>{driveMins} min</Text>
                </View>
              </View>
            </View>

            {/* Right Share & Favorite Circular Buttons */}
            <View style={styles.actionCirclesRow}>
              <TouchableOpacity
                onPress={handleShareStation}
                activeOpacity={0.8}
                style={styles.darkCircleBtn}
              >
                <Forward size={18} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  toggleSavedStation(stationId);
                }}
                activeOpacity={0.8}
                style={styles.lightCircleBtn}
              >
                <Heart
                  size={18}
                  color={isFavorite ? "#E53935" : "#151C18"}
                  fill={isFavorite ? "#E53935" : "none"}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ===================== AVAILABLE CONNECTORS ===================== */}
          <Text style={styles.sectionHeading}>Available Connectors</Text>

          <View style={styles.connectorsList}>
            {CONNECTOR_OPTIONS.map((conn) => {
              const isSelected = conn.id === selectedConnectorId;
              return (
                <TouchableOpacity
                  key={conn.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedConnectorId(conn.id);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.connectorCard,
                    isSelected && styles.connectorCardSelected,
                  ]}
                >
                  <View style={styles.connectorIllustrationWrap}>
                    <ConnectorPlugIllustration variant={conn.name} size={48} />
                  </View>

                  <View style={styles.connectorInfo}>
                    <Text style={styles.connectorName}>{conn.name}</Text>
                    <View style={styles.connectorMetaRow}>
                      <View style={styles.metaBadgeItem}>
                        <View style={styles.coinCircle}>
                          <DollarSign
                            size={10}
                            color="#151C18"
                            strokeWidth={2.5}
                          />
                        </View>
                        <Text style={styles.metaItemText}>
                          {conn.priceLabel}
                        </Text>
                      </View>

                      <View style={styles.metaBadgeItem}>
                        <Fuel size={13} color="#757F7A" strokeWidth={1.8} />
                        <Text style={styles.metaItemText}>
                          {conn.slotLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ===================== CHOOSE DATE & TIME ===================== */}
          <Text style={styles.sectionHeading}>Choose Date & Time</Text>

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              onPress={() => setShowDateModal(true)}
              activeOpacity={0.8}
              style={styles.dateTimePill}
            >
              <Text style={styles.dateTimeText}>{selectedDate}</Text>
              <Calendar size={17} color="#151C18" strokeWidth={1.8} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTimeModal(true)}
              activeOpacity={0.8}
              style={styles.dateTimePill}
            >
              <Text style={styles.dateTimeText}>{selectedTime}</Text>
              <Clock size={17} color="#151C18" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* ===================== CONFIRM BOOKING BUTTON ===================== */}
          <TouchableOpacity
            onPress={handleConfirmBooking}
            activeOpacity={0.88}
            style={styles.confirmBookingBtn}
          >
            <Text style={styles.confirmBookingText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===================== DATE PICKER MODAL ===================== */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>
            {DATE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => {
                  setSelectedDate(d);
                  setShowDateModal(false);
                }}
                style={[
                  styles.optionRow,
                  selectedDate === d && styles.optionRowSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionRowText,
                    selectedDate === d && styles.optionRowTextSelected,
                  ]}
                >
                  {d}
                </Text>
                {selectedDate === d && <Check size={16} color="#05E660" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ===================== TIME PICKER MODAL ===================== */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Charging Slot Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimeModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setSelectedTime(t);
                    setShowTimeModal(false);
                  }}
                  style={[
                    styles.timeGridCell,
                    selectedTime === t && styles.timeGridCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeGridText,
                      selectedTime === t && styles.timeGridTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== BOOKING SUCCESS MODAL ===================== */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.successBadgeCircle}>
              <Zap size={28} color="#151C18" fill="#151C18" />
            </View>
            <Text style={styles.successTitle}>Slot Reserved!</Text>
            <Text style={styles.successSub}>
              {stationName} • {activeConnector.name} ({activeConnector.slotLabel})
            </Text>
            <Text style={styles.successMeta}>
              {selectedDate} at {selectedTime} • Gate Pass {createdGatePassCode}
            </Text>

            <View style={styles.successButtonsCol}>
              <TouchableOpacity
                onPress={() => {
                  setShowSuccessModal(false);
                  startChargingSession({
                    bookingId: createdBookingId || undefined,
                    stationId,
                    stationName,
                    connectorName: activeConnector.name,
                    slotLabel: activeConnector.slotLabel,
                    powerKw: activeConnector.powerKw,
                    pricePerKwh: activeConnector.pricePerKwh,
                  });
                  router.push({
                    pathname: "/(driver)/active-charge",
                    params: {
                      stationId,
                      stationName,
                      connectorName: activeConnector.name,
                      slotLabel: activeConnector.slotLabel,
                      powerKw: String(activeConnector.powerKw),
                      priceLabel: activeConnector.priceLabel,
                    },
                  });
                }}
                style={styles.confirmBookingBtn}
              >
                <Text style={styles.confirmBookingText}>
                  Start Live Charging Session
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push({
                    pathname: "/(driver)/gate-pass",
                    params: { bookingId: createdBookingId || "" },
                  });
                }}
                style={styles.secondaryPassBtn}
              >
                <Text style={styles.secondaryPassBtnText}>
                  View Digital Gate Pass
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 40,
  },
  heroBannerContainer: {
    height: 220,
    width: "100%",
    position: "relative",
    backgroundColor: "#E5EAE7",
  },
  heroBannerImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 16 : 20,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  contentPadding: {
    paddingHorizontal: 22,
    marginTop: -6,
  },
  stationTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -0.4,
  },
  stationAddress: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
  },
  metaActionsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 22,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  ratingBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111714",
  },
  ratingCount: {
    fontSize: 12,
    color: "#757F7A",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  greyPill: {
    backgroundColor: "#E3E7E5",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 14,
  },
  greyPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#151C18",
  },
  actionCirclesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  darkCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#151C18",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  lightCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3E7E5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
    marginBottom: 12,
  },
  connectorsList: {
    gap: 10,
    marginBottom: 22,
  },
  connectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  connectorCardSelected: {
    borderColor: "#151C18",
    backgroundColor: "#FFFFFF",
  },
  connectorIllustrationWrap: {
    marginRight: 14,
  },
  connectorInfo: {
    flex: 1,
  },
  connectorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
    marginBottom: 6,
  },
  connectorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  metaBadgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  coinCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.3,
    borderColor: "#757F7A",
    alignItems: "center",
    justifyContent: "center",
  },
  metaItemText: {
    fontSize: 12,
    color: "#757F7A",
    fontWeight: "500",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  dateTimePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    borderWidth: 1.2,
    borderColor: "#2C322F",
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111714",
  },
  confirmBookingBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  confirmBookingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111714",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#F7F9F8",
  },
  optionRowSelected: {
    backgroundColor: "#151C18",
  },
  optionRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
  },
  optionRowTextSelected: {
    color: "#05E660",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeGridCell: {
    width: "30%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F7F9F8",
    alignItems: "center",
    justifyContent: "center",
  },
  timeGridCellSelected: {
    backgroundColor: "#151C18",
  },
  timeGridText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
  },
  timeGridTextSelected: {
    color: "#05E660",
  },
  successBadgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111714",
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    color: "#525C57",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "500",
  },
  successMeta: {
    fontSize: 12,
    color: "#757F7A",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 22,
  },
  successButtonsCol: {
    gap: 10,
  },
  secondaryPassBtn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryPassBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
  },
});
