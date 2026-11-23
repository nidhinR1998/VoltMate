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
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  ShieldCheck,
  Clock,
  Wifi,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  DEFAULT_CONNECTOR_SPECS,
  applyStationFilters,
  countActiveStationFilters,
  ConnectorFilterKey,
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
  isOwnStationDistanceHidden,
} from "../../theme/tokens";
import {
  AppButton,
  AppChip,
  AppToggle,
  BottomSheet,
  EmptyState,
} from "../../components/ui/DesignSystem";

type FilterChipKey =
  | "P2P_HOME"
  | "PUBLIC_DC"
  | "CCS2"
  | "TYPE_2"
  | "SOCKET_15A"
  | "POWER_22"
  | "UNDER_12"
  | "AVAILABLE";

const MAP_FILTER_CHIPS: ReadonlyArray<{
  key: FilterChipKey;
  label: string;
}> = [
  { key: "P2P_HOME", label: "P2P Host" },
  { key: "PUBLIC_DC", label: "Public" },
  { key: "CCS2", label: "CCS2" },
  { key: "TYPE_2", label: "Type-2" },
  { key: "SOCKET_15A", label: "15A" },
  { key: "POWER_22", label: "22+ kW" },
  { key: "UNDER_12", label: "≤ ₹12/kWh" },
  { key: "AVAILABLE", label: "Available now" },
];

type SheetSnapPoint = "peek" | "half" | "full";

type SmartSearchItem = PlaceSuggestion & {
  isEvStation?: boolean;
  stationId?: string;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_MARGIN = SPACING.screenMargin;
const CARD_GAP = 10;
// Horizontal swipeable card list that peeks the next card by 18dp
const STATION_CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2 - 18;
const SNAP_INTERVAL = STATION_CARD_WIDTH + CARD_GAP;

const SHEET_HEIGHT_BY_SNAP: Record<SheetSnapPoint, number> = {
  peek: 214,
  half: 344,
  full: 452,
};

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
    setLocationState,
    stationFilters,
    setStationFilters,
    toggleConnectorFilter,
    resetStationFilters,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [mapLayer, setMapLayer] = useState<"standard" | "satellite" | "hybrid">(
    preferredMapLayer
  );
  const [showTraffic, setShowTraffic] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnapPoint>("peek");

  const sheetBottomBase = Platform.OS === "ios" ? 94 : 88;
  const currentSheetHeight = SHEET_HEIGHT_BY_SNAP[sheetSnap];

  // Animated values so locate-me & layers controls move smoothly with the sheet and fade out when expanded beyond half
  const fabBottomAnim = useRef(
    new Animated.Value(sheetBottomBase + SHEET_HEIGHT_BY_SNAP.peek + 16)
  ).current;
  const fabOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const targetBottom = sheetBottomBase + SHEET_HEIGHT_BY_SNAP[sheetSnap] + 16;
    const targetOpacity = sheetSnap === "full" ? 0 : 1;
    Animated.parallel([
      Animated.spring(fabBottomAnim, {
        toValue: targetBottom,
        useNativeDriver: false,
        damping: 20,
        stiffness: 180,
      }),
      Animated.timing(fabOpacityAnim, {
        toValue: targetOpacity,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [sheetSnap, sheetBottomBase, fabBottomAnim, fabOpacityAnim]);

  const activeFilterCount = useMemo(
    () => countActiveStationFilters(stationFilters),
    [stationFilters]
  );

  const isChipSelected = (key: FilterChipKey): boolean => {
    switch (key) {
      case "P2P_HOME":
        return stationFilters.stationType === "P2P_HOME";
      case "PUBLIC_DC":
        return stationFilters.stationType === "PUBLIC_DC";
      case "CCS2":
      case "TYPE_2":
      case "SOCKET_15A":
        return stationFilters.connectorTypes.includes(key);
      case "POWER_22":
        return stationFilters.minPowerKw === 22;
      case "UNDER_12":
        return stationFilters.maxPriceInr === 12;
      case "AVAILABLE":
        return stationFilters.availableNow;
    }
  };

  const toggleFilterChip = (key: FilterChipKey) => {
    switch (key) {
      case "P2P_HOME":
        setStationFilters({
          stationType:
            stationFilters.stationType === "P2P_HOME" ? "ALL" : "P2P_HOME",
        });
        break;
      case "PUBLIC_DC":
        setStationFilters({
          stationType:
            stationFilters.stationType === "PUBLIC_DC" ? "ALL" : "PUBLIC_DC",
        });
        break;
      case "CCS2":
      case "TYPE_2":
      case "SOCKET_15A":
        toggleConnectorFilter(key as ConnectorFilterKey);
        break;
      case "POWER_22":
        setStationFilters({
          minPowerKw: stationFilters.minPowerKw === 22 ? null : 22,
        });
        break;
      case "UNDER_12":
        setStationFilters({
          maxPriceInr: stationFilters.maxPriceInr === 12 ? null : 12,
        });
        break;
      case "AVAILABLE":
        setStationFilters({
          availableNow: !stationFilters.availableNow,
        });
        break;
    }
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
              (lastKnown.coords.accuracy ?? 50) > 1200
                ? "LOW_ACCURACY"
                : "READY",
              lastKnown.coords
            );
            void executeSafeStationScan(fastLat, fastLng, 25);
          }

          const freshPos = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 2500)
            ),
          ]);
          if (mounted && freshPos?.coords) {
            const preciseLat = freshPos.coords.latitude;
            const preciseLng = freshPos.coords.longitude;
            setUserCoords({ latitude: preciseLat, longitude: preciseLng });
            setMapCenter({ lat: preciseLat, lng: preciseLng });
            setFocusSeq((s) => s + 1);
            setLocationState(
              (freshPos.coords.accuracy ?? 50) > 1200
                ? "LOW_ACCURACY"
                : "READY",
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

  // Shared Single-Source Station Filtering: updates pins, sheet list, counts, and camera
  const filteredStations = useMemo(() => {
    const withTrueDistance = stations.map((s) => {
      const d = calcDistanceKm(
        distanceRefLat,
        distanceRefLng,
        s.latitude,
        s.longitude
      );
      return {
        ...s,
        distanceKm: d,
        etaMins: Math.max(2, Math.round(d * 2.2)),
      };
    });

    const regionalPool = withTrueDistance
      .filter((s) => s.distanceKm <= 45)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const baseList =
      regionalPool.length > 0
        ? regionalPool
        : [...withTrueDistance].sort((a, b) => a.distanceKm - b.distanceKm);

    return applyStationFilters(
      baseList,
      stationFilters,
      activeVehicle,
      searchQuery
    );
  }, [
    stations,
    activeVehicle,
    searchQuery,
    stationFilters,
    distanceRefLat,
    distanceRefLng,
  ]);

  // Fit/center camera when filter criteria change so matching pins sit in the visible area above the sheet
  const filterSignature = JSON.stringify(stationFilters);
  useEffect(() => {
    if (filteredStations.length > 0) {
      const target =
        filteredStations.find((s) => s.id === selectedStationId) ||
        filteredStations[0];
      if (target) {
        selectStation(target.id);
        setMapCenter({ lat: target.latitude, lng: target.longitude });
        setFocusSeq((s) => s + 1);
      }
    }
  }, [filterSignature]);

  const activeStationIndex = useMemo(() => {
    const idx = filteredStations.findIndex((s) => s.id === selectedStationId);
    return idx >= 0 ? idx : 0;
  }, [filteredStations, selectedStationId]);

  const activeStation = useMemo(() => {
    return filteredStations[activeStationIndex] || filteredStations[0] || null;
  }, [filteredStations, activeStationIndex]);

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
          offset: index * SNAP_INTERVAL,
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
    setFocusSeq((s) => s + 1);
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

  return (
    <View style={styles.container}>
      {/* Fullscreen Interactive Map with Top & Bottom Camera Padding */}
      <View style={styles.mapWrap}>
        <LeafletMap
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          userCoords={userCoords}
          zoom={15}
          focusSeq={focusSeq}
          activeLayer={mapLayer}
          showsTraffic={showTraffic}
          topPadding={136}
          bottomPadding={currentSheetHeight + 104}
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

      {/* Top Search Bar + Filter Button + Horizontal Filter Chips Row */}
      <View style={styles.topSearchWrap} pointerEvents="box-none">
        <View style={styles.topSearchRow}>
          <View style={styles.searchPill}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or charger"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              numberOfLines={1}
            />
            {searchQuery.length === 0 && (
              <View style={styles.nearCityChip}>
                <MapPin size={11} color={COLORS.primary} />
                <Text
                  style={styles.nearCityChipText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  Near {nearbyCity}
                </Text>
              </View>
            )}
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
              activeFilterCount > 0 && styles.filterCircleBtnActive,
            ]}
            onPress={() => setFilterSheetVisible(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open charger filters${
              activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""
            }`}
          >
            <SlidersHorizontal
              size={20}
              color={
                activeFilterCount > 0 ? COLORS.textInverse : COLORS.textPrimary
              }
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text
                  style={styles.filterCountBadgeText}
                  maxFontSizeMultiplier={1.1}
                >
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Horizontal Filter Chips Row with Left Padding 20 and Right-Edge Fade */}
        <View style={styles.chipsScrollOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.filterChipsScrollRow}
          >
            <AppChip
              label="All"
              selected={activeFilterCount === 0}
              onPress={() => resetStationFilters()}
            />
            {MAP_FILTER_CHIPS.map((chip) => (
              <AppChip
                key={chip.key}
                label={chip.label}
                selected={isChipSelected(chip.key)}
                onPress={() => toggleFilterChip(chip.key)}
              />
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(244, 247, 245, 0)", "rgba(244, 247, 245, 0.92)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.chipsRightFade}
            pointerEvents="none"
          />
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

      {/* Map Layer & Locate-Me Controls Positioned Above Sheet (fades out when sheet expanded beyond half) */}
      <Animated.View
        pointerEvents={sheetSnap === "full" ? "none" : "box-none"}
        style={[
          styles.googleRightFabStack,
          {
            bottom: fabBottomAnim,
            opacity: fabOpacityAnim,
          },
        ]}
      >
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
      </Animated.View>

      {/* Bottom Horizontal Swipeable Station Sheet (Peek / Half / Full snap points, transparent container) */}
      {filteredStations.length > 0 && (
        <View
          style={[
            styles.carouselContainer,
            {
              bottom: sheetBottomBase,
              zIndex: sheetSnap === "full" ? 55 : 42,
            },
          ]}
          pointerEvents="box-none"
        >
          <FlatList
            ref={carouselRef}
            data={filteredStations}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.carouselListContent}
            getItemLayout={(_, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const rawIndex = Math.round(
                e.nativeEvent.contentOffset.x / SNAP_INTERVAL
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
              const hasRealReviews = st.reviewsCount > 0 && st.rating > 0;
              const hostRoleLabel =
                st.stationType === "P2P_HOME"
                  ? `${st.hostName} • Home host`
                  : `${st.hostName} • Public station`;
              const distDisplay =
                isCurrent && routeMeta
                  ? `${routeMeta.distanceKm} km • ${routeMeta.durationMins} min`
                  : `${st.distanceKm.toFixed(1)} km • ${st.etaMins} min`;

              return (
                <View
                  style={[
                    styles.stationCard,
                    {
                      width: STATION_CARD_WIDTH,
                      marginRight: CARD_GAP,
                    },
                  ]}
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

                  {/* Top Bar: Status Dot + Counter ("3 of 12") + Prev/Next/Expand */}
                  <View style={styles.carouselTopBar}>
                    <View style={styles.availabilityStatusRow}>
                      <View
                        style={[
                          styles.statusLiveDot,
                          {
                            backgroundColor:
                              st.isAvailable !== false
                                ? COLORS.emerald500
                                : COLORS.warning,
                          },
                        ]}
                      />
                      <Text
                        style={styles.availabilityStatusText}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.2}
                      >
                        {st.isAvailable !== false ? "Available now" : "Busy"}
                      </Text>
                    </View>

                    <View style={styles.topBarRightControls}>
                      <TouchableOpacity
                        disabled={index === 0}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => focusStationAtIndex(index - 1, true)}
                        style={[
                          styles.navArrowBtn,
                          index === 0 && { opacity: 0.35 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Previous station"
                      >
                        <ChevronLeft size={15} color={COLORS.textPrimary} />
                      </TouchableOpacity>

                      <Text
                        style={styles.pageCounterText}
                        maxFontSizeMultiplier={1.2}
                      >
                        {index + 1} of {filteredStations.length}
                      </Text>

                      <TouchableOpacity
                        disabled={index === filteredStations.length - 1}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => focusStationAtIndex(index + 1, true)}
                        style={[
                          styles.navArrowBtn,
                          index === filteredStations.length - 1 && {
                            opacity: 0.35,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Next station"
                      >
                        <ChevronRight size={15} color={COLORS.textPrimary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={cycleSheetSnap}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.snapCycleBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Expand or collapse station sheet"
                      >
                        {sheetSnap === "full" ? (
                          <ChevronDown size={15} color={COLORS.textSecondary} />
                        ) : (
                          <ChevronUp size={15} color={COLORS.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Station Name */}
                  <Text
                    style={styles.stationName}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {st.name}
                  </Text>

                  {/* Peek Meta Row: Distance + ETA Chip, Rating (or "New" with no stars), Price Chip (shown once) */}
                  <View style={styles.peekChipsRow}>
                    {!hideDist && (
                      <View style={styles.metaChip}>
                        <Navigation size={11} color={COLORS.primary} />
                        <Text
                          style={styles.metaChipText}
                          maxFontSizeMultiplier={1.2}
                        >
                          {distDisplay}
                        </Text>
                      </View>
                    )}

                    {hasRealReviews ? (
                      <View style={styles.metaChip}>
                        <Star
                          size={11}
                          color={COLORS.warning}
                          fill={COLORS.warning}
                        />
                        <Text
                          style={styles.metaChipText}
                          maxFontSizeMultiplier={1.2}
                        >
                          {st.rating.toFixed(1)} ({st.reviewsCount})
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.newBadgeChip}>
                        <Text
                          style={styles.newBadgeChipText}
                          maxFontSizeMultiplier={1.2}
                        >
                          New
                        </Text>
                      </View>
                    )}

                    <View style={styles.stationTariffPill}>
                      <Text
                        style={styles.stationTariffBadge}
                        maxFontSizeMultiplier={1.2}
                      >
                        ₹{st.pricePerKwh.toFixed(2)}/kWh
                      </Text>
                    </View>
                  </View>

                  {/* Peek Mode: Compact Connector Icon Chips (Price shown once above) */}
                  {sheetSnap === "peek" && (
                    <View style={styles.peekConnectorsRow}>
                      {specs.slice(0, 3).map((spec: any) => {
                        const shortConn = spec.name
                          .toUpperCase()
                          .includes("CCS")
                          ? "CCS2"
                          : spec.name.toUpperCase().includes("TYPE")
                          ? "Type-2"
                          : "15A";
                        return (
                          <View
                            key={spec.id}
                            style={styles.peekConnectorIconChip}
                          >
                            <Zap size={11} color={COLORS.primary} />
                            <Text
                              style={styles.peekConnectorIconText}
                              maxFontSizeMultiplier={1.2}
                            >
                              {shortConn} • {spec.powerKw} kW
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Half & Full Mode: Compact Hero Banner + Connector Selector Cards + Host Row */}
                  {sheetSnap !== "peek" && (
                    <View style={styles.expandedSectionWrap}>
                      {/* Gallery / Hero Placeholder Banner with Amenity Chips */}
                      <View style={styles.heroBannerStrip}>
                        <View style={styles.heroBannerLeft}>
                          <Zap size={16} color={COLORS.primary} />
                          <Text
                            style={styles.heroBannerTitle}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                          >
                            {st.stationType === "P2P_HOME"
                              ? "P2P Host Charger"
                              : "Public Charging Station"}
                          </Text>
                        </View>
                        <View style={styles.amenityChipsInline}>
                          <View style={styles.amenityMiniChip}>
                            <ShieldCheck size={11} color={COLORS.primary} />
                            <Text style={styles.amenityMiniText}>Verified</Text>
                          </View>
                          <View style={styles.amenityMiniChip}>
                            <Clock size={11} color={COLORS.primary} />
                            <Text style={styles.amenityMiniText}>24×7</Text>
                          </View>
                          <View style={styles.amenityMiniChip}>
                            <Wifi size={11} color={COLORS.primary} />
                            <Text style={styles.amenityMiniText}>Live</Text>
                          </View>
                        </View>
                      </View>

                      {/* Compact Horizontal Connector Selector Cards (Transparent Plug Background, Price Not Duplicated) */}
                      <View style={styles.plugsPreviewRow}>
                        {specs.map((spec: any) => {
                          const shortTitle = spec.name
                            .toUpperCase()
                            .includes("CCS")
                            ? "CCS2 DC"
                            : spec.name.toUpperCase().includes("TYPE")
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
                              accessibilityRole="button"
                              accessibilityLabel={`Select ${shortTitle} ${spec.powerKw} kilowatt connector`}
                            >
                              <ConnectorPlugIllustration
                                type={spec.name}
                                size="sm"
                              />
                              <View style={styles.plugTileTextCol}>
                                <Text
                                  style={styles.plugTileName}
                                  numberOfLines={1}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {shortTitle}
                                </Text>
                                <Text
                                  style={styles.plugTilePower}
                                  numberOfLines={1}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {spec.powerKw} kW
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Host / Operator Row with Avatar + Role + Call Icon */}
                      <View style={styles.hostOperatorRow}>
                        <View style={styles.hostAvatarCircle}>
                          <Text style={styles.hostAvatarInitial}>
                            {(st.hostName || "V").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={styles.hostRoleTitle}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                          >
                            {hostRoleLabel}
                          </Text>
                          <Text
                            style={styles.stationAddr}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                          >
                            {st.address}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Full Mode: Spec Info as Chips Instead of a Table */}
                  {sheetSnap === "full" && (
                    <View style={styles.specChipsRow}>
                      <View style={styles.specInfoChip}>
                        <Zap size={12} color={COLORS.primary} />
                        <Text style={styles.specInfoChipText}>
                          {st.maxPowerKw} kW Max Output
                        </Text>
                      </View>
                      <View style={styles.specInfoChip}>
                        <ShieldCheck size={12} color={COLORS.primary} />
                        <Text style={styles.specInfoChipText}>
                          {st.stationType === "P2P_HOME"
                            ? "P2P Home Host Supply"
                            : `${st.discomBoard || "KSEB"} Grid Supply`}
                        </Text>
                      </View>
                      <View style={styles.specInfoChip}>
                        <Clock size={12} color={COLORS.primary} />
                        <Text style={styles.specInfoChipText}>
                          Instant Slot Booking
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ONE Action Row: [Directions] [Book Slot] + Call Icon Button */}
                  <View style={styles.actionsRow}>
                    <AppButton
                      label="Directions"
                      variant="secondary"
                      size="md"
                      loading={isLoadingRoute && isCurrent}
                      style={{ flex: 1 }}
                      icon={<Navigation size={15} color={COLORS.primary} />}
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
                      icon={<Zap size={15} color={COLORS.textInverse} />}
                      onPress={() => {
                        selectStation(st.id);
                        router.push({
                          pathname: "/(driver)/booking-sheet",
                          params: { stationId: st.id },
                        });
                      }}
                    />

                    <TouchableOpacity
                      style={styles.callIconBtn}
                      onPress={() =>
                        launchNativePhoneCall(st.hostPhone || "+9118002098282")
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${st.hostName}`}
                    >
                      <Phone size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Empty Result State when no stations match active filters */}
      {filteredStations.length === 0 && (
        <View
          style={[
            styles.emptyOverlayContainer,
            { bottom: sheetBottomBase + 8 },
          ]}
        >
          <EmptyState
            icon={<MapPin size={24} color={COLORS.primary} />}
            title="No chargers match — Clear filters"
            subtitle="Reset active filters or pan the map to discover nearby stations."
            ctaLabel="Clear filters"
            onPressCta={() => {
              resetStationFilters();
              setSearchQuery("");
            }}
          />
        </View>
      )}

      {/* Full Filter Bottom Sheet (Shared State with Chips Row, Map Pins, Sheet List & Home Nearby) */}
      <BottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filter Chargers"
        subtitle={`${filteredStations.length} matching ${
          filteredStations.length === 1 ? "station" : "stations"
        } near ${nearbyCity}`}
      >
        <View style={styles.filterSheetBody}>
          {/* Connector Type (Multi-select) */}
          <Text style={styles.filterSectionLabel}>Connector Type</Text>
          <View style={styles.filterChipGroup}>
            {(
              [
                { key: "CCS2", label: "CCS2 DC" },
                { key: "TYPE_2", label: "Type-2 AC" },
                { key: "SOCKET_15A", label: "15A Socket" },
              ] as const
            ).map((c) => (
              <AppChip
                key={c.key}
                label={c.label}
                selected={stationFilters.connectorTypes.includes(c.key)}
                onPress={() => toggleConnectorFilter(c.key)}
              />
            ))}
          </View>

          {/* Station Type (All / P2P Host / Public) */}
          <Text style={styles.filterSectionLabel}>Station Type</Text>
          <View style={styles.filterChipGroup}>
            {(
              [
                { key: "ALL", label: "All Stations" },
                { key: "P2P_HOME", label: "P2P Host" },
                { key: "PUBLIC_DC", label: "Public Station" },
              ] as const
            ).map((stType) => (
              <AppChip
                key={stType.key}
                label={stType.label}
                selected={stationFilters.stationType === stType.key}
                onPress={() =>
                  setStationFilters({
                    stationType: stType.key,
                  })
                }
              />
            ))}
          </View>

          {/* Minimum Power */}
          <Text style={styles.filterSectionLabel}>Minimum Power</Text>
          <View style={styles.filterChipGroup}>
            {(
              [
                { kw: null, label: "Any" },
                { kw: 7.4, label: "7.4+ kW" },
                { kw: 22, label: "22+ kW" },
                { kw: 50, label: "50+ kW" },
              ] as const
            ).map((p) => (
              <AppChip
                key={String(p.kw)}
                label={p.label}
                selected={stationFilters.minPowerKw === p.kw}
                onPress={() =>
                  setStationFilters({
                    minPowerKw: p.kw,
                  })
                }
              />
            ))}
          </View>

          {/* Max Price */}
          <Text style={styles.filterSectionLabel}>Max Price (₹/kWh)</Text>
          <View style={styles.filterChipGroup}>
            {(
              [
                { price: null, label: "Any Price" },
                { price: 10, label: "≤ ₹10/kWh" },
                { price: 12, label: "≤ ₹12/kWh" },
                { price: 15, label: "≤ ₹15/kWh" },
              ] as const
            ).map((pr) => (
              <AppChip
                key={String(pr.price)}
                label={pr.label}
                selected={stationFilters.maxPriceInr === pr.price}
                onPress={() =>
                  setStationFilters({
                    maxPriceInr: pr.price,
                  })
                }
              />
            ))}
          </View>

          {/* Available Now + Live Traffic Toggles */}
          <View style={styles.filterToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterToggleTitle}>Available now</Text>
              <Text style={styles.filterToggleSub}>
                Show only stations with free charging bays
              </Text>
            </View>
            <AppToggle
              value={stationFilters.availableNow}
              onValueChange={(val) =>
                setStationFilters({
                  availableNow: val,
                })
              }
              accessibilityLabel="Filter available chargers now"
            />
          </View>

          <View style={styles.filterToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterToggleTitle}>Live road traffic</Text>
              <Text style={styles.filterToggleSub}>
                Overlay traffic congestion on the map
              </Text>
            </View>
            <AppToggle
              value={showTraffic}
              onValueChange={setShowTraffic}
              accessibilityLabel="Toggle live road traffic overlay"
            />
          </View>

          <View style={styles.filterSheetFooterRow}>
            <AppButton
              label="Clear all"
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              onPress={() => {
                resetStationFilters();
                setSearchQuery("");
              }}
            />
            <AppButton
              label={`Apply (${filteredStations.length})`}
              variant="primary"
              size="md"
              style={{ flex: 1 }}
              onPress={() => setFilterSheetVisible(false)}
            />
          </View>
        </View>
      </BottomSheet>
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
    top: 14,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.screenMargin,
  },
  searchPill: {
    flex: 1,
    height: 48,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    ...ELEVATION.level2,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  nearCityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 128,
  },
  nearCityChipText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  clearTouchBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.level2,
  },
  filterCircleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterCountBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.volt,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  filterCountBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.ink,
  },
  chipsScrollOuter: {
    position: "relative",
    marginTop: 8,
  },
  filterChipsScrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: SPACING.screenMargin,
    paddingRight: SPACING.screenMargin + 20,
    paddingVertical: 2,
  },
  chipsRightFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  suggestionsDropdown: {
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.screenMargin,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    paddingVertical: 6,
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
    zIndex: 35,
  },
  googleRoundFabSmall: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.level2,
  },
  googleLocateMeFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...ELEVATION.level2,
  },
  carouselContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  carouselListContent: {
    paddingLeft: CARD_HORIZONTAL_MARGIN,
    paddingRight: CARD_HORIZONTAL_MARGIN - CARD_GAP,
  },
  emptyOverlayContainer: {
    position: "absolute",
    left: CARD_HORIZONTAL_MARGIN,
    right: CARD_HORIZONTAL_MARGIN,
    zIndex: 45,
    backgroundColor: "transparent",
  },
  stationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadiusLarge,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: 14,
    paddingTop: 6,
    overflow: "hidden",
    borderWidth: 0,
    ...ELEVATION.level2,
  },
  dragHandleTapArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
  },
  carouselTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  availabilityStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityStatusText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  topBarRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageCounterText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    paddingHorizontal: 2,
  },
  navArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  snapCycleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  stationName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  peekChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  newBadgeChip: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeChipText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  stationTariffPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stationTariffBadge: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  peekConnectorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  peekConnectorIconChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  peekConnectorIconText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  expandedSectionWrap: {
    gap: 8,
    marginBottom: 10,
  },
  heroBannerStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  heroBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  heroBannerTitle: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  amenityChipsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  amenityMiniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityMiniText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  plugsPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  plugTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  plugTileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  plugTileName: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  plugTilePower: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  hostOperatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  hostAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarInitial: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  hostRoleTitle: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  stationAddr: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  specChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  specInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specInfoChipText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  callIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSheetBody: {
    gap: 10,
    paddingBottom: 8,
  },
  filterSectionLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterChipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 12,
  },
  filterToggleTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  filterToggleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  filterSheetFooterRow: {
    flexDirection: "row",
    gap: 10,
  },
});
