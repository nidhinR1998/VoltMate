import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import {
  fetchHybridDirections,
  searchPlacesHybrid,
} from "../../services/hybridMapService";

const CORRIDOR_DESTINATIONS: Record<
  string,
  { lat: number; lng: number; elevationM: number }
> = {
  "Munnar Hill Station": { lat: 10.0889, lng: 77.0595, elevationM: 1532 },
  "Trivandrum Technopark": { lat: 8.5581, lng: 76.8816, elevationM: 45 },
  "Wayanad Kalpetta": { lat: 11.6103, lng: 76.0828, elevationM: 780 },
  "Coimbatore Avinashi Rd": { lat: 11.0168, lng: 76.9558, elevationM: 411 },
  "Kozhikode Cyberpark": { lat: 11.2488, lng: 75.8342, elevationM: 28 },
  "Alappuzha Backwaters": { lat: 9.4981, lng: 76.3388, elevationM: 12 },
};

export default function RoutePlannerScreen() {
  const router = useRouter();
  const {
    stations,
    vehicles,
    selectStation,
    preferredMapLayer,
    showToast,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const [origin] = useState("Kakkanad Infopark, Kochi");
  const [destination, setDestination] = useState("Munnar Hill Station");
  const [computed, setComputed] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [corridorCoords, setCorridorCoords] = useState<Array<[number, number]>>([
    [10.0159, 76.3419],
    [10.0088, 76.3618],
    [10.0124, 76.9535],
    [10.0889, 77.0595],
  ]);
  const [corridorMeta, setCorridorMeta] = useState({
    distanceKm: 128,
    durationMins: 195,
    elevationM: 1532,
    regenKwh: 4.2,
    source: "OSRM_FREE",
  });

  const handleComputeCorridor = async (destName?: string) => {
    const targetName = (destName || destination).trim();
    if (!targetName) return;
    if (destName) setDestination(destName);

    setIsComputing(true);
    let coords = CORRIDOR_DESTINATIONS[targetName];

    if (!coords) {
      // Dynamically geocode custom city name via Photon/Hybrid search
      const matches = await searchPlacesHybrid(targetName, 10.0159, 76.3419);
      if (matches.length > 0) {
        coords = {
          lat: matches[0].latitude,
          lng: matches[0].longitude,
          elevationM: Math.round(60 + Math.abs(matches[0].latitude - 10.0) * 280),
        };
      } else {
        coords = { lat: 10.5276, lng: 76.2144, elevationM: 140 };
      }
    }

    const res = await fetchHybridDirections(
      10.0159,
      76.3419,
      coords.lat,
      coords.lng
    );
    const estRegen = Number(((coords.elevationM / 1000) * 2.8).toFixed(1));

    setCorridorCoords(res.coordinates);
    setCorridorMeta({
      distanceKm: res.distanceKm,
      durationMins: res.durationMins,
      elevationM: coords.elevationM,
      regenKwh: estRegen,
      source: res.source,
    });
    setComputed(true);
    setIsComputing(false);
    showToast(
      `Corridor Computed to ${targetName}`,
      `${res.distanceKm} km • Est. +${estRegen} kWh Regenerative Braking`,
      "info"
    );
  };

  const recommendedWaypoints =
    destination.toLowerCase().includes("trivandrum") ||
    destination.toLowerCase().includes("alappuzha") ||
    destination.toLowerCase().includes("kollam")
      ? stations.filter((s) => s.id === "s6" || s.id === "s2")
      : stations.filter((s) => s.id === "s5" || s.id === "s4");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(driver)/bookings")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>EV Trip Corridor Planner</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Input Card */}
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>
          ORIGIN • ACTIVE EV: {activeVehicle?.makeModel} ({activeVehicle?.rangeKm} km range)
        </Text>
        <TextInput style={styles.input} value={origin} editable={false} />

        <Text style={styles.fieldLabel}>SEARCH CUSTOM DESTINATION CITY</Text>
        <View style={styles.searchDestRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={() => handleComputeCorridor()}
            returnKeyType="search"
            placeholder="Search custom destination (e.g. Wayanad, Coimbatore...)"
          />
          <TouchableOpacity
            style={styles.inlineSearchBtn}
            onPress={() => handleComputeCorridor()}
          >
            <Text style={styles.inlineSearchBtnTxt}>Go</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Destination Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.destChipsScroll}
        >
          {Object.keys(CORRIDOR_DESTINATIONS).map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.destChip,
                destination === city && styles.destChipActive,
              ]}
              onPress={() => handleComputeCorridor(city)}
            >
              <Text
                style={[
                  styles.destChipText,
                  destination === city && styles.destChipTextActive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.computeBtn}
          onPress={() => handleComputeCorridor()}
          disabled={isComputing}
        >
          {isComputing ? (
            <ActivityIndicator color="#151C18" />
          ) : (
            <Text style={styles.computeBtnText}>
              Compute Highway Corridor & Stops
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {computed && (
        <>
          <View style={styles.mapPreviewWrap}>
            <LeafletMap
              centerLat={corridorCoords[Math.floor(corridorCoords.length / 2)]?.[0] ?? 10.04}
              centerLng={corridorCoords[Math.floor(corridorCoords.length / 2)]?.[1] ?? 76.55}
              zoom={9}
              activeLayer={preferredMapLayer}
              markers={stations.map((s) => ({
                id: s.id,
                lat: s.latitude,
                lng: s.longitude,
                title: s.name,
                price: `₹${s.pricePerKwh.toFixed(2)}`,
                powerKw: s.maxPowerKw,
                type: s.stationType,
                distanceKm: s.distanceKm,
              }))}
              routeCoords={corridorCoords}
            />
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {corridorMeta.distanceKm} km
              </Text>
              <Text style={styles.summaryLbl}>Distance</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {Math.floor(corridorMeta.durationMins / 60)}h{" "}
                {corridorMeta.durationMins % 60}m
              </Text>
              <Text style={styles.summaryLbl}>Drive Time</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                +{corridorMeta.elevationM}m
              </Text>
              <Text style={styles.summaryLbl}>Elevation</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#096B30" }]}>
                +{corridorMeta.regenKwh} kWh
              </Text>
              <Text style={styles.summaryLbl}>Est. Regen</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Bookable Highway Charging Stops (₹/kWh)
          </Text>
          {recommendedWaypoints.map((s) => (
            <View key={s.id} style={styles.stopCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.stopName}>{s.name}</Text>
                <Text style={styles.stopMeta}>
                  {s.address} • {s.maxPowerKw} kW • ₹{s.pricePerKwh.toFixed(2)}
                  /kWh
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bookStopBtn}
                onPress={() => {
                  selectStation(s.id);
                  router.push({
                    pathname: "/(driver)/booking-sheet",
                    params: { stationId: s.id },
                  });
                }}
              >
                <Text style={styles.bookStopBtnText}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C857F",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
    marginBottom: 12,
  },
  searchDestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inlineSearchBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSearchBtnTxt: {
    color: "#05E660",
    fontSize: 13,
    fontWeight: "800",
  },
  destChipsScroll: {
    marginBottom: 14,
  },
  destChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
    marginRight: 8,
  },
  destChipActive: {
    backgroundColor: "#151C18",
  },
  destChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B746E",
  },
  destChipTextActive: {
    color: "#05E660",
  },
  computeBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  computeBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  mapPreviewWrap: {
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  summaryLbl: {
    fontSize: 11,
    color: "#7C857F",
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
  },
  stopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stopName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  stopMeta: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  bookStopBtn: {
    backgroundColor: "#05E660",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bookStopBtnText: {
    color: "#151C18",
    fontSize: 12,
    fontWeight: "800",
  },
});
