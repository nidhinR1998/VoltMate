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
} from "react-native";
import { useRouter } from "expo-router";
import {
  Zap,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Star,
  FileText,
  QrCode,
  X,
  Check,
  Share2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";
import { useAuthStore } from "../../store/useAuthStore";

const SAVED_STATION_ITEMS = [
  {
    id: "st-pall-mall",
    title: "Pall Mall Station",
    address: "1 White Hall Palace, Street 5, Kakkanad",
    distanceKm: "1.0",
    driveMins: "3",
    rating: "4.5",
    reviews: "56",
    connector: "CHAdeMO",
    price: "$0.5/ kWh",
  },
  {
    id: "st-spark-ev",
    title: "Spark EV Station",
    address: "14 Seaport-Airport Ave, Infopark Phase 1",
    distanceKm: "1.8",
    driveMins: "3",
    rating: "4.8",
    reviews: "84",
    connector: "Type A",
    price: "$0.75/ kWh",
  },
];

const PAST_SESSIONS = [
  {
    id: "INV-2026-841",
    station: "Pall Mall Station",
    date: "May 28, 2026 • 16:30",
    connector: "CHAdeMO • Slot B",
    kwh: "28.4 kWh",
    duration: "38 mins",
    amount: "$14.20",
  },
  {
    id: "INV-2026-819",
    station: "Spark EV Station",
    date: "May 24, 2026 • 11:15",
    connector: "Type A • Slot A",
    kwh: "19.2 kWh",
    duration: "52 mins",
    amount: "$14.40",
  },
  {
    id: "INV-2026-792",
    station: "Infopark Green Plaza",
    date: "May 19, 2026 • 18:00",
    connector: "Type B • Slot C",
    kwh: "34.0 kWh",
    duration: "41 mins",
    amount: "$25.50",
  },
];

export default function BookingsAndSavedScreen() {
  const router = useRouter();
  const {
    savedStationIds,
    toggleSavedStation,
    stations,
    bookings,
    chargingHistory,
    cancelBooking,
    startChargingSession,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"bookings" | "saved" | "history">(
    "bookings"
  );
  const [selectedInvoice, setSelectedInvoice] = useState<
    (typeof chargingHistory)[0] | null
  >(null);

  const activeBookingsList = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "ACTIVE"
  );
  const savedStationsList = stations.filter((st) =>
    savedStationIds.includes(st.id)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Stations & Bookings</Text>
        <Text style={styles.pageSubtitle}>
          Active reservations, saved stations & charging receipts
        </Text>

        {/* Segmented Pill Control */}
        <View style={styles.segmentBar}>
          {[
            { id: "bookings", label: "Active Pass" },
            { id: "saved", label: "Saved Stations" },
            { id: "history", label: "History" },
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setActiveTab(tab.id as any);
                }}
                style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    isSel && styles.segmentBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===================== TAB 1: ACTIVE BOOKING PASS ===================== */}
        {activeTab === "bookings" && (
          <View style={{ gap: 14 }}>
            {(activeBookingsList.length > 0 ? activeBookingsList : bookings.slice(0, 1)).map(
              (bk) => (
                <View key={bk.id} style={styles.activeBookingCard}>
                  <View style={styles.bookingTopRow}>
                    <View style={styles.confirmedBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.confirmedBadgeText}>
                        {bk.status === "ACTIVE"
                          ? "CHARGING ACTIVE"
                          : "CONFIRMED SLOT"}
                      </Text>
                    </View>
                    <Text style={styles.gateCodeLabel}>
                      Pass {bk.gatePassCode}
                    </Text>
                  </View>

                  <Text style={styles.bookingStationName}>
                    {bk.stationName}
                  </Text>
                  <Text style={styles.bookingStationAddr}>
                    {bk.stationAddress}
                  </Text>

                  <View style={styles.connectorSummaryRow}>
                    <ConnectorPlugIllustration
                      variant={bk.connectorName}
                      size={46}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectorTitle}>
                        {bk.connectorName} • {bk.slotLabel}
                      </Text>
                      <Text style={styles.connectorSub}>
                        {bk.priceLabel} • {bk.powerKw} kW Fast Charge
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dateTimePillsRow}>
                    <View style={styles.infoPill}>
                      <Calendar size={14} color="#151C18" />
                      <Text style={styles.infoPillText}>{bk.dateLabel}</Text>
                    </View>
                    <View style={styles.infoPill}>
                      <Clock size={14} color="#151C18" />
                      <Text style={styles.infoPillText}>{bk.timeWindow}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(driver)/gate-pass",
                          params: { bookingId: bk.id },
                        })
                      }
                      style={styles.gatePassOutlineBtn}
                    >
                      <QrCode size={16} color="#151C18" />
                      <Text style={styles.gatePassOutlineText}>Gate Pass</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        startChargingSession({
                          bookingId: bk.id,
                          stationId: bk.stationId,
                          stationName: bk.stationName,
                          connectorName: bk.connectorName,
                          slotLabel: bk.slotLabel,
                          powerKw: bk.powerKw,
                          pricePerKwh: bk.pricePerKwh,
                        });
                        router.push({
                          pathname: "/(driver)/active-charge",
                          params: {
                            stationId: bk.stationId,
                            stationName: bk.stationName,
                            connectorName: bk.connectorName,
                            slotLabel: bk.slotLabel,
                            powerKw: String(bk.powerKw),
                          },
                        });
                      }}
                      style={styles.startChargeBtn}
                    >
                      <Zap size={16} color="#151C18" fill="#151C18" />
                      <Text style={styles.startChargeText}>Start Charging</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* ===================== TAB 2: SAVED STATIONS ===================== */}
        {activeTab === "saved" && (
          <View style={{ gap: 12 }}>
            {(savedStationsList.length > 0 ? savedStationsList : stations.slice(0, 3)).map(
              (st) => {
                const isFav = savedStationIds.includes(st.id);
                return (
                  <View key={st.id} style={styles.savedCard}>
                    <View style={styles.savedHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedTitle}>{st.title}</Text>
                        <Text style={styles.savedAddress}>{st.address}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleSavedStation(st.id)}
                        style={styles.heartCircle}
                      >
                        <Heart
                          size={17}
                          color={isFav ? "#E53935" : "#151C18"}
                          fill={isFav ? "#E53935" : "none"}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.savedMetaRow}>
                      <View style={styles.ratingInline}>
                        <Star size={13} color="#151C18" fill="#151C18" />
                        <Text style={styles.ratingBold}>{st.rating}</Text>
                        <Text style={styles.ratingSub}>({st.reviews})</Text>
                      </View>
                      <View style={styles.greyPill}>
                        <Text style={styles.greyPillText}>
                          {st.distanceKm} km
                        </Text>
                      </View>
                      <View style={styles.greyPill}>
                        <Text style={styles.greyPillText}>
                          {st.priceDisplay}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(driver)/booking-sheet",
                          params: {
                            stationId: st.id,
                            stationName: st.title,
                            stationAddress: st.address,
                            distanceKm: String(st.distanceKm),
                            driveMins: String(st.driveMins),
                            rating: String(st.rating),
                            reviews: String(st.reviews),
                          },
                        })
                      }
                      style={styles.bookSavedBtn}
                    >
                      <Text style={styles.bookSavedBtnText}>Book Slot</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
            )}
          </View>
        )}

        {/* ===================== TAB 3: CHARGING HISTORY ===================== */}
        {activeTab === "history" && (
          <View style={{ gap: 12 }}>
            {chargingHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedInvoice(item)}
                activeOpacity={0.85}
                style={styles.historyCard}
              >
                <View style={styles.historyTopRow}>
                  <View>
                    <Text style={styles.historyStation}>{item.station}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <Text style={styles.historyAmount}>{item.amount}</Text>
                </View>

                <View style={styles.historyBottomRow}>
                  <Text style={styles.historyMeta}>
                    {item.connector} • {item.kwh} ({item.duration})
                  </Text>
                  <View style={styles.invoicePill}>
                    <FileText size={12} color="#151C18" />
                    <Text style={styles.invoicePillText}>Receipt</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ===================== RECEIPT MODAL ===================== */}
      <Modal
        visible={!!selectedInvoice}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Charging Tax Receipt</Text>
              <TouchableOpacity
                onPress={() => setSelectedInvoice(null)}
                style={styles.closeBtn}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <>
                <View style={styles.invoiceBox}>
                  <View style={styles.invRow}>
                    <Text style={styles.invLabel}>Invoice ID</Text>
                    <Text style={styles.invVal}>{selectedInvoice.id}</Text>
                  </View>
                  <View style={styles.invRow}>
                    <Text style={styles.invLabel}>Station</Text>
                    <Text style={styles.invVal}>{selectedInvoice.station}</Text>
                  </View>
                  <View style={styles.invRow}>
                    <Text style={styles.invLabel}>Connector</Text>
                    <Text style={styles.invVal}>{selectedInvoice.connector}</Text>
                  </View>
                  <View style={styles.invRow}>
                    <Text style={styles.invLabel}>Energy Delivered</Text>
                    <Text style={styles.invVal}>{selectedInvoice.kwh}</Text>
                  </View>
                  <View style={[styles.invRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.invTotalLabel}>Total Paid</Text>
                    <Text style={styles.invTotalVal}>
                      {selectedInvoice.amount}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `VoltMate Receipt ${selectedInvoice.id}: ${selectedInvoice.kwh} at ${selectedInvoice.station} (${selectedInvoice.amount}).`,
                      });
                    } catch {}
                  }}
                  style={styles.shareInvoiceBtn}
                >
                  <Share2 size={16} color="#151C18" />
                  <Text style={styles.shareInvoiceText}>Share Receipt</Text>
                </TouchableOpacity>
              </>
            )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 112,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 3,
    marginBottom: 16,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: "#E4E8E6",
    borderRadius: 24,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#151C18",
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#525C57",
  },
  segmentBtnTextActive: {
    color: "#05E660",
  },
  activeBookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  bookingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#05E660",
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A38",
  },
  gateCodeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#757F7A",
  },
  bookingStationName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111714",
  },
  bookingStationAddr: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 2,
    marginBottom: 14,
  },
  connectorSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
    padding: 12,
    borderRadius: 18,
    marginBottom: 14,
  },
  connectorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  connectorSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  dateTimePillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F3",
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#151C18",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  gatePassOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#151C18",
    gap: 6,
  },
  gatePassOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  startChargeBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    gap: 6,
  },
  startChargeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  savedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  savedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  savedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  savedAddress: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  heartCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  savedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  ratingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  ratingBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111714",
  },
  ratingSub: {
    fontSize: 12,
    color: "#757F7A",
  },
  greyPill: {
    backgroundColor: "#E4E8E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greyPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#151C18",
  },
  bookSavedBtn: {
    backgroundColor: "#05E660",
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bookSavedBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  historyStation: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111714",
  },
  historyDate: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  historyBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F3",
  },
  historyMeta: {
    fontSize: 12,
    color: "#757F7A",
  },
  invoicePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  invoicePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#151C18",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  invoiceBox: {
    backgroundColor: "#F7F9F8",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  invRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEA",
  },
  invLabel: {
    fontSize: 13,
    color: "#757F7A",
  },
  invVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111714",
  },
  invTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  invTotalVal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#05E660",
  },
  shareInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#05E660",
    gap: 8,
  },
  shareInvoiceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
});
