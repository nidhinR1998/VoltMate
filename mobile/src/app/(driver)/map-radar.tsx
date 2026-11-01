import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  DEFAULT_CONNECTOR_SPECS,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";
import {
  fetchHybridDirections,
  searchPlacesHybrid,
  PlaceSuggestion,
} from "../../services/hybridMapService";
import {
  calcDistanceKm,
  VERIFIED_KERALA_EV_REGISTRY,
} from "../../services/realTimeEvHunter";
import { launchNativeTurnByTurnMaps } from "../../services/notificationService";

type FilterCategory =
  | "ALL"
  | "P2P_HOME"
  | "PUBLIC_DC"
  | "SOCKET_15A"
  | "TYPE_2"
  | "CCS2"
  | "UNDER_12";

interface SmartSearchItem extends PlaceSuggestion {
  isEvStation?: boolean;
  stationId?: string;
}

export default function MapRadarScreen() {
  const router = useRouter();
  const {
    stations,
    selectedStationId,
    selectStation,
    preferredMapLayer,
    setPreferredMapLayer,
    syncLiveStationsForRegion,
  } = useVoltMateEngine();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("ALL");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [mapLayer, setMapLayer] = useState<"standard" | "satellite" | "hybrid">(
    preferredMapLayer
  );
  const [showTraffic, setShowTraffic] = useState(true);

  useEffect(() => {
    setMapLayer(preferredMapLayer);
  }, [preferredMapLayer]);

  const [placeSuggestions, setPlaceSuggestions] = useState<SmartSearchItem[]>(
    []
  );
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [routeMeta, setRouteMeta] = useState<{
    distanceKm: number;
    durationMins: number;
    source: string;
  } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Default to Payyanur / North Kerala street-level center, immediately overridden by 0.2s GPS lock
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 12.0988,
    lng: 75.1952,
  });
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isScanningLive, setIsScanningLive] = useState(false);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedCenterRef = useRef<{ lat: number; lng: number }>({
    lat: 12.0988,
    lng: 75.1952,
  });

  // Safe wrapper that guarantees the green spinner stops within 3.5 seconds maximum
  const executeSafeStationScan = async (
    lat: number,
    lng: number,
    radiusKm = 25
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    lastFetchedCenterRef.current = { lat, lng };
    setIsScanningLive(true);

    const safetyTimeout = setTimeout(() => {
      setIsScanningLive(false);
      isFetchingRef.current = false;
    }, 3500);

    try {
      await syncLiveStationsForRegion(lat, lng, radiusKm);
    } finally {
      clearTimeout(safetyTimeout);
      setIsScanningLive(false);
      isFetchingRef.current = false;
    }
  };

  // FIX 1: Instant 2-Stage GPS Lock (0.2s cached + High-Accuracy live watch)
  useEffect(() => {
    let mounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted" && mounted) {
          // STAGE 1: Instant cached GPS lock (< 0.2 seconds)
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (mounted && lastKnown?.coords) {
            const fastLat = lastKnown.coords.latitude;
            const fastLng = lastKnown.coords.longitude;
            setUserCoords({ latitude: fastLat, longitude: fastLng });
            setMapCenter({ lat: fastLat, lng: fastLng });
            executeSafeStationScan(fastLat, fastLng, 25);
          }

          // STAGE 2: High-accuracy hardware GPS lock
          const freshPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (mounted && freshPos?.coords) {
            const preciseLat = freshPos.coords.latitude;
            const preciseLng = freshPos.coords.longitude;
            setUserCoords({ latitude: preciseLat, longitude: preciseLng });
            setMapCenter({ lat: preciseLat, lng: preciseLng });
            await executeSafeStationScan(preciseLat, preciseLng, 25);
          }

          // STAGE 3: Continuous live Blue Dot tracking as driver moves
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 15,
            },
            (loc) => {
              if (mounted && loc?.coords) {
                setUserCoords({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                });
              }
            }
          );
          return;
        }
      } catch {
        // Fallback to Payyanur center if GPS unavailable
      }
      if (mounted) {
        await executeSafeStationScan(12.0988, 75.1952, 25);
      }
    })();

    return () => {
      mounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    };
  }, []);

  // FIX 2: Kill Infinite Search Spinner Loop on onRegionChangeComplete
  const handleAutonomousRegionChange = (
    lat: number,
    lng: number,
    isGesture?: boolean
  ) => {
    const movedKm = calcDistanceKm(
      lat,
      lng,
      lastFetchedCenterRef.current.lat,
      lastFetchedCenterRef.current.lng
    );

    // Ignore micro-renders or programmatic camera animations unless user dragged > 2.5 km
    if (isFetchingRef.current) return;
    if (isGesture === false && movedKm < 2.5) return;
    if (movedKm < 2.5) return;

    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => {
      executeSafeStationScan(lat, lng, 25);
    }, 550);
  };

  const handleAutonomousMapPress = async (lat: number, lng: number) => {
    setSearchQuery("");
    setPlaceSuggestions([]);
    setRouteCoords([]);
    setRouteMeta(null);
    setMapCenter({ lat, lng });
    isFetchingRef.current = false;
    await executeSafeStationScan(lat, lng, 25);
  };

  // Floating "🎯 My Location" button handler
  const handleCenterOnUserGps = async () => {
    setRouteCoords([]);
    setRouteMeta(null);
    if (userCoords) {
      setMapCenter({ lat: userCoords.latitude, lng: userCoords.longitude });
      isFetchingRef.current = false;
      await executeSafeStationScan(
        userCoords.latitude,
        userCoords.longitude,
        25
      );
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (pos?.coords) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setMapCenter({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          isFetchingRef.current = false;
          await executeSafeStationScan(
            pos.coords.latitude,
            pos.coords.longitude,
            25
          );
        }
      }
    } catch {
      // ignore
    }
  };

  // FIX 4: Smart EV-First Search Bar (No "Check Dam" or "Quarantine Stations"!)
  useEffect(() => {
    const qRaw = searchQuery.trim();
    const q = qRaw.toLowerCase();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      setIsSearchingPlaces(false);
      return;
    }

    const refLat = userCoords?.latitude ?? mapCenter.lat;
    const refLng = userCoords?.longitude ?? mapCenter.lng;

    // INTENT #1: "Stations near me", "near me", "ev", "chargers", "charging stations"
    const isNearMeIntent =
      q.includes("near me") ||
      q === "stations" ||
      q === "station" ||
      q === "ev" ||
      q === "ev stations" ||
      q === "chargers" ||
      q === "charging" ||
      q === "charging station" ||
      q === "charging stations";

    if (isNearMeIntent) {
      const nearbyEvs: Array<SmartSearchItem & { _dist: number }> =
        VERIFIED_KERALA_EV_REGISTRY.map((st) => {
          const d = calcDistanceKm(refLat, refLng, st.latitude, st.longitude);
          const rate = st.connectors[0]?.pricePerKwhInr ?? 12.0;
          return {
            id: st.id,
            title: `⚡ ${st.title}`,
            subtitle: `${d.toFixed(1)} km away • ${st.address} • ₹${rate.toFixed(2)}/kWh`,
            latitude: st.latitude,
            longitude: st.longitude,
            source: "NOMINATIM",
            isEvStation: true,
            stationId: st.id,
            _dist: d,
          };
        })
          .sort((a, b) => a._dist - b._dist)
          .slice(0, 6);

      setPlaceSuggestions(nearbyEvs);
      setIsSearchingPlaces(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        // INTENT #2: Match verified EV stations & operators first
        const evMatches: Array<SmartSearchItem & { _dist: number }> =
          VERIFIED_KERALA_EV_REGISTRY.filter(
            (st) =>
              st.title.toLowerCase().includes(q) ||
              st.address.toLowerCase().includes(q) ||
              st.operator.toLowerCase().includes(q)
          )
            .map((st) => {
              const d = calcDistanceKm(
                refLat,
                refLng,
                st.latitude,
                st.longitude
              );
              const maxKw = Math.max(
                ...st.connectors.map((c) => c.powerKw),
                7.4
              );
              return {
                id: st.id,
                title: `⚡ ${st.title}`,
                subtitle: `${d.toFixed(1)} km • ${st.address} • ${maxKw}kW`,
                latitude: st.latitude,
                longitude: st.longitude,
                source: "NOMINATIM",
                isEvStation: true,
                stationId: st.id,
                _dist: d,
              };
            })
            .sort((a, b) => a._dist - b._dist)
            .slice(0, 5);

        // INTENT #3: Town / City geocoding (Payyanur, Pilathara, Kannur, Kakkanad, etc.)
        const cleanPlaceQuery = qRaw
          .replace(/charging stations?|chargers?|stations?|near me/gi, "")
          .trim();

        let townResults: PlaceSuggestion[] = [];
        if (cleanPlaceQuery.length >= 2) {
          townResults = await searchPlacesHybrid(
            cleanPlaceQuery,
            refLat,
            refLng
          );
        }

        // Filter out bizarre non-EV POIs like "Check Dam" or "Quarantine"
        const filteredTowns = townResults.filter(
          (t) =>
            !t.title.toLowerCase().includes("check dam") &&
            !t.title.toLowerCase().includes("quarantine")
        );

        setPlaceSuggestions([...evMatches, ...filteredTowns].slice(0, 6));
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [searchQuery, mapCenter.lat, mapCenter.lng, userCoords]);

  // Filter out stations far outside current region (> 45 km) so Kochi stations never show in Payyanur
  const filteredStations = useMemo(() => {
    const onlineOnly = stations.filter((s) => s.isOnline !== false);
    const withTrueDistance = onlineOnly.map((s) => ({
      ...s,
      distanceKm: calcDistanceKm(
        mapCenter.lat,
        mapCenter.lng,
        s.latitude,
        s.longitude
      ),
    }));

    const regionalPool = withTrueDistance
      .filter((s) => s.distanceKm <= 45)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const baseList =
      regionalPool.length > 0 ? regionalPool : withTrueDistance.slice(0, 8);

    const byCategory = baseList.filter((s) => {
      if (filterCategory === "P2P_HOME") return s.stationType === "P2P_HOME";
      if (filterCategory === "PUBLIC_DC") return s.stationType === "PUBLIC_DC";
      if (filterCategory === "SOCKET_15A")
        return s.connectorTypes.some((c) => c.toUpperCase().includes("15A"));
      if (filterCategory === "TYPE_2")
        return s.connectorTypes.some((c) => c.toUpperCase().includes("TYPE-2"));
      if (filterCategory === "CCS2")
        return s.connectorTypes.some((c) => c.toUpperCase().includes("CCS2"));
      if (filterCategory === "UNDER_12") return s.pricePerKwh <= 12.0;
      return true;
    });

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;

    const textMatches = byCategory.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.hostName.toLowerCase().includes(q)
    );
    return textMatches.length > 0 ? textMatches : byCategory;
  }, [stations, searchQuery, filterCategory, mapCenter.lat, mapCenter.lng]);

  const activeStation = useMemo(() => {
    return (
      filteredStations.find((s) => s.id === selectedStationId) ||
      filteredStations[0] ||
      stations[0]
    );
  }, [filteredStations, selectedStationId, stations]);

  const markers = useMemo(
    () =>
      filteredStations.map((s) => ({
        id: s.id,
        lat: s.latitude,
        lng: s.longitude,
        title: s.name,
        price: `₹${s.pricePerKwh.toFixed(2)}`,
        powerKw: s.maxPowerKw,
        type: s.stationType,
        distanceKm: s.distanceKm,
      })),
    [filteredStations]
  );

  const handleGetDirections = async () => {
    if (!activeStation) return;
    const originLat = userCoords?.latitude ?? mapCenter.lat;
    const originLng = userCoords?.longitude ?? mapCenter.lng;
    setIsLoadingRoute(true);
    const res = await fetchHybridDirections(
      originLat,
      originLng,
      activeStation.latitude,
      activeStation.longitude
    );
    setRouteCoords(res.coordinates);
    setRouteMeta({
      distanceKm: res.distanceKm,
      durationMins: res.durationMins,
      source: res.source,
    });
    setIsLoadingRoute(false);
    await launchNativeTurnByTurnMaps(
      activeStation.latitude,
      activeStation.longitude,
      activeStation.name
    );
  };

  const handleSelectPlaceSuggestion = async (place: SmartSearchItem) => {
    setSearchQuery("");
    setPlaceSuggestions([]);
    setRouteCoords([]);
    setRouteMeta(null);
    setMapCenter({ lat: place.latitude, lng: place.longitude });
    isFetchingRef.current = false;
    await executeSafeStationScan(place.latitude, place.longitude, 25);
    if (place.stationId) {
      selectStation(place.stationId);
    }
  };

  const connectorSpecs =
    activeStation?.connectorSpecs || DEFAULT_CONNECTOR_SPECS;

  return (
    <View style={styles.container}>
      {/* Fullscreen Interactive Map */}
      <View style={styles.mapWrap}>
        <LeafletMap
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          userCoords={userCoords}
          zoom={15}
          activeLayer={mapLayer}
          showsTraffic={showTraffic}
          markers={markers}
          selectedMarkerId={activeStation?.id}
          routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
          onSelectMarker={(id) => {
            selectStation(id);
            const target = stations.find((s) => s.id === id);
            if (target) {
              setMapCenter({ lat: target.latitude, lng: target.longitude });
            }
            setRouteCoords([]);
            setRouteMeta(null);
          }}
          onRegionChangeComplete={handleAutonomousRegionChange}
          onMapPress={handleAutonomousMapPress}
        />
      </View>

      {/* Top Search Bar + Filter Button */}
      <View style={styles.topSearchWrap}>
        <View style={styles.topSearchRow}>
          <View style={styles.searchPill}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search town or EV hub (Payyanur, Ather, GOEC...)"
              placeholderTextColor="#8C948E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {(isSearchingPlaces || isScanningLive) && (
              <ActivityIndicator size="small" color="#05E660" />
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setPlaceSuggestions([]);
                }}
              >
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterCircleBtn,
              filterCategory !== "ALL" && styles.filterCircleBtnActive,
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.filterSlidersIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Map Mode Switcher Pill (Street | Satellite | Traffic) */}
        <View style={styles.mapModePillRow}>
          {(
            [
              { key: "standard", label: "🗺️ Street" },
              { key: "satellite", label: "🛰️ Satellite" },
              { key: "hybrid", label: "🚦 Traffic" },
            ] as const
          ).map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.mapModeChip,
                mapLayer === mode.key && styles.mapModeChipActive,
              ]}
              onPress={() => {
                setMapLayer(mode.key);
                setPreferredMapLayer(mode.key);
              }}
            >
              <Text
                style={[
                  styles.mapModeChipText,
                  mapLayer === mode.key && styles.mapModeChipTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}

          {filterCategory !== "ALL" && (
            <TouchableOpacity
              style={styles.activeFilterBadge}
              onPress={() => setFilterCategory("ALL")}
            >
              <Text style={styles.activeFilterBadgeTxt}>
                {filterCategory} ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Smart EV + Town Autocomplete Dropdown */}
        {placeSuggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {placeSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectPlaceSuggestion(item)}
              >
                <Text style={styles.suggestionPin}>
                  {item.isEvStation ? "⚡" : "📍"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                {item.isEvStation && (
                  <View style={styles.evTagPill}>
                    <Text style={styles.evTagText}>EV Hub</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Floating "🎯 My Location" Precision GPS Button */}
      <TouchableOpacity
        style={styles.myLocationFab}
        onPress={handleCenterOnUserGps}
        activeOpacity={0.85}
      >
        <View style={styles.myLocationBlueDot} />
        <Text style={styles.myLocationFabText}>My GPS</Text>
      </TouchableOpacity>

      {/* Bottom Floating Station Sheet */}
      {activeStation && (
        <View style={styles.stationCard}>
          <View style={styles.dragHandle} />

          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stationName}>{activeStation.name}</Text>
              <Text style={styles.stationAddr} numberOfLines={1}>
                {activeStation.address}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.stationDistanceText}>
                {routeMeta
                  ? `${routeMeta.distanceKm} km`
                  : `${activeStation.distanceKm} km`}
              </Text>
              <Text style={styles.stationTariffBadge}>
                ₹{activeStation.pricePerKwh.toFixed(2)}/kWh
              </Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.ratingBold}>
              {activeStation.rating.toFixed(1)}
            </Text>
            <Text style={styles.reviewsMuted}>
              ({activeStation.reviewsCount} Reviews) •{" "}
              {activeStation.stationType === "P2P_HOME"
                ? `🏠 P2P Host (${activeStation.hostName})`
                : "⚡ Public Grid Hub"}
            </Text>
            {routeMeta && (
              <View style={styles.routeEtaBadge}>
                <Text style={styles.routeEtaText}>
                  {routeMeta.durationMins} min
                </Text>
              </View>
            )}
          </View>

          {/* 3 Indian Connector Preview Tiles */}
          <View style={styles.plugsPreviewRow}>
            {connectorSpecs.map((spec) => (
              <TouchableOpacity
                key={spec.id}
                style={styles.plugTile}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/booking-sheet",
                    params: {
                      stationId: activeStation.id,
                      connectorId: spec.id,
                    },
                  })
                }
              >
                <ConnectorPlugIllustration type={spec.name} size="sm" />
                <Text style={styles.plugTileName} numberOfLines={1}>
                  {spec.name.split(" ")[0]}
                </Text>
                <Text style={styles.plugTilePrice}>{spec.priceLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Action Buttons: Open Maps + Book */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.getDirectionOutlineBtn}
              onPress={handleGetDirections}
              disabled={isLoadingRoute}
            >
              {isLoadingRoute ? (
                <ActivityIndicator size="small" color="#151C18" />
              ) : (
                <Text style={styles.getDirectionOutlineText}>
                  🗺️ Open Maps
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookGreenBtn}
              onPress={() =>
                router.push({
                  pathname: "/(driver)/booking-sheet",
                  params: { stationId: activeStation.id },
                })
              }
            >
              <Text style={styles.bookGreenBtnText}>Book Slot</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter & Map Layer Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter Stations & Connectors</Text>
            <Text style={styles.modalSectionLabel}>
              Station & Indian Connector Type
            </Text>
            {(
              [
                { key: "ALL", label: "All Nearby & Highway EV Stations" },
                { key: "SOCKET_15A", label: "🔌 15A Socket (3.3 kW AC)" },
                { key: "TYPE_2", label: "🔋 Type-2 AC (7.4 kW / 22 kW)" },
                { key: "CCS2", label: "🚀 CCS2 DC (50 kW / 60 kW)" },
                {
                  key: "UNDER_12",
                  label: "₹ Under ₹12/kWh (KSEB / P2P Domestic)",
                },
                { key: "P2P_HOME", label: "🏠 P2P Home Hosts Only" },
                { key: "PUBLIC_DC", label: "⚡ Public DC Fast Hubs Only" },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.filterOptBtn,
                  filterCategory === opt.key && styles.filterOptBtnActive,
                ]}
                onPress={() => {
                  setFilterCategory(opt.key);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterOptText}>{opt.label}</Text>
                {filterCategory === opt.key && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.trafficRow}>
              <Text style={styles.modalSectionLabel}>
                Live Road Traffic Overlay
              </Text>
              <TouchableOpacity
                style={[
                  styles.trafficToggle,
                  showTraffic && styles.trafficToggleActive,
                ]}
                onPress={() => setShowTraffic(!showTraffic)}
              >
                <Text
                  style={[
                    styles.trafficToggleText,
                    showTraffic && styles.trafficToggleTextActive,
                  ]}
                >
                  {showTraffic ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  mapWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  topSearchWrap: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    zIndex: 25,
  },
  topSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchPill: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#151C18",
  },
  clearBtn: {
    fontSize: 15,
    color: "#7C857F",
    fontWeight: "700",
    paddingLeft: 8,
  },
  filterCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
  },
  filterCircleBtnActive: {
    backgroundColor: "#05E660",
  },
  filterSlidersIcon: {
    fontSize: 18,
  },
  mapModePillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  mapModeChip: {
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mapModeChipActive: {
    backgroundColor: "#151C18",
  },
  mapModeChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  mapModeChipTextActive: {
    color: "#05E660",
  },
  activeFilterBadge: {
    backgroundColor: "#05E660",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeFilterBadgeTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  suggestionsDropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F2",
  },
  suggestionPin: {
    fontSize: 16,
    marginRight: 10,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  suggestionSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 1,
  },
  evTagPill: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  evTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#096B30",
  },
  myLocationFab: {
    position: "absolute",
    right: 20,
    bottom: 392,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 7,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
    borderWidth: 1,
    borderColor: "#E2E8E4",
  },
  myLocationBlueDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4285F4",
    borderWidth: 2,
    borderColor: "#D2E3FC",
  },
  myLocationFabText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  stationCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 98,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E1E5E2",
    alignSelf: "center",
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stationName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.3,
  },
  stationAddr: {
    fontSize: 12,
    color: "#7C857F",
    fontWeight: "500",
    marginTop: 3,
  },
  stationDistanceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  stationTariffBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginBottom: 14,
  },
  starIcon: {
    fontSize: 14,
    color: "#151C18",
  },
  ratingBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  reviewsMuted: {
    fontSize: 12,
    color: "#7C857F",
    fontWeight: "500",
  },
  routeEtaBadge: {
    marginLeft: "auto",
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  routeEtaText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  plugsPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  plugTile: {
    flex: 1,
    backgroundColor: "#F5F7F6",
    borderRadius: 18,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  plugTileName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  plugTilePrice: {
    fontSize: 10,
    color: "#7C857F",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  getDirectionOutlineBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  getDirectionOutlineText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  bookGreenBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  bookGreenBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C857F",
    marginBottom: 8,
    marginTop: 6,
  },
  filterOptBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    marginBottom: 7,
  },
  filterOptBtnActive: {
    backgroundColor: "#EAFBF0",
    borderWidth: 1.5,
    borderColor: "#05E660",
  },
  filterOptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: "900",
    color: "#096B30",
  },
  trafficRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  trafficToggle: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#E8ECE9",
  },
  trafficToggleActive: {
    backgroundColor: "#05E660",
  },
  trafficToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5C6460",
  },
  trafficToggleTextActive: {
    color: "#151C18",
  },
  doneBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
