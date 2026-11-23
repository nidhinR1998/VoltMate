import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Compass,
  CalendarClock,
  Zap,
  Clock,
  FileText,
  Share2,
  Check,
  Trash2,
  Ticket,
  Receipt,
  MoreHorizontal,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  BookingRecord,
  ChargingHistoryRecord,
  partitionBookingsByTab,
} from "../../store/useVoltMateEngine";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  calculateGstBreakdown,
} from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  BottomSheet,
  EmptyState,
  SegmentedControl,
  StatusBadge,
} from "../../components/ui/DesignSystem";

export default function BookingsScreen() {
  const router = useRouter();
  const {
    user,
    bookings,
    chargingHistory,
    cancelBooking,
    rescheduleBooking,
    startChargingSession,
  } = useVoltMateEngine();
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "HISTORY">(
    "UPCOMING"
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<ChargingHistoryRecord | null>(null);
  const [overflowBooking, setOverflowBooking] =
    useState<BookingRecord | null>(null);
  const [confirmCancelMode, setConfirmCancelMode] = useState(false);

  const { upcomingBookings, historyRecords } = partitionBookingsByTab(
    bookings,
    chargingHistory
  );

  const handleShareInvoice = async (item: ChargingHistoryRecord) => {
    const { taxableValueInr: taxable, cgstInr: cgst, sgstInr: sgst } =
      calculateGstBreakdown(item.amount);
    try {
      await Share.share({
        message: `VoltMate GST Tax Invoice #${
          item.invoiceNumber || item.id
        }\nSupplier GSTIN: 32AABCV4921K1Z5 | HSN/SAC: 998714\nStation: ${item.station}\nHost: ${
          item.hostName || "VoltMate Host"
        }\nDate: ${item.date}\nEnergy: ${item.energyKwh} kWh @ ₹${(
          item.ratePerKwh ?? 10.5
        ).toFixed(2)}/kWh\nTaxable Value: ₹${taxable.toFixed(2)}\nCGST (9%): ₹${cgst.toFixed(2)} | SGST (9%): ₹${sgst.toFixed(2)}\nTotal Settled: ₹${item.amount.toFixed(
          2
        )} (VoltMate Wallet / Razorpay)`,
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
      {/* Header Row — Fixed P0 Bug #1: No clipping or overlap of Trip Planner pill */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.pageTitle}>My Bookings</Text>
          <Text style={styles.pageSub} numberOfLines={2}>
            Manage reserved charging slots & GST receipts
          </Text>
        </View>
        <TouchableOpacity
          style={styles.tripPlannerPill}
          onPress={() => router.push("/(driver)/route-planner")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open EV trip planner"
        >
          <Compass size={16} color={COLORS.primary} />
          <Text style={styles.tripPlannerText}>Trip Planner</Text>
        </TouchableOpacity>
      </View>

      {/* Unified Segmented Control */}
      <View style={styles.segmentContainer}>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            {
              key: "UPCOMING",
              label: "Upcoming",
              count: upcomingBookings.length,
            },
            {
              key: "HISTORY",
              label: "History",
              count: historyRecords.length,
            },
          ]}
        />
      </View>

      {activeTab === "UPCOMING" ? (
        upcomingBookings.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={26} color={COLORS.primary} />}
            title="No Upcoming Slots"
            subtitle="Explore nearby EV chargers on the map and reserve a charging slot in advance."
            ctaLabel="Find a Charging Station"
            onPressCta={() => router.push("/(driver)/map-radar")}
          />
        ) : (
          upcomingBookings.map((b) => (
            <AppCard key={b.id} style={styles.bookingCard}>
              <View style={styles.cardTopRow}>
                <StatusBadge
                  status={b.status === "ACTIVE_CHARGING" ? "live" : "upcoming"}
                  label={b.status}
                />
                <View style={styles.pinTagBox}>
                  <Ticket size={13} color={COLORS.primary} />
                  <Text style={styles.otpTag}>
                    PIN: {b.otpCode.slice(0, 3)} {b.otpCode.slice(3)}
                  </Text>
                </View>
              </View>

              <Text style={styles.stationName} numberOfLines={2}>
                {b.stationName}
              </Text>
              <Text style={styles.stationAddr} numberOfLines={2}>
                {b.address}
              </Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Time Slot</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {b.slotTime}
                  </Text>
                </View>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Connector</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {b.connectorType}
                  </Text>
                </View>
                <View style={[styles.metaBox, { alignItems: "flex-end" }]}>
                  <Text style={styles.metaLabel}>Est. Total</Text>
                  <Text style={[styles.metaValue, styles.priceHighlight]}>
                    ₹{b.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Max 2 visible actions (Gate Pass, Charge) + Overflow Menu (Reschedule, Cancel with confirmation) */}
              <View style={styles.cardActionsRow}>
                <AppButton
                  label="Gate Pass"
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  icon={<Ticket size={16} color={COLORS.primary} />}
                  onPress={() =>
                    router.push({
                      pathname: "/(driver)/gate-pass",
                      params: { bookingId: b.id },
                    })
                  }
                />

                <AppButton
                  label="Charge"
                  variant="primary"
                  size="md"
                  style={{ flex: 1.15 }}
                  icon={<Zap size={16} color={COLORS.textInverse} />}
                  onPress={() => startChargingSession(b.id, b.stationId)}
                />

                <TouchableOpacity
                  style={styles.overflowBtn}
                  onPress={() => {
                    setConfirmCancelMode(false);
                    setOverflowBooking(b);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`More options for ${b.stationName}`}
                >
                  <MoreHorizontal size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </AppCard>
          ))
        )
      ) : historyRecords.length === 0 ? (
        <EmptyState
          icon={<Receipt size={26} color={COLORS.primary} />}
          title="No Charging History"
          subtitle="Your completed EV charging sessions and downloadable GST invoices will appear here."
          ctaLabel="Find a Charging Station"
          onPressCta={() => router.push("/(driver)/map-radar")}
        />
      ) : (
        historyRecords.map((h) => (
          <AppCard
            key={h.id}
            style={styles.historyCard}
            onPress={() => setSelectedInvoice(h)}
          >
            <View style={styles.historyRowInner}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.historyStation} numberOfLines={2}>
                  {h.station}
                </Text>
                <Text style={styles.historyDate}>{h.date}</Text>
                <View style={styles.historyMetricsRow}>
                  <View style={styles.metricInline}>
                    <Zap size={13} color={COLORS.primary} />
                    <Text style={styles.historyMetrics}>
                      {h.energyKwh} kWh
                    </Text>
                  </View>
                  <Text style={styles.dotSep}>•</Text>
                  <View style={styles.metricInline}>
                    <Clock size={13} color={COLORS.textSecondary} />
                    <Text style={styles.historyMetrics}>
                      {h.durationMins} mins
                    </Text>
                  </View>
                  <Text style={styles.dotSep}>•</Text>
                  <Text style={styles.historyMetrics} numberOfLines={1}>
                    {h.connectorType || "Type-2 AC"}
                  </Text>
                </View>
              </View>
              <View style={styles.historyRightCol}>
                <Text style={styles.historyPrice}>₹{h.amount.toFixed(2)}</Text>
                <TouchableOpacity
                  style={styles.settledChip}
                  onPress={() => setSelectedInvoice(h)}
                  accessibilityRole="button"
                  accessibilityLabel="View charging receipt"
                >
                  <FileText size={12} color={COLORS.primary} />
                  <Text style={styles.settledChipText}>Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AppCard>
        ))
      )}

      {/* Digital Charging Invoice Modal */}
      <Modal visible={!!selectedInvoice} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.invoiceModalCard}>
            <View style={styles.invoiceHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceOverline}>
                  VOLTMATE • VERIFIED TAX INVOICE
                </Text>
                <Text style={styles.invoiceTitle}>
                  Receipt #
                  {selectedInvoice?.invoiceNumber || selectedInvoice?.id}
                </Text>
              </View>
              <View style={styles.paidStamp}>
                <Check size={14} color={COLORS.primary} strokeWidth={2.5} />
                <Text style={styles.paidStampTxt}>PAID</Text>
              </View>
            </View>

            <View style={styles.invoiceTotalBox}>
              <Text style={styles.invoiceTotalLabel}>Total Amount Settled</Text>
              <Text style={styles.invoiceTotalAmount}>
                ₹{selectedInvoice?.amount.toFixed(2)}
              </Text>
              <Text style={styles.invoicePaymentMode}>
                Paid via VoltMate Wallet / UPI ({user?.upiId || "driver@okaxis"}
                )
              </Text>
            </View>

            <View style={styles.invoiceDetailsBox}>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Station Name</Text>
                <Text style={styles.invoiceDetailVal} numberOfLines={2}>
                  {selectedInvoice?.station}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Host / Operator</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.hostName || "VoltMate Host"}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Date & Time</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.date}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Connector Standard</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.connectorType || "Type-2 AC"}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Energy Consumed</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.energyKwh} kWh (
                  {selectedInvoice?.durationMins} mins)
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Tariff Rate</Text>
                <Text style={styles.invoiceDetailVal}>
                  ₹{(selectedInvoice?.ratePerKwh ?? 10.5).toFixed(2)}/kWh
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Vehicle Reg. Plate</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.vehiclePlate || "KL-07-CS-4921"}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>GSTIN / HSN Code</Text>
                <Text style={styles.invoiceDetailVal}>
                  32AABCV4921K1Z5 • SAC 998714
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>
                  Taxable Value + GST (18%)
                </Text>
                <Text style={styles.invoiceDetailVal}>
                  ₹{((selectedInvoice?.amount ?? 0) / 1.18).toFixed(2)} + ₹
                  {(
                    (selectedInvoice?.amount ?? 0) -
                    (selectedInvoice?.amount ?? 0) / 1.18
                  ).toFixed(2)}{" "}
                  (9% CGST + 9% SGST)
                </Text>
              </View>
            </View>

            <View style={styles.invoiceActionsRow}>
              <AppButton
                label="Share Receipt"
                variant="secondary"
                style={{ flex: 1.2 }}
                icon={<Share2 size={16} color={COLORS.primary} />}
                onPress={() =>
                  selectedInvoice && handleShareInvoice(selectedInvoice)
                }
              />
              <AppButton
                label="Close"
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => setSelectedInvoice(null)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Overflow Menu BottomSheet: Reschedule & Cancel with Confirmation */}
      <BottomSheet
        visible={!!overflowBooking}
        onClose={() => {
          setOverflowBooking(null);
          setConfirmCancelMode(false);
        }}
        title={
          confirmCancelMode
            ? "Cancel Reservation?"
            : overflowBooking?.stationName || "Manage Reservation"
        }
        subtitle={
          confirmCancelMode
            ? `Your pre-authorized hold of ₹${(overflowBooking?.totalAmount ?? 0).toFixed(2)} will be refunded immediately to your VoltMate Wallet.`
            : overflowBooking?.slotTime
        }
      >
        {confirmCancelMode ? (
          <View style={{ gap: SPACING.xs }}>
            <AppButton
              label="Yes, Cancel & Refund Hold"
              variant="destructive"
              icon={<Trash2 size={16} color={COLORS.textInverse} />}
              onPress={async () => {
                if (overflowBooking) {
                  await cancelBooking(overflowBooking.id);
                }
                setOverflowBooking(null);
                setConfirmCancelMode(false);
              }}
            />
            <AppButton
              label="Keep Reservation"
              variant="secondary"
              onPress={() => setConfirmCancelMode(false)}
            />
          </View>
        ) : (
          <View style={{ gap: SPACING.xs }}>
            <AppButton
              label="Reschedule Slot (+2 Hours)"
              variant="secondary"
              icon={<CalendarClock size={16} color={COLORS.primary} />}
              onPress={async () => {
                if (overflowBooking) {
                  await rescheduleBooking(overflowBooking.id);
                }
                setOverflowBooking(null);
              }}
            />
            <AppButton
              label="Cancel Reservation"
              variant="destructive"
              icon={<Trash2 size={16} color={COLORS.textInverse} />}
              onPress={() => setConfirmCancelMode(true)}
            />
          </View>
        )}
      </BottomSheet>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
  },
  pageSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tripPlannerPill: {
    flexShrink: 0,
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
  tripPlannerText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  segmentContainer: {
    marginBottom: SPACING.md,
  },
  bookingCard: {
    marginBottom: SPACING.sm,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  pinTagBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpTag: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  stationName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  stationAddr: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaBox: {
    flex: 1,
  },
  metaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  priceHighlight: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.primary,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  overflowBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  historyCard: {
    marginBottom: SPACING.sm,
  },
  historyRowInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  historyStation: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  historyDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  metricInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dotSep: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  historyMetrics: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  historyRightCol: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  historyPrice: {
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  settledChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
  },
  settledChipText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  invoiceModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  invoiceOverline: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  invoiceTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  paidStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  paidStampTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  invoiceTotalBox: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  invoiceTotalLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: "#A7F3D0",
  },
  invoiceTotalAmount: {
    ...TYPOGRAPHY.display,
    ...TYPOGRAPHY.tabular,
    color: COLORS.neonLive,
    marginVertical: 4,
  },
  invoicePaymentMode: {
    ...TYPOGRAPHY.caption,
    color: "#D1FAE5",
  },
  invoiceDetailsBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.md,
  },
  invoiceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  invoiceDetailKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  invoiceDetailVal: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  invoiceActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
});
