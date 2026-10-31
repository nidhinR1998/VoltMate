import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import {
  VerticalBatteryIndicator,
  EvCarHeroRender,
  ConnectorPlugIllustration,
} from "../../components/ui/EvVisuals";
import { launchNativeTurnByTurnMaps } from "../../services/notificationService";

export default function DriverHomeScreen() {
  const router = useRouter();
  const {
    user,
    vehicles,
    stations,
    bookings,
    chargingHistory,
    notifications,
    preferredMapLayer,
    reminderSnoozedUntil,
    setPrimaryVehicle,
    adjustActiveVehicleSoc,
    selectStation,
    startChargingSession,
    markNotificationsRead,
    triggerTestReminder,
    snoozeReminder,
    topUpWalletInr,
  } = useVoltMateEngine();

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [quickTopUpModal, setQuickTopUpModal] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<
    "Google Pay" | "PhonePe" | "Paytm"
  >("Google Pay");

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];
  const nearbyStation =
    stations.find((s) => s.id === "s2") || stations[0];
  const upcomingBooking =
    bookings.find(
      (b) => b.status === "UPCOMING" || b.status === "CONFIRMED"
    ) || bookings[0];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const estimatedEnergyKwh = activeVehicle
    ? (
        (activeVehicle.socPercent / 100) *
        activeVehicle.batteryCapacityKwh
      ).toFixed(1)
    : "32.4";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header: Vehicle Selector + INR Wallet Pill + Notification Bell */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.vehicleDropdownBtn}
          onPress={() => setVehicleModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.modelTitleRow}>
            <Text style={styles.modelTitle} numberOfLines={1}>
              {activeVehicle?.makeModel || "Tata Nexon EV Empowered+"}
            </Text>
            <Text style={styles.chevronDown}>⌄</Text>
          </View>
          <Text style={styles.modelSub}>
            {activeVehicle?.year || "2025"} •{" "}
            {activeVehicle?.plateNumber || "KL-07-CS-4921"} •{" "}
            {user?.fullName || "Nidhin R"}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.walletPill}
            onPress={() => setQuickTopUpModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.walletPillIcon}>₹</Text>
            <Text style={styles.walletPillAmount}>
              ₹
              {(user?.voltCreditsBalance ?? 1450.0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <View style={styles.walletPlusDot}>
              <Text style={styles.walletPlusTxt}>+</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Row: Vertical Battery Left (with Interactive - SoC + Controls) + 3D EV Car Right */}
      <View style={styles.heroRow}>
        <View style={styles.batteryColWrap}>
          <VerticalBatteryIndicator
            socPercent={activeVehicle?.socPercent ?? 72}
          />
          <View style={styles.socStepperRow}>
            <TouchableOpacity
              style={styles.socStepBtn}
              onPress={() => adjustActiveVehicleSoc(-5)}
            >
              <Text style={styles.socStepBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.socStepLabel}>SoC</Text>
            <TouchableOpacity
              style={styles.socStepBtn}
              onPress={() => adjustActiveVehicleSoc(5)}
            >
              <Text style={styles.socStepBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.carWrapper}>
          <EvCarHeroRender model={activeVehicle?.makeModel} />
        </View>
      </View>

      {/* Active Upcoming Reservation Card with Digital Gate Pass & Instant Start Charging */}
      {upcomingBooking && (
        <View style={styles.activeBookingBanner}>
          <View style={styles.activeBookingLeft}>
            <View style={styles.liveDotRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeBookingTag}>
                UPCOMING SLOT • PASS #{upcomingBooking.otpCode.slice(0, 3)}-
                {upcomingBooking.otpCode.slice(3)}
              </Text>
            </View>
            <Text style={styles.activeBookingStation}>
              {upcomingBooking.stationName}
            </Text>
            <Text style={styles.activeBookingMeta}>
              {upcomingBooking.slotTime} • {upcomingBooking.connectorType} (₹
              {upcomingBooking.pricePerKwh.toFixed(2)}/kWh)
            </Text>

            <View style={styles.activeBannerBtns}>
              <TouchableOpacity
                style={styles.startChargePillBtn}
                onPress={() => startChargingSession(upcomingBooking.id)}
              >
                <Text style={styles.startChargePillText}>
                  ⚡ Start Charging
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gatePassMiniBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/gate-pass",
                    params: { bookingId: upcomingBooking.id },
                  })
                }
              >
                <Text style={styles.gatePassMiniText}>Digital Gate Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Two Metric Cards: Distance & Energy */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricBigValue}>
              {activeVehicle?.rangeKm ?? 252}
            </Text>
            <Text style={styles.metricUnit}> km</Text>
          </View>
          <Text style={styles.metricSubText}>Kochi City + Highway</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Energy</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricBigValue}>{estimatedEnergyKwh}</Text>
            <Text style={styles.metricUnit}> kWh</Text>
          </View>
          <Text style={styles.metricSubText}>
            of {activeVehicle?.batteryCapacityKwh ?? 45.0} kWh pack
          </Text>
        </View>
      </View>

      {/* Charging Port Horizontal Card */}
      <TouchableOpacity
        style={styles.portCard}
        activeOpacity={0.88}
        onPress={() => {
          selectStation(nearbyStation.id);
          router.push({
            pathname: "/(driver)/booking-sheet",
            params: { stationId: nearbyStation.id },
          });
        }}
      >
        <ConnectorPlugIllustration
          type={activeVehicle?.connectorLabel || "CCS2 DC & Type-2 AC"}
          size="md"
        />
        <View style={styles.portTextCol}>
          <Text style={styles.portLabel}>Indian EV Charging Port</Text>
          <Text style={styles.portValue}>
            {activeVehicle?.connectorLabel || "CCS2 DC & Type-2 AC"}
          </Text>
          <Text style={styles.portRateHint}>
            ₹8.50/kWh (15A) • ₹10.50/kWh (Type-2) • ₹16.50/kWh (CCS2)
          </Text>
        </View>
        <View style={styles.bookNowChip}>
          <Text style={styles.bookNowChipText}>Book Slot</Text>
        </View>
      </TouchableOpacity>

      {/* 4 Quick Action Buttons (Book Slot, Gate Pass, Trip Planner, Top-Up) */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => {
            selectStation(nearbyStation.id);
            router.push({
              pathname: "/(driver)/booking-sheet",
              params: { stationId: nearbyStation.id },
            });
          }}
        >
          <Text style={styles.quickActionIcon}>🔌</Text>
          <Text style={styles.quickActionLabel}>Book Slot</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => router.push("/(driver)/gate-pass")}
        >
          <Text style={styles.quickActionIcon}>🎟️</Text>
          <Text style={styles.quickActionLabel}>Gate Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => router.push("/(driver)/route-planner")}
        >
          <Text style={styles.quickActionIcon}>🧭</Text>
          <Text style={styles.quickActionLabel}>Trip Planner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => setQuickTopUpModal(true)}
        >
          <Text style={styles.quickActionIcon}>💳</Text>
          <Text style={styles.quickActionLabel}>Top-Up</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby Station Section + Mini Map Preview */}
      <View style={styles.nearbyHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nearbyOverline}>Nearby Kochi Station</Text>
          <Text style={styles.nearbyTitle}>{nearbyStation.name}</Text>
          <View style={styles.nearbyChipsRow}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                {nearbyStation.distanceKm} km
              </Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                {nearbyStation.etaMins || 3} min
              </Text>
            </View>
            <View style={[styles.infoChip, styles.rateChipGreen]}>
              <Text style={styles.rateChipText}>
                ₹{nearbyStation.pricePerKwh.toFixed(2)}/kWh
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.getDirectionBtn}
          onPress={() =>
            launchNativeTurnByTurnMaps(
              nearbyStation.latitude,
              nearbyStation.longitude,
              nearbyStation.name
            )
          }
        >
          <Text style={styles.getDirectionBtnText}>Get Direction</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.miniMapCard}
        activeOpacity={0.92}
        onPress={() => {
          selectStation(nearbyStation.id);
          router.push("/(driver)/map-radar");
        }}
      >
        <LeafletMap
          centerLat={10.012}
          centerLng={76.346}
          zoom={14}
          activeLayer={preferredMapLayer}
          compactMode={true}
          selectedMarkerId={nearbyStation.id}
          markers={[
            {
              id: nearbyStation.id,
              lat: nearbyStation.latitude,
              lng: nearbyStation.longitude,
              title: nearbyStation.name,
              price: `₹${nearbyStation.pricePerKwh.toFixed(2)}`,
              powerKw: nearbyStation.maxPowerKw,
              type: nearbyStation.stationType,
              distanceKm: nearbyStation.distanceKm,
            },
          ]}
        />
      </TouchableOpacity>

      {/* All Nearby Kochi Chargers Horizontal Carousel */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          Available Kochi Chargers ({stations.length})
        </Text>
        <TouchableOpacity onPress={() => router.push("/(driver)/map-radar")}>
          <Text style={styles.sectionLink}>See Radar →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stationCarousel}
      >
        {stations.map((st) => (
          <View key={st.id} style={styles.stationMiniCard}>
            <View style={styles.stationMiniTop}>
              <View style={styles.stationTypePill}>
                <Text style={styles.stationTypePillTxt}>
                  {st.stationType === "P2P_HOME" ? "🏠 P2P Host" : "⚡ Public DC"}
                </Text>
              </View>
              <Text style={styles.stationRatingTxt}>★ {st.rating}</Text>
            </View>
            <Text style={styles.stationMiniName} numberOfLines={1}>
              {st.name}
            </Text>
            <Text style={styles.stationMiniAddr} numberOfLines={1}>
              {st.address}
            </Text>
            <View style={styles.stationMiniFooter}>
              <Text style={styles.stationMiniPrice}>
                ₹{st.pricePerKwh.toFixed(2)}/kWh
              </Text>
              <Text style={styles.stationMiniDist}>
                {st.distanceKm} km • {st.maxPowerKw} kW
              </Text>
            </View>
            <View style={styles.stationMiniActionRow}>
              <TouchableOpacity
                style={styles.stationMiniDirBtn}
                onPress={() =>
                  launchNativeTurnByTurnMaps(st.latitude, st.longitude, st.name)
                }
              >
                <Text style={styles.stationMiniDirTxt}>Get Direction</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stationMiniBookBtn}
                onPress={() => {
                  selectStation(st.id);
                  router.push({
                    pathname: "/(driver)/booking-sheet",
                    params: { stationId: st.id },
                  });
                }}
              >
                <Text style={styles.stationMiniBookTxt}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Recent Charging Activity Summary */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Charging Sessions</Text>
        <TouchableOpacity onPress={() => router.push("/(driver)/bookings")}>
          <Text style={styles.sectionLink}>All Receipts →</Text>
        </TouchableOpacity>
      </View>

      {chargingHistory.slice(0, 3).map((h) => (
        <TouchableOpacity
          key={h.id}
          style={styles.historyRowCard}
          onPress={() => router.push("/(driver)/bookings")}
        >
          <View style={styles.historyIconBox}>
            <Text style={styles.historyIcon}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyStationName}>{h.station}</Text>
            <Text style={styles.historyDateText}>
              {h.date} • {h.energyKwh} kWh ({h.durationMins} mins)
            </Text>
          </View>
          <Text style={styles.historyAmountText}>₹{h.amount.toFixed(2)}</Text>
        </TouchableOpacity>
      ))}

      {/* Vehicle Switcher Modal */}
      <Modal visible={vehicleModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Active Vehicle</Text>
            <Text style={styles.modalSub}>
              Switch your active Indian EV to filter compatible connectors &
              range
            </Text>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.vehicleOption,
                  v.isPrimary && styles.vehicleOptionActive,
                ]}
                onPress={async () => {
                  await setPrimaryVehicle(v.id);
                  setVehicleModalVisible(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleOptionTitle}>
                    {v.makeModel} ({v.year})
                  </Text>
                  <Text style={styles.vehicleOptionSub}>
                    {v.plateNumber} • {v.connectorLabel} • {v.socPercent}% SOC (
                    {v.rangeKm} km)
                  </Text>
                </View>
                {v.isPrimary && <Text style={styles.activeCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={() => {
                  setVehicleModalVisible(false);
                  router.push("/(driver)/garage-wallet");
                }}
              >
                <Text style={styles.secondaryModalBtnText}>+ Add Vehicle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setVehicleModalVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications & Reminders Center Drawer */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.notifHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Notifications & Reminders</Text>
                <Text style={styles.notifSubCount}>
                  {unreadCount} unread alerts • Kochi Live Grid
                </Text>
              </View>
              <TouchableOpacity
                onPress={markNotificationsRead}
                style={styles.markReadBtn}
              >
                <Text style={styles.markReadText}>Mark All Read</Text>
              </TouchableOpacity>
            </View>

            {/* Active Upcoming Reminder Banner */}
            <View style={styles.reminderHighlightBanner}>
              <Text style={styles.reminderBannerTitle}>
                ⏰ Reminder: Your slot at{" "}
                {upcomingBooking?.stationName ||
                  "Spark EV Fast Hub (Infopark Phase 1)"}{" "}
                starts in 15 minutes.
              </Text>
              <Text style={styles.reminderBannerSub}>
                Gate Pass #
                {upcomingBooking
                  ? `${upcomingBooking.otpCode.slice(0, 3)}-${upcomingBooking.otpCode.slice(3)}`
                  : "544-555"}{" "}
                is ready for plug-in.
                {reminderSnoozedUntil
                  ? ` (Snoozed ${reminderSnoozedUntil})`
                  : ""}
              </Text>
              <View style={styles.reminderActionRow}>
                <TouchableOpacity
                  style={styles.reminderPrimaryBtn}
                  onPress={() => {
                    setNotifModalVisible(false);
                    router.push({
                      pathname: "/(driver)/gate-pass",
                      params: upcomingBooking
                        ? { bookingId: upcomingBooking.id }
                        : undefined,
                    });
                  }}
                >
                  <Text style={styles.reminderPrimaryBtnTxt}>
                    View Gate Pass
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reminderSnoozeBtn}
                  onPress={() => snoozeReminder(10)}
                >
                  <Text style={styles.reminderSnoozeBtnTxt}>Snooze 10m</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Trigger Test Reminder Button */}
            <TouchableOpacity
              style={styles.testReminderBtn}
              onPress={() => triggerTestReminder()}
            >
              <Text style={styles.testReminderBtnText}>
                🔔 Trigger Reminder Alert (System Tray + Toast)
              </Text>
            </TouchableOpacity>

            <ScrollView
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                  onPress={() => {
                    setNotifModalVisible(false);
                    if (n.category === "WALLET") {
                      router.push("/(driver)/garage-wallet");
                    } else if (n.category === "HOST") {
                      router.push("/(host)/dashboard");
                    } else {
                      router.push("/(driver)/bookings");
                    }
                  }}
                >
                  <View style={styles.notifTopLine}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMsg}>{n.message}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeModalBtn, { marginTop: 12 }]}
              onPress={() => setNotifModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Close Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Instant UPI Wallet Top-Up Modal (₹200, ₹500, ₹1,000, ₹2,000) */}
      <Modal visible={quickTopUpModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Top Up VoltMate Wallet (₹ INR)</Text>
            <Text style={styles.modalSub}>
              Current Balance: ₹{(user?.voltCreditsBalance ?? 1450.0).toFixed(2)}{" "}
              • UPI ID: {user?.upiId || "nidhinrajesh@okaxis"}
            </Text>

            <Text style={styles.upiSelectLabel}>
              Select UPI Instant Intent App
            </Text>
            <View style={styles.upiAppRow}>
              {(["Google Pay", "PhonePe", "Paytm"] as const).map((app) => (
                <TouchableOpacity
                  key={app}
                  style={[
                    styles.upiAppChip,
                    selectedUpiApp === app && styles.upiAppChipActive,
                  ]}
                  onPress={() => setSelectedUpiApp(app)}
                >
                  <Text
                    style={[
                      styles.upiAppChipText,
                      selectedUpiApp === app && styles.upiAppChipTextActive,
                    ]}
                  >
                    {app === "Google Pay"
                      ? "⚡ GPay"
                      : app === "PhonePe"
                      ? "💜 PhonePe"
                      : "💙 Paytm"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.topUpAmountGrid}>
              {[200, 500, 1000, 2000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.topUpAmountBtn}
                  onPress={async () => {
                    setQuickTopUpModal(false);
                    await topUpWalletInr(amt, "UPI_APP", selectedUpiApp);
                  }}
                >
                  <Text style={styles.topUpAmountText}>
                    +₹{amt.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.topUpSubLabel}>
                    Pay via {selectedUpiApp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setQuickTopUpModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  vehicleDropdownBtn: {
    flex: 1,
    paddingRight: 10,
  },
  modelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modelTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  chevronDown: {
    fontSize: 20,
    color: "#151C18",
    fontWeight: "700",
    marginTop: -4,
  },
  modelSub: {
    fontSize: 12,
    color: "#6B746E",
    fontWeight: "600",
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 22,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  walletPillIcon: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16B374",
  },
  walletPillAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  walletPlusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  walletPlusTxt: {
    fontSize: 12,
    fontWeight: "900",
    color: "#151C18",
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bellIcon: {
    fontSize: 19,
  },
  notifBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#F03E3E",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  batteryColWrap: {
    alignItems: "center",
  },
  socStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  socStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  socStepBtnTxt: {
    color: "#05E660",
    fontSize: 15,
    fontWeight: "900",
  },
  socStepLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  carWrapper: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: -12,
  },
  activeBookingBanner: {
    backgroundColor: "#151C18",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  activeBookingLeft: {
    width: "100%",
  },
  liveDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#05E660",
  },
  activeBookingTag: {
    color: "#05E660",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  activeBookingStation: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  activeBookingMeta: {
    color: "#A3ACA6",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 12,
  },
  activeBannerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startChargePillBtn: {
    flex: 1.2,
    backgroundColor: "#05E660",
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  startChargePillText: {
    color: "#151C18",
    fontSize: 13,
    fontWeight: "900",
  },
  gatePassMiniBtn: {
    flex: 1,
    backgroundColor: "#26302A",
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  gatePassMiniText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  metricLabel: {
    fontSize: 14,
    color: "#6B746E",
    fontWeight: "600",
    marginBottom: 10,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricBigValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.8,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B746E",
  },
  metricSubText: {
    fontSize: 12,
    color: "#8A928D",
    fontWeight: "600",
    marginTop: 6,
  },
  portCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  portTextCol: {
    flex: 1,
  },
  portLabel: {
    fontSize: 12,
    color: "#8A928D",
    fontWeight: "600",
    marginBottom: 2,
  },
  portValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  portRateHint: {
    fontSize: 11,
    color: "#16B374",
    fontWeight: "700",
    marginTop: 2,
  },
  bookNowChip: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bookNowChipText: {
    color: "#096B30",
    fontSize: 12,
    fontWeight: "800",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  nearbyOverline: {
    fontSize: 13,
    color: "#7C857F",
    fontWeight: "600",
  },
  nearbyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
    marginBottom: 8,
  },
  nearbyChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  infoChip: {
    backgroundColor: "#E4E8E5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C3530",
  },
  rateChipGreen: {
    backgroundColor: "#EAFBF0",
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  getDirectionBtn: {
    backgroundColor: "#151C18",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  getDirectionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  miniMapCard: {
    height: 175,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#E8ECEA",
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151C18",
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  stationCarousel: {
    gap: 12,
    paddingBottom: 18,
  },
  stationMiniCard: {
    width: 245,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  stationMiniTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stationTypePill: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stationTypePillTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#151C18",
  },
  stationRatingTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  stationMiniName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  stationMiniAddr: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
    marginBottom: 10,
  },
  stationMiniFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F2F4F3",
    paddingTop: 8,
    marginBottom: 10,
  },
  stationMiniPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  stationMiniDist: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B746E",
  },
  stationMiniActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  stationMiniDirBtn: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  stationMiniDirTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  stationMiniBookBtn: {
    flex: 1,
    backgroundColor: "#05E660",
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  stationMiniBookTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  historyRowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  historyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAFBF0",
    alignItems: "center",
    justifyContent: "center",
  },
  historyIcon: {
    fontSize: 18,
  },
  historyStationName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  historyDateText: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  historyAmountText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  modalSub: {
    fontSize: 13,
    color: "#6B746E",
    marginTop: 4,
    marginBottom: 14,
  },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F5F7F6",
    marginBottom: 10,
  },
  vehicleOptionActive: {
    borderWidth: 2,
    borderColor: "#16B374",
    backgroundColor: "#EAFBF0",
  },
  vehicleOptionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  vehicleOptionSub: {
    fontSize: 12,
    color: "#6B746E",
    marginTop: 3,
  },
  activeCheck: {
    fontSize: 18,
    fontWeight: "900",
    color: "#151C18",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  secondaryModalBtn: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryModalBtnText: {
    color: "#151C18",
    fontWeight: "800",
    fontSize: 14,
  },
  closeModalBtn: {
    flex: 1,
    backgroundColor: "#151C18",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  notifHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notifSubCount: {
    fontSize: 12,
    color: "#6B746E",
    fontWeight: "600",
    marginTop: 2,
  },
  markReadBtn: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  reminderHighlightBanner: {
    backgroundColor: "#10241B",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#16B374",
  },
  reminderBannerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  reminderBannerSub: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  reminderActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  reminderPrimaryBtn: {
    flex: 1,
    backgroundColor: "#05E660",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  reminderPrimaryBtnTxt: {
    color: "#151C18",
    fontSize: 12,
    fontWeight: "800",
  },
  reminderSnoozeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  reminderSnoozeBtnTxt: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  testReminderBtn: {
    backgroundColor: "#F2F4F3",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E5E2",
  },
  testReminderBtnText: {
    color: "#151C18",
    fontSize: 12,
    fontWeight: "800",
  },
  notifCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F5F7F6",
    marginBottom: 10,
  },
  notifCardUnread: {
    backgroundColor: "#EAFBF0",
    borderWidth: 1,
    borderColor: "#B2F2BB",
  },
  notifTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16B374",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  notifMsg: {
    fontSize: 13,
    color: "#5C6460",
    marginTop: 3,
  },
  notifTime: {
    fontSize: 11,
    color: "#8A928D",
    marginTop: 6,
    fontWeight: "600",
  },
  upiSelectLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5C6460",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  upiAppRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  upiAppChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  upiAppChipActive: {
    backgroundColor: "#EAFBF0",
    borderColor: "#16B374",
  },
  upiAppChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
  },
  upiAppChipTextActive: {
    color: "#096B30",
    fontWeight: "800",
  },
  topUpAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  topUpAmountBtn: {
    width: "48%",
    backgroundColor: "#EAFBF0",
    borderWidth: 1.5,
    borderColor: "#05E660",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  topUpAmountText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  topUpSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#096B30",
    marginTop: 2,
  },
});
