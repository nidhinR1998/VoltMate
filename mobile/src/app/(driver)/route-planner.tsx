import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, Compass, Zap } from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import {
  fetchHybridDirections,
  searchPlacesHybrid,
} from "../../services/hybridMapService";
import { calcDistanceKm } from "../../services/realTimeEvHunter";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppChip,
  StatTile,
} from "../../components/ui/DesignSystem";

const CORRIDOR_DESTINATIONS: Record<
  string,
  { lat: number; lng: number; elevationM: number }
> = {
  "Munnar Hill Station": { lat: 10.0889, lng: 77.0595, elevationM: 1532 },
  "Trivandrum Technopark": { lat: 8.5581, lng: 76.8816, elevationM: 45 },
  "Kochi Infopark": { lat: 10.0088, lng: 76.3512, elevationM: 18 },
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
    syncLiveStationsForRegion,
  } = useVoltMateEngine();

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];
  const closestStation = stations[0];

  const [origin, setOrigin] = useState(
    closestStation?.address || "Current GPS Location"
  );
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: closestStation?.latitude || 10.0159,
    lng: closestStation?.longitude || 76.3419,
  });
  const [destination, setDestination] = useState("Munnar Hill Station");
  const [computed, setComputed] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [corridorCoords, setCorridorCoords] = useState<Array<[number, number]>>(
    [
      [
        closestStation?.latitude || 10.0159,
        closestStation?.longitude || 76.3419,
      ],
      [10.0889, 77.0595],
    ]
  );
  const [corridorMeta, setCorridorMeta] = useState({
    distanceKm: 128,
    durationMins: 195,
    elevationM: 1532,
    regenKwh: 4.2,
    source: "OSRM_FREE",
  });

  const lockLiveGpsOrigin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos =
          (await Location.getLastKnownPositionAsync()) ||
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        if (pos?.coords) {
          setOriginCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setOrigin(
            `Live GPS (${pos.coords.latitude.toFixed(
              4
            )}, ${pos.coords.longitude.toFixed(4)})`
          );
          return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      }
    } catch {
      // keep existing originCoords
    }
    return originCoords;
  };

  useEffect(() => {
    (async () => {
      const start = await lockLiveGpsOrigin();
      await handleComputeCorridor("Munnar Hill Station", start);
    })();
  }, []);

  const handleComputeCorridor = async (
    destName?: string,
    overrideStart?: { lat: number; lng: number }
  ) => {
    const targetName = (destName || destination).trim();
    if (!targetName) return;
    if (destName) setDestination(destName);

    setIsComputing(true);

    let startLat = overrideStart?.lat ?? originCoords.lat;
    let startLng = overrideStart?.lng ?? originCoords.lng;

    if (
      !overrideStart &&
      origin.trim() &&
      !origin.startsWith("Live GPS") &&
      origin !== (closestStation?.address || "")
    ) {
      const origMatches = await searchPlacesHybrid(origin, startLat, startLng);
      if (origMatches.length > 0) {
        startLat = origMatches[0].latitude;
        startLng = origMatches[0].longitude;
        setOriginCoords({ lat: startLat, lng: startLng });
      }
    }

    let coords = CORRIDOR_DESTINATIONS[targetName];

    if (!coords) {
      const matches = await searchPlacesHybrid(targetName, startLat, startLng);
      if (matches.length > 0) {
        coords = {
          lat: matches[0].latitude,
          lng: matches[0].longitude,
          elevationM: Math.round(
            60 + Math.abs(matches[0].latitude - startLat) * 280
          ),
        };
      } else {
        coords = { lat: 10.5276, lng: 76.2144, elevationM: 140 };
      }
    }

    const res = await fetchHybridDirections(
      startLat,
      startLng,
      coords.lat,
      coords.lng
    );
    const estRegen = Number(((coords.elevationM / 1000) * 2.8).toFixed(1));

    const midLat = (startLat + coords.lat) / 2;
    const midLng = (startLng + coords.lng) / 2;
    await syncLiveStationsForRegion(midLat, midLng, 35);

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

  const midRoutePoint =
    corridorCoords[Math.floor(corridorCoords.length / 2)] || [
      originCoords.lat,
      originCoords.lng,
    ];
  const recommendedWaypoints = [...stations]
    .sort(
      (a, b) =>
        calcDistanceKm(
          midRoutePoint[0],
          midRoutePoint[1],
          a.latitude,
          a.longitude
        ) -
        calcDistanceKm(
          midRoutePoint[0],
          midRoutePoint[1],
          b.latitude,
          b.longitude
        )
    )
    .slice(0, 4);

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
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>EV Trip Corridor Planner</Text>
        <View style={{ width: SPACING.touchTarget }} />
      </View>

      {/* Input Card */}
      <AppCard style={styles.formCard}>
        <Text style={styles.fieldLabel}>
          ORIGIN • ACTIVE EV: {activeVehicle?.makeModel} (
          {activeVehicle?.rangeKm} km range)
        </Text>
        <View style={styles.searchDestRow}>
          <TextInput
            style={styles.input}
            value={origin}
            onChangeText={setOrigin}
            placeholder="Enter starting city or tap GPS..."
            placeholderTextColor={COLORS.textMuted}
          />
          <AppButton
            label="GPS"
            variant="secondary"
            size="md"
            icon={<MapPin size={15} color={COLORS.primary} />}
            onPress={async () => {
              const gps = await lockLiveGpsOrigin();
              await handleComputeCorridor(destination, gps);
            }}
          />
        </View>

        <Text style={styles.fieldLabel}>DESTINATION CITY</Text>
        <View style={styles.searchDestRow}>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={() => handleComputeCorridor()}
            returnKeyType="search"
            placeholder="Search destination (Wayanad, Coimbatore...)"
            placeholderTextColor={COLORS.textMuted}
          />
          <AppButton
            label="Go"
            variant="secondary"
            size="md"
            onPress={() => handleComputeCorridor()}
          />
        </View>

        {/* Quick Destination Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.destChipsScroll}
        >
          {Object.keys(CORRIDOR_DESTINATIONS).map((city) => (
            <AppChip
              key={city}
              label={city}
              selected={destination === city}
              onPress={() => handleComputeCorridor(city)}
            />
          ))}
        </ScrollView>

        <AppButton
          label="Compute Highway Corridor & Stops"
          variant="primary"
          size="lg"
          loading={isComputing}
          icon={<Compass size={18} color={COLORS.textInverse} />}
          onPress={() => handleComputeCorridor()}
        />
      </AppCard>

      {computed && (
        <>
          <View style={styles.mapPreviewWrap}>
            <LeafletMap
              centerLat={
                corridorCoords[Math.floor(corridorCoords.length / 2)]?.[0] ??
                10.04
              }
              centerLng={
                corridorCoords[Math.floor(corridorCoords.length / 2)]?.[1] ??
                76.55
              }
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

          <View style={styles.summaryRow}>
            <StatTile
              label="Distance"
              value={`${corridorMeta.distanceKm} km`}
            />
            <StatTile
              label="Drive Time"
              value={`${Math.floor(corridorMeta.durationMins / 60)}h ${
                corridorMeta.durationMins % 60
              }m`}
            />
            <StatTile
              label="Est. Regen"
              value={`+${corridorMeta.regenKwh} kWh`}
              accent
            />
          </View>

          <Text style={styles.sectionTitle}>
            Bookable Highway Charging Stops (₹/kWh)
          </Text>
          {recommendedWaypoints.map((s) => (
            <AppCard key={s.id} style={styles.stopCard}>
              <View style={styles.stopRowInner}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.stopName} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.stopMeta} numberOfLines={2}>
                    {s.address} • {s.maxPowerKw} kW • ₹
                    {s.pricePerKwh.toFixed(2)}/kWh
                  </Text>
                </View>
                <AppButton
                  label="Book Slot"
                  variant="primary"
                  size="md"
                  icon={<Zap size={15} color={COLORS.textInverse} />}
                  onPress={() => {
                    selectStation(s.id);
                    router.push({
                      pathname: "/(driver)/booking-sheet",
                      params: { stationId: s.id },
                    });
                  }}
                />
              </View>
            </AppCard>
          ))}
        </>
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  formCard: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  searchDestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  destChipsScroll: {
    gap: 8,
    paddingBottom: SPACING.sm,
  },
  mapPreviewWrap: {
    height: 220,
    borderRadius: SPACING.cardRadiusLarge,
    overflow: "hidden",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  stopCard: {
    marginBottom: SPACING.xs,
  },
  stopRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stopName: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  stopMeta: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
