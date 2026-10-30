import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Linking,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronDown,
  Check,
  Zap,
  X,
  Plus,
  Minus,
  Car,
  QrCode,
  Compass,
  Wallet,
  Heart,
  Star,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthStore, StationCatalogItem } from "../../store/useAuthStore";
import {
  VerticalBatteryWidget,
  EvCarHeroRender,
  ConnectorPlugIllustration,
  getStationAssetImage,
} from "../../components/ui/EvVisuals";
import { LeafletMap } from "../../components/map/LeafletMap";

export default function HomeDashboardScreen() {
  const router = useRouter();
  const {
    user,
    vehicles,
    selectedVehicleId,
    selectVehicle,
    updateVehicleBattery,
    stations,
    savedStationIds,
    toggleSavedStation,
    bookings,
    activeBookingId,
    activeSession,
    chargingHistory,
    notifications,
    markNotificationsRead,
    syncStationsFromBackend,
  } = useAuthStore();

  useEffect(() => {
    syncStationsFromBackend(10.0159, 76.3419);
  }, []);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const [selectedNearbyStationId, setSelectedNearbyStationId] =
    useState<string>("st-spark-ev");
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const walletBalance = user?.voltCreditsBalance ?? 142.5;

  const nearbyStation: StationCatalogItem =
    stations.find((s) => s.id === selectedNearbyStationId) ||
    stations[1] ||
    stations[0];

  const activeBooking =
    bookings.find(
      (b) =>
        b.id === activeBookingId &&
        (b.status === "CONFIRMED" || b.status === "ACTIVE")
    ) ||
    bookings.find((b) => b.status === "CONFIRMED" || b.status === "ACTIVE") ||
    null;

  const savedStationsList = stations.filter((s) =>
    savedStationIds.includes(s.id)
  );

  const handleOpenDirections = (station: StationCatalogItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const lat = station.latitude;
    const lng = station.longitude;
    const label = encodeURIComponent(station.title);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        router.push("/(driver)/map-radar");
      });
    } else {
      router.push("/(driver)/map-radar");
    }
  };

  const handleOpenBooking = (station: StationCatalogItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push({
      pathname: "/(driver)/booking-sheet",
      params: {
        stationId: station.id,
        stationName: station.title,
        stationAddress: station.address,
        distanceKm: String(station.distanceKm),
        driveMins: String(station.driveMins),
        rating: String(station.rating),
        reviews: String(station.reviews),
      },
    });
  };

  const handleAdjustBattery = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    updateVehicleBattery(
      selectedVehicle.id,
      selectedVehicle.batteryPercent + delta
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== TOP HEADER ROW ===================== */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowVehiclePicker(true);
            }}
            activeOpacity={0.75}
            style={styles.vehicleSelectorBtn}
          >
            <View style={styles.vehicleTitleRow}>
              <Text style={styles.vehicleModelText}>
                {selectedVehicle.model}
              </Text>
              <ChevronDown size={18} color="#111714" strokeWidth={2.2} />
            </View>
            <Text style={styles.vehicleSubText}>
              {selectedVehicle.brand} {selectedVehicle.year} •{" "}
              {user?.fullName ? user.fullName.split(" ")[0] : "Driver"}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerRightRow}>
            <TouchableOpacity
              onPress={() => router.push("/(driver)/garage-wallet")}
              activeOpacity={0.8}
              style={styles.walletChip}
            >
              <Wallet size={14} color="#05E660" />
              <Text style={styles.walletChipText}>
                ${walletBalance.toFixed(2)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                markNotificationsRead();
                setShowNotifications(true);
              }}
              activeOpacity={0.75}
              style={styles.bellButton}
            >
              <Bell size={22} color="#111714" strokeWidth={1.9} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ===================== HERO BATTERY + EV CAR ROW ===================== */}
        <View style={styles.heroSection}>
          <View style={styles.batteryCol}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/(driver)/active-charge")}
            >
              <VerticalBatteryWidget
                percentage={selectedVehicle.batteryPercent}
                isCharging={true}
              />
            </TouchableOpacity>

            {/* Live Battery Level Simulation Controls */}
            <View style={styles.batteryStepperRow}>
              <TouchableOpacity
                onPress={() => handleAdjustBattery(-5)}
                style={styles.stepperBtn}
              >
                <Minus size={13} color="#151C18" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.stepperLabel}>SoC</Text>
              <TouchableOpacity
                onPress={() => handleAdjustBattery(5)}
                style={styles.stepperBtn}
              >
                <Plus size={13} color="#151C18" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowVehiclePicker(true)}
            style={styles.carArtWrap}
          >
            <EvCarHeroRender
              width={242}
              height={154}
              variant={selectedVehicle.model}
            />
          </TouchableOpacity>
        </View>

        {/* ===================== DISTANCE & ENERGY METRIC CARDS ===================== */}
        <View style={styles.metricsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(driver)/route-planner")}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Distance</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricNumber}>{selectedVehicle.rangeKm}</Text>
              <Text style={styles.metricUnit}> km</Text>
            </View>
            <Text style={styles.metricSub}>{selectedVehicle.travelTimeEst}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(driver)/active-charge")}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Energy</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricNumber}>
                {(
                  (selectedVehicle.energyKwh * selectedVehicle.batteryPercent) /
                  100
                ).toFixed(1)}
              </Text>
              <Text style={styles.metricUnit}> kwh</Text>
            </View>
            <Text style={styles.metricSub}>
              of {selectedVehicle.energyKwh} kWh pack
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===================== CHARGING PORT CARD ===================== */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(driver)/map-radar")}
          style={styles.portCard}
        >
          <View style={styles.portIconWrap}>
            <ConnectorPlugIllustration
              variant={selectedVehicle.chargingPort}
              size={52}
            />
          </View>
          <View style={styles.portTextWrap}>
            <Text style={styles.portLabel}>Charging Port</Text>
            <Text style={styles.portTitle}>{selectedVehicle.chargingPort}</Text>
          </View>
          <View style={styles.portPlatePill}>
            <Text style={styles.portPlateText}>
              {selectedVehicle.plateNumber}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ===================== QUICK COCKPIT ACTIONS ROW ===================== */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            onPress={() => handleOpenBooking(nearbyStation)}
            activeOpacity={0.85}
            style={styles.quickActionItem}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#05E660" }]}>
              <Zap size={18} color="#151C18" fill="#151C18" />
            </View>
            <Text style={styles.quickActionLabel}>Book Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(driver)/gate-pass")}
            activeOpacity={0.85}
            style={styles.quickActionItem}
          >
            <View style={styles.quickActionIcon}>
              <QrCode size={18} color="#05E660" />
            </View>
            <Text style={styles.quickActionLabel}>Gate Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(driver)/route-planner")}
            activeOpacity={0.85}
            style={styles.quickActionItem}
          >
            <View style={styles.quickActionIcon}>
              <Compass size={18} color="#05E660" />
            </View>
            <Text style={styles.quickActionLabel}>Trip Planner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(driver)/garage-wallet")}
            activeOpacity={0.85}
            style={styles.quickActionItem}
          >
            <View style={styles.quickActionIcon}>
              <Wallet size={18} color="#05E660" />
            </View>
            <Text style={styles.quickActionLabel}>Top-Up</Text>
          </TouchableOpacity>
        </View>

        {/* ===================== ACTIVE RESERVATION / GATE PASS BANNER ===================== */}
        {(activeSession || activeBooking) && (
          <View style={styles.activeReservationCard}>
            <View style={styles.activeResTopRow}>
              <View style={styles.liveStatusPill}>
                <View style={styles.liveGreenDot} />
                <Text style={styles.liveStatusPillText}>
                  {activeSession ? "CHARGING IN PROGRESS" : "UPCOMING RESERVATION"}
                </Text>
              </View>
              <Text style={styles.passCodeBadge}>
                {activeBooking?.gatePassCode || "#849-201"}
              </Text>
            </View>

            <Text style={styles.activeResStation}>
              {activeSession?.stationName || activeBooking?.stationName}
            </Text>
            <Text style={styles.activeResMeta}>
              {activeSession
                ? `${activeSession.connectorName} (${activeSession.slotLabel}) • ${activeSession.powerKw} kW Fast Charge`
                : `${activeBooking?.connectorName} (${activeBooking?.slotLabel}) • ${activeBooking?.dateLabel}, ${activeBooking?.timeWindow}`}
            </Text>

            <View style={styles.activeResButtonsRow}>
              <TouchableOpacity
                onPress={() => router.push("/(driver)/gate-pass")}
                style={styles.resOutlineBtn}
              >
                <QrCode size={15} color="#151C18" />
                <Text style={styles.resOutlineBtnText}>Digital Gate Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/active-charge",
                    params: {
                      stationId:
                        activeSession?.stationId ||
                        activeBooking?.stationId ||
                        nearbyStation.id,
                      stationName:
                        activeSession?.stationName ||
                        activeBooking?.stationName ||
                        nearbyStation.title,
                      connectorName:
                        activeSession?.connectorName ||
                        activeBooking?.connectorName ||
                        "CHAdeMO",
                      slotLabel:
                        activeSession?.slotLabel ||
                        activeBooking?.slotLabel ||
                        "Slot B",
                      powerKw: String(
                        activeSession?.powerKw || activeBooking?.powerKw || 50
                      ),
                    },
                  })
                }
                style={styles.resPrimaryBtn}
              >
                <Zap size={15} color="#151C18" fill="#151C18" />
                <Text style={styles.resPrimaryBtnText}>
                  {activeSession ? "Live Telemetry" : "Start Charging"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===================== NEARBY STATION + MINI MAP CARD ===================== */}
        <View style={styles.nearbySectionCard}>
          {/* Station Quick Switcher Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stationSwitcherRow}
          >
            {stations.slice(0, 4).map((st) => {
              const isSel = st.id === nearbyStation.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedNearbyStationId(st.id);
                  }}
                  style={[
                    styles.stationSwitchChip,
                    isSel && styles.stationSwitchChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stationSwitchChipText,
                      isSel && styles.stationSwitchChipTextActive,
                    ]}
                  >
                    {st.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.nearbyHeaderRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenBooking(nearbyStation)}
              style={{ flex: 1 }}
            >
              <Text style={styles.nearbySubLabel}>Nearby Station</Text>
              <Text style={styles.nearbyTitle}>{nearbyStation.title}</Text>
              <View style={styles.nearbyPillsRow}>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>
                    {nearbyStation.distanceKm} km
                  </Text>
                </View>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>
                    {nearbyStation.driveMins} min
                  </Text>
                </View>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>
                    {nearbyStation.priceDisplay}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleOpenDirections(nearbyStation)}
                activeOpacity={0.85}
                style={styles.getDirectionBtn}
              >
                <Text style={styles.getDirectionBtnText}>Get Direction</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOpenBooking(nearbyStation)}
                activeOpacity={0.85}
                style={styles.bookMiniBtn}
              >
                <Text style={styles.bookMiniBtnText}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Embedded Mini Street Map with Route Line */}
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push("/(driver)/map-radar")}
            style={styles.miniMapContainer}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <LeafletMap
                centerLat={10.0159}
                centerLng={76.3419}
                zoom={14}
                layerMode="standard"
                stations={[nearbyStation]}
                selectedStationId={nearbyStation.id}
                showRouteLine={true}
                destinationLat={nearbyStation.latitude}
                destinationLng={nearbyStation.longitude}
                interactive={false}
                miniPreviewMode={true}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* ===================== SAVED / FAVORITE STATIONS CAROUSEL ===================== */}
        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionHeading}>Saved Charging Hubs</Text>
          <TouchableOpacity onPress={() => router.push("/(driver)/bookings")}>
            <Text style={styles.sectionLinkText}>Manage ({savedStationsList.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.savedCarouselContent}
        >
          {(savedStationsList.length > 0 ? savedStationsList : stations.slice(0, 3)).map(
            (st) => {
              const isFav = savedStationIds.includes(st.id);
              return (
                <TouchableOpacity
                  key={st.id}
                  activeOpacity={0.88}
                  onPress={() => handleOpenBooking(st)}
                  style={styles.savedCarouselCard}
                >
                  <View style={styles.savedCardImageWrap}>
                    <Image
                      source={getStationAssetImage(st.title)}
                      style={styles.savedCardImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => toggleSavedStation(st.id)}
                      style={styles.savedHeartBtn}
                    >
                      <Heart
                        size={15}
                        color={isFav ? "#E53935" : "#151C18"}
                        fill={isFav ? "#E53935" : "none"}
                      />
                    </TouchableOpacity>
                    <View style={styles.savedPowerTag}>
                      <Zap size={11} color="#05E660" fill="#05E660" />
                      <Text style={styles.savedPowerTagText}>
                        {st.powerKw} kW
                      </Text>
                    </View>
                  </View>

                  <View style={styles.savedCardBody}>
                    <Text style={styles.savedCardTitle} numberOfLines={1}>
                      {st.title}
                    </Text>
                    <Text style={styles.savedCardAddr} numberOfLines={1}>
                      {st.address}
                    </Text>
                    <View style={styles.savedCardFooter}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Star size={12} color="#151C18" fill="#151C18" />
                        <Text style={styles.savedRatingText}>{st.rating}</Text>
                        <Text style={styles.savedDistText}>
                          • {st.distanceKm} km
                        </Text>
                      </View>
                      <Text style={styles.savedPriceText}>
                        {st.priceDisplay}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* ===================== RECENT CHARGING SESSIONS ===================== */}
        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionHeading}>Recent Charging Sessions</Text>
          <TouchableOpacity onPress={() => router.push("/(driver)/bookings")}>
            <Text style={styles.sectionLinkText}>Full History</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 10 }}>
          {chargingHistory.slice(0, 2).map((session) => (
            <TouchableOpacity
              key={session.id}
              activeOpacity={0.85}
              onPress={() => router.push("/(driver)/bookings")}
              style={styles.recentSessionCard}
            >
              <View style={styles.recentSessionIcon}>
                <FileText size={18} color="#05E660" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentSessionTitle}>{session.station}</Text>
                <Text style={styles.recentSessionSub}>
                  {session.connector} • {session.kwh} ({session.duration})
                </Text>
                <Text style={styles.recentSessionDate}>{session.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.recentSessionAmount}>{session.amount}</Text>
                <View style={styles.settledTag}>
                  <Text style={styles.settledTagText}>SETTLED</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ===================== VEHICLE SWITCHER MODAL ===================== */}
      <Modal
        visible={showVehiclePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Active Vehicle</Text>
              <TouchableOpacity
                onPress={() => setShowVehiclePicker(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            {vehicles.map((v) => {
              const isSelected = v.id === selectedVehicle.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    selectVehicle(v.id);
                    setShowVehiclePicker(false);
                  }}
                  style={[
                    styles.vehicleOptionCard,
                    isSelected && styles.vehicleOptionSelected,
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={styles.vehicleOptionIcon}>
                      <Car size={20} color="#151C18" />
                    </View>
                    <View>
                      <Text style={styles.vehicleOptionTitle}>
                        {v.brand} {v.model} ({v.year})
                      </Text>
                      <Text style={styles.vehicleOptionSub}>
                        {v.batteryPercent}% Battery • {v.rangeKm} km • {v.chargingPort}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckCircle}>
                      <Check size={14} color="#05E660" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => {
                setShowVehiclePicker(false);
                router.push("/(driver)/garage-wallet");
              }}
              style={styles.manageGarageBtn}
            >
              <Plus size={16} color="#111714" />
              <Text style={styles.manageGarageBtnText}>
                Manage Vehicles & Wallet
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================== NOTIFICATIONS MODAL ===================== */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Live Activity & Alerts ({notifications.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {notifications.map((item) => (
                <View key={item.id} style={styles.notifCard}>
                  <View style={styles.notifDot} />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.notifBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
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
    paddingTop: 14,
    paddingBottom: 118,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  vehicleSelectorBtn: {
    paddingVertical: 2,
  },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  vehicleModelText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -0.3,
  },
  vehicleSubText: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C18",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 6,
  },
  walletChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F2F4F3",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    minHeight: 168,
  },
  batteryCol: {
    alignItems: "center",
    gap: 8,
  },
  batteryStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#757F7A",
  },
  carArtWrap: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: -10,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: "#757F7A",
    fontWeight: "500",
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricNumber: {
    fontSize: 32,
    fontWeight: "500",
    color: "#111714",
    letterSpacing: -0.8,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111714",
  },
  metricSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 6,
  },
  portCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  portIconWrap: {
    marginRight: 16,
  },
  portTextWrap: {
    flex: 1,
  },
  portLabel: {
    fontSize: 12,
    color: "#757F7A",
    fontWeight: "500",
    marginBottom: 3,
  },
  portTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  portPlatePill: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  portPlateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#151C18",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    gap: 6,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111714",
  },
  activeReservationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#151C18",
  },
  activeResTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  liveStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#05E660",
  },
  liveStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A38",
  },
  passCodeBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  activeResStation: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  activeResMeta: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
    marginBottom: 12,
  },
  activeResButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  resOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#151C18",
    gap: 6,
  },
  resOutlineBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
  },
  resPrimaryBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 21,
    backgroundColor: "#05E660",
    gap: 6,
  },
  resPrimaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
  },
  nearbySectionCard: {
    backgroundColor: "#F7F9F8",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6EAE8",
    marginBottom: 20,
  },
  stationSwitcherRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  stationSwitchChip: {
    backgroundColor: "#E8ECEA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stationSwitchChipActive: {
    backgroundColor: "#151C18",
  },
  stationSwitchChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#525C57",
  },
  stationSwitchChipTextActive: {
    color: "#05E660",
    fontWeight: "700",
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  nearbySubLabel: {
    fontSize: 12,
    color: "#757F7A",
    marginBottom: 2,
  },
  nearbyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -0.3,
  },
  nearbyPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  greyPill: {
    backgroundColor: "#E3E7E5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  greyPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1B231F",
  },
  getDirectionBtn: {
    backgroundColor: "#151C18",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
  },
  getDirectionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  bookMiniBtn: {
    backgroundColor: "#05E660",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
  },
  bookMiniBtnText: {
    color: "#151C18",
    fontSize: 12,
    fontWeight: "700",
  },
  miniMapContainer: {
    height: 152,
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
  },
  sectionHeaderBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
  },
  sectionLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047835",
  },
  savedCarouselContent: {
    gap: 12,
    paddingBottom: 18,
  },
  savedCarouselCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  savedCardImageWrap: {
    height: 105,
    width: "100%",
    position: "relative",
    backgroundColor: "#E5EAE7",
  },
  savedCardImage: {
    width: "100%",
    height: "100%",
  },
  savedHeartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedPowerTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(21, 28, 24, 0.88)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  savedPowerTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  savedCardBody: {
    padding: 12,
  },
  savedCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  savedCardAddr: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
    marginBottom: 8,
  },
  savedCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savedRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111714",
  },
  savedDistText: {
    fontSize: 11,
    color: "#757F7A",
  },
  savedPriceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047835",
  },
  recentSessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    gap: 12,
  },
  recentSessionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  recentSessionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  recentSessionSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  recentSessionDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  recentSessionAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111714",
  },
  settledTag: {
    backgroundColor: "#E8F8EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  settledTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0D7A38",
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
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111714",
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F9F8",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
  },
  vehicleOptionSelected: {
    borderColor: "#151C18",
    backgroundColor: "#FFFFFF",
  },
  vehicleOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  vehicleOptionSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  selectedCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  manageGarageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
    gap: 6,
  },
  manageGarageBtnText: {
    color: "#111714",
    fontSize: 14,
    fontWeight: "700",
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F7F9F8",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    gap: 10,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#05E660",
    marginTop: 5,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
  },
  notifTime: {
    fontSize: 11,
    color: "#757F7A",
  },
  notifBody: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 3,
    lineHeight: 17,
  },
});
