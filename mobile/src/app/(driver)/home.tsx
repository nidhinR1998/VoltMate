import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  LocateFixed,
  Bell,
  ChevronDown,
  Plus,
  Minus,
  PlugZap,
  Ticket,
  Compass,
  Wallet,
  Zap,
  Home as HomeIcon,
  Star,
  Search,
  Clock,
  Check,
  Navigation,
  Pencil,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  INDIAN_EV_BRANDS,
  INDIAN_EV_CATALOG,
  IndianEvModelPreset,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";
import { launchNativeTurnByTurnMaps } from "../../services/notificationService";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  ELEVATION,
} from "../../theme/tokens";
import {
  AmountChips,
  AppButton,
  AppCard,
  AppChip,
  BottomSheet,
  EmptyState,
  OfflineBanner,
  RingGauge,
  SectionHeader,
  Sparkline,
  StatTile,
  StationCard,
  StatusBadge,
} from "../../components/ui/DesignSystem";

const CAROUSEL_CARD_WIDTH = 272;
const CAROUSEL_GAP = 12;

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
    nearbyCity,
    locationStatus,
    setLocationState,
    addVehicle,
    setPrimaryVehicle,
    adjustActiveVehicleSoc,
    selectStation,
    startChargingSession,
    markNotificationsRead,
    triggerTestReminder,
    snoozeReminder,
    topUpWallet,
    syncLiveStationsForRegion,
  } = useVoltMateEngine();

  const [homeUserCoords, setHomeUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [homeMapCenter, setHomeMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedHomeStationId, setSelectedHomeStationId] = useState<string>("");
  const homeCarouselRef = React.useRef<ScrollView | null>(null);

  useEffect(() => {
    let mounted = true;
    let watchSub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (mounted) {
            setLocationState("GPS_OFF", null);
            await syncLiveStationsForRegion(12.1045, 75.2058, 25);
          }
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setLocationState("PERMISSION_DENIED", null);
            await syncLiveStationsForRegion(12.1045, 75.2058, 25);
          }
          return;
        }
        if (mounted) {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (mounted && lastKnown?.coords) {
            const isLowAcc = (lastKnown.coords.accuracy ?? 50) > 1200;
            setHomeUserCoords({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
            setLocationState(
              isLowAcc ? "LOW_ACCURACY" : "READY",
              lastKnown.coords
            );
            await syncLiveStationsForRegion(
              lastKnown.coords.latitude,
              lastKnown.coords.longitude,
              25
            );
          }
          const pos = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
          ]);
          if (mounted && pos?.coords) {
            const isLowAcc = (pos.coords.accuracy ?? 50) > 1200;
            setHomeUserCoords({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setLocationState(isLowAcc ? "LOW_ACCURACY" : "READY", pos.coords);
            await syncLiveStationsForRegion(
              pos.coords.latitude,
              pos.coords.longitude,
              25
            );
          }
          watchSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 250,
            },
            (loc) => {
              if (mounted && loc?.coords) {
                setHomeUserCoords({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                });
                setLocationState("READY", loc.coords);
                void syncLiveStationsForRegion(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  25
                );
              }
            }
          );
          return;
        }
      } catch {
        if (mounted) {
          setLocationState("GPS_OFF", null);
        }
      }
      if (mounted) {
        await syncLiveStationsForRegion(12.1045, 75.2058, 25);
      }
    })();
    return () => {
      mounted = false;
      if (watchSub) watchSub.remove();
    };
  }, []);

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [evSearchQuery, setEvSearchQuery] = useState("");
  const [selectedBrandTab, setSelectedBrandTab] = useState<
    "ALL" | "GARAGE" | IndianEvModelPreset["brand"]
  >("ALL");
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [quickTopUpModal, setQuickTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [socEditOpen, setSocEditOpen] = useState(false);

  const filteredCatalogVehicles = evSearchQuery.trim()
    ? INDIAN_EV_CATALOG.filter(
        (m) =>
          m.makeModel.toLowerCase().includes(evSearchQuery.trim().toLowerCase()) ||
          m.manufacturer
            .toLowerCase()
            .includes(evSearchQuery.trim().toLowerCase()) ||
          m.segment.toLowerCase().includes(evSearchQuery.trim().toLowerCase())
      )
    : selectedBrandTab === "ALL"
    ? INDIAN_EV_CATALOG
    : selectedBrandTab === "GARAGE"
    ? []
    : INDIAN_EV_CATALOG.filter((m) => m.brand === selectedBrandTab);

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];
  const onlineStations = stations.filter((s) => s.isOnline !== false);
  const nearbyStation =
    onlineStations.find((s) => s.id === selectedHomeStationId) ||
    onlineStations[0] ||
    stations[0];
  const [homeFocusSeq, setHomeFocusSeq] = useState(1);
  const upcomingBooking =
    bookings.find(
      (b) =>
        b.status === "UPCOMING" ||
        b.status === "CONFIRMED" ||
        b.status === "ACTIVE_CHARGING"
    ) || null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const estimatedEnergyKwh = activeVehicle
    ? (
        (activeVehicle.socPercent / 100) *
        activeVehicle.batteryCapacityKwh
      ).toFixed(1)
    : "32.4";

  const spendSparklineValues =
    chargingHistory.length >= 2
      ? chargingHistory
          .slice(0, 6)
          .map((h) => h.amount)
          .reverse()
      : [140, 185, 160, 210, 195, 240];

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
          accessibilityRole="button"
          accessibilityLabel={`Active vehicle ${activeVehicle?.makeModel || "Select EV"}. Tap to switch vehicle.`}
        >
          <View style={styles.modelTitleRow}>
            <Text style={styles.modelTitle} numberOfLines={2}>
              {activeVehicle?.makeModel || "Tata Nexon.ev Empowered+"}
            </Text>
            <ChevronDown size={18} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.modelSub} numberOfLines={1}>
            Near {nearbyCity} • {activeVehicle?.plateNumber || "KL-07-CS-4921"}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.walletPill}
            onPress={() => setQuickTopUpModal(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Top up VoltMate wallet"
          >
            <Text style={styles.walletPillIcon}>₹</Text>
            <Text style={styles.walletPillAmount}>
              {(user?.voltCreditsBalance ?? 1450.0).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
            <View style={styles.walletPlusDot}>
              <Plus size={12} color={COLORS.textInverse} strokeWidth={3} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadCount} unread`}
          >
            <Bell size={20} color={COLORS.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Status Banner when GPS Permission Denied, Off, or Low Accuracy */}
      {(locationStatus === "PERMISSION_DENIED" ||
        locationStatus === "GPS_OFF" ||
        locationStatus === "LOW_ACCURACY") && (
        <TouchableOpacity
          style={styles.infoChip}
          onPress={() => router.push("/(driver)/map-radar")}
          accessibilityRole="button"
          accessibilityLabel="Location unavailable, tap to search city manually"
        >
          <Text style={styles.infoChipText}>
            {locationStatus === "PERMISSION_DENIED"
              ? `Location permission off • Tap to search city manually (Showing Near ${nearbyCity})`
              : locationStatus === "GPS_OFF"
              ? `GPS is off • Tap to search city manually (Showing Near ${nearbyCity})`
              : `Low GPS accuracy • Showing stations near ${nearbyCity}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Hero Vehicle Card: Circular SoC RingGauge + Car Render + Tucked Edit SoC Icon + Range & Energy StatTiles */}
      <AppCard style={styles.portCard}>
        <View style={styles.heroRow}>
          <View style={styles.batteryColWrap}>
            <RingGauge
              percent={activeVehicle?.socPercent ?? 72}
              size={116}
              strokeWidth={11}
              label="Battery"
            />
            <TouchableOpacity
              style={[styles.socStepperRow, { paddingHorizontal: 10, paddingVertical: 5, gap: 4 }]}
              onPress={() => setSocEditOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Adjust battery state of charge"
            >
              <Pencil size={12} color={COLORS.primary} />
              <Text style={styles.socStepLabel}>Adjust SoC</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.carWrapper}>
            <EvCarHeroRender model={activeVehicle?.makeModel} />
          </View>
        </View>

        {socEditOpen && (
          <View style={[styles.socStepperRow, { alignSelf: "flex-start", marginBottom: SPACING.sm }]}>
            <TouchableOpacity
              style={styles.socStepBtn}
              onPress={() => adjustActiveVehicleSoc(-5)}
              accessibilityRole="button"
              accessibilityLabel="Decrease battery SoC by 5 percent"
            >
              <Minus size={14} color={COLORS.primary} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.socStepLabel}>
              {activeVehicle?.socPercent ?? 72}% SoC
            </Text>
            <TouchableOpacity
              style={styles.socStepBtn}
              onPress={() => adjustActiveVehicleSoc(5)}
              accessibilityRole="button"
              accessibilityLabel="Increase battery SoC by 5 percent"
            >
              <Plus size={14} color={COLORS.primary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.metricsRow}>
          <StatTile
            label="Est. Range"
            value={`${activeVehicle?.rangeKm ?? 252} km`}
            subtext={`Max ${activeVehicle?.maxRangeKm ?? 350} km`}
            accent
          />
          <StatTile
            label="Energy Available"
            value={`${estimatedEnergyKwh} kWh`}
            subtext={`of ${activeVehicle?.batteryCapacityKwh ?? 45.0} kWh`}
          />
        </View>
      </AppCard>

      {/* "Next Up" Card for Upcoming Booking with Start Charging / Gate Pass */}
      {upcomingBooking && (
        <View style={styles.activeBookingBanner}>
          <View style={styles.activeBookingLeft}>
            <View style={styles.liveDotRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeBookingTag}>
                NEXT UP • PASS {upcomingBooking.otpCode.slice(0, 3)}{" "}
                {upcomingBooking.otpCode.slice(3)}
              </Text>
            </View>
            <Text style={styles.activeBookingStation} numberOfLines={1}>
              {upcomingBooking.stationName}
            </Text>
            <Text style={styles.activeBookingMeta} numberOfLines={1}>
              {upcomingBooking.slotTime} • {upcomingBooking.connectorType} (₹
              {upcomingBooking.pricePerKwh.toFixed(2)}/kWh)
            </Text>

            <View style={styles.activeBannerBtns}>
              <AppButton
                label="Start charging"
                variant="primary"
                size="md"
                style={{ flex: 1.2 }}
                icon={<Zap size={16} color={COLORS.textInverse} />}
                onPress={() => startChargingSession(upcomingBooking.id)}
              />
              <AppButton
                label="Gate pass"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/gate-pass",
                    params: { bookingId: upcomingBooking.id },
                  })
                }
              />
            </View>
          </View>
        </View>
      )}

      {/* 4-Icon Quick-Action Row (Book, Gate Pass, Trip Planner, Top-Up) */}
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
          accessibilityRole="button"
          accessibilityLabel="Book charging slot"
        >
          <View style={styles.quickActionIconBox}>
            <PlugZap size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Book</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => router.push("/(driver)/gate-pass")}
          accessibilityRole="button"
          accessibilityLabel="Open digital gate pass"
        >
          <View style={styles.quickActionIconBox}>
            <Ticket size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Gate Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => router.push("/(driver)/route-planner")}
          accessibilityRole="button"
          accessibilityLabel="Open EV trip planner"
        >
          <View style={styles.quickActionIconBox}>
            <Compass size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Trip Planner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionTile}
          onPress={() => setQuickTopUpModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Top up wallet balance"
        >
          <View style={styles.quickActionIconBox}>
            <Wallet size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Top-Up</Text>
        </TouchableOpacity>
      </View>

      {/* Inline Map Preview */}
      <View style={styles.miniMapCard}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.92}
          onPress={() => {
            selectStation(nearbyStation.id);
            router.push("/(driver)/map-radar");
          }}
          accessibilityRole="button"
          accessibilityLabel="Open full screen map radar"
        >
          <LeafletMap
            centerLat={homeMapCenter?.lat ?? nearbyStation.latitude}
            centerLng={homeMapCenter?.lng ?? nearbyStation.longitude}
            userCoords={homeUserCoords}
            zoom={15}
            focusSeq={homeFocusSeq}
            activeLayer={preferredMapLayer}
            compactMode={true}
            selectedMarkerId={nearbyStation.id}
            onSelectMarker={(id) => {
              setSelectedHomeStationId(id);
              const target = onlineStations.find((s) => s.id === id);
              if (target) {
                setHomeMapCenter({ lat: target.latitude, lng: target.longitude });
                setHomeFocusSeq((s) => s + 1);
              }
            }}
            markers={onlineStations.slice(0, 12).map((st) => ({
              id: st.id,
              lat: st.latitude,
              lng: st.longitude,
              title: st.name,
              price: `₹${st.pricePerKwh.toFixed(2)}`,
              powerKw: st.maxPowerKw,
              type: st.stationType,
              distanceKm: st.distanceKm,
            }))}
          />
        </TouchableOpacity>

        {/* Recenter Button on Home Preview Map */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Recenter map on my GPS location"
          onPress={async () => {
            if (homeUserCoords) {
              setHomeMapCenter({
                lat: homeUserCoords.latitude,
                lng: homeUserCoords.longitude,
              });
              setHomeFocusSeq((s) => s + 1);
              void syncLiveStationsForRegion(
                homeUserCoords.latitude,
                homeUserCoords.longitude,
                25
              );
            }
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                const cached = await Location.getLastKnownPositionAsync();
                if (cached?.coords) {
                  setHomeUserCoords({
                    latitude: cached.coords.latitude,
                    longitude: cached.coords.longitude,
                  });
                  setHomeMapCenter({
                    lat: cached.coords.latitude,
                    lng: cached.coords.longitude,
                  });
                  setHomeFocusSeq((s) => s + 1);
                }
                const pos = await Promise.race([
                  Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  }),
                  new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800)),
                ]);
                if (pos?.coords) {
                  setHomeUserCoords({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  });
                  setHomeMapCenter({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  });
                  setHomeFocusSeq((s) => s + 1);
                  void syncLiveStationsForRegion(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    25
                  );
                }
              }
            } catch {}
          }}
          style={styles.miniMapLocateBtn}
        >
          <LocateFixed size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Nearby Live EV Chargers Carousel (Snap scrolling, symmetric edge padding, hidden scrollbar) */}
      <SectionHeader
        title={`Nearby in ${nearbyCity} (${onlineStations.length})`}
        actionLabel="Open Map"
        onPressAction={() => router.push("/(driver)/map-radar")}
      />

      <ScrollView
        ref={homeCarouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.carouselBleedWrap}
        contentContainerStyle={styles.stationCarousel}
        onMomentumScrollEnd={(e) => {
          const cardStep = CAROUSEL_CARD_WIDTH + CAROUSEL_GAP;
          const idx = Math.max(
            0,
            Math.min(
              onlineStations.length - 1,
              Math.round(e.nativeEvent.contentOffset.x / cardStep)
            )
          );
          const target = onlineStations[idx];
          if (target) {
            setSelectedHomeStationId(target.id);
            selectStation(target.id);
            setHomeMapCenter({ lat: target.latitude, lng: target.longitude });
            setHomeFocusSeq((s) => s + 1);
          }
        }}
      >
        {onlineStations.map((st) => {
          const isFocused = st.id === nearbyStation.id;
          return (
            <StationCard
              key={st.id}
              station={st}
              variant="compact"
              selected={isFocused}
              onPress={() => {
                setSelectedHomeStationId(st.id);
                selectStation(st.id);
                setHomeMapCenter({ lat: st.latitude, lng: st.longitude });
                setHomeFocusSeq((s) => s + 1);
              }}
              onDirectionsPress={() =>
                launchNativeTurnByTurnMaps(st.latitude, st.longitude, st.name)
              }
              onBookPress={() => {
                selectStation(st.id);
                router.push({
                  pathname: "/(driver)/booking-sheet",
                  params: { stationId: st.id },
                });
              }}
            />
          );
        })}
      </ScrollView>

      {/* Recent Charging Activity Summary with Spend Sparkline & EmptyState fallback */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SPACING.sm,
        }}
      >
        <SectionHeader
          title="Recent sessions"
          actionLabel="Receipts"
          onPressAction={() => router.push("/(driver)/bookings")}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Sparkline values={spendSparklineValues} width={96} height={32} />
      </View>

      {chargingHistory.length === 0 ? (
        <EmptyState
          icon={<Zap size={24} color={COLORS.primary} />}
          title="No Charging Sessions Yet"
          subtitle="Completed charging sessions and verified GST receipts will appear here."
          ctaLabel="Find a Charger"
          onPressCta={() => router.push("/(driver)/map-radar")}
        />
      ) : (
        chargingHistory.slice(0, 3).map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.historyRowCard}
            onPress={() => router.push("/(driver)/bookings")}
          >
            <View style={styles.historyIconBox}>
              <Zap size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyStationName} numberOfLines={2}>
                {h.station}
              </Text>
              <Text style={styles.historyDateText}>
                {h.date} • {h.energyKwh} kWh ({h.durationMins} mins)
              </Text>
            </View>
            <Text style={styles.historyAmountText}>₹{h.amount.toFixed(2)}</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Vehicle Switcher Modal */}
      <Modal visible={vehicleModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Select Active EV ({INDIAN_EV_CATALOG.length}+ Models)
            </Text>
            <Text style={styles.modalSub}>
              Search or filter by brand across Indian 4W, Luxury & 2W EVs
            </Text>

            <View style={styles.searchFieldWrap}>
              <Search size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchFieldInput}
                placeholder="Search EV model (Nexon, BE 6, Windsor, Ather...)"
                placeholderTextColor={COLORS.textMuted}
                value={evSearchQuery}
                onChangeText={setEvSearchQuery}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {(
                [
                  { key: "ALL", label: `All EVs (${INDIAN_EV_CATALOG.length})` },
                  { key: "GARAGE", label: `My Garage (${vehicles.length})` },
                  ...INDIAN_EV_BRANDS.map((b) => ({
                    key: b,
                    label: `${b} (${
                      INDIAN_EV_CATALOG.filter((m) => m.brand === b).length
                    })`,
                  })),
                ] as const
              ).map((tab) => {
                const isActive =
                  !evSearchQuery.trim() && selectedBrandTab === tab.key;
                return (
                  <AppChip
                    key={tab.key}
                    label={tab.label}
                    selected={isActive}
                    onPress={() => {
                      setEvSearchQuery("");
                      setSelectedBrandTab(tab.key as any);
                    }}
                  />
                );
              })}
            </ScrollView>

            <ScrollView
              style={{ maxHeight: 350 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedBrandTab === "GARAGE" && !evSearchQuery.trim()
                ? vehicles.map((v) => (
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
                      <View style={{ marginRight: 10 }}>
                        <EvCarHeroRender
                          model={v.makeModel}
                          width={68}
                          height={48}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={styles.vehicleOptionTitle}
                          numberOfLines={2}
                        >
                          {v.makeModel}
                        </Text>
                        <Text style={styles.vehicleOptionSub}>
                          {v.plateNumber} • {v.batteryCapacityKwh} kWh •{" "}
                          {v.socPercent}% ({v.rangeKm} km)
                        </Text>
                        <Text
                          style={[
                            styles.vehicleOptionSub,
                            { color: COLORS.primary },
                          ]}
                        >
                          {v.connectorLabel}
                        </Text>
                      </View>
                      {v.isPrimary && (
                        <View style={styles.selectedCheckCircle}>
                          <Check size={14} color={COLORS.textInverse} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                : filteredCatalogVehicles.map((preset) => {
                    const existingInGarage = vehicles.find(
                      (v) =>
                        v.makeModel.toLowerCase() ===
                        preset.makeModel.toLowerCase()
                    );
                    const isPrimary = existingInGarage?.isPrimary ?? false;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.vehicleOption,
                          isPrimary && styles.vehicleOptionActive,
                        ]}
                        onPress={async () => {
                          if (existingInGarage) {
                            await setPrimaryVehicle(existingInGarage.id);
                          } else {
                            await addVehicle({
                              makeModel: preset.makeModel,
                              year: "2025",
                              plateNumber: "KL-07-EV-2026",
                              batteryCapacityKwh: preset.batteryCapacityKwh,
                              connectorType: preset.connectorType,
                              connectorLabel: preset.connectorLabel,
                              socPercent: 80,
                              rangeKm: Math.round(preset.maxRangeKm * 0.8),
                              maxRangeKm: preset.maxRangeKm,
                            });
                          }
                          setVehicleModalVisible(false);
                        }}
                      >
                        <View style={{ marginRight: 10 }}>
                          <EvCarHeroRender
                            model={preset.makeModel}
                            width={68}
                            height={48}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={styles.vehicleOptionTitle}
                            numberOfLines={2}
                          >
                            {preset.makeModel}
                          </Text>
                          <Text style={styles.vehicleOptionSub}>
                            {preset.segment} • {preset.batteryCapacityKwh} kWh •{" "}
                            {preset.maxRangeKm} km Range • {preset.maxDcPowerKw}{" "}
                            kW Max
                          </Text>
                          <Text
                            style={[
                              styles.vehicleOptionSub,
                              { color: COLORS.primary },
                            ]}
                          >
                            {preset.connectorLabel}
                          </Text>
                        </View>
                        {isPrimary && (
                          <View style={styles.selectedCheckCircle}>
                            <Check
                              size={14}
                              color={COLORS.textInverse}
                              strokeWidth={3}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <AppButton
                label="Custom EV Garage"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setVehicleModalVisible(false);
                  router.push("/(driver)/garage-wallet");
                }}
              />
              <AppButton
                label="Done"
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => setVehicleModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications & Reminders Center Drawer */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.notifHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Notifications & Reminders</Text>
                <Text style={styles.notifSubCount}>
                  {unreadCount} unread alerts • VoltMate EV Network
                </Text>
              </View>
              <TouchableOpacity
                onPress={markNotificationsRead}
                style={styles.markReadBtn}
              >
                <Text style={styles.markReadText}>Mark All Read</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reminderHighlightBanner}>
              <View style={styles.reminderTitleRow}>
                <Clock size={16} color={COLORS.primary} />
                <Text style={styles.reminderBannerTitle}>
                  {upcomingBooking
                    ? `Reminder: Your slot at ${upcomingBooking.stationName} is active.`
                    : `Nearest Live Charger: ${
                        nearbyStation?.name || "VoltMate EV Hub"
                      }`}
                </Text>
              </View>
              <Text style={styles.reminderBannerSub}>
                {upcomingBooking
                  ? `Gate Pass ${upcomingBooking.otpCode.slice(0, 3)} ${upcomingBooking.otpCode.slice(3)} is ready for plug-in.`
                  : `Instant booking available at ₹${(
                      nearbyStation?.pricePerKwh ?? 10.5
                    ).toFixed(2)}/kWh.`}
                {reminderSnoozedUntil
                  ? ` (Snoozed ${reminderSnoozedUntil})`
                  : ""}
              </Text>
              <View style={styles.reminderActionRow}>
                <AppButton
                  label="View Gate Pass"
                  variant="primary"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setNotifModalVisible(false);
                    router.push({
                      pathname: "/(driver)/gate-pass",
                      params: upcomingBooking
                        ? { bookingId: upcomingBooking.id }
                        : undefined,
                    });
                  }}
                />
                <AppButton
                  label="Snooze 10m"
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={() => snoozeReminder(10)}
                />
              </View>
            </View>

            <AppButton
              label="Trigger Test Reminder Alert"
              variant="secondary"
              size="md"
              style={{ marginBottom: SPACING.sm }}
              icon={<Bell size={16} color={COLORS.primary} />}
              onPress={() => triggerTestReminder()}
            />

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

            <AppButton
              label="Close"
              variant="primary"
              style={{ marginTop: SPACING.sm }}
              onPress={() => setNotifModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Wallet Add Money BottomSheet with AmountChips (200/500/1000/2000) + Custom Amount + Single CTA */}
      <BottomSheet
        visible={quickTopUpModal}
        onClose={() => setQuickTopUpModal(false)}
        title="Add money to wallet"
        subtitle={`Balance: ₹${(user?.voltCreditsBalance ?? 1450.0).toFixed(2)}`}
      >
        <AmountChips
          presets={[200, 500, 1000, 2000]}
          selectedAmount={topUpAmount}
          onSelectAmount={setTopUpAmount}
          onSubmit={async (amt) => {
            setQuickTopUpModal(false);
            await topUpWallet(amt, "Razorpay Checkout");
          }}
        />
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  vehicleDropdownBtn: {
    flex: 1,
    minHeight: SPACING.touchTarget,
    justifyContent: "center",
  },
  modelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modelTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  modelSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    minHeight: SPACING.touchTarget,
    borderRadius: SPACING.chipRadius,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level1,
  },
  walletPillIcon: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.primary,
  },
  walletPillAmount: {
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  walletPlusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  bellButton: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...ELEVATION.level1,
  },
  notifBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.destructive,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: "800",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  batteryColWrap: {
    alignItems: "center",
  },
  socStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: "hidden",
  },
  socStepBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  socStepLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
    paddingHorizontal: 8,
  },
  carWrapper: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  activeBookingBanner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.neonLive,
  },
  activeBookingTag: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.neonLive,
  },
  activeBookingStation: {
    ...TYPOGRAPHY.title,
    color: COLORS.textInverse,
  },
  activeBookingMeta: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: "#D1FAE5",
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  activeBannerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricBigValue: {
    ...TYPOGRAPHY.h1,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  metricUnit: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  metricSubText: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  portCard: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  portTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  portTextCol: {
    flex: 1,
  },
  portLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  portValue: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  tariffChipsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tariffMiniChip: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tariffMiniName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  tariffMiniPrice: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 76,
    ...ELEVATION.level1,
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  nearbyBlock: {
    marginBottom: SPACING.sm,
  },
  nearbyHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  nearbyOverline: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  nearbyTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  nearbyChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  infoChip: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
  },
  infoChipText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  rateChipGreen: {
    backgroundColor: COLORS.primaryLight,
  },
  rateChipText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  miniMapCard: {
    height: 176,
    borderRadius: SPACING.cardRadiusLarge,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceMuted,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniMapLocateBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level2,
  },
  carouselBleedWrap: {
    marginHorizontal: -SPACING.screenMargin,
    marginBottom: SPACING.lg,
  },
  stationCarousel: {
    paddingHorizontal: SPACING.screenMargin,
    gap: CAROUSEL_GAP,
    paddingBottom: 4,
  },
  stationMiniCard: {
    width: CAROUSEL_CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level1,
  },
  stationMiniCardFocused: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  stationMiniTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  stationTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stationTypePillTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  ratingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stationRatingTxt: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  stationMiniName: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    minHeight: 48,
  },
  stationMiniAddr: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.xs,
    minHeight: 32,
  },
  stationMiniFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  stationMiniPrice: {
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  stationMiniDist: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  stationMiniActionRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  historyRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  historyStationName: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  historyDateText: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyAmountText: {
    ...TYPOGRAPHY.title,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  modalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  searchFieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  searchFieldInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SPACING.cardRadius,
    backgroundColor: COLORS.surfaceSubtle,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  vehicleOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  vehicleOptionTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  vehicleOptionSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  selectedCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  notifHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  notifSubCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  markReadBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SPACING.chipRadius,
  },
  markReadText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  reminderHighlightBanner: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: SPACING.sm,
  },
  reminderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderBannerTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.primary,
    flex: 1,
  },
  reminderBannerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  reminderActionRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  notifCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  notifCardUnread: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  notifTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notifMsg: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  notifTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  upiSelectLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  upiAppRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  topUpAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  topUpAmountBtn: {
    width: "48%",
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SPACING.cardRadius,
    paddingVertical: 14,
    alignItems: "center",
  },
  topUpAmountText: {
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  topUpSubLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
