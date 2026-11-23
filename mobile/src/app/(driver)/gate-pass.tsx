import React, { useState } from "react";
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
  ArrowLeft,
  Share2,
  Zap,
  Phone,
  Navigation,
  Copy,
  Check,
  Calendar,
  Ticket,
} from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import {
  launchNativePhoneCall,
  launchNativeTurnByTurnMaps,
} from "../../services/notificationService";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import { AppButton, AppCard, EmptyState } from "../../components/ui/DesignSystem";

export default function GatePassScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { bookings, stations, selectedStationId, startChargingSession } =
    useVoltMateEngine();
  const [copied, setCopied] = useState(false);
  const [calendarSaved, setCalendarSaved] = useState(false);

  const booking =
    bookings.find((b) => b.id === bookingId) || bookings[0] || null;
  const station =
    stations.find((s) => s.id === (booking?.stationId || selectedStationId)) ||
    stations[0];

  // Clean 6-digit PIN without '#' prefix
  const otpFormatted = booking
    ? `${booking.otpCode.slice(0, 3)} ${booking.otpCode.slice(3, 6)}`
    : "842 910";

  const handleSharePass = async () => {
    try {
      await Share.share({
        message: `VoltMate EV Digital Gate Pass\nStation: ${
          booking?.stationName || station?.name || "VoltMate EV Hub"
        }\nPIN Code: ${otpFormatted}\nSlot: ${
          booking?.slotTime || "Instant Walk-In Access"
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
          style={styles.iconBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(driver)/bookings")
          }
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Access Pass</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleSharePass}
          accessibilityRole="button"
          accessibilityLabel="Share digital gate pass"
        >
          <Share2 size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <AppCard style={styles.passCard}>
        <View style={styles.statusPill}>
          <View style={styles.greenDot} />
          <Text style={styles.statusText}>
            {booking ? "RESERVED SLOT TOKEN" : "INSTANT PLUG-IN PASS"}
          </Text>
        </View>

        <Text style={styles.stationName} numberOfLines={2}>
          {booking?.stationName || station?.name || "VoltMate EV Charging Hub"}
        </Text>
        <Text style={styles.stationAddr} numberOfLines={2}>
          {booking?.address || station?.address}
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
                    {
                      backgroundColor: isCorner
                        ? COLORS.textPrimary
                        : COLORS.border,
                    },
                  ]}
                />
              );
            })}
            <View style={styles.qrCenterBadge}>
              <Zap size={18} color={COLORS.textInverse} fill={COLORS.textInverse} />
            </View>
          </View>
        </View>

        <Text style={styles.otpLabel}>6-DIGIT CHARGER UNLOCK PIN</Text>
        <View style={styles.otpRow}>
          <View style={styles.otpBox}>
            <Text style={styles.otpCodeText}>{otpFormatted}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2400);
            }}
            accessibilityRole="button"
            accessibilityLabel="Copy 6-digit PIN"
          >
            {copied ? (
              <Check size={16} color={COLORS.primary} />
            ) : (
              <Copy size={16} color={COLORS.primary} />
            )}
            <Text style={styles.copyBtnTxt}>{copied ? "Copied" : "Copy"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Reservation ID</Text>
            <Text style={styles.metaVal}>{booking?.id || "VOLT-99482"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Time Slot</Text>
            <Text style={styles.metaVal}>
              {booking?.slotTime || "Today • 16:30 – 17:30"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>EV Connector</Text>
            <Text style={styles.metaVal} numberOfLines={1}>
              {booking?.connectorType || "Type-2 AC Wallbox"} (₹
              {(booking?.pricePerKwh ?? 10.5).toFixed(2)}/kWh)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Pre-Authorized Hold</Text>
            <Text style={[styles.metaVal, { color: COLORS.primary }]}>
              ₹{(booking?.totalAmount ?? 189.0).toFixed(2)} (VoltMate Wallet)
            </Text>
          </View>
        </View>
      </AppCard>

      {/* Primary Action: Start Live Charging Session */}
      <AppButton
        label="Start Live Charging Session"
        variant="primary"
        size="lg"
        style={{ marginBottom: SPACING.sm }}
        icon={<Zap size={18} color={COLORS.textInverse} />}
        onPress={() => startChargingSession(booking?.id, station?.id)}
      />

      {/* Secondary Actions Row: Directions, Add to Calendar & Call Host */}
      <View style={styles.secondaryActionRow}>
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

        <AppButton
          label={calendarSaved ? "Added" : "Calendar"}
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          icon={<Calendar size={15} color={COLORS.primary} />}
          onPress={() => setCalendarSaved(true)}
        />

        <AppButton
          label="Call Host"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          icon={<Phone size={15} color={COLORS.primary} />}
          onPress={() =>
            launchNativePhoneCall(
              booking?.hostPhone || station?.hostPhone || "+919847011223"
            )
          }
        />
      </View>

      {!booking && (
        <View style={{ marginTop: SPACING.md }}>
          <EmptyState
            icon={<Ticket size={24} color={COLORS.primary} />}
            title="No Active Reservation Selected"
            subtitle="Showing your instant walk-in pass. Book a slot in advance to lock in a dedicated time window."
            ctaLabel="Browse Stations"
            onPressCta={() => router.push("/(driver)/map-radar")}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.navSafePadding,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  iconBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  passCard: {
    alignItems: "center",
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
    marginBottom: SPACING.sm,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neonLive,
  },
  statusText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  stationName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  stationAddr: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  qrFrame: {
    width: 188,
    height: 188,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSubtle,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  otpLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  otpBox: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpCodeText: {
    ...TYPOGRAPHY.h1,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    minHeight: SPACING.touchTarget,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  copyBtnTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  metaList: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  metaKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  metaVal: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
});
