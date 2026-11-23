import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from "react-native";
import {
  Zap,
  ChevronDown,
  Play,
  Pause,
  Phone,
  Check,
  Share2,
  OctagonX,
  ArrowRight,
} from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { VerticalBatteryIndicator, EvCarHeroRender } from "./EvVisuals";
import { launchNativePhoneCall } from "../../services/notificationService";
import { COLORS, SPACING, TYPOGRAPHY, ELEVATION } from "../../theme/tokens";
import { AppButton, AppCard } from "./DesignSystem";

export const ActiveChargingModal: React.FC = () => {
  const {
    activeSession,
    isChargingModalOpen,
    latestSettledReceipt,
    vehicles,
    user,
    openChargingModal,
    closeChargingModal,
    togglePauseChargingSession,
    setTargetCutOffSoc,
    stopChargingSession,
    clearSettledReceipt,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleShareReceipt = async () => {
    if (!latestSettledReceipt) return;
    try {
      await Share.share({
        message: `VoltMate EV GST Charging Invoice #${latestSettledReceipt.invoiceNumber}\nStation: ${latestSettledReceipt.station}\nVehicle: ${latestSettledReceipt.vehiclePlate}\nEnergy: ${latestSettledReceipt.energyKwh} kWh @ ₹${latestSettledReceipt.ratePerKwh?.toFixed(2)}/kWh\nTotal Settled: ₹${latestSettledReceipt.amount.toFixed(2)} (VoltMate Wallet)`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Minimized Live Charging Pill when session is running in background */}
      {activeSession && !isChargingModalOpen && (
        <TouchableOpacity
          style={styles.minimizedPill}
          activeOpacity={0.9}
          onPress={openChargingModal}
          accessibilityRole="button"
          accessibilityLabel="Open live charging session"
        >
          <View style={styles.pulseDot} />
          <Zap size={16} color={COLORS.neonLive} />
          <Text style={styles.minimizedText} numberOfLines={1}>
            Charging {activeSession.currentSoc}% • {activeSession.deliveredKwh.toFixed(2)} kWh • ₹{activeSession.liveCostInr.toFixed(2)}
          </Text>
          <View style={styles.minimizedOpenWrap}>
            <Text style={styles.minimizedOpenBtn}>Live</Text>
            <ArrowRight size={14} color={COLORS.neonLive} />
          </View>
        </TouchableOpacity>
      )}

      {/* Full Live Charging Cockpit Modal */}
      <Modal
        visible={!!activeSession && isChargingModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={closeChargingModal}
      >
        <ScrollView
          style={styles.cockpitContainer}
          contentContainerStyle={styles.cockpitContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={closeChargingModal}
              accessibilityRole="button"
              accessibilityLabel="Minimize live charging modal"
            >
              <ChevronDown size={18} color={COLORS.textPrimary} />
              <Text style={styles.minimizeBtnTxt}>Minimize</Text>
            </TouchableOpacity>

            <View
              style={[
                styles.liveTag,
                activeSession?.isPaused && styles.liveTagPaused,
              ]}
            >
              <View
                style={[
                  styles.pulseDot,
                  activeSession?.isPaused && { backgroundColor: COLORS.warning },
                ]}
              />
              <Text
                style={[
                  styles.liveTagText,
                  activeSession?.isPaused && { color: COLORS.warning },
                ]}
              >
                {activeSession?.isPaused ? "Paused" : "Live"}
              </Text>
            </View>
          </View>

          <Text style={styles.stationTitle} numberOfLines={2}>
            {activeSession?.stationName || "VoltMate Charging Hub"}
          </Text>
          <Text style={styles.stationSub} numberOfLines={2}>
            {activeVehicle?.makeModel || "Tata Nexon.ev"} •{" "}
            {activeVehicle?.plateNumber || "KL-07-CS-4921"}
          </Text>

          {/* Hero Numbers: Live Cost & Energy Delivered */}
          <View style={styles.heroMetricsRow}>
            <AppCard style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Live Cost (₹)</Text>
              <Text style={[styles.heroMetricValue, { color: COLORS.primary }]}>
                ₹{(activeSession?.liveCostInr ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.heroMetricSub}>
                @ ₹{(activeSession?.ratePerKwh ?? 10.5).toFixed(2)}/kWh
              </Text>
            </AppCard>

            <AppCard style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Energy Delivered</Text>
              <Text style={styles.heroMetricValue}>
                {(activeSession?.deliveredKwh ?? 0).toFixed(2)} kWh
              </Text>
              <Text style={styles.heroMetricSub} numberOfLines={1}>
                {activeSession?.connectorType || "Type-2 AC"}
              </Text>
            </AppCard>
          </View>

          <View style={styles.heroRow}>
            <VerticalBatteryIndicator
              socPercent={activeSession?.currentSoc ?? 72}
              isCharging={!activeSession?.isPaused}
            />
            <View style={styles.carWrap}>
              <EvCarHeroRender model={activeVehicle?.makeModel} />
            </View>
          </View>

          {/* Secondary Telemetry Row: Power & Session Timer */}
          <View style={styles.telemetryGrid}>
            <AppCard style={styles.telemetryCard}>
              <Text style={styles.telemetryLabel}>Power & Grid</Text>
              <Text style={styles.telemetryValue}>
                {activeSession?.isPaused
                  ? "0.0"
                  : (activeSession?.powerKw ?? 7.4).toFixed(1)}{" "}
                kW
              </Text>
              <Text style={styles.telemetrySub}>
                {activeSession?.voltageV ?? 231.2}V • {activeSession?.currentA ?? 31.8}A
              </Text>
            </AppCard>

            <AppCard style={styles.telemetryCard}>
              <Text style={styles.telemetryLabel}>Session Timer</Text>
              <Text style={styles.telemetryValue}>
                {formatTimer(activeSession?.elapsedSeconds ?? 0)}
              </Text>
              <Text style={styles.telemetrySub}>
                Target SoC: {activeSession?.targetCutOffSoc ?? 80}%
              </Text>
            </AppCard>
          </View>

          {/* Smart Cut-Off Selector */}
          <AppCard style={styles.cutOffCard}>
            <Text style={styles.cutOffTitle}>Auto Cut-Off Target</Text>
            <View style={styles.cutOffPillsRow}>
              {([80, 90, 100] as const).map((pct) => {
                const isSelected = activeSession?.targetCutOffSoc === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.cutOffPill,
                      isSelected && styles.cutOffPillActive,
                    ]}
                    onPress={() => setTargetCutOffSoc(pct)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.cutOffPillText,
                        isSelected && styles.cutOffPillTextActive,
                      ]}
                    >
                      Stop @ {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AppCard>

          {/* Clear Action Controls: Pause/Resume & Call Host */}
          <View style={styles.secondaryActionsRow}>
            <AppButton
              label={activeSession?.isPaused ? "Resume Charging" : "Pause Charging"}
              variant="secondary"
              style={{ flex: 1 }}
              icon={
                activeSession?.isPaused ? (
                  <Play size={16} color={COLORS.primary} />
                ) : (
                  <Pause size={16} color={COLORS.primary} />
                )
              }
              onPress={togglePauseChargingSession}
            />
            <AppButton
              label="Call Host"
              variant="secondary"
              style={{ flex: 1 }}
              icon={<Phone size={16} color={COLORS.primary} />}
              onPress={() =>
                launchNativePhoneCall(activeSession?.hostPhone || "+9118002098282")
              }
            />
          </View>

          {/* Visually separated Destructive Final Action */}
          <View style={styles.destructiveSection}>
            <AppButton
              label={`Stop Charging & Pay Bill (₹${(activeSession?.liveCostInr ?? 0).toFixed(2)})`}
              variant="destructive"
              icon={<OctagonX size={18} color={COLORS.textInverse} />}
              onPress={stopChargingSession}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Itemized GST / MoP Charging Receipt Modal */}
      <Modal
        visible={!!latestSettledReceipt}
        transparent
        animationType="slide"
        onRequestClose={clearSettledReceipt}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptSheet}>
            <View style={styles.receiptSuccessBadge}>
              <Check size={28} color={COLORS.textInverse} strokeWidth={3} />
            </View>
            <Text style={styles.receiptTitle}>Verified Charging Receipt</Text>
            <Text style={styles.receiptSub}>
              Invoice #{latestSettledReceipt?.invoiceNumber} • KSEB EV Compliant
            </Text>

            <View style={styles.receiptAmountBox}>
              <Text style={styles.receiptAmountLabel}>
                TOTAL DEDUCTED FROM VOLTMATE WALLET
              </Text>
              <Text style={styles.receiptAmountBig}>
                ₹{latestSettledReceipt?.amount.toFixed(2)}
              </Text>
              <Text style={styles.receiptWalletRem}>
                Updated Wallet Balance: ₹{(user?.voltCreditsBalance ?? 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.receiptRowsWrap}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Charging Station</Text>
                <Text style={styles.receiptVal} numberOfLines={2}>
                  {latestSettledReceipt?.station}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Host / Operator</Text>
                <Text style={styles.receiptVal}>
                  {latestSettledReceipt?.hostName}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Vehicle & Plate</Text>
                <Text style={styles.receiptVal} numberOfLines={2}>
                  {activeVehicle?.makeModel} ({latestSettledReceipt?.vehiclePlate})
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Energy Delivered</Text>
                <Text style={styles.receiptVal}>
                  {latestSettledReceipt?.energyKwh} kWh @ ₹
                  {latestSettledReceipt?.ratePerKwh?.toFixed(2)}/kWh
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Updated EV SoC</Text>
                <Text style={[styles.receiptVal, { color: COLORS.primary }]}>
                  {activeVehicle?.socPercent}% SoC ({activeVehicle?.rangeKm} km)
                </Text>
              </View>
            </View>

            <View style={styles.receiptBtnRow}>
              <AppButton
                label="Share Receipt"
                variant="secondary"
                style={{ flex: 1 }}
                icon={<Share2 size={16} color={COLORS.primary} />}
                onPress={handleShareReceipt}
              />
              <AppButton
                label="Done"
                variant="primary"
                style={{ flex: 1 }}
                onPress={clearSettledReceipt}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  minimizedPill: {
    position: "absolute",
    top: 48,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
    backgroundColor: COLORS.textPrimary,
    borderRadius: SPACING.chipRadius,
    paddingHorizontal: SPACING.md,
    minHeight: SPACING.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    zIndex: 9000,
    borderWidth: 1.5,
    borderColor: COLORS.neonLive,
    ...ELEVATION.level2,
  },
  minimizedText: {
    flex: 1,
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textInverse,
  },
  minimizedOpenWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  minimizedOpenBtn: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.neonLive,
  },
  cockpitContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cockpitContent: {
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.lg,
    paddingBottom: 48,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  minimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    minHeight: SPACING.touchTarget,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  minimizeBtnTxt: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  liveTagPaused: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neonLive,
  },
  liveTagText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  stationTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
  },
  stationSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  heroMetricCard: {
    flex: 1,
    padding: SPACING.md,
  },
  heroMetricLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  heroMetricValue: {
    ...TYPOGRAPHY.h1,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  heroMetricSub: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  carWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  telemetryGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  telemetryCard: {
    flex: 1,
    padding: SPACING.md,
  },
  telemetryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  telemetryValue: {
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  telemetrySub: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  cutOffCard: {
    marginBottom: SPACING.md,
  },
  cutOffTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cutOffPillsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  cutOffPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cutOffPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cutOffPillText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  cutOffPillTextActive: {
    color: COLORS.textInverse,
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  destructiveSection: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  receiptSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
    alignItems: "center",
  },
  receiptSuccessBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  receiptTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  receiptSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  receiptAmountBox: {
    width: "100%",
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  receiptAmountLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: "#A7F3D0",
  },
  receiptAmountBig: {
    ...TYPOGRAPHY.display,
    ...TYPOGRAPHY.tabular,
    color: COLORS.neonLive,
    marginVertical: 4,
  },
  receiptWalletRem: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: "#D1FAE5",
  },
  receiptRowsWrap: {
    width: "100%",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.md,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  receiptKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  receiptVal: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  receiptBtnRow: {
    flexDirection: "row",
    width: "100%",
    gap: SPACING.sm,
  },
});
