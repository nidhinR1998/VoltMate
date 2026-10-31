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
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { VerticalBatteryIndicator, EvCarHeroRender } from "./EvVisuals";
import { launchNativePhoneCall } from "../../services/notificationService";

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
        >
          <View style={styles.pulseDot} />
          <Text style={styles.minimizedText} numberOfLines={1}>
            ⚡ Charging {activeSession.currentSoc}% • {activeSession.deliveredKwh.toFixed(2)} kWh • ₹{activeSession.liveCostInr.toFixed(2)}
          </Text>
          <Text style={styles.minimizedOpenBtn}>Open →</Text>
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
            >
              <Text style={styles.minimizeBtnTxt}>⌄ Minimize</Text>
            </TouchableOpacity>

            <View style={styles.liveTag}>
              <View
                style={[
                  styles.pulseDot,
                  activeSession?.isPaused && { backgroundColor: "#F59E0B" },
                ]}
              />
              <Text style={styles.liveTagText}>
                {activeSession?.isPaused ? "PAUSED" : "LIVE TELEMETRY (1s)"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={togglePauseChargingSession}
            >
              <Text style={styles.pauseBtnText}>
                {activeSession?.isPaused ? "▶" : "⏸"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.stationTitle}>
            {activeSession?.stationName || "Spark EV Fast Hub"}
          </Text>
          <Text style={styles.stationSub}>
            {activeVehicle?.makeModel || "Tata Nexon EV Empowered+"} •{" "}
            {activeVehicle?.plateNumber || "KL-07-CS-4921"}
          </Text>

          <View style={styles.heroRow}>
            <VerticalBatteryIndicator
              socPercent={activeSession?.currentSoc ?? 72}
            />
            <View style={styles.carWrap}>
              <EvCarHeroRender model={activeVehicle?.makeModel} />
            </View>
          </View>

          {/* 4 Live 1-Second Telemetry Cards */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCard}>
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
            </View>

            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryLabel}>Energy Delivered</Text>
              <Text style={styles.telemetryValue}>
                {(activeSession?.deliveredKwh ?? 0).toFixed(2)} kWh
              </Text>
              <Text style={styles.telemetrySub} numberOfLines={1}>
                {activeSession?.connectorType || "Type-2 AC"}
              </Text>
            </View>

            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryLabel}>Session Timer</Text>
              <Text style={styles.telemetryValue}>
                {formatTimer(activeSession?.elapsedSeconds ?? 0)}
              </Text>
              <Text style={styles.telemetrySub}>
                Target SOC: {activeSession?.targetCutOffSoc ?? 80}%
              </Text>
            </View>

            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryLabel}>Live Cost (₹ INR)</Text>
              <Text style={[styles.telemetryValue, { color: "#096B30" }]}>
                ₹{(activeSession?.liveCostInr ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.telemetrySub}>
                @ ₹{(activeSession?.ratePerKwh ?? 10.5).toFixed(2)}/kWh
              </Text>
            </View>
          </View>

          {/* Smart Cut-Off Selector */}
          <View style={styles.cutOffCard}>
            <Text style={styles.cutOffTitle}>Smart Auto Cut-Off Target</Text>
            <View style={styles.cutOffPillsRow}>
              {([80, 90, 100] as const).map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[
                    styles.cutOffPill,
                    activeSession?.targetCutOffSoc === pct &&
                      styles.cutOffPillActive,
                  ]}
                  onPress={() => setTargetCutOffSoc(pct)}
                >
                  <Text
                    style={[
                      styles.cutOffPillText,
                      activeSession?.targetCutOffSoc === pct &&
                        styles.cutOffPillTextActive,
                    ]}
                  >
                    Stop @ {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Call Station / Host Button */}
          <TouchableOpacity
            style={styles.callHostBtn}
            onPress={() =>
              launchNativePhoneCall(activeSession?.hostPhone || "+919847011223")
            }
          >
            <Text style={styles.callHostBtnText}>
              📞 Call Station Host ({activeSession?.hostName || "Kochi Grid"})
            </Text>
          </TouchableOpacity>

          {/* Stop Charging & Pay Bill Button */}
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={stopChargingSession}
            activeOpacity={0.9}
          >
            <Text style={styles.stopBtnText}>
              Stop Charging & Pay Bill (₹
              {(activeSession?.liveCostInr ?? 0).toFixed(2)})
            </Text>
          </TouchableOpacity>
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
              <Text style={styles.receiptSuccessIcon}>✓</Text>
            </View>
            <Text style={styles.receiptTitle}>Verified GST / MoP Receipt</Text>
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
                Updated Wallet Balance: ₹
                {(user?.voltCreditsBalance ?? 1450).toFixed(2)}
              </Text>
            </View>

            <View style={styles.receiptRowsWrap}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Charging Station</Text>
                <Text style={styles.receiptVal}>
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
                <Text style={styles.receiptVal}>
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
                <Text style={styles.receiptKey}>Updated EV SOC</Text>
                <Text style={[styles.receiptVal, { color: "#096B30" }]}>
                  {activeVehicle?.socPercent}% SOC ({activeVehicle?.rangeKm} km)
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
                onPress={clearSettledReceipt}
              >
                <Text style={styles.doneInvoiceBtnTxt}>Done</Text>
              </TouchableOpacity>
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
    top: 52,
    left: 18,
    right: 18,
    backgroundColor: "#10241B",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 9000,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: "#05E660",
  },
  minimizedText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  minimizedOpenBtn: {
    color: "#05E660",
    fontSize: 12,
    fontWeight: "900",
  },
  cockpitContainer: {
    flex: 1,
    backgroundColor: "#FAF8F3",
  },
  cockpitContent: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 60,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  minimizeBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  minimizeBtnTxt: {
    fontSize: 13,
    fontWeight: "800",
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
    marginBottom: 14,
  },
  cutOffTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
  },
  cutOffPillTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  callHostBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAFBF0",
    borderWidth: 1.5,
    borderColor: "#16B374",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  callHostBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
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

