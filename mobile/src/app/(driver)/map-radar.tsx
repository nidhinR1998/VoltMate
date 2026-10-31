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
import { launchNativeTurnByTurnMaps } from "../../services/notificationService";

type FilterCategory =
  | "ALL"
  | "P2P_HOME"
  | "PUBLIC_DC"
  | "SOCKET_15A"
  | "TYPE_2"
  | "CCS2"
  | "UNDER_12";

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

  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>(
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

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 10.0159,
    lng: 76.3419,
  });
  const [isScanningLive, setIsScanningLive] = useState(false);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 100% Autonomous GPS Lock + Silent Background Heartbeat (Zero Manual Refresh Buttons)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsScanningLive(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted" && mounted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mounted && pos?.coords) {
            setMapCenter({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            await syncLiveStationsForRegion(
              pos.coords.latitude,
              pos.coords.longitude,
              25
            );
            setIsScanningLive(false);
            return;
          }
        }
      } catch {
        // fallback to default Kochi center
      }
      if (mounted) {
        await syncLiveStationsForRegion(10.0159, 76.3419, 25);
        setIsScanningLive(false);
      }
    })();

    const heartbeat = setInterval(() => {
      syncLiveStationsForRegion(mapCenter.lat, mapCenter.lng, 25);
    }, 20000);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    };
  }, []);

  const handleAutonomousRegionChange = (lat: number, lng: number) => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(async () => {
      setIsScanningLive(true);
      await syncLiveStationsForRegion(lat, lng, 25);
      setIsScanningLive(false);
    }, 550);
  };

  const handleAutonomousMapPress = async (lat: number, lng: number) => {
    setSearchQuery("");
    setPlaceSuggestions([]);
    setRouteCoords([]);
    setRouteMeta(null);
    setMapCenter({ lat, lng });
    setIsScanningLive(true);
    await syncLiveStationsForRegion(lat, lng, 25);
    setIsScanningLive(false);
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      const results = await searchPlacesHybrid(
        q,
        mapCenter.lat,
        mapCenter.lng
      );
      setPlaceSuggestions(results);
      setIsSearchingPlaces(false);
    }, 320);
    return () => clearTimeout(timer);
  }, [searchQuery, mapCenter.lat, mapCenter.lng]);

  const filteredStations = useMemo(() => {
    const onlineOnly = stations.filter((s) => s.isOnline !== false);
    const byCategory = onlineOnly.filter((s) => {
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
    // Keep current regional markers visible while typing a town name in the autocomplete bar
    return textMatches.length > 0 ? textMatches : byCategory;
  }, [stations, searchQuery, filterCategory]);

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
    setIsLoadingRoute(true);
    const res = await fetchHybridDirections(
      mapCenter.lat,
      mapCenter.lng,
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

  const handleSelectPlaceSuggestion = async (place: PlaceSuggestion) => {
    setSearchQuery("");
    setPlaceSuggestions([]);
    setRouteCoords([]);
    setRouteMeta(null);
    setMapCenter({ lat: place.latitude, lng: place.longitude });
    setIsScanningLive(true);
    await syncLiveStationsForRegion(place.latitude, place.longitude, 25);
    setIsScanningLive(false);
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
          zoom={14}
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
              placeholder="Search town or station (Payyanur, Kannur, Lulu...)"
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

        {/* Hybrid Place Autocomplete Dropdown */}
        {placeSuggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {placeSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectPlaceSuggestion(item)}
              >
                <Text style={styles.suggestionPin}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

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
                { key: "ALL", label: "All Kochi & Highway Stations" },
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
    fontWeight: "700",
    color: "#096B30",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  getDirectionOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E0E4E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  getDirectionOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  bookGreenBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#05E660",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bookGreenBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C857F",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  filterOptBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    marginBottom: 8,
  },
  filterOptBtnActive: {
    borderWidth: 1.5,
    borderColor: "#16B374",
    backgroundColor: "#EAFBF0",
  },
  filterOptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: "900",
    color: "#151C18",
  },
  trafficRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  trafficToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
  },
  trafficToggleActive: {
    backgroundColor: "#05E660",
  },
  trafficToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B746E",
  },
  trafficToggleTextActive: {
    color: "#151C18",
  },
  doneBtn: {
    backgroundColor: "#151C18",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
