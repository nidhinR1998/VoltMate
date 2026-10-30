import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Modal,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  SlidersHorizontal,
  Star,
  X,
  Route,
  Zap,
  MapPin,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  LeafletMap,
  MapLayerMode,
  MapStationMarker,
} from "../../components/map/LeafletMap";
import { ConnectorPlugIllustration } from "../../components/ui/EvVisuals";
import {
  searchPlacesAutocomplete,
  PlaceSuggestion,
} from "../../services/routingEngine";

interface StationRecord extends MapStationMarker {
  address: string;
  rating: number;
  reviews: number;
  driveMins: number;
  connectors: string[];
  priceDisplay: string;
}

const DISCOVERY_STATIONS: StationRecord[] = [
  {
    id: "st-pall-mall",
    title: "Pall Mall Station",
    address: "1 White Hall Palace, Street 5, Kakkanad",
    latitude: 10.0168,
    longitude: 76.3422,
    pricePerKwh: 10.0,
    priceDisplay: "$1.00/ kWh",
    powerKw: 50.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 1,
    driveMins: 3,
    rating: 4.5,
    reviews: 56,
    connectors: ["Type A", "CHAdeMO", "Type B"],
  },
  {
    id: "st-spark-ev",
    title: "Spark EV Station",
    address: "14 Seaport-Airport Ave, Infopark Phase 1",
    latitude: 10.0225,
    longitude: 76.3365,
    pricePerKwh: 8.5,
    priceDisplay: "$0.75/ kWh",
    powerKw: 22.0,
    status: "AVAILABLE",
    nodeType: "P2P_HOME",
    distanceKm: 1.2,
    driveMins: 4,
    rating: 4.8,
    reviews: 84,
    connectors: ["Type A", "Type B", "CHAdeMO"],
  },
  {
    id: "st-infopark-hub",
    title: "Infopark Green Plaza",
    address: "Gate 2, Infopark Expressway, Kochi",
    latitude: 10.0232,
    longitude: 76.3468,
    pricePerKwh: 12.0,
    priceDisplay: "$0.90/ kWh",
    powerKw: 60.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 2,
    driveMins: 5,
    rating: 4.7,
    reviews: 112,
    connectors: ["Type B", "CHAdeMO", "Type A"],
  },
  {
    id: "st-sadar-road",
    title: "Sadar Road Supercharge",
    address: "88 Sadar Road Junction, Edappally",
    latitude: 10.0132,
    longitude: 76.3492,
    pricePerKwh: 9.5,
    priceDisplay: "$0.80/ kWh",
    powerKw: 30.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 2.5,
    driveMins: 6,
    rating: 4.6,
    reviews: 43,
    connectors: ["Type A", "CHAdeMO", "Type B"],
  },
  {
    id: "st-lotus-villa",
    title: "Lotus Enclave EV Spot",
    address: "Villa 14, West Avenue, Kakkanad",
    latitude: 10.0108,
    longitude: 76.3352,
    pricePerKwh: 7.5,
    priceDisplay: "$0.50/ kWh",
    powerKw: 7.4,
    status: "AVAILABLE",
    nodeType: "P2P_HOME",
    distanceKm: 3,
    driveMins: 7,
    rating: 4.9,
    reviews: 68,
    connectors: ["Type A", "Type B", "CHAdeMO"],
  },
  {
    id: "st-stadium-hub",
    title: "Stadium Corridor Hub",
    address: "Tangail Stadium South Gate, Kaloor",
    latitude: 10.0095,
    longitude: 76.3435,
    pricePerKwh: 11.0,
    priceDisplay: "$0.85/ kWh",
    powerKw: 50.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: 3.5,
    driveMins: 8,
    rating: 4.4,
    reviews: 39,
    connectors: ["CHAdeMO", "Type A", "Type B"],
  },
];

export default function MapRadarScreen() {
  const router = useRouter();

  const [mapCenter, setMapCenter] = useState({
    latitude: 10.0159,
    longitude: 76.3419,
  });
  const [layerMode, setLayerMode] = useState<MapLayerMode>("standard");
  const [showsTraffic, setShowsTraffic] = useState<boolean>(true);
  const [forceNativeGoogleMaps, setForceNativeGoogleMaps] =
    useState<boolean>(false);

  const [selectedStationId, setSelectedStationId] =
    useState<string>("st-pall-mall");
  const [showRouteLine, setShowRouteLine] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>(
    []
  );
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [selectedConnectorFilter, setSelectedConnectorFilter] =
    useState<string>("ALL");

  // Debounced Zero-Cost Places Autocomplete (Ola Maps -> Photon Komoot OpenStreetMap)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchPlacesAutocomplete(
        q,
        mapCenter.latitude,
        mapCenter.longitude
      );
      setPlaceSuggestions(results);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, mapCenter.latitude, mapCenter.longitude]);

  const filteredStations = useMemo(() => {
    return DISCOVERY_STATIONS.filter((st) => {
      if (
        selectedConnectorFilter !== "ALL" &&
        !st.connectors.includes(selectedConnectorFilter)
      ) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          st.title.toLowerCase().includes(q) ||
          st.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedConnectorFilter, searchQuery]);

  const activeStation = useMemo(() => {
    return (
      filteredStations.find((s) => s.id === selectedStationId) ||
      filteredStations[0] ||
      DISCOVERY_STATIONS[0]
    );
  }, [filteredStations, selectedStationId]);

  const handleSelectStation = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedStationId(id);
    const st = DISCOVERY_STATIONS.find((s) => s.id === id);
    if (st) {
      setMapCenter({ latitude: st.latitude, longitude: st.longitude });
    }
    setShowSearchDropdown(false);
  };

  const handleSelectPlaceSuggestion = (place: PlaceSuggestion) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSearchQuery(place.name);
    setShowSearchDropdown(false);
    setMapCenter({
      latitude: place.latitude,
      longitude: place.longitude,
    });
  };

  const handleGetDirection = (station: StationRecord) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (!showRouteLine) {
      setShowRouteLine(true);
      return;
    }
    const lat = station.latitude;
    const lng = station.longitude;
    const label = encodeURIComponent(station.title);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleBookNow = (station: StationRecord) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  return (
    <View style={styles.container}>
      {/* ===================== FULL-SCREEN MAP (NATIVE GOOGLE SDK + ZERO-COST ROUTING) ===================== */}
      <View style={StyleSheet.absoluteFill}>
        <LeafletMap
          centerLat={mapCenter.latitude}
          centerLng={mapCenter.longitude}
          zoom={14}
          layerMode={layerMode}
          stations={filteredStations.length > 0 ? filteredStations : DISCOVERY_STATIONS}
          selectedStationId={activeStation.id}
          showRouteLine={showRouteLine}
          onSelectStation={handleSelectStation}
          showsTraffic={showsTraffic}
          forceNativeGoogleMaps={forceNativeGoogleMaps}
        />
      </View>

      {/* ===================== TOP FLOATING SEARCH BAR & FILTER BUTTON ===================== */}
      <View style={styles.topSearchRow}>
        <View style={styles.searchPill}>
          <Search size={19} color="#151C18" strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setShowSearchDropdown(txt.trim().length > 0);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
            }}
            placeholder="Search station or place"
            placeholderTextColor="#757F7A"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setPlaceSuggestions([]);
                setShowSearchDropdown(false);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#757F7A" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setShowFilterModal(true);
          }}
          activeOpacity={0.85}
          style={styles.filterCircleBtn}
        >
          <SlidersHorizontal size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Live Search Dropdown (Stations + Photon Komoot / Ola Places Autocomplete) */}
      {showSearchDropdown &&
        (filteredStations.length > 0 || placeSuggestions.length > 0) && (
          <View style={styles.searchDropdown}>
            {filteredStations.slice(0, 3).map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => handleSelectStation(st.id)}
                style={styles.dropdownItem}
              >
                <View style={styles.dropdownPinIcon}>
                  <Zap size={13} color="#05E660" fill="#05E660" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle}>{st.title}</Text>
                  <Text style={styles.dropdownSub}>{st.address}</Text>
                </View>
                <Text style={styles.dropdownDist}>{st.distanceKm} km</Text>
              </TouchableOpacity>
            ))}

            {placeSuggestions.slice(0, 4).map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => handleSelectPlaceSuggestion(place)}
                style={styles.dropdownItem}
              >
                <View
                  style={[
                    styles.dropdownPinIcon,
                    { backgroundColor: "#F2F4F3" },
                  ]}
                >
                  <MapPin size={14} color="#151C18" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle}>{place.name}</Text>
                  <Text style={styles.dropdownSub} numberOfLines={1}>
                    {place.subtitle}
                  </Text>
                </View>
                <Text style={styles.dropdownDist}>Fly To</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      {/* ===================== FLOATING STATION PREVIEW BOTTOM CARD ===================== */}
      <View style={styles.stationCardWrapper} pointerEvents="box-none">
        <View style={styles.stationCard}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Station Title & Distance */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.stationTitle} numberOfLines={1}>
              {activeStation.title}
            </Text>
            <Text style={styles.stationDistance}>
              {activeStation.distanceKm} km
            </Text>
          </View>

          {/* Address */}
          <Text style={styles.stationAddress} numberOfLines={1}>
            {activeStation.address}
          </Text>

          {/* Star Rating Row */}
          <View style={styles.ratingRow}>
            <Star size={14} color="#151C18" fill="#151C18" />
            <Text style={styles.ratingNumber}>{activeStation.rating}</Text>
            <Text style={styles.ratingReviews}>
              ({activeStation.reviews} Reviews)
            </Text>
          </View>

          {/* 3 Available Connector Illustration Boxes */}
          <View style={styles.connectorsPreviewRow}>
            {activeStation.connectors.slice(0, 3).map((conn, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => handleBookNow(activeStation)}
                style={styles.connectorBox}
              >
                <ConnectorPlugIllustration variant={conn} size={50} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Get Direction & Book Pill Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => handleGetDirection(activeStation)}
              activeOpacity={0.8}
              style={styles.directionOutlineBtn}
            >
              <Text style={styles.directionOutlineText}>
                {showRouteLine ? "Open Maps" : "Get Direction"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBookNow(activeStation)}
              activeOpacity={0.85}
              style={styles.bookPrimaryBtn}
            >
              <Text style={styles.bookPrimaryText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ===================== FILTER & MAP STYLE MODAL ===================== */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Map Filters & View</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>CONNECTOR TYPE</Text>
            <View style={styles.filterPillsRow}>
              {["ALL", "Type A", "CHAdeMO", "Type B"].map((conn) => {
                const isSel = selectedConnectorFilter === conn;
                return (
                  <TouchableOpacity
                    key={conn}
                    onPress={() => setSelectedConnectorFilter(conn)}
                    style={[styles.filterPill, isSel && styles.filterPillActive]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSel && styles.filterPillTextActive,
                      ]}
                    >
                      {conn === "ALL" ? "All Plugs" : conn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.filterSectionLabel}>
              OLA MAPS & LAYER TYPE
            </Text>
            <View style={styles.filterPillsRow}>
              {[
                { id: "standard", label: "Ola Light" },
                { id: "street", label: "Ola Street" },
                { id: "satellite", label: "Satellite" },
                { id: "hybrid", label: "Hybrid" },
              ].map((m) => {
                const isSel = layerMode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setLayerMode(m.id as MapLayerMode)}
                    style={[styles.filterPill, isSel && styles.filterPillActive]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSel && styles.filterPillTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live Traffic & Future Google SDK Toggles */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Ola Maps Routing & Search Active</Text>
                <Text style={styles.toggleSub}>
                  Key: x41faa...9sSG0 (Directions + Places + Map Canvas)
                </Text>
              </View>
              <Switch
                value={showsTraffic}
                onValueChange={setShowsTraffic}
                trackColor={{ false: "#DCE2DF", true: "#05E660" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.toggleTitle}>
                  Switch to Native Google Maps SDK (Future)
                </Text>
                <Text style={styles.toggleSub}>
                  Keep OFF while using Ola Maps; turn ON when Google Console key is added
                </Text>
              </View>
              <Switch
                value={forceNativeGoogleMaps}
                onValueChange={setForceNativeGoogleMaps}
                trackColor={{ false: "#DCE2DF", true: "#05E660" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false);
                router.push("/(driver)/route-planner");
              }}
              style={styles.corridorShortcutBtn}
            >
              <Route size={17} color="#151C18" />
              <Text style={styles.corridorShortcutText}>
                Open Intercity Highway Trip Planner
              </Text>
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
    backgroundColor: "#EDEFF0",
  },
  topSearchRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 22,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 100,
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#111714",
  },
  filterCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#151C18",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  searchDropdown: {
    position: "absolute",
    top: Platform.OS === "ios" ? 114 : 80,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 6,
    zIndex: 120,
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F3",
  },
  dropdownPinIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
  },
  dropdownSub: {
    fontSize: 11,
    color: "#757F7A",
  },
  dropdownDist: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
  },
  stationCardWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 104 : 96,
    left: 20,
    right: 20,
    zIndex: 90,
  },
  stationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  dragHandleWrap: {
    alignItems: "center",
    marginBottom: 10,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DCE0DE",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111714",
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  stationDistance: {
    fontSize: 13,
    fontWeight: "500",
    color: "#525C57",
  },
  stationAddress: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginBottom: 14,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111714",
  },
  ratingReviews: {
    fontSize: 12,
    color: "#757F7A",
  },
  connectorsPreviewRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  connectorBox: {
    flex: 1,
    height: 74,
    backgroundColor: "#F4F6F5",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  directionOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E6E4",
    alignItems: "center",
    justifyContent: "center",
  },
  directionOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111714",
  },
  bookPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  bookPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
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
    paddingBottom: 38,
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
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 6,
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F2F4F3",
    borderWidth: 1,
    borderColor: "#E4E8E6",
  },
  filterPillActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111714",
  },
  filterPillTextActive: {
    color: "#05E660",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F3",
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111714",
  },
  toggleSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 1,
  },
  corridorShortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 12,
    gap: 8,
  },
  corridorShortcutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
});
