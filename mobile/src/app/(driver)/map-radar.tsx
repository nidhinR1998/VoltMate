import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  LocateFixed,
  Layers,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
  Zap,
  MapPin,
  Star,
  Phone,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  DEFAULT_CONNECTOR_SPECS,
  filterStationForVehicle,
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
import {
  launchNativeTurnByTurnMaps,
  launchNativePhoneCall,
} from "../../services/notificationService";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  ELEVATION,
  pluralize,
  isOwnStationDistanceHidden,
} from "../../theme/tokens";
import { AppButton, AppChip, EmptyState } from "../../components/ui/DesignSystem";

type FilterCategory =
  | "P2P_HOME"
  | "PUBLIC_DC"
  | "CCS2"
  | "TYPE_2"
  | "SOCKET_15A"
  | "UNDER_12"
  | "AVAILABLE";

const MAP_FILTER_CHIPS: ReadonlyArray<{
  key: FilterCategory;
  label: string;
}> = [
  { key: "P2P_HOME", label: "P2P Host" },
  { key: "PUBLIC_DC", label: "Fast DC" },
  { key: "CCS2", label: "CCS2" },
  { key: "TYPE_2", label: "Type-2" },
  { key: "SOCKET_15A", label: "15A" },
  { key: "UNDER_12", label: "≤ ₹12/kWh" },
  { key: "AVAILABLE", label: "Available" },
];

type SheetSnapPoint = "peek" | "half" | "full";

type SmartSearchItem = PlaceSuggestion & {
  isEvStation?: boolean;
  stationId?: string;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_MARGIN = SPACING.screenMargin;
const STATION_CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

export default function MapRadarScreen() {
  const router = useRouter();
  const {
    stations,
    vehicles,
    selectedStationId,
    selectStation,
    preferredMapLayer,
    setPreferredMapLayer,
    syncLiveStationsForRegion,
    nearbyCity,
    locationStatus,
    setLocationState,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<FilterCategory[]>([]);
  const [mapLayer, setMapLayer] = useState<"standard" | "satellite" | "hybrid">(
    preferredMapLayer
  );
  const [showTraffic, setShowTraffic] = useState(true);
  const [sheetSnap, setSheetSnap] = useState<SheetSnapPoint>("half");

  const toggleFilterChip = (key: FilterCategory) => {
    setSelectedFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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

  const initialTarget =
    stations.find((s) => s.id === selectedStationId) || stations[0];
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: initialTarget?.latitude || 12.1045,
    lng: initialTarget?.longitude || 75.2058,
  });
  const [focusSeq, setFocusSeq] = useState(1);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocatingMe, setIsLocatingMe] = useState(false);

  const carouselRef = useRef<FlatList<any> | null>(null);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedCenterRef = useRef<{ lat: number; lng: number }>({
    lat: initialTarget?.latitude || 12.0988,
    lng: initialTarget?.longitude || 75.1952,
  });

  const executeSafeStationScan = async (
    lat: number,
    lng: number,
    radiusKm = 25
  ) => {
    isFetchingRef.current = true;
    lastFetchedCenterRef.current = { lat, lng };

    const safetyTimeout = setTimeout(() => {
      isFetchingRef.current = false;
    }, 3000);

    try {
      await syncLiveStationsForRegion(lat, lng, radiusKm);
    } finally {
      clearTimeout(safetyTimeout);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (mounted) {
            setLocationState("GPS_OFF", null);
            await executeSafeStationScan(12.0988, 75.1952, 25);
          }
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) {
            setLocationState("PERMISSION_DENIED", null);
            await executeSafeStationScan(12.0988, 75.1952, 25);
          }
          return;
        }
        if (status === "granted" && mounted) {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (mounted && lastKnown?.coords) {
            const fastLat = lastKnown.coords.latitude;
            const fastLng = lastKnown.coords.longitude;
            setUserCoords({ latitude: fastLat, longitude: fastLng });
            setMapCenter({ lat: fastLat, lng: fastLng });
            setFocusSeq((s) => s + 1);
            setLocationState(
              (lastKnown.coords.accuracy ?? 50) > 1200 ? "LOW_ACCURACY" : "READY",
              lastKnown.coords
            );
            void executeSafeStationScan(fastLat, fastLng, 25);
          }

          const freshPos = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          if (mounted && freshPos?.coords) {
            const preciseLat = freshPos.coords.latitude;
            const preciseLng = freshPos.coords.longitude;
            setUserCoords({ latitude: preciseLat, longitude: preciseLng });
            setMapCenter({ lat: preciseLat, lng: preciseLng });
            setFocusSeq((s) => s + 1);
            setLocationState(
              (freshPos.coords.accuracy ?? 50) > 1200 ? "LOW_ACCURACY" : "READY",
              freshPos.coords
            );
            await executeSafeStationScan(preciseLat, preciseLng, 25);
          }

          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 150,
            },
            (loc) => {
              if (mounted && loc?.coords) {
                setUserCoords({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                });
                setLocationState("READY", loc.coords);
                const movedKm = calcDistanceKm(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  lastFetchedCenterRef.current.lat,
                  lastFetchedCenterRef.current.lng
                );
                if (movedKm >= 0.25 && !isFetchingRef.current) {
                  void executeSafeStationScan(
                    loc.coords.latitude,
                    loc.coords.longitude,
                    25
                  );
                }
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

    if (isFetchingRef.current) return;
    if (isGesture === false && movedKm < 2.5) return;
    if (movedKm < 2.5) return;

    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => {
      void executeSafeStationScan(lat, lng, 25);
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

  const handleCenterOnUserGps = async () => {
    setRouteCoords([]);
    setRouteMeta(null);

    if (userCoords) {
      setMapCenter({ lat: userCoords.latitude, lng: userCoords.longitude });
      setFocusSeq((s) => s + 1);
    }

    setIsLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const cached = await Location.getLastKnownPositionAsync();
        if (cached?.coords) {
          const cLat = cached.coords.latitude;
          const cLng = cached.coords.longitude;
          setUserCoords({ latitude: cLat, longitude: cLng });
          setMapCenter({ lat: cLat, lng: cLng });
          setFocusSeq((s) => s + 1);
        }

        const livePos = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800)),
        ]);

        const finalLat =
          livePos?.coords?.latitude ??
          cached?.coords?.latitude ??
          userCoords?.latitude ??
          mapCenter.lat;
        const finalLng =
          livePos?.coords?.longitude ??
          cached?.coords?.longitude ??
          userCoords?.longitude ??
          mapCenter.lng;

        setUserCoords({ latitude: finalLat, longitude: finalLng });
        setMapCenter({ lat: finalLat, lng: finalLng });
        setFocusSeq((s) => s + 1);
        setIsLocatingMe(false);

        isFetchingRef.current = false;
        void executeSafeStationScan(finalLat, finalLng, 25);
        return;
      }
    } catch {
      // ignore
    } finally {
      setIsLocatingMe(false);
    }
  };

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
            title: st.title,
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

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      const stopSpinnerTimer = setTimeout(() => {
        if (!cancelled) setIsSearchingPlaces(false);
      }, 2200);
      try {
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
                title: st.title,
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

        const filteredTowns = townResults.filter(
          (t) =>
            !t.title.toLowerCase().includes("check dam") &&
            !t.title.toLowerCase().includes("quarantine")
        );

        if (!cancelled) {
          setPlaceSuggestions([...evMatches, ...filteredTowns].slice(0, 6));
        }
      } finally {
        clearTimeout(stopSpinnerTimer);
        if (!cancelled) setIsSearchingPlaces(false);
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, mapCenter.lat, mapCenter.lng, userCoords]);

  const distanceRefLat =
    userCoords?.latitude ?? lastFetchedCenterRef.current.lat;
  const distanceRefLng =
    userCoords?.longitude ?? lastFetchedCenterRef.current.lng;

  const filteredStations = useMemo(() => {
    const onlineOnly = stations
      .filter((s) => s.isOnline !== false)
      .map((s) => filterStationForVehicle(s, activeVehicle));
    const withTrueDistance = onlineOnly.map((s) => ({
      ...s,
      distanceKm: calcDistanceKm(
        distanceRefLat,
        distanceRefLng,
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
      if (selectedFilters.length === 0) return true;
      return selectedFilters.every((filter) => {
        if (filter === "P2P_HOME") return s.stationType === "P2P_HOME";
        if (filter === "PUBLIC_DC") return s.stationType === "PUBLIC_DC";
        if (filter === "SOCKET_15A")
          return s.connectorTypes.some((c) => c.toUpperCase().includes("15A"));
        if (filter === "TYPE_2")
          return s.connectorTypes.some((c) => c.toUpperCase().includes("TYPE-2"));
        if (filter === "CCS2")
          return s.connectorTypes.some((c) => c.toUpperCase().includes("CCS2"));
        if (filter === "UNDER_12") return s.pricePerKwh <= 12.0;
        if (filter === "AVAILABLE") return s.isAvailable !== false;
        return true;
      });
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
  }, [
    stations,
    activeVehicle,
    searchQuery,
    selectedFilters,
    distanceRefLat,
    distanceRefLng,
  ]);

  const activeStationIndex = useMemo(() => {
    const idx = filteredStations.findIndex((s) => s.id === selectedStationId);
    return idx >= 0 ? idx : 0;
  }, [filteredStations, selectedStationId]);

  const activeStation = useMemo(() => {
    return (
      filteredStations[activeStationIndex] ||
      filteredStations[0] ||
      stations[0]
    );
  }, [filteredStations, activeStationIndex, stations]);

  const focusStationAtIndex = (index: number, scrollCarousel = true) => {
    const target = filteredStations[index];
    if (!target) return;
    selectStation(target.id);
    setMapCenter({ lat: target.latitude, lng: target.longitude });
    setFocusSeq((s) => s + 1);
    setRouteCoords([]);
    setRouteMeta(null);
    if (scrollCarousel && carouselRef.current) {
      try {
        carouselRef.current.scrollToIndex({ index, animated: true });
      } catch {
        carouselRef.current.scrollToOffset({
          offset: index * STATION_CARD_WIDTH,
          animated: true,
        });
      }
    }
  };

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

  const handleGetDirections = async (targetSt = activeStation) => {
    if (!targetSt) return;
    const originLat = userCoords?.latitude ?? mapCenter.lat;
    const originLng = userCoords?.longitude ?? mapCenter.lng;
    setIsLoadingRoute(true);
    const res = await fetchHybridDirections(
      originLat,
      originLng,
      targetSt.latitude,
      targetSt.longitude
    );
    setRouteCoords(res.coordinates);
    setRouteMeta({
      distanceKm: res.distanceKm,
      durationMins: res.durationMins,
      source: res.source,
    });
    setIsLoadingRoute(false);
    await launchNativeTurnByTurnMaps(
      targetSt.latitude,
      targetSt.longitude,
      targetSt.name
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

  const cycleSheetSnap = () => {
    setSheetSnap((prev) =>
      prev === "peek" ? "half" : prev === "half" ? "full" : "peek"
    );
  };

  // Dynamic FAB offset so recenter & layer buttons always sit above the station sheet
  const fabBottomOffset =
    sheetSnap === "peek" ? 286 : sheetSnap === "half" ? 396 : 478;

  return (
    <View style={styles.container}>
      {/* Fullscreen Interactive Map */}
      <View style={styles.mapWrap}>
        <LeafletMap
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          userCoords={userCoords}
          zoom={16}
          focusSeq={focusSeq}
          activeLayer={mapLayer}
          showsTraffic={showTraffic}
          markers={markers}
          selectedMarkerId={activeStation?.id}
          routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
          onSelectMarker={(id) => {
            const idx = filteredStations.findIndex((s) => s.id === id);
            if (idx >= 0) {
              focusStationAtIndex(idx, true);
            } else {
              selectStation(id);
              const target = stations.find((s) => s.id === id);
              if (target) {
                setMapCenter({ lat: target.latitude, lng: target.longitude });
                setFocusSeq((s) => s + 1);
              }
              setRouteCoords([]);
              setRouteMeta(null);
            }
          }}
          onRegionChangeComplete={handleAutonomousRegionChange}
          onMapPress={handleAutonomousMapPress}
        />
      </View>

      {/* Top Search Bar + Filter Button (Shortened placeholder, controlled spinner, no duplicate layer chips) */}
      <View style={styles.topSearchWrap}>
        <View style={styles.topSearchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Near ${nearbyCity} • Search city or charger...`}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearchingPlaces && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearTouchBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  setSearchQuery("");
                  setPlaceSuggestions([]);
                  setIsSearchingPlaces(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search query"
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterCircleBtn,
              showTraffic && styles.filterCircleBtnActive,
            ]}
            onPress={() => setShowTraffic((prev) => !prev)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Toggle live traffic overlay"
          >
            <SlidersHorizontal
              size={20}
              color={showTraffic ? COLORS.textInverse : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Horizontal Multi-Select Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScrollRow}
        >
          <AppChip
            label="All"
            selected={selectedFilters.length === 0}
            onPress={() => setSelectedFilters([])}
          />
          {MAP_FILTER_CHIPS.map((chip) => (
            <AppChip
              key={chip.key}
              label={chip.label}
              selected={selectedFilters.includes(chip.key)}
              onPress={() => toggleFilterChip(chip.key)}
            />
          ))}
        </ScrollView>

        {/* Smart EV + Town Autocomplete Dropdown */}
        {placeSuggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {placeSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectPlaceSuggestion(item)}
              >
                <View style={styles.suggestionIconBox}>
                  {item.isEvStation ? (
                    <Zap size={16} color={COLORS.primary} />
                  ) : (
                    <MapPin size={16} color={COLORS.textSecondary} />
                  )}
                </View>
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

      {/* Single Map Layer & Recenter Controls Positioned Above Bottom Sheet */}
      <View style={[styles.googleRightFabStack, { bottom: fabBottomOffset }]}>
        <TouchableOpacity
          style={styles.googleRoundFabSmall}
          onPress={() => {
            const nextLayer =
              mapLayer === "standard"
                ? "satellite"
                : mapLayer === "satellite"
                ? "hybrid"
                : "standard";
            setMapLayer(nextLayer);
            setPreferredMapLayer(nextLayer);
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Switch map layer, current layer ${mapLayer}`}
        >
          <Layers
            size={20}
            color={
              mapLayer !== "standard" ? COLORS.primary : COLORS.textPrimary
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.googleLocateMeFab}
          onPress={handleCenterOnUserGps}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Center map on my current location"
        >
          {isLocatingMe ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <LocateFixed size={22} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Horizontal Swipeable Station Sheet with Drag Handle, Snap Points & Page Indicators */}
      {filteredStations.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={carouselRef}
            data={filteredStations}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={STATION_CARD_WIDTH}
            snapToAlignment="center"
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: STATION_CARD_WIDTH,
              offset: STATION_CARD_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const rawIndex = Math.round(
                e.nativeEvent.contentOffset.x / STATION_CARD_WIDTH
              );
              const clampedIndex = Math.max(
                0,
                Math.min(filteredStations.length - 1, rawIndex)
              );
              const target = filteredStations[clampedIndex];
              if (target && target.id !== activeStation?.id) {
                focusStationAtIndex(clampedIndex, false);
              }
            }}
            renderItem={({ item: st, index }) => {
              const isCurrent = st.id === activeStation?.id;
              const specs = st.connectorSpecs || DEFAULT_CONNECTOR_SPECS;
              const hideDist = isOwnStationDistanceHidden(
                st.isUserHosted,
                st.distanceKm
              );

              return (
                <View
                  style={[styles.stationCard, { width: STATION_CARD_WIDTH }]}
                >
                  {/* Drag Handle + Snap Point Toggle */}
                  <TouchableOpacity
                    style={styles.dragHandleTapArea}
                    onPress={cycleSheetSnap}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Bottom sheet size ${sheetSnap}. Tap to resize`}
                  >
                    <View style={styles.dragHandleBar} />
                  </TouchableOpacity>

                  {/* Top Bar: Prev + Page Indicators + Next + Snap Size Toggle */}
                  <View style={styles.carouselTopBar}>
                    <TouchableOpacity
                      disabled={index === 0}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => focusStationAtIndex(index - 1, true)}
                      style={[
                        styles.navArrowBtn,
                        index === 0 && { opacity: 0.3 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Previous station"
                    >
                      <ChevronLeft size={16} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.pageDotsRow}>
                      {filteredStations.slice(0, 10).map((dotSt, dotIdx) => {
                        const isDotActive = dotIdx === index;
                        return (
                          <View
                            key={dotSt.id}
                            style={[
                              styles.pageDot,
                              isDotActive && styles.pageDotActive,
                            ]}
                          />
                        );
                      })}
                    </View>

                    <View style={styles.topBarRightControls}>
                      <TouchableOpacity
                        disabled={index === filteredStations.length - 1}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => focusStationAtIndex(index + 1, true)}
                        style={[
                          styles.navArrowBtn,
                          index === filteredStations.length - 1 && {
                            opacity: 0.3,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Next station"
                      >
                        <ChevronRight size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={cycleSheetSnap}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.snapCycleBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Expand or collapse station sheet"
                      >
                        {sheetSnap === "full" ? (
                          <ChevronDown size={16} color={COLORS.textSecondary} />
                        ) : (
                          <ChevronUp size={16} color={COLORS.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Header: Station Title (2-line safe wrap) + Non-Colliding Distance/Tariff Column */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleCol}>
                      <Text style={styles.stationName} numberOfLines={2}>
                        {st.name}
                      </Text>
                      <Text style={styles.stationAddr} numberOfLines={2}>
                        {st.address}
                      </Text>
                    </View>
                    <View style={styles.cardPriceCol}>
                      {!hideDist && (
                        <Text style={styles.stationDistanceText}>
                          {isCurrent && routeMeta
                            ? `${routeMeta.distanceKm} km`
                            : `${st.distanceKm} km`}
                        </Text>
                      )}
                      <View style={styles.stationTariffPill}>
                        <Text style={styles.stationTariffBadge}>
                          ₹{st.pricePerKwh.toFixed(2)}/kWh
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Rating & Station Type Row */}
                  <View style={styles.ratingRow}>
                    <Star
                      size={14}
                      color={COLORS.warning}
                      fill={COLORS.warning}
                    />
                    <Text style={styles.ratingBold}>
                      {st.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.reviewsMuted} numberOfLines={1}>
                      ({pluralize(st.reviewsCount, "verified review")}) •{" "}
                      {st.stationType === "P2P_HOME"
                        ? `P2P Host (${st.hostName})`
                        : "Public Grid Hub"}
                    </Text>
                    {isCurrent && routeMeta && (
                      <View style={styles.routeEtaBadge}>
                        <Text style={styles.routeEtaText}>
                          {routeMeta.durationMins} min
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Connector Preview Tiles (Visible in "half" and "full" snap states; all 3 fit cleanly without right-edge clipping) */}
                  {sheetSnap !== "peek" && (
                    <View style={styles.plugsPreviewRow}>
                      {specs.map((spec: any) => {
                        const shortTitle = spec.name.includes("CCS2")
                          ? "CCS2 DC"
                          : spec.name.includes("Type-2")
                          ? "Type-2 AC"
                          : "15A Socket";
                        return (
                          <TouchableOpacity
                            key={spec.id}
                            style={styles.plugTile}
                            activeOpacity={0.85}
                            onPress={() => {
                              selectStation(st.id);
                              router.push({
                                pathname: "/(driver)/booking-sheet",
                                params: {
                                  stationId: st.id,
                                  connectorId: spec.id,
                                },
                              });
                            }}
                          >
                            <ConnectorPlugIllustration
                              type={spec.name}
                              size="sm"
                            />
                            <Text style={styles.plugTileName} numberOfLines={1}>
                              {shortTitle}
                            </Text>
                            <Text
                              style={styles.plugTilePrice}
                              numberOfLines={1}
                            >
                              ₹{spec.pricePerKwh.toFixed(2)}/kWh
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Extra Details in "full" snap state */}
                  {sheetSnap === "full" && (
                    <View style={styles.fullDetailsBox}>
                      <View style={styles.fullDetailRow}>
                        <Text style={styles.fullDetailKey}>Max Output</Text>
                        <Text style={styles.fullDetailVal}>
                          {st.maxPowerKw} kW • Verified Grid Supply
                        </Text>
                      </View>
                      <View style={styles.fullDetailRow}>
                        <Text style={styles.fullDetailKey}>Host / Operator</Text>
                        <Text style={styles.fullDetailVal}>{st.hostName}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.inlineCallBtn}
                        onPress={() =>
                          launchNativePhoneCall(
                            st.hostPhone || "+9118002098282"
                          )
                        }
                      >
                        <Phone size={14} color={COLORS.primary} />
                        <Text style={styles.inlineCallTxt}>
                          Call Station Operator
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Bottom Action Buttons: Safely Padded & Equal Flex Width (Never Clipped) */}
                  <View style={styles.actionsRow}>
                    <AppButton
                      label="Directions"
                      variant="secondary"
                      size="md"
                      loading={isLoadingRoute && isCurrent}
                      style={{ flex: 1 }}
                      icon={<Navigation size={16} color={COLORS.primary} />}
                      onPress={() => {
                        selectStation(st.id);
                        void handleGetDirections(st);
                      }}
                    />

                    <AppButton
                      label="Book Slot"
                      variant="primary"
                      size="md"
                      style={{ flex: 1 }}
                      icon={<Zap size={16} color={COLORS.textInverse} />}
                      onPress={() => {
                        selectStation(st.id);
                        router.push({
                          pathname: "/(driver)/booking-sheet",
                          params: { stationId: st.id },
                        });
                      }}
                    />
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Empty State when no stations match active filters */}
      {filteredStations.length === 0 && (
        <View style={styles.carouselContainer}>
          <EmptyState
            icon={<MapPin size={24} color={COLORS.primary} />}
            title="No chargers match filters"
            subtitle="Clear active filter chips or pan the map to discover nearby stations."
            ctaLabel="Reset Filters"
            onPressCta={() => {
              setSelectedFilters([]);
              setSearchQuery("");
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  topSearchWrap: {
    position: "absolute",
    top: 16,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
    zIndex: 25,
  },
  topSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  searchPill: {
    flex: 1,
    height: 50,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level2,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  clearTouchBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.level2,
  },
  filterCircleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipsScrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: SPACING.xs,
    paddingBottom: 4,
  },
  suggestionsDropdown: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  suggestionSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  evTagPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  evTagText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  googleRightFabStack: {
    position: "absolute",
    right: SPACING.screenMargin,
    alignItems: "center",
    gap: SPACING.xs,
    zIndex: 40,
  },
  googleRoundFabSmall: {
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
  googleLocateMeFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level2,
  },
  carouselContainer: {
    position: "absolute",
    left: CARD_HORIZONTAL_MARGIN,
    right: CARD_HORIZONTAL_MARGIN,
    bottom: 94,
    zIndex: 30,
  },
  stationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadiusLarge,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: SPACING.cardPadding,
    paddingTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...ELEVATION.level2,
  },
  dragHandleTapArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
  },
  carouselTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  snapCycleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderStrong,
  },
  pageDotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  cardTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  cardPriceCol: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  stationName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  stationAddr: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stationDistanceText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stationTariffPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  stationTariffBadge: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    marginBottom: SPACING.sm,
  },
  ratingBold: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  reviewsMuted: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  routeEtaBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
  },
  routeEtaText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  plugsPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  plugTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plugTileName: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  plugTilePrice: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
    marginTop: 1,
  },
  fullDetailsBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fullDetailKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  fullDetailVal: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  inlineCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inlineCallTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    paddingHorizontal: SPACING.screenMargin,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalSectionLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: 4,
  },
  filterOptBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterOptBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterOptText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  trafficRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
});
