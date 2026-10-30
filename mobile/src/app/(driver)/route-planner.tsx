import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  ArrowLeft,
  Navigation,
  Search,
  MapPin,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LeafletMap, MapStationMarker } from "../../components/map/LeafletMap";
import {
  ConnectorPlugIllustration,
  getStationAssetImage,
} from "../../components/ui/EvVisuals";
import {
  fetchZeroCostDirections,
  searchPlacesAutocomplete,
  PlaceSearchResult,
} from "../../services/routingEngine";

const CORRIDOR_ROUTES = [
  {
    id: "r1",
    label: "Kochi → Munnar",
    originLat: 10.0159,
    originLng: 76.3419,
    destLat: 10.0889,
    destLng: 77.0595,
    distanceKm: 126,
    duration: "3h 25m",
    elevationGainM: 1532,
    regenKwh: 5.4,
    arrivalSoc: 24,
    stopName: "Adimali Ghat DC Fast Station",
    stopLat: 10.022,
    stopLng: 76.55,
    stopDistKm: 82,
    stopPrice: "$0.60/ kWh",
    connector: "CHAdeMO",
  },
  {
    id: "r2",
    label: "Kochi → Trivandrum",
    originLat: 10.0159,
    originLng: 76.3419,
    destLat: 8.5241,
    destLng: 76.9366,
    distanceKm: 204,
    duration: "4h 30m",
    elevationGainM: 145,
    regenKwh: 1.8,
    arrivalSoc: 18,
    stopName: "Kollam Bypass Ultra-Fast Plaza",
    stopLat: 8.8932,
    stopLng: 76.6141,
    stopDistKm: 134,
    stopPrice: "$0.75/ kWh",
    connector: "Type B",
  },
  {
    id: "r3",
    label: "Kochi → Coimbatore",
    originLat: 10.0159,
    originLng: 76.3419,
    destLat: 11.0168,
    destLng: 76.9558,
    distanceKm: 192,
    duration: "3h 50m",
    elevationGainM: 420,
    regenKwh: 2.9,
    arrivalSoc: 22,
    stopName: "Thrissur Highway AC Superhub",
    stopLat: 10.5276,
    stopLng: 76.2144,
    stopDistKm: 74,
    stopPrice: "$0.50/ kWh",
    connector: "Type A",
  },
];

export default function RoutePlannerScreen() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState(CORRIDOR_ROUTES[0]);
  const [departureSoc, setDepartureSoc] = useState(72);

  // Live Zero-Cost Routing State (Ola Maps -> OSRM Fallback)
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [liveDistanceKm, setLiveDistanceKm] = useState(selectedRoute.distanceKm);
  const [liveDurationStr, setLiveDurationStr] = useState(selectedRoute.duration);
  const [routingSource, setRoutingSource] = useState<"OLA_MAPS" | "OSRM">("OSRM");
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Custom Destination Search (Ola Maps -> Photon Komoot Fallback)
  const [destQuery, setDestQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSearchResult[]>([]);
  const [customDest, setCustomDest] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const destLat = customDest ? customDest.lat : selectedRoute.destLat;
    const destLng = customDest ? customDest.lng : selectedRoute.destLng;

    setIsLoadingRoute(true);
    fetchZeroCostDirections(
      selectedRoute.originLat,
      selectedRoute.originLng,
      destLat,
      destLng
    )
      .then((res) => {
        if (!active) return;
        const tuples: [number, number][] = res.coordinates.map((pt) => [
          pt.latitude,
          pt.longitude,
        ]);
        setRoutePolyline(tuples);
        setLiveDistanceKm(res.distanceKm || selectedRoute.distanceKm);
        const hrs = Math.floor(res.durationMins / 60);
        const mins = res.durationMins % 60;
        setLiveDurationStr(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
        setRoutingSource(res.source);
      })
      .finally(() => {
        if (active) setIsLoadingRoute(false);
      });

    return () => {
      active = false;
    };
  }, [selectedRoute, customDest]);

  useEffect(() => {
    if (destQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchPlacesAutocomplete(
        destQuery,
        selectedRoute.originLat,
        selectedRoute.originLng
      );
      setPlaceSuggestions(results);
    }, 280);
    return () => clearTimeout(timer);
  }, [destQuery, selectedRoute.originLat, selectedRoute.originLng]);

  const corridorStation: MapStationMarker = {
    id: "st-corridor-1",
    title: selectedRoute.stopName,
    latitude: selectedRoute.stopLat,
    longitude: selectedRoute.stopLng,
    pricePerKwh: 9.0,
    powerKw: 50.0,
    status: "AVAILABLE",
    nodeType: "PUBLIC_DC",
    distanceKm: selectedRoute.stopDistKm,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color="#151C18" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Trip & Corridor Planner</Text>
          <View style={styles.engineBadge}>
            <Text style={styles.engineBadgeText}>{routingSource}</Text>
          </View>
        </View>

        {/* Zero-Cost Destination Search Bar (Ola Maps -> Photon Komoot) */}
        <View style={styles.searchBox}>
          <Search size={17} color="#757F7A" />
          <TextInput
            value={destQuery}
            onChangeText={setDestQuery}
            placeholder="Search custom destination (Photon / Ola Maps)..."
            placeholderTextColor="#8B9490"
            style={styles.searchInput}
          />
          {isLoadingRoute && <ActivityIndicator size="small" color="#05E660" />}
        </View>

        {placeSuggestions.length > 0 && (
          <View style={styles.suggestionsCard}>
            {placeSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setCustomDest({
                    name: item.name,
                    lat: item.latitude,
                    lng: item.longitude,
                  });
                  setDestQuery("");
                  setPlaceSuggestions([]);
                }}
                style={styles.suggestionRow}
              >
                <MapPin size={15} color="#05E660" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionSub}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Corridor Preset Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {CORRIDOR_ROUTES.map((rt) => {
            const isSel = !customDest && rt.id === selectedRoute.id;
            return (
              <TouchableOpacity
                key={rt.id}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setCustomDest(null);
                  setSelectedRoute(rt);
                }}
                style={[styles.presetPill, isSel && styles.presetPillActive]}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    isSel && styles.presetPillTextActive,
                  ]}
                >
                  {rt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Map Preview Card */}
        <View style={styles.mapCard}>
          <LeafletMap
            centerLat={selectedRoute.stopLat}
            centerLng={selectedRoute.stopLng}
            zoom={9}
            layerMode="standard"
            stations={[corridorStation]}
            selectedStationId="st-corridor-1"
            showRouteLine={true}
            destinationLat={customDest ? customDest.lat : selectedRoute.destLat}
            destinationLng={customDest ? customDest.lng : selectedRoute.destLng}
            routeCoordinates={routePolyline}
          />
        </View>

        {/* Departure Battery SOC Selector */}
        <View style={styles.socCard}>
          <View style={styles.socHeaderRow}>
            <Text style={styles.socLabel}>Departure Battery Level</Text>
            <Text style={styles.socValue}>{departureSoc}%</Text>
          </View>
          <View style={styles.socPillsRow}>
            {[40, 60, 72, 90, 100].map((val) => {
              const isSel = departureSoc === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setDepartureSoc(val)}
                  style={[styles.socPill, isSel && styles.socPillActive]}
                >
                  <Text
                    style={[
                      styles.socPillText,
                      isSel && styles.socPillTextActive,
                    ]}
                  >
                    {val}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Telemetry Summary Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>
              {customDest ? `To ${customDest.name}` : "Distance"}
            </Text>
            <Text style={styles.metricNum}>{liveDistanceKm} km</Text>
            <Text style={styles.metricSub}>{liveDurationStr} via {routingSource}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Elevation Gain</Text>
            <Text style={styles.metricNum}>
              +{selectedRoute.elevationGainM} m
            </Text>
            <Text style={styles.metricSub}>
              Regen +{selectedRoute.regenKwh} kWh
            </Text>
          </View>
        </View>

        {/* Elevation & Battery Curve Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            Elevation Climb vs Battery Depletion
          </Text>
          <Svg width="100%" height={110} viewBox="0 0 320 110">
            <Defs>
              <LinearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#05E660" stopOpacity="0.28" />
                <Stop offset="100%" stopColor="#05E660" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>
            {/* Terrain Elevation Area */}
            <Path
              d="M 10 95 Q 90 88, 160 55 T 310 18 L 310 100 L 10 100 Z"
              fill="url(#elevFill)"
            />
            <Path
              d="M 10 95 Q 90 88, 160 55 T 310 18"
              stroke="#05E660"
              strokeWidth="2.5"
              fill="none"
            />
            {/* Battery SOC Drop Line */}
            <Path
              d="M 10 22 Q 120 45, 180 68 T 310 86"
              stroke="#151C18"
              strokeWidth="2.2"
              strokeDasharray="5,4"
              fill="none"
            />
            <Circle cx="180" cy="68" r="5" fill="#151C18" />
          </Svg>
          <View style={styles.chartLegendRow}>
            <Text style={styles.legendText}>● Green: Terrain Elevation</Text>
            <Text style={styles.legendText}>-- Charcoal: Battery SOC%</Text>
          </View>
        </View>

        {/* Recommended Pitstop Card */}
        <Text style={styles.sectionHeading}>Recommended Charging Stop</Text>
        <View style={styles.pitstopCard}>
          <Image
            source={getStationAssetImage(selectedRoute.stopName)}
            style={styles.pitstopBanner}
            resizeMode="cover"
          />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ConnectorPlugIllustration
              variant={selectedRoute.connector}
              size={50}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.pitstopTitle}>{selectedRoute.stopName}</Text>
              <Text style={styles.pitstopSub}>
                At {selectedRoute.stopDistKm} km mark •{" "}
                {selectedRoute.stopPrice}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(driver)/booking-sheet",
                params: {
                  stationId: "st-corridor-1",
                  stationName: selectedRoute.stopName,
                  stationAddress: "Highway Corridor Mile 82",
                  distanceKm: String(selectedRoute.stopDistKm),
                  driveMins: "55",
                  rating: "4.8",
                  reviews: "64",
                },
              })
            }
            style={styles.bookPitstopBtn}
          >
            <Text style={styles.bookPitstopText}>Book Corridor Slot</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111714",
  },
  engineBadge: {
    backgroundColor: "#151C18",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  engineBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#05E660",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "#E4E8E6",
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111714",
  },
  suggestionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4E8E6",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F3",
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111714",
  },
  suggestionSub: {
    fontSize: 11,
    color: "#757F7A",
  },
  presetsRow: {
    gap: 8,
    marginBottom: 14,
  },
  presetPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E8E6",
  },
  presetPillActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  presetPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111714",
  },
  presetPillTextActive: {
    color: "#05E660",
  },
  mapCard: {
    height: 185,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4E8E6",
    marginBottom: 14,
  },
  socCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 14,
  },
  socHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  socLabel: {
    fontSize: 13,
    color: "#757F7A",
    fontWeight: "500",
  },
  socValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111714",
  },
  socPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  socPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
  },
  socPillActive: {
    backgroundColor: "#05E660",
  },
  socPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#525C57",
  },
  socPillTextActive: {
    color: "#111714",
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  metricTitle: {
    fontSize: 12,
    color: "#757F7A",
  },
  metricNum: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111714",
    marginTop: 4,
  },
  metricSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
    marginBottom: 8,
  },
  chartLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#757F7A",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111714",
    marginBottom: 10,
  },
  pitstopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  pitstopBanner: {
    width: "100%",
    height: 110,
    borderRadius: 16,
    marginBottom: 12,
  },
  pitstopTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111714",
  },
  pitstopSub: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 3,
  },
  bookPitstopBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  bookPitstopText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111714",
  },
});
