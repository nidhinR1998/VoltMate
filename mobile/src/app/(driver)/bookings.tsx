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
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
  ChargingHistoryRecord,
} from "../../store/useVoltMateEngine";

export default function BookingsScreen() {
  const router = useRouter();
  const {
    bookings,
    chargingHistory,
    cancelBooking,
    startChargingSession,
  } = useVoltMateEngine();
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "HISTORY">(
    "UPCOMING"
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<ChargingHistoryRecord | null>(null);

  const handleShareInvoice = async (item: ChargingHistoryRecord) => {
    try {
      await Share.share({
        message: `VoltMate Digital Charging Invoice #${
          item.invoiceNumber || item.id
        }\nStation: ${item.station}\nHost: ${
          item.hostName || "KSEB / P2P Host"
        }\nDate: ${item.date}\nEnergy: ${item.energyKwh} kWh @ ₹${(
          item.ratePerKwh ?? 10.5
        ).toFixed(2)}/kWh\nTotal Paid: ₹${item.amount.toFixed(
          2
        )} (VoltMate Wallet / UPI)`,
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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>My Bookings</Text>
          <Text style={styles.pageSub}>
            Manage reserved Kochi charging slots & GST receipts
          </Text>
        </View>
        <TouchableOpacity
          style={styles.tripPlannerPill}
          onPress={() => router.push("/(driver)/route-planner")}
        >
          <Text style={styles.tripPlannerText}>🧭 Trip Planner</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === "UPCOMING" && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab("UPCOMING")}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === "UPCOMING" && styles.segmentTextActive,
            ]}
          >
            Upcoming ({bookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === "HISTORY" && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab("HISTORY")}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === "HISTORY" && styles.segmentTextActive,
            ]}
          >
            History ({chargingHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "UPCOMING" ? (
        bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Upcoming Slots</Text>
            <Text style={styles.emptySub}>
              Discover nearby Kochi chargers on the map and reserve your slot.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push("/(driver)/map-radar")}
            >
              <Text style={styles.exploreBtnText}>Find a Station</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{b.status}</Text>
                </View>
                <Text style={styles.otpTag}>
                  Gate Pass: #{b.otpCode.slice(0, 3)}-{b.otpCode.slice(3)}
                </Text>
              </View>

              <Text style={styles.stationName}>{b.stationName}</Text>
              <Text style={styles.stationAddr}>{b.address}</Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Time Slot</Text>
                  <Text style={styles.metaValue}>{b.slotTime}</Text>
                </View>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Indian Connector</Text>
                  <Text style={styles.metaValue}>{b.connectorType}</Text>
                </View>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Est. Total (₹ INR)</Text>
                  <Text style={[styles.metaValue, { color: "#096B30" }]}>
                    ₹{b.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.gatePassBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(driver)/gate-pass",
                      params: { bookingId: b.id },
                    })
                  }
                >
                  <Text style={styles.gatePassBtnText}>Gate Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.startChargeBtn}
                  onPress={() => startChargingSession(b.id, b.stationId)}
                >
                  <Text style={styles.startChargeBtnText}>
                    ⚡ Start Charging
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => cancelBooking(b.id)}
                >
                  <Text style={styles.cancelBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )
      ) : (
        chargingHistory.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.historyCard}
            activeOpacity={0.88}
            onPress={() => setSelectedInvoice(h)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.historyStation}>{h.station}</Text>
              <Text style={styles.historyDate}>{h.date}</Text>
              <Text style={styles.historyMetrics}>
                ⚡ {h.energyKwh} kWh • ⏱ {h.durationMins} mins •{" "}
                {h.connectorType || "Type-2 AC"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.historyPrice}>₹{h.amount.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.settledChip}
                onPress={() => setSelectedInvoice(h)}
              >
                <Text style={styles.settledChipText}>📄 Receipt</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Digital Charging Invoice Modal */}
      <Modal visible={!!selectedInvoice} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.invoiceModalCard}>
            <View style={styles.invoiceHeaderRow}>
              <View>
                <Text style={styles.invoiceOverline}>
                  VOLTMATE KERALA • TAX INVOICE
                </Text>
                <Text style={styles.invoiceTitle}>
                  Receipt #{selectedInvoice?.invoiceNumber || selectedInvoice?.id}
                </Text>
              </View>
              <View style={styles.paidStamp}>
                <Text style={styles.paidStampTxt}>PAID ✓</Text>
              </View>
            </View>

            <View style={styles.invoiceTotalBox}>
              <Text style={styles.invoiceTotalLabel}>Total Amount Settled</Text>
              <Text style={styles.invoiceTotalAmount}>
                ₹{selectedInvoice?.amount.toFixed(2)}
              </Text>
              <Text style={styles.invoicePaymentMode}>
                Paid via VoltMate Wallet / UPI (nidhinrajesh@okaxis)
              </Text>
            </View>

            <View style={styles.invoiceDetailsBox}>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Station Name</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.station}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Host / Operator</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.hostName || "Arun Nair (P2P Host)"}
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
                  {selectedInvoice?.connectorType || "15A 3-Pin Socket"}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Energy Consumed</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.energyKwh} kWh ({selectedInvoice?.durationMins}{" "}
                  mins)
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Tariff Rate</Text>
                <Text style={styles.invoiceDetailVal}>
                  ₹{(selectedInvoice?.ratePerKwh ?? 8.5).toFixed(2)}/kWh
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailKey}>Vehicle Reg. Plate</Text>
                <Text style={styles.invoiceDetailVal}>
                  {selectedInvoice?.vehiclePlate || "KL-07-CS-4921"}
                </Text>
              </View>
            </View>

            <View style={styles.invoiceActionsRow}>
              <TouchableOpacity
                style={styles.shareInvoiceBtn}
                onPress={() =>
                  selectedInvoice && handleShareInvoice(selectedInvoice)
                }
              >
                <Text style={styles.shareInvoiceBtnText}>
                  ↗ Share / Download Receipt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeInvoiceBtn}
                onPress={() => setSelectedInvoice(null)}
              >
                <Text style={styles.closeInvoiceBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#151C18",
  },
  pageSub: {
    fontSize: 13,
    color: "#7C857F",
    marginTop: 2,
  },
  tripPlannerPill: {
    backgroundColor: "#151C18",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tripPlannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#E4E8E5",
    borderRadius: 22,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 18,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B746E",
  },
  segmentTextActive: {
    color: "#151C18",
    fontWeight: "800",
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
    marginBottom: 18,
  },
  exploreBtn: {
    backgroundColor: "#05E660",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 22,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  otpTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  stationName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  stationAddr: {
    fontSize: 13,
    color: "#7C857F",
    marginTop: 2,
    marginBottom: 14,
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: "#F5F7F6",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  metaBox: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: "#7C857F",
    fontWeight: "600",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  gatePassBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  gatePassBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  startChargeBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  startChargeBtnText: {
    color: "#151C18",
    fontSize: 13,
    fontWeight: "800",
  },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E2E6E3",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#6B746E",
    fontSize: 14,
    fontWeight: "800",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyStation: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  historyDate: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  historyMetrics: {
    fontSize: 12,
    color: "#4B534E",
    fontWeight: "600",
    marginTop: 6,
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 6,
  },
  settledChip: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  settledChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  invoiceModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  invoiceOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C857F",
    letterSpacing: 0.8,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  paidStamp: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#16B374",
  },
  paidStampTxt: {
    fontSize: 12,
    fontWeight: "900",
    color: "#096B30",
  },
  invoiceTotalBox: {
    backgroundColor: "#10241B",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  invoiceTotalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A7F3D0",
  },
  invoiceTotalAmount: {
    fontSize: 30,
    fontWeight: "900",
    color: "#05E660",
    marginVertical: 4,
  },
  invoicePaymentMode: {
    fontSize: 11,
    color: "#D1FAE5",
    fontWeight: "600",
  },
  invoiceDetailsBox: {
    backgroundColor: "#F5F7F6",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  invoiceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceDetailKey: {
    fontSize: 12,
    color: "#6B746E",
    fontWeight: "600",
  },
  invoiceDetailVal: {
    fontSize: 12,
    color: "#151C18",
    fontWeight: "800",
    maxWidth: "60%",
    textAlign: "right",
  },
  invoiceActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareInvoiceBtn: {
    flex: 1.5,
    backgroundColor: "#05E660",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  shareInvoiceBtnText: {
    color: "#151C18",
    fontSize: 13,
    fontWeight: "800",
  },
  closeInvoiceBtn: {
    flex: 1,
    backgroundColor: "#151C18",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  closeInvoiceBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
