import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronDown,
  Check,
  Zap,
  Navigation,
  X,
  Plus,
  Car,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../store/useAuthStore";
import {
  VerticalBatteryWidget,
  EvCarHeroRender,
  ConnectorPlugIllustration,
} from "../../components/ui/EvVisuals";
import { LeafletMap, MapStationMarker } from "../../components/map/LeafletMap";

const NEARBY_PREVIEW_STATIONS: MapStationMarker[] = [
  {
    id: "st-spark-ev",
    title: "Spark EV Station",
    latitude: 10.0188,
    longitude: 76.3372,
    pricePerKwh: 8.5,
    powerKw: 22.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 1.8,
  },
];

const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Pall Mall Station Slot Available",
    body: "CHAdeMO & Type A bays are open now with 0 min wait time.",
    time: "2m ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Battery Health Optimal (72%)",
    body: "Estimated range 70 km (1h 20m driving time) at current consumption.",
    time: "18m ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Off-Peak Tariff Active",
    body: "Save 18% on kWh rates at Spark EV Station until 6:00 PM.",
    time: "1h ago",
    unread: false,
  },
];

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { vehicles, selectedVehicleId, selectVehicle } = useAuthStore();

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const handleOpenDirections = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const lat = 10.0188;
    const lng = 76.3372;
    const label = encodeURIComponent("Spark EV Station");
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

  const handleOpenBooking = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push({
      pathname: "/(driver)/booking-sheet",
      params: {
        stationId: "st-spark-ev",
        stationName: "Spark EV Station",
        stationAddress: "14 Seaport-Airport Ave, Kakkanad, Kochi",
        distanceKm: "1.8",
        driveMins: "3",
        rating: "4.8",
        reviews: "84",
      },
    });
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
              <Text style={styles.vehicleModelText}>{selectedVehicle.model}</Text>
              <ChevronDown size={18} color="#111714" strokeWidth={2.2} />
            </View>
            <Text style={styles.vehicleSubText}>
              {selectedVehicle.brand} {selectedVehicle.year}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setUnreadCount(0);
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

        {/* ===================== HERO BATTERY + EV CAR ROW ===================== */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(driver)/active-charge")}
          >
            <VerticalBatteryWidget
              percentage={selectedVehicle.batteryPercent}
              isCharging={true}
            />
          </TouchableOpacity>

          <View style={styles.carArtWrap}>
            <EvCarHeroRender width={242} height={154} />
          </View>
        </View>

        {/* ===================== DISTANCE & ENERGY METRIC CARDS ===================== */}
        <View style={styles.metricsRow}>
          {/* Distance Card */}
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

          {/* Energy Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(driver)/active-charge")}
            style={styles.metricCard}
          >
            <Text style={styles.metricLabel}>Energy</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricNumber}>{selectedVehicle.energyKwh}</Text>
              <Text style={styles.metricUnit}> kwh</Text>
            </View>
            <Text style={styles.metricSub}>Tap for live telemetry</Text>
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
        </TouchableOpacity>

        {/* ===================== NEARBY STATION + MINI MAP CARD ===================== */}
        <View style={styles.nearbySectionCard}>
          <View style={styles.nearbyHeaderRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenBooking}
              style={{ flex: 1 }}
            >
              <Text style={styles.nearbySubLabel}>Nearby Station</Text>
              <Text style={styles.nearbyTitle}>Spark EV Station</Text>
              <View style={styles.nearbyPillsRow}>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>1.8 km</Text>
                </View>
                <View style={styles.greyPill}>
                  <Text style={styles.greyPillText}>3 min</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenDirections}
              activeOpacity={0.85}
              style={styles.getDirectionBtn}
            >
              <Text style={styles.getDirectionBtnText}>Get Direction</Text>
            </TouchableOpacity>
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
                layerMode="light"
                stations={NEARBY_PREVIEW_STATIONS}
                selectedStationId="st-spark-ev"
                showRouteLine={true}
                interactive={false}
                miniPreviewMode={true}
              />
            </View>
          </TouchableOpacity>
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
              <Text style={styles.manageGarageBtnText}>Manage Vehicles & Wallet</Text>
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
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            {NOTIFICATIONS.map((item) => (
              <View key={item.id} style={styles.notifCard}>
                <View style={styles.notifDot} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.notifBody}>{item.body}</Text>
                </View>
              </View>
            ))}
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
    paddingBottom: 112,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    marginBottom: 18,
    minHeight: 162,
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
    marginBottom: 16,
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
  nearbySectionCard: {
    backgroundColor: "#F7F9F8",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6EAE8",
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
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
    gap: 8,
    marginTop: 8,
  },
  greyPill: {
    backgroundColor: "#E3E7E5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  greyPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1B231F",
  },
  getDirectionBtn: {
    backgroundColor: "#151C18",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#151C18",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  getDirectionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  miniMapContainer: {
    height: 152,
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
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

