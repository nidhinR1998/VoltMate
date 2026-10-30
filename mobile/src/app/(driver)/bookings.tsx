import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  Alert,
  Linking,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect } from "react-native-svg";
import {
  Zap,
  QrCode,
  Clock,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Receipt,
  Car,
  Calendar,
  X,
  Phone,
  Navigation,
  CheckCircle2,
  Copy,
  Download,
  Share2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSessionStore } from "../../store/useSessionStore";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

// Vector QR Code Component
const SocietyQrCode: React.FC<{ size?: number }> = ({ size = 180 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Rect width="100" height="100" fill="#FFFFFF" rx="8" />
    <Rect x="8" y="8" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="12" y="12" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="16" y="16" width="10" height="10" fill="#000000" rx="2" />

    <Rect x="66" y="8" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="70" y="12" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="74" y="16" width="10" height="10" fill="#000000" rx="2" />

    <Rect x="8" y="66" width="26" height="26" fill="#000000" rx="4" />
    <Rect x="12" y="70" width="18" height="18" fill="#FFFFFF" rx="2" />
    <Rect x="16" y="74" width="10" height="10" fill="#000000" rx="2" />

    <Rect x="40" y="12" width="6" height="6" fill="#000000" />
    <Rect x="50" y="12" width="6" height="6" fill="#000000" />
    <Rect x="40" y="24" width="6" height="6" fill="#000000" />
    <Rect x="50" y="24" width="10" height="6" fill="#000000" />
    <Rect x="12" y="42" width="8" height="6" fill="#000000" />
    <Rect x="38" y="42" width="24" height="6" fill="#000000" />
    <Rect x="68" y="42" width="6" height="6" fill="#000000" />
    <Rect x="44" y="54" width="12" height="6" fill="#000000" />
    <Rect x="62" y="54" width="8" height="6" fill="#000000" />
    <Rect x="40" y="66" width="6" height="12" fill="#000000" />
    <Rect x="52" y="66" width="8" height="6" fill="#000000" />
    <Rect x="82" y="66" width="6" height="12" fill="#000000" />
    <Rect x="52" y="78" width="14" height="6" fill="#000000" />
    <Rect x="72" y="78" width="8" height="6" fill="#000000" />
  </Svg>
);

export default function BookingsScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const { isSessionActive, telemetry, startSession } = useSessionStore();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  // Modals
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const pastReceipts = [
    {
      id: "REC-9402",
      date: "28 Oct 2026, 06:30 PM",
      host: "Lotus Greens Villa (Arun K.)",
      location: "Kakkanad, Kochi • Bay B-14",
      units: "14.2 kWh",
      duration: "1h 45m",
      amount: "₹120.70",
      status: "COMPLETED",
      paymentMethod: "VoltCredits (₹0 Fee)",
      discomSlab: "KSEB LT-1A Telescopic",
      ksebUnitRate: "₹8.50 / kWh",
      hostUtr: "UTR_829471928471",
    },
    {
      id: "REC-8921",
      date: "25 Oct 2026, 09:15 AM",
      host: "Infopark Phase 2 DC Hub",
      location: "Infopark Expressway, Kochi",
      units: "28.5 kWh",
      duration: "35m",
      amount: "₹513.00",
      status: "COMPLETED",
      paymentMethod: "UPI Direct",
      discomSlab: "Commercial EV Fast Slab",
      ksebUnitRate: "₹18.00 / kWh",
      hostUtr: "UTR_719482019482",
    },
    {
      id: "REC-7814",
      date: "21 Oct 2026, 08:00 PM",
      host: "Skyline Imperial Bay Socket",
      location: "Marine Drive, Kochi",
      units: "11.0 kWh",
      duration: "1h 20m",
      amount: "₹93.50",
      status: "COMPLETED",
      paymentMethod: "VoltCredits",
      discomSlab: "KSEB Domestic",
      ksebUnitRate: "₹8.50 / kWh",
      hostUtr: "UTR_619482019381",
    },
  ];

  const handleStartChargingFromModal = () => {
    setShowGatePassModal(false);
    startSession({
      bookingId: "VM-ACT-9901",
      hostName: "Arun Kumar (Verified Host)",
      hostPhone: "+91 98460 12345",
      vehicleModel: "Tata Nexon EV Max",
      batteryCapacityKwh: 40.5,
      initialSoc: 42.0,
    });
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.push("/(driver)/active-charge");
  };

  const handleShareReceipt = (rec: any) => {
    Share.share({
      message: `VoltMate EV Charging Receipt\nStation: ${rec.host}\nUnits: ${rec.units}\nAmount: ${rec.amount}\nUTR: ${rec.hostUtr}`,
    }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            My <Text style={{ color: accentColor }}>Bookings</Text>
          </Text>
          <Text style={styles.subtitle}>
            Live charging passes, security check-ins & receipts
          </Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("ACTIVE");
            }}
            style={[styles.tabPill, activeTab === "ACTIVE" && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, activeTab === "ACTIVE" && styles.tabTextActive]}>
              Active Passes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("HISTORY");
            }}
            style={[styles.tabPill, activeTab === "HISTORY" && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, activeTab === "HISTORY" && styles.tabTextActive]}>
              Charging Receipts
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "ACTIVE" ? (
          <View style={styles.activeSection}>
            {/* Live Active Charge Banner if Session Active */}
            {isSessionActive && (
              <TouchableOpacity
                onPress={() => router.push("/(driver)/active-charge")}
                activeOpacity={0.85}
                style={styles.liveChargeCard}
              >
                <View style={styles.liveBadgeRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveText}>LIVE CHARGING IN PROGRESS</Text>
                  <Text style={styles.socBadge}>
                    {telemetry.currentSocPercent.toFixed(0)}% SOC
                  </Text>
                </View>

                <View style={styles.liveDetailsRow}>
                  <View>
                    <Text style={styles.liveHostName}>Arun Kumar (Host)</Text>
                    <Text style={styles.liveStatsText}>
                      {telemetry.deliveredKwh.toFixed(1)} kWh • ₹{telemetry.liveCostInr.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.viewCockpitBtn}>
                    <Text style={styles.viewCockpitText}>Open Cockpit</Text>
                    <ChevronRight size={16} color="#06090E" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Active Gate Pass Card */}
            <View style={styles.gatePassCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeBadge}>
                  <Zap size={13} color="#00F59B" />
                  <Text style={styles.typeBadgeText}>P2P RESERVED</Text>
                </View>
                <View style={styles.timerBadge}>
                  <Clock size={12} color="#FFB800" />
                  <Text style={styles.timerBadgeText}>Arrive in 18 mins</Text>
                </View>
              </View>

              <Text style={styles.stationTitle}>Lotus Greens Villa 15A Socket</Text>
              <View style={styles.locationRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.locationText}>Kakkanad, Kochi • Bay B-14</Text>
              </View>

              {/* Society Security Pass Box */}
              <View style={styles.securityBox}>
                <View style={styles.securityLeft}>
                  <Text style={styles.securityLabel}>SOCIETY ENTRY CODE</Text>
                  <Text style={styles.securityCode}>#849-201</Text>
                  <Text style={styles.securitySub}>Show to Security Guard</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowGatePassModal(true)}
                  style={styles.qrBtn}
                >
                  <QrCode size={28} color="#00F59B" />
                  <Text style={styles.qrBtnText}>View Pass</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => setShowGatePassModal(true)}
                  style={styles.primaryActionBtn}
                >
                  <Text style={styles.primaryActionText}>Open Digital Gate Pass</Text>
                  <ChevronRight size={16} color="#06090E" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Zero-Wait Society Access Helper */}
            <View style={styles.helperCard}>
              <ShieldCheck size={18} color="#00F59B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.helperTitle}>Zero-Wait Society Access</Text>
                <Text style={styles.helperSub}>
                  Your digital gate pass includes auto-approved MyGate society clearance for your EV plate number.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Past Receipts Tab */
          <View style={styles.historySection}>
            {pastReceipts.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => setSelectedReceipt(rec)}
                activeOpacity={0.8}
                style={styles.receiptCard}
              >
                <View style={styles.receiptTop}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.receiptHost}>{rec.host}</Text>
                    <Text style={styles.receiptDate}>{rec.date}</Text>
                  </View>
                  <Text style={styles.receiptAmount}>{rec.amount}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Energy</Text>
                    <Text style={styles.metricValue}>{rec.units}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{rec.duration}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Payment</Text>
                    <Text style={styles.metricValueHighlight}>{rec.paymentMethod}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full-Screen Digital Society Gate Pass Modal */}
      <Modal visible={showGatePassModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Digital Society Gate Pass</Text>
              <TouchableOpacity onPress={() => setShowGatePassModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalPassCard}>
              <View style={styles.passTopRow}>
                <View style={styles.approvedPill}>
                  <CheckCircle2 size={12} color="#00F59B" />
                  <Text style={styles.approvedText}>MYGATE PRE-APPROVED</Text>
                </View>
                <Text style={styles.passExpiry}>Valid for next 45m</Text>
              </View>

              <Text style={styles.passStationTitle}>Lotus Greens Villa 15A Socket</Text>
              <Text style={styles.passLocation}>Lotus Greens Enclave • Bay B-14</Text>

              {/* QR Code */}
              <View style={styles.qrBox}>
                <SocietyQrCode size={180} />
                <Text style={styles.qrHelper}>Show to Society Security Guard</Text>
              </View>

              {/* Gate Pass Code */}
              <View style={styles.gateCodeBox}>
                <Text style={styles.gateCodeLabel}>SOCIETY ENTRY CODE</Text>
                <Text style={styles.gateCodeNumber}>#849-201</Text>
                <Text style={styles.gateCodeSub}>Registered to Plate: KL-07-CS-4921</Text>
              </View>

              {/* Quick Contacts */}
              <View style={styles.modalContactRow}>
                <TouchableOpacity
                  onPress={() => Linking.openURL("tel:+919846012345")}
                  style={styles.modalContactBtn}
                >
                  <Phone size={15} color="#00F59B" />
                  <Text style={styles.modalContactText}>Call Host (Masked)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://www.google.com/maps/search/?api=1&query=Kakkanad+Kochi")
                  }
                  style={styles.modalContactBtn}
                >
                  <Navigation size={15} color="#00E5FF" />
                  <Text style={[styles.modalContactText, { color: "#00E5FF" }]}>Open in Maps</Text>
                </TouchableOpacity>
              </View>

              {/* Start Charging Session Button */}
              <TouchableOpacity
                onPress={handleStartChargingFromModal}
                style={styles.modalStartBtn}
              >
                <Zap size={18} color="#06090E" />
                <Text style={styles.modalStartBtnText}>
                  ⚡ Start Charging Session (Plug In)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detailed Tax & MoP Invoice Modal */}
      {selectedReceipt && (
        <Modal visible={!!selectedReceipt} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Receipt size={20} color="#00F59B" />
                  <Text style={styles.modalTitle}>MoP Energy Receipt</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.invoiceCard}>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Invoice Number</Text>
                  <Text style={styles.invVal}>{selectedReceipt.id}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Date & Time</Text>
                  <Text style={styles.invVal}>{selectedReceipt.date}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Charging Host</Text>
                  <Text style={styles.invVal}>{selectedReceipt.host}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Location</Text>
                  <Text style={styles.invVal}>{selectedReceipt.location}</Text>
                </View>

                <View style={styles.invDivider} />

                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Energy Consumed</Text>
                  <Text style={styles.invValHighlight}>{selectedReceipt.units}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Electricity Utility Slab</Text>
                  <Text style={styles.invVal}>{selectedReceipt.discomSlab}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Tariff Rate</Text>
                  <Text style={styles.invVal}>{selectedReceipt.ksebUnitRate}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invLabel}>Platform Convenience Fee</Text>
                  <Text style={[styles.invVal, { color: "#00F59B" }]}>₹0.00 (Zero Fee)</Text>
                </View>

                <View style={styles.invDivider} />

                <View style={styles.invoiceRowTotal}>
                  <Text style={styles.invTotalLabel}>Total Paid</Text>
                  <Text style={styles.invTotalVal}>{selectedReceipt.amount}</Text>
                </View>

                <Text style={styles.utrNote}>
                  Settled directly to host via UPI. Bank UTR: {selectedReceipt.hostUtr}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleShareReceipt(selectedReceipt)}
                style={styles.shareInvoiceBtn}
              >
                <Share2 size={16} color="#06090E" />
                <Text style={styles.shareInvoiceBtnText}>Share / Download Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 16,
  },
  tabPillActive: {
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    borderWidth: 1,
    borderColor: "#00F59B",
  },
  tabText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#00F59B",
    fontWeight: "700",
  },
  activeSection: {
    gap: 16,
  },
  liveChargeCard: {
    backgroundColor: "rgba(0, 245, 155, 0.08)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#00F59B",
    padding: 16,
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00F59B",
    marginRight: 8,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00F59B",
    letterSpacing: 0.5,
    flex: 1,
  },
  socBadge: {
    backgroundColor: "#06090E",
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveHostName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  liveStatsText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  viewCockpitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00F59B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  viewCockpitText: {
    color: "#06090E",
    fontWeight: "700",
    fontSize: 12,
  },
  gatePassCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,184,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timerBadgeText: {
    color: "#FFB800",
    fontSize: 11,
    fontWeight: "700",
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#06090E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  securityLeft: {},
  securityLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  securityCode: {
    fontSize: 24,
    fontWeight: "900",
    color: "#00F59B",
    letterSpacing: 1,
    marginVertical: 2,
  },
  securitySub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  qrBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,245,155,0.08)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
  },
  qrBtnText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  primaryActionText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 14,
  },
  helperCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(15,22,34,0.6)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  helperTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  helperSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  historySection: {
    gap: 12,
  },
  receiptCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
  },
  receiptTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  receiptHost: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  receiptDate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00F59B",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
  },
  receiptMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  metricValueHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00E5FF",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1622",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalPassCard: {
    backgroundColor: "#06090E",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  passTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  approvedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,245,155,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  approvedText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  passExpiry: {
    fontSize: 11,
    color: "#94A3B8",
  },
  passStationTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  passLocation: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    marginBottom: 12,
  },
  qrBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1622",
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
  },
  qrHelper: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
  },
  gateCodeBox: {
    alignItems: "center",
    backgroundColor: "#0F1622",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  gateCodeLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
  },
  gateCodeNumber: {
    fontSize: 26,
    fontWeight: "900",
    color: "#00F59B",
    letterSpacing: 2,
    marginVertical: 2,
  },
  gateCodeSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  modalContactRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modalContactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1622",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  modalContactText: {
    color: "#00F59B",
    fontSize: 11,
    fontWeight: "700",
  },
  modalStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  modalStartBtnText: {
    color: "#06090E",
    fontSize: 13,
    fontWeight: "800",
  },
  invoiceCard: {
    backgroundColor: "#06090E",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  invLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  invVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  invValHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#00F59B",
  },
  invDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 8,
  },
  invoiceRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  invTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  invTotalVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00F59B",
  },
  utrNote: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 8,
  },
  shareInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  shareInvoiceBtnText: {
    color: "#06090E",
    fontSize: 13,
    fontWeight: "800",
  },
});
