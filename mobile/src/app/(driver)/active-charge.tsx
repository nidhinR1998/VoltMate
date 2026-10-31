import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useAuthStore,
  TAB_BAR_SAFE_PADDING,
  ChargingHistoryRecord,
} from "../../store/useAuthStore";
import { VerticalBatteryIndicator, EvCarHeroRender } from "../../components/ui/EvVisuals";

export default function ActiveChargeScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const {
    bookings,
    vehicles,
    user,
    completeChargingSession,
    showToast,
  } = useAuthStore();

  const booking = bookings.find((b) => b.id === bookingId) || bookings[0];
  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const [soc, setSoc] = useState(activeVehicle?.socPercent ?? 72);
  const [targetCutOff, setTargetCutOff] = useState<80 | 90 | 100>(80);
  const [deliveredKwh, setDeliveredKwh] = useState(4.85);
  const [elapsedSeconds, setElapsedSeconds] = useState(1455); // 00:24:15
  const [isPaused, setIsPaused] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState<ChargingHistoryRecord | null>(null);

  const pricePerKwh = booking?.pricePerKwh ?? 10.5;
  const powerKw = booking?.powerKw ?? 7.2;
  const liveCost = Number((deliveredKwh * pricePerKwh).toFixed(2));

  useEffect(() => {
    if (isPaused || settledReceipt) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setDeliveredKwh((prev) => Number((prev + 0.03).toFixed(2)));
      setSoc((prev) => {
        if (prev >= targetCutOff) {
          return prev;
        }
        return prev < 100 && Math.random() > 0.45 ? prev + 1 : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isPaused, settledReceipt, targetCutOff]);

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const estMinsRemaining = Math.max(
    2,
    Math.round(((Math.max(soc, targetCutOff) - soc) * 0.42 * 60) / Math.max(3.3, powerKw))
  );

  const handleStopAndSettle = async () => {
    setIsPaused(true);
    const record = await completeChargingSession({
      bookingId: booking?.id,
      stationName: booking?.stationName || "Spark EV Hub (Infopark Phase 1)",
      hostName: booking?.hostName || "Spark Grid Kerala",
      energyKwh: deliveredKwh,
      durationMins: Math.max(1, Math.round(elapsedSeconds / 60)),
      amount: liveCost,
      ratePerKwh: pricePerKwh,
      connectorType: booking?.connectorType || "Type-2 AC Wallbox",
      finalSocPercent: soc,
    });
    setSettledReceipt(record);
  };

  const handleShareReceipt = async () => {
    if (!settledReceipt) return;
    try {
      await Share.share({
        message: `VoltMate EV GST Charging Invoice #${settledReceipt.id}\nStation: ${settledReceipt.station}\nVehicle: ${settledReceipt.vehiclePlate}\nEnergy: ${settledReceipt.energyKwh} kWh @ ₹${settledReceipt.ratePerKwh?.toFixed(2)}/kWh\nTotal Settled: ₹${settledReceipt.amount.toFixed(2)} (Paid via VoltMate Wallet)`,
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
      {/* Top Bar */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(driver)/home")
          }
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.liveTag}>
          <View
            style={[
              styles.pulseDot,
              isPaused && { backgroundColor: "#F59E0B" },
            ]}
          />
          <Text style={styles.liveTagText}>
            {isPaused ? "PAUSED" : "CHARGING ACTIVE"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.pauseBtn}
          onPress={() => {
            const next = !isPaused;
            setIsPaused(next);
            showToast(
              next ? "Charging Paused" : "Charging Resumed",
              next
                ? "Power flow temporarily suspended."
                : `Delivering ${powerKw} kW to ${activeVehicle?.makeModel}.`,
              "info"
            );
          }}
        >
          <Text style={styles.pauseBtnText}>{isPaused ? "▶" : "⏸"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stationTitle}>
        {booking?.stationName || "Spark EV Hub"}
      </Text>
      <Text style={styles.stationSub}>
        {activeVehicle?.makeModel || "Tata Nexon EV Empowered+"} •{" "}
        {activeVehicle?.plateNumber || "KL-07-CS-4921"}
      </Text>

      {/* Rising Liquid Battery + 3D EV Car */}
      <View style={styles.heroRow}>
        <VerticalBatteryIndicator socPercent={soc} />
        <View style={styles.carWrap}>
          <EvCarHeroRender model={activeVehicle?.makeModel} />
        </View>
      </View>

      {/* 4 Real-Time Telemetry Cards */}
      <View style={styles.telemetryGrid}>
        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryLabel}>Power Output</Text>
          <Text style={styles.telemetryValue}>
            {isPaused ? "0.0" : powerKw.toFixed(1)} kW
          </Text>
          <Text style={styles.telemetrySub}>231V • 31.2A Stable</Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryLabel}>Energy Delivered</Text>
          <Text style={styles.telemetryValue}>{deliveredKwh.toFixed(2)} kWh</Text>
          <Text style={styles.telemetrySub}>
            {booking?.connectorType || "Type-2 AC Wallbox"}
          </Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryLabel}>Session Timer</Text>
          <Text style={styles.telemetryValue}>{formatDuration(elapsedSeconds)}</Text>
          <Text style={styles.telemetrySub}>
            Est. {estMinsRemaining} mins to {targetCutOff}%
          </Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryLabel}>Live Cost (₹ INR)</Text>
          <Text style={[styles.telemetryValue, { color: "#096B30" }]}>
            ₹{liveCost.toFixed(2)}
          </Text>
          <Text style={styles.telemetrySub}>@ ₹{pricePerKwh.toFixed(2)}/kWh</Text>
        </View>
      </View>

      {/* Smart Cut-Off Selector (80% / 90% / 100%) */}
      <View style={styles.cutOffCard}>
        <View style={styles.cutOffHeader}>
          <View>
            <Text style={styles.cutOffTitle}>Smart SOC Auto Cut-Off</Text>
            <Text style={styles.cutOffSub}>
              Automatically stops power & sends phone alert at target SOC
            </Text>
          </View>
          <View style={styles.cutOffBadge}>
            <Text style={styles.cutOffBadgeTxt}>Stop @ {targetCutOff}%</Text>
          </View>
        </View>
        <View style={styles.cutOffPillsRow}>
          {([80, 90, 100] as const).map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[
                styles.cutOffPill,
                targetCutOff === pct && styles.cutOffPillActive,
              ]}
              onPress={() => {
                setTargetCutOff(pct);
                showToast(
                  `Smart Cut-Off Set to ${pct}%`,
                  `Charger will auto-terminate when ${activeVehicle?.makeModel} hits ${pct}% SOC.`,
                  "info"
                );
              }}
            >
              <Text
                style={[
                  styles.cutOffPillText,
                  targetCutOff === pct && styles.cutOffPillTextActive,
                ]}
              >
                Stop at {pct}% {pct === 80 ? "(Recommended)" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stop Charging & Settle Bill Button */}
      <TouchableOpacity
        style={styles.stopBtn}
        onPress={handleStopAndSettle}
        activeOpacity={0.9}
      >
        <Text style={styles.stopBtnText}>
          Stop Charging & Settle Bill (₹{liveCost.toFixed(2)})
        </Text>
      </TouchableOpacity>

      {/* Itemized GST / MoP Charging Receipt Modal */}
      <Modal visible={!!settledReceipt} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptSheet}>
            <View style={styles.receiptSuccessBadge}>
              <Text style={styles.receiptSuccessIcon}>✓</Text>
            </View>
            <Text style={styles.receiptTitle}>Charging Session Settled</Text>
            <Text style={styles.receiptSub}>
              MoP India / KSEB Compliant EV Charging Receipt
            </Text>

            <View style={styles.receiptAmountBox}>
              <Text style={styles.receiptAmountLabel}>TOTAL PAID VIA VOLTMATE WALLET</Text>
              <Text style={styles.receiptAmountBig}>
                ₹{settledReceipt?.amount.toFixed(2)}
              </Text>
              <Text style={styles.receiptWalletRem}>
                Remaining Wallet Balance: ₹{(user?.voltCreditsBalance ?? 1450).toFixed(2)}
              </Text>
            </View>

            <View style={styles.receiptRowsWrap}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Invoice Number</Text>
                <Text style={styles.receiptVal}>#{settledReceipt?.id}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Charging Station</Text>
                <Text style={styles.receiptVal}>{settledReceipt?.station}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Host / Operator</Text>
                <Text style={styles.receiptVal}>{settledReceipt?.hostName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Vehicle & Plate</Text>
                <Text style={styles.receiptVal}>
                  {activeVehicle?.makeModel} ({settledReceipt?.vehiclePlate})
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Energy Delivered</Text>
                <Text style={styles.receiptVal}>
                  {settledReceipt?.energyKwh} kWh @ ₹{settledReceipt?.ratePerKwh?.toFixed(2)}/kWh
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Final Battery SOC</Text>
                <Text style={[styles.receiptVal, { color: "#096B30" }]}>
                  {soc}% SOC
                </Text>
              </View>
            </View>

            <View style={styles.receiptBtnRow}>
              <TouchableOpacity
                style={styles.shareInvoiceBtn}
                onPress={handleShareReceipt}
              >
                <Text style={styles.shareInvoiceBtnTxt}>↗ Share Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneInvoiceBtn}
                onPress={() => {
                  setSettledReceipt(null);
                  router.replace("/(driver)/bookings");
                }}
              >
                <Text style={styles.doneInvoiceBtnTxt}>View in Bookings</Text>
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
    paddingTop: 16,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#05E660",
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.6,
  },
  pauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  stationTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#151C18",
  },
  stationSub: {
    fontSize: 13,
    color: "#6B746E",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  carWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: -10,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  telemetryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  telemetryLabel: {
    fontSize: 12,
    color: "#7C857F",
    fontWeight: "600",
    marginBottom: 6,
  },
  telemetryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#151C18",
  },
  telemetrySub: {
    fontSize: 11,
    color: "#8A928D",
    fontWeight: "600",
    marginTop: 4,
  },
  cutOffCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cutOffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cutOffTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  cutOffSub: {
    fontSize: 11,
    color: "#7C857F",
    marginTop: 2,
  },
  cutOffBadge: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cutOffBadgeTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  cutOffPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  cutOffPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
  },
  cutOffPillActive: {
    backgroundColor: "#151C18",
  },
  cutOffPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5C6460",
  },
  cutOffPillTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  stopBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  receiptSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: "center",
  },
  receiptSuccessBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  receiptSuccessIcon: {
    fontSize: 26,
    fontWeight: "900",
    color: "#151C18",
  },
  receiptTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#151C18",
  },
  receiptSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
    marginBottom: 16,
  },
  receiptAmountBox: {
    width: "100%",
    backgroundColor: "#10241B",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  receiptAmountLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A7F3D0",
    letterSpacing: 0.8,
  },
  receiptAmountBig: {
    fontSize: 32,
    fontWeight: "900",
    color: "#05E660",
    marginVertical: 4,
  },
  receiptWalletRem: {
    fontSize: 12,
    color: "#D1FAE5",
    fontWeight: "600",
  },
  receiptRowsWrap: {
    width: "100%",
    backgroundColor: "#F5F7F6",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptKey: {
    fontSize: 12,
    color: "#6B746E",
    fontWeight: "600",
  },
  receiptVal: {
    fontSize: 12,
    color: "#151C18",
    fontWeight: "800",
    maxWidth: "62%",
    textAlign: "right",
  },
  receiptBtnRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  shareInvoiceBtn: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
  },
  shareInvoiceBtnTxt: {
    color: "#151C18",
    fontSize: 14,
    fontWeight: "800",
  },
  doneInvoiceBtn: {
    flex: 1,
    backgroundColor: "#05E660",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
  },
  doneInvoiceBtnTxt: {
    color: "#151C18",
    fontSize: 14,
    fontWeight: "800",
  },
});
