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
import { useAuthStore, TAB_BAR_SAFE_PADDING } from "../../store/useAuthStore";
import { LeafletMap } from "../../components/map/LeafletMap";
import { fetchHybridDirections } from "../../services/hybridMapService";

const CORRIDOR_DESTINATIONS: Record<string, { lat: number; lng: number }> = {
  "Munnar Hill Station": { lat: 10.0889, lng: 77.0595 },
  "Trivandrum Technopark": { lat: 8.5581, lng: 76.8816 },
  "Kozhikode Cyberpark": { lat: 11.2488, lng: 75.8342 },
  "Thrissur Swaraj Round": { lat: 10.5276, lng: 76.2144 },
};

export default function RoutePlannerScreen() {
  const router = useRouter();
  const { stations, selectStation, preferredMapLayer } = useAuthStore();

  const [origin] = useState("Kakkanad Infopark, Kochi");
  const [destination, setDestination] = useState("Munnar Hill Station");
  const [computed, setComputed] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [corridorCoords, setCorridorCoords] = useState<Array<[number, number]>>([
    [10.0159, 76.3419],
    [10.0088, 76.3512],
    [10.045, 76.62],
    [10.0889, 77.0595],
  ]);
  const [corridorMeta, setCorridorMeta] = useState({
    distanceKm: 128,
    durationMins: 195,
    source: "OSRM_FREE",
  });

  const handleComputeCorridor = async (destName?: string) => {
    const targetName = destName || destination;
    if (destName) setDestination(destName);
    const coords = CORRIDOR_DESTINATIONS[targetName] || {
      lat: 10.0889,
      lng: 77.0595,
    };

    setIsComputing(true);
    const res = await fetchHybridDirections(
      10.0159,
      76.3419,
      coords.lat,
      coords.lng
    );
    setCorridorCoords(res.coordinates);
    setCorridorMeta({
      distanceKm: res.distanceKm,
      durationMins: res.durationMins,
      source: res.source,
    });
    setComputed(true);
    setIsComputing(false);
  };

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
        <Text style={styles.fieldLabel}>ORIGIN</Text>
        <TextInput style={styles.input} value={origin} editable={false} />

        <Text style={styles.fieldLabel}>DESTINATION</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Enter destination city"
        />

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
            <Text style={styles.computeBtnText}>Compute Optimal EV Corridor</Text>
          )}
        </TouchableOpacity>
      </View>

      {computed && (
        <>
          <View style={styles.mapPreviewWrap}>
            <LeafletMap
              centerLat={10.04}
              centerLng={76.55}
              zoom={10}
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
              <Text style={styles.summaryVal}>{corridorMeta.distanceKm} km</Text>
              <Text style={styles.summaryLbl}>Total Distance</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>
                {Math.floor(corridorMeta.durationMins / 60)}h{" "}
                {corridorMeta.durationMins % 60}m
              </Text>
              <Text style={styles.summaryLbl}>Drive Time</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#096B30" }]}>1 Stop</Text>
              <Text style={styles.summaryLbl}>Recommended</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recommended Charging Waypoints</Text>
          {stations.slice(0, 2).map((s) => (
            <View key={s.id} style={styles.stopCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{s.name}</Text>
                <Text style={styles.stopMeta}>
                  {s.address} • {s.maxPowerKw} kW • ₹{s.pricePerKwh.toFixed(2)}/kWh
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
    fontSize: 11,
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
    fontSize: 18,
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
    backgroundColor: "#151C18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bookStopBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
