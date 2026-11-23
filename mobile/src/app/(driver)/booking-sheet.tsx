import React, { useEffect, useMemo, useState } from "react";
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
  ArrowLeft,
  Home as HomeIcon,
  Zap,
  Star,
  Navigation,
  Phone,
  Share2,
  Heart,
  PlugZap,
  Calendar,
  Clock,
  Check,
  Copy,
  Ticket,
  ShieldCheck,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  DEFAULT_CONNECTOR_SPECS,
  BookingRecord,
  getCompatibleConnectorsForVehicle,
} from "../../store/useVoltMateEngine";
import {
  ConnectorPlugIllustration,
  STATION_HERO_BANNER_IMAGE,
} from "../../components/ui/EvVisuals";
import {
  launchNativePhoneCall,
  launchNativeTurnByTurnMaps,
} from "../../services/notificationService";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  pluralize,
  isOwnStationDistanceHidden,
  estimateBookingKwhAndTotal,
} from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppChip,
  TimelineSlotPicker,
} from "../../components/ui/DesignSystem";

function buildDynamicDateOptions(): string[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const result: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const labelPrefix =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[d.getDay()];
    result.push(`${labelPrefix}, ${d.getDate()} ${months[d.getMonth()]}`);
  }
  return result;
}

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

  const dateOptions = useMemo(() => buildDynamicDateOptions(), []);

  const {
    stations,
    vehicles,
    selectedStationId,
    favoriteStationIds,
    toggleFavoriteStation,
    createBooking,
    startChargingSession,
    hideToast,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];
  const station =
    stations.find((s) => s.id === (stationId || selectedStationId)) ||
    stations[0];
  const connectors = useMemo(
    () =>
      getCompatibleConnectorsForVehicle(
        station?.connectorSpecs || DEFAULT_CONNECTOR_SPECS,
        activeVehicle
      ),
    [station?.id, activeVehicle?.id, activeVehicle?.connectorType]
  );

  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(
    connectorId || connectors[0].id
  );
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [reservedBookingModal, setReservedBookingModal] =
    useState<BookingRecord | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  useEffect(() => {
    if (connectorId && connectors.some((c) => c.id === connectorId)) {
      setSelectedConnectorId(connectorId);
    } else if (connectors[0]?.id) {
      setSelectedConnectorId(connectors[0].id);
    }
  }, [station?.id, connectorId, connectors]);

  const isFavorite = favoriteStationIds.includes(station.id);
  const chosenConnector =
    connectors.find((c) => c.id === selectedConnectorId) || connectors[0];

  const { estimatedKwh, estimatedTotalInr } = estimateBookingKwhAndTotal(
    chosenConnector.powerKw,
    durationHours,
    chosenConnector.pricePerKwh
  );

  const isP2pHome =
    station.stationType === "P2P_HOME" || Boolean(station.isUserHosted);
  const hideDistance = isOwnStationDistanceHidden(
    station.isUserHosted,
    station.distanceKm
  );

  const handleShareStation = async () => {
    try {
      await Share.share({
        message: `Charge at ${station.name} (${station.address}) on VoltMate — starting at ₹${station.pricePerKwh.toFixed(2)}/kWh!`,
      });
    } catch {
      // ignore
    }
  };

  const handleConfirmBooking = async () => {
    if (isSubmittingBooking) return;
    setIsSubmittingBooking(true);
    try {
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
      // Suppress redundant top toast when showing the dedicated success modal
      hideToast();
      setPinCopied(false);
      setReservedBookingModal(created);
    } catch {
      // Insufficient balance toast and Razorpay Top-Up modal are already triggered by createBooking
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCopyPin = async (pin: string) => {
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2500);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Hero Header: Architectural P2P Home Host Card OR Commercial Public Hub Photo */}
      {isP2pHome ? (
        <View style={styles.p2pHeroHeader}>
          <View style={styles.p2pHeroTopRow}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(driver)/map-radar")
              }
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.heroBadgePill}>
              <HomeIcon size={13} color={COLORS.neonLive} />
              <Text style={styles.heroBadgeText}>
                Verified P2P Home Host • {station.hostName}
              </Text>
            </View>
          </View>
          <View style={styles.p2pIllustrationCard}>
            <View style={styles.p2pHostIconCircle}>
              <PlugZap size={28} color={COLORS.neonLive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.p2pBannerTitle}>
                Residential Driveway EV Charger
              </Text>
              <Text style={styles.p2pBannerSub}>
                Protected by 6-digit Gate Pass OTP • Verified Home Tariff
              </Text>
            </View>
          </View>
        </View>
      ) : (
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
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.heroBadgePill}>
              <Zap size={13} color={COLORS.neonLive} />
              <Text style={styles.heroBadgeText}>
                Public Fast Hub • {station.hostName}
              </Text>
            </View>
          </View>
        </ImageBackground>
      )}

      {/* Main Details Sheet */}
      <View style={styles.bodyWrap}>
        <View style={styles.stationTopRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.stationTitle} numberOfLines={2}>
              {station.name}
            </Text>
            <Text style={styles.stationAddr} numberOfLines={2}>
              {station.address}
            </Text>

            <View style={styles.ratingRow}>
              {station.reviewsCount > 0 && station.rating > 0 ? (
                <>
                  <Star
                    size={14}
                    color={COLORS.warning}
                    fill={COLORS.warning}
                  />
                  <Text style={styles.ratingNum}>
                    {station.rating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewsText}>
                    ({pluralize(station.reviewsCount, "verified review")})
                  </Text>
                </>
              ) : (
                <Text style={styles.distanceInline}>New</Text>
              )}
              {!hideDistance && (
                <>
                  <Text style={styles.dotSep}>•</Text>
                  <Text style={styles.distanceInline}>
                    {station.distanceKm} km away
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.actionCirclesRow}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={handleShareStation}
              accessibilityRole="button"
              accessibilityLabel="Share station"
            >
              <Share2 size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => toggleFavoriteStation(station.id)}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? "Remove from favorites" : "Save to favorites"
              }
            >
              <Heart
                size={18}
                color={isFavorite ? COLORS.destructive : COLORS.textPrimary}
                fill={isFavorite ? COLORS.destructive : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Directions and Call Host on ONE Clean Row */}
        <View style={styles.quickContactRow}>
          <AppButton
            label="Directions"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            icon={<Navigation size={16} color={COLORS.primary} />}
            onPress={() =>
              launchNativeTurnByTurnMaps(
                station.latitude,
                station.longitude,
                station.name
              )
            }
          />
          <AppButton
            label="Call Host"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            icon={<Phone size={16} color={COLORS.primary} />}
            onPress={() => launchNativePhoneCall(station.hostPhone)}
          />
        </View>

        {/* Station Amenities Pills */}
        <View style={styles.amenitiesPillRow}>
          {(
            station.amenities || [
              "Covered Parking",
              "CCTV Monitored",
              "24/7 Access",
            ]
          ).map((amenity) => (
            <AppChip key={amenity} label={amenity} />
          ))}
        </View>

        {/* Available Indian Connectors Section — Unified Selectable Card Pattern (Border + Check) & Real EV Plug Icon */}
        <Text style={styles.sectionTitle}>Select EV Connector</Text>

        {connectors.map((c) => {
          const isSelected = c.id === selectedConnectorId;
          return (
            <AppCard
              key={c.id}
              selected={isSelected}
              onPress={() => setSelectedConnectorId(c.id)}
              style={styles.connectorCard}
            >
              <View style={styles.connectorRowInner}>
                <ConnectorPlugIllustration type={c.name} size="md" />
                <View style={styles.connectorInfoCol}>
                  <Text style={styles.connectorName} numberOfLines={2}>
                    {c.name}
                  </Text>
                  <View style={styles.connectorMetaRow}>
                    <View style={styles.metaBadge}>
                      <Zap size={12} color={COLORS.primary} />
                      <Text style={styles.metaText}>{c.priceLabel}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <PlugZap size={12} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{c.slotLabel}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </AppCard>
          );
        })}

        {/* Choose Date, Time & Duration via TimelineSlotPicker */}
        <Text style={styles.sectionTitle}>Choose Date & Time Slot</Text>

        <View style={{ marginBottom: SPACING.md }}>
          <TimelineSlotPicker
            dates={dateOptions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            timeSlots={TIME_OPTIONS}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            durationsHours={[0.5, 1, 1.5, 2]}
            selectedDurationHours={durationHours}
            onSelectDurationHours={setDurationHours}
          />
        </View>

        {/* Live Estimate Bill Box */}
        <AppCard style={styles.estimateCard}>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>Selected Connector</Text>
            <Text style={styles.estimateVal} numberOfLines={1}>
              {chosenConnector.name}
            </Text>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateLabel}>Tariff Rate</Text>
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
        </AppCard>

        {/* Sticky CTA Hierarchy: Primary "Book • ₹X", Secondary "Start now" */}
        <AppButton
          label={`Book • ₹${estimatedTotalInr.toFixed(2)}`}
          variant="primary"
          size="lg"
          loading={isSubmittingBooking}
          disabled={isSubmittingBooking}
          style={{ marginBottom: SPACING.sm }}
          onPress={handleConfirmBooking}
        />

        <AppButton
          label="Start now"
          variant="secondary"
          size="lg"
          icon={<Zap size={17} color={COLORS.primary} />}
          onPress={() => startChargingSession(undefined, station.id)}
        />
      </View>

      {/* Slot Reserved! Success Sheet — PIN without '#', Copy + QR Preview, Add to Calendar, Directions */}
      <Modal
        visible={!!reservedBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReservedBookingModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reservedPopupCard}>
            <View style={styles.reservedBadgeCircle}>
              <Check size={28} color={COLORS.textInverse} strokeWidth={3} />
            </View>
            <Text style={styles.reservedPopupTitle}>Slot Reserved!</Text>
            <Text style={styles.reservedPopupSub} numberOfLines={2}>
              {reservedBookingModal?.stationName} •{" "}
              {reservedBookingModal?.slotTime}
            </Text>

            <View style={styles.reservedPassRow}>
              {/* Mini QR Matrix Preview */}
              <View style={styles.miniQrBox}>
                <View style={styles.miniQrGrid}>
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const isDark =
                      idx % 2 === 0 || idx < 5 || idx > 19 || idx === 12;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.miniQrCell,
                          {
                            backgroundColor: isDark
                              ? COLORS.textPrimary
                              : COLORS.border,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* 6-Digit PIN Without '#' Prefix + Copy Button */}
              <View style={styles.reservedOtpBox}>
                <Text style={styles.reservedOtpLabel}>
                  DIGITAL GATE PASS PIN
                </Text>
                <Text style={styles.reservedOtpDigits}>
                  {reservedBookingModal?.otpCode.slice(0, 3)}{" "}
                  {reservedBookingModal?.otpCode.slice(3)}
                </Text>
                <TouchableOpacity
                  style={styles.copyPinBtn}
                  onPress={() =>
                    handleCopyPin(reservedBookingModal?.otpCode || "")
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Copy 6-digit gate pass PIN"
                >
                  {pinCopied ? (
                    <Check size={14} color={COLORS.primary} />
                  ) : (
                    <Copy size={14} color={COLORS.primary} />
                  )}
                  <Text style={styles.copyPinTxt}>
                    {pinCopied ? "PIN Copied" : "Copy PIN"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Ticket Utilities: Add to Calendar & Directions */}
            <View style={styles.quickContactRow}>
              <AppButton
                label={calendarAdded ? "Added" : "Add to Calendar"}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                icon={<Calendar size={15} color={COLORS.primary} />}
                onPress={() => setCalendarAdded(true)}
              />
              <AppButton
                label="Directions"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                icon={<Navigation size={15} color={COLORS.primary} />}
                onPress={() =>
                  launchNativeTurnByTurnMaps(
                    station.latitude,
                    station.longitude,
                    station.name
                  )
                }
              />
            </View>

            {/* Primary CTA: Start Live Charging Session */}
            <AppButton
              label="Start Live Charging Session"
              variant="primary"
              size="lg"
              style={{ width: "100%", marginBottom: SPACING.xs }}
              icon={<Zap size={18} color={COLORS.textInverse} />}
              onPress={() => {
                const targetId = reservedBookingModal?.id;
                setReservedBookingModal(null);
                startChargingSession(targetId);
              }}
            />

            {/* Secondary CTA: View Digital Gate Pass */}
            <AppButton
              label="View Digital Gate Pass"
              variant="secondary"
              size="lg"
              style={{ width: "100%" }}
              icon={<Ticket size={18} color={COLORS.primary} />}
              onPress={() => {
                const targetId = reservedBookingModal?.id;
                setReservedBookingModal(null);
                router.push({
                  pathname: "/(driver)/gate-pass",
                  params: { bookingId: targetId },
                });
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.navSafePadding,
  },
  p2pHeroHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.md,
    paddingBottom: 34,
  },
  p2pHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  p2pIllustrationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  p2pHostIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(5, 230, 96, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  p2pBannerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textInverse,
  },
  p2pBannerSub: {
    ...TYPOGRAPHY.caption,
    color: "#D1FAE5",
    marginTop: 2,
  },
  heroBanner: {
    height: 190,
    backgroundColor: COLORS.surfaceMuted,
  },
  heroBannerImg: {
    resizeMode: "cover",
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 20, 0.35)",
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.md,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  backCircleBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17, 24, 20, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
  },
  heroBadgeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.neonLive,
  },
  bodyWrap: {
    paddingHorizontal: SPACING.screenMargin,
    marginTop: -18,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
  },
  stationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  stationTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
  },
  stationAddr: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  ratingNum: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  reviewsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  dotSep: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  distanceInline: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  actionCirclesRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  iconCircleBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quickContactRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  amenitiesPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  connectorCard: {
    marginBottom: SPACING.sm,
    paddingRight: 44,
  },
  connectorRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  connectorInfoCol: {
    flex: 1,
  },
  connectorName: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  connectorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dateTimePill: {
    flex: 1,
    height: 48,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  dateTimeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  durationRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  estimateCard: {
    marginBottom: SPACING.md,
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: SPACING.sm,
  },
  estimateLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  estimateVal: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  estimateTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  estimateTotalLabel: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  estimateTotalVal: {
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
    paddingHorizontal: SPACING.screenMargin,
    paddingBottom: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  pickerOptionText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  reservedPopupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: SPACING.lg,
    alignItems: "center",
  },
  reservedBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  reservedPopupTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
  },
  reservedPopupSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  reservedPassRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  miniQrBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  miniQrGrid: {
    width: 54,
    height: 54,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  miniQrCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  reservedOtpBox: {
    flex: 1,
    alignItems: "flex-start",
  },
  reservedOtpLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  reservedOtpDigits: {
    ...TYPOGRAPHY.h1,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginVertical: 2,
  },
  copyPinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SPACING.chipRadius,
    marginTop: 2,
  },
  copyPinTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
});
