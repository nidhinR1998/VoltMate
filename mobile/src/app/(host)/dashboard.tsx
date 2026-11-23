import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Car,
  MapPin,
  Pencil,
  Trash2,
  Clock,
  PlugZap,
  Plus,
  CalendarCog,
  Check,
  X,
  ArrowRight,
} from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppToggle,
  ConnectorChip,
  EmptyState,
  SectionHeader,
  Sparkline,
  StatTile,
} from "../../components/ui/DesignSystem";

export default function HostDashboardScreen() {
  const router = useRouter();
  const {
    stations,
    hostRequests,
    hostWeeklyEarnings,
    hostEarningsBalance,
    hostWeeklyKwh,
    hostSessionsCount,
    respondHostRequest,
    toggleHostStationOnline,
    deleteHostStation,
    switchMode,
  } = useVoltMateEngine();

  // Fix P0 Bug #7: Only show user's own hosted P2P stations, NEVER fall back to public stations[0] ("chargeMOD...")
  const myHostedStations = stations.filter(
    (s) => s.isUserHosted || s.stationType === "P2P_HOME"
  );
  const userPublishedStation = myHostedStations.find((s) => s.isUserHosted);
  const myStation = userPublishedStation || myHostedStations[0] || null;
  const isOnline = myStation ? myStation.isOnline !== false : false;
  const pendingCount = hostRequests.filter(
    (r) => r.status === "PENDING"
  ).length;

  // Show user's own published station title, or neutral "Host Studio" before user has published
  const headerTitle = userPublishedStation
    ? userPublishedStation.name
    : "Host Studio";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.overline}>VOLTMATE P2P HOST STUDIO</Text>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {headerTitle}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.driverModeBtn}
          onPress={() => {
            switchMode("DRIVER");
            router.push("/(driver)/home");
          }}
          accessibilityRole="button"
          accessibilityLabel="Switch to Driver Mode"
        >
          <Car size={16} color={COLORS.primary} />
          <Text style={styles.driverModeBtnText}>Driver Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Availability Status Card */}
      {myStation ? (
        <AppCard style={styles.statusCard}>
          <View style={styles.statusRowInner}>
            <View style={{ flex: 1, paddingRight: SPACING.sm }}>
              <View style={styles.liveRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isOnline
                        ? COLORS.neonLive
                        : COLORS.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusTag,
                    !isOnline && { color: COLORS.textSecondary },
                  ]}
                >
                  {isOnline ? "ACCEPTING BOOKINGS" : "OFFLINE"}
                </Text>
              </View>
              <Text style={styles.statusTitle} numberOfLines={2}>
                {isOnline ? "Your P2P Charger is Live" : "Station Paused"}
              </Text>
              <Text style={styles.statusSub} numberOfLines={2}>
                {myStation.address}
              </Text>
            </View>
            <AppToggle
              value={isOnline}
              accessibilityLabel="Toggle station online status"
              onValueChange={(val) => {
                toggleHostStationOnline(myStation.id, val);
              }}
            />
          </View>
        </AppCard>
      ) : (
        <EmptyState
          icon={<PlugZap size={26} color={COLORS.primary} />}
          title="Host Your Home EV Charger"
          subtitle="Share your residential 15A socket or Type-2 wallbox with verified EV drivers and earn direct UPI payouts."
          ctaLabel="Publish My P2P Charger"
          onPressCta={() => router.push("/(host)/add-charger")}
        />
      )}

      {/* Earnings Hero with Sparkline + Utilization Metrics */}
      <AppCard
        style={styles.earningsHeroCard}
        onPress={() => router.push("/(host)/wallet")}
      >
        <View style={styles.earningsHeroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.earningsHeroLabel}>
              THIS WEEK EARNINGS (₹ INR)
            </Text>
            <Text style={styles.earningsHeroValue}>
              ₹{hostWeeklyEarnings.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.earningsHeroSub}>
              Available Payout: ₹{hostEarningsBalance.toFixed(0)} →
            </Text>
          </View>
          <Sparkline
            values={[320, 480, 410, 620, 590, Math.max(250, hostWeeklyEarnings)]}
            width={92}
            height={34}
          />
        </View>
      </AppCard>

      <View style={styles.metricsRow}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.85}
          onPress={() => router.push("/(host)/wallet")}
        >
          <StatTile
            label="Payout Balance"
            value={`₹${hostEarningsBalance.toFixed(0)}`}
            subtext="Instant UPI Withdraw →"
            accent
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.85}
          onPress={() => router.push("/(host)/schedule-matrix")}
        >
          <StatTile
            label="Sessions Hosted"
            value={`${hostSessionsCount}`}
            subtext={`${hostWeeklyKwh} kWh • Edit Schedule →`}
          />
        </TouchableOpacity>
      </View>

      {/* Single Entry Point for Adding / Managing Hosted Chargers & Connectors */}
      <SectionHeader
        title={`My Hosted Chargers (${myHostedStations.length})`}
        actionLabel="+ Add Charger"
        onPressAction={() => router.push("/(host)/add-charger")}
      />

      {myHostedStations.map((st) => {
        const stOnline = st.isOnline !== false;
        return (
          <AppCard key={st.id} style={styles.stationCard}>
            <View style={styles.reqTopRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.reqDriverName} numberOfLines={2}>
                  {st.name}
                </Text>
                <Text style={styles.reqVehicle} numberOfLines={2}>
                  {st.address}
                </Text>
                <View style={styles.coordRow}>
                  <MapPin size={13} color={COLORS.primary} />
                  <Text style={styles.reqSlotMeta}>
                    From ₹{st.pricePerKwh.toFixed(2)}/kWh • {st.maxPowerKw} kW
                    Max
                  </Text>
                </View>
              </View>
              <AppToggle
                value={stOnline}
                accessibilityLabel={`Toggle ${st.name} online`}
                onValueChange={(val) => toggleHostStationOnline(st.id, val)}
              />
            </View>

            {/* Configured Connectors as ConnectorChip pills */}
            <View style={styles.connectorChipsRow}>
              {st.connectorSpecs.map((c) => (
                <ConnectorChip
                  key={c.id}
                  name={c.name}
                  powerKw={c.powerKw}
                  pricePerKwh={c.pricePerKwh}
                />
              ))}
            </View>

            {/* Secondary "Edit Tariff & Pin" Button (Step 4 requirement) */}
            <View style={styles.reqActionsRow}>
              <AppButton
                label="Edit Tariff & Pin"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                icon={<Pencil size={15} color={COLORS.primary} />}
                onPress={() =>
                  router.push({
                    pathname: "/(host)/add-charger",
                    params: { stationId: st.id },
                  })
                }
              />
              {myHostedStations.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteIconBtn}
                  onPress={() => deleteHostStation(st.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${st.name}`}
                >
                  <Trash2 size={18} color={COLORS.destructive} />
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        );
      })}

      {/* Unified Incoming Slot Requests Queue (Merged duplicate Booking Queue tile vs Incoming Slot Requests) */}
      <SectionHeader
        title={`Incoming Slot Requests (${pendingCount})`}
        actionLabel="View All"
        onPressAction={() => router.push("/(host)/incoming-requests")}
      />

      {hostRequests.length === 0 ? (
        <EmptyState
          icon={<Clock size={24} color={COLORS.primary} />}
          title="No Pending Slot Requests"
          subtitle="Your charger is discoverable on the live map. New booking requests from nearby EV drivers will appear here."
        />
      ) : (
        hostRequests.map((req) => (
          <AppCard key={req.id} style={styles.stationCard}>
            <View style={styles.reqTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqDriverName}>{req.driverName}</Text>
                <Text style={styles.reqVehicle}>{req.vehicle}</Text>
              </View>
              <View style={styles.payoutBadge}>
                <Text style={styles.payoutBadgeTxt}>{req.payout}</Text>
              </View>
            </View>

            <View style={styles.reqMetaRow}>
              <View style={styles.metaBadge}>
                <Clock size={13} color={COLORS.textSecondary} />
                <Text style={styles.reqSlotMeta}>{req.slot}</Text>
              </View>
              <View style={styles.metaBadge}>
                <PlugZap size={13} color={COLORS.primary} />
                <Text style={styles.reqSlotMeta}>
                  {req.connector} ({req.estEnergy})
                </Text>
              </View>
            </View>

            {req.status === "PENDING" ? (
              <View style={styles.reqActionsRow}>
                <AppButton
                  label="Accept & Issue Pass"
                  variant="primary"
                  size="md"
                  style={{ flex: 1.4 }}
                  icon={<Check size={16} color={COLORS.textInverse} />}
                  onPress={() => respondHostRequest(req.id, true)}
                />
                <AppButton
                  label="Decline"
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  icon={<X size={16} color={COLORS.textSecondary} />}
                  onPress={() => respondHostRequest(req.id, false)}
                />
              </View>
            ) : (
              <View style={styles.approvedBanner}>
                <Check size={14} color={COLORS.primary} strokeWidth={2.6} />
                <Text style={styles.approvedBannerTxt}>
                  APPROVED • Gate Pass PIN {req.otpCode?.slice(0, 3) || "544"}{" "}
                  {req.otpCode?.slice(3) || "555"} Active
                </Text>
              </View>
            )}
          </AppCard>
        ))
      )}

      {/* Availability Schedule Shortcut Card */}
      <AppCard
        style={styles.scheduleBannerCard}
        onPress={() => router.push("/(host)/schedule-matrix")}
      >
        <View style={styles.scheduleBannerInner}>
          <View style={styles.scheduleIconBox}>
            <CalendarCog size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reqDriverName}>
              7-Day Availability Schedule
            </Text>
            <Text style={styles.reqVehicle}>
              Configure active hosting hours & private driveway blocks
            </Text>
          </View>
          <ArrowRight size={18} color={COLORS.primary} />
        </View>
      </AppCard>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  overline: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  driverModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: SPACING.chipRadius,
  },
  driverModeBtnText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  statusCard: {
    marginBottom: SPACING.md,
  },
  statusRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTag: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  statusTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statusSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  earningsHeroCard: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  earningsHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  earningsHeroLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  earningsHeroValue: {
    ...TYPOGRAPHY.display,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    marginVertical: 2,
  },
  earningsHeroSub: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  connectorChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  stationCard: {
    marginBottom: SPACING.sm,
  },
  reqTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reqDriverName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  reqVehicle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  reqSlotMeta: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  inlineConnectorsWrap: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xs,
  },
  connectorRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSubtle,
    padding: 10,
    borderRadius: 14,
  },
  connectorName: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  connectorMeta: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  readyBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  readyBadgeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  reqActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  deleteIconBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: "#FECDCA",
    alignItems: "center",
    justifyContent: "center",
  },
  payoutBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SPACING.chipRadius,
  },
  payoutBadgeTxt: {
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  reqMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approvedBannerTxt: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  scheduleBannerCard: {
    marginTop: SPACING.xs,
  },
  scheduleBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  scheduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
