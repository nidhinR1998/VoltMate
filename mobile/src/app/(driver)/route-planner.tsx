import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import {
  ArrowLeft,
  Navigation,
  Mountain,
  Zap,
  TrendingDown,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  BatteryCharging,
  Layers,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { LeafletMap } from "../../components/map/LeafletMap";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

const PRESET_ROUTES = [
  { id: "munnar", label: "Kochi → Munnar", dest: "Munnar Ghats (1,550m)", dist: 128, climb: 1535 },
  { id: "tvm", label: "Kochi → Trivandrum", dest: "Trivandrum City (Coastal)", dist: 205, climb: 180 },
  { id: "cbe", label: "Kochi → Coimbatore", dest: "Coimbatore (Palakkad Gap)", dist: 190, climb: 420 },
  { id: "calicut", label: "Kochi → Kozhikode", dest: "Kozhikode Beach", dist: 182, climb: 95 },
];

const CORRIDOR_PINS = [
  {
    id: "pit-1",
    title: "Kothamangalam Highway P2P Villa",
    lat: 10.062,
    lng: 76.628,
    pricePerKwh: 8.5,
    powerKw: 7.4,
    type: "P2P_AVAILABLE" as const,
    amenity: "Covered Parking • Tea",
    distKm: 52,
  },
  {
    id: "pit-2",
    title: "Neriamangalam Bridge Fast DC Hub",
    lat: 10.052,
    lng: 76.782,
    pricePerKwh: 16.0,
    powerKw: 50.0,
    type: "PUBLIC_DC" as const,
    amenity: "Food Court • Restroom",
    distKm: 74,
  },
  {
    id: "pit-3",
    title: "Adimali KSEB Substation Fast Hub",
    lat: 10.038,
    lng: 76.954,
    pricePerKwh: 15.5,
    powerKw: 60.0,
    type: "PUBLIC_DC" as const,
    amenity: "24/7 Security • CCTV",
    distKm: 98,
  },
];

export default function RoutePlannerScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();

  const [origin, setOrigin] = useState("Kochi, Kerala (Sea Level)");
  const [destination, setDestination] = useState("Munnar Ghats (1,550m MSL)");
  const [batterySoc, setBatterySoc] = useState(65);
  const [computing, setComputing] = useState(false);
  const [showResults, setShowResults] = useState(true);

  const handleCompute = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setComputing(true);
    setTimeout(() => {
      setComputing(false);
      setShowResults(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 700);
  };

  const handleSelectPreset = (preset: typeof PRESET_ROUTES[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setDestination(preset.dest);
    handleCompute();
  };

  const handleBookPitstop = (pit: typeof CORRIDOR_PINS[0]) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.push({
      pathname: "/(driver)/booking-sheet",
      params: { stationId: pit.id, title: pit.title },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Elevation Corridor Planner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Interactive Highway Corridor Mini-Map */}
        <View style={styles.miniMapWrapper}>
          <LeafletMap
            markers={CORRIDOR_PINS}
            selectedMarkerId="pit-2"
            onSelectMarker={(id) => {
              const p = CORRIDOR_PINS.find((x) => x.id === id);
              if (p) handleBookPitstop(p);
            }}
            tileMode="street"
            userLocation={{ lat: 10.0159, lng: 76.3419 }}
            showRouteLine={true}
          />
          <View style={styles.mapOverlayTag}>
            <Mountain size={14} color="#00F59B" />
            <Text style={styles.mapOverlayTagText}>NH 85 Mountain Corridor (Kochi → Munnar)</Text>
          </View>
        </View>

        {/* Quick Route Preset Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
          {PRESET_ROUTES.map((p) => {
            const isSel = destination.includes(p.label.split("→ ")[1]?.trim() || "");
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleSelectPreset(p)}
                style={[styles.presetChip, isSel && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Inputs Card */}
        <View style={styles.inputsCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>STARTING POINT</Text>
            <View style={styles.inputWrapper}>
              <Compass size={16} color="#00F59B" />
              <TextInput value={origin} onChangeText={setOrigin} style={styles.textInput} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DESTINATION</Text>
            <View style={styles.inputWrapper}>
              <Navigation size={16} color="#00E5FF" />
              <TextInput value={destination} onChangeText={setDestination} style={styles.textInput} />
            </View>
          </View>

          {/* Battery SOC Slider */}
          <View style={styles.socSliderBox}>
            <View style={styles.socHeader}>
              <Text style={styles.socLabel}>DEPARTURE BATTERY SOC</Text>
              <Text style={styles.socValueText}>{batterySoc}%</Text>
            </View>

            <View style={styles.socPillsRow}>
              {[20, 40, 65, 80, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBatterySoc(val);
                  }}
                  style={[styles.socPill, batterySoc === val && styles.socPillActive]}
                >
                  <Text style={[styles.socPillText, batterySoc === val && styles.socPillTextActive]}>
                    {val}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Compute Button */}
          <TouchableOpacity
            onPress={handleCompute}
            disabled={computing}
            activeOpacity={0.85}
            style={styles.computeBtn}
          >
            {computing ? (
              <ActivityIndicator color="#06090E" />
            ) : (
              <>
                <Mountain size={18} color="#06090E" />
                <Text style={styles.computeBtnText}>COMPUTE HIGHWAY CORRIDOR</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {showResults && (
          <View style={styles.resultsWrap}>
            {/* Telemetry Summary Grid */}
            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryTitle}>ROUTE ENERGY CONSUMPTION TELEMETRY</Text>

              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>DISTANCE</Text>
                  <Text style={styles.tVal}>128 km</Text>
                </View>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>CLIMB</Text>
                  <Text style={[styles.tVal, { color: "#FFB800" }]}>+1,550m</Text>
                </View>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>REGEN RECOVERY</Text>
                  <Text style={[styles.tVal, { color: "#00F59B" }]}>+11% SOC</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.telemetryRow}>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>WITHOUT CHARGING</Text>
                  <Text style={[styles.tVal, { color: "#EF4444" }]}>18% (Critical)</Text>
                </View>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>WITH 1 PITSTOP</Text>
                  <Text style={[styles.tVal, { color: "#00F59B" }]}>74% (Safe)</Text>
                </View>
                <View style={styles.telemetryCol}>
                  <Text style={styles.tLabel}>RECOMMENDED</Text>
                  <Text style={styles.tValSmall}>1 Stop (20m)</Text>
                </View>
              </View>
            </View>

            {/* SVG Elevation & Battery SOC Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Elevation & Battery SOC Profile</Text>
                <Text style={styles.chartSub}>Ghat Climb vs Regenerative Braking</Text>
              </View>

              <Svg width={width - 72} height={140} style={{ alignSelf: "center", marginTop: 10 }}>
                <Defs>
                  <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#00F59B" stopOpacity="0.4" />
                    <Stop offset="100%" stopColor="#00F59B" stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Elevation Curve */}
                <Path
                  d="M 10 110 Q 70 100 130 70 T 260 20 L 260 110 Z"
                  fill="url(#elevGrad)"
                />
                <Path
                  d="M 10 110 Q 70 100 130 70 T 260 20"
                  stroke="#00F59B"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Battery SOC Line (Dropping as elevation rises) */}
                <Path
                  d="M 10 40 Q 80 60 150 90 T 260 98"
                  stroke="#FFB800"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />

                {/* Critical Drop Alert Point */}
                <Circle cx="160" cy="92" r="5" fill="#EF4444" />
                <SvgText x="160" y="82" fill="#EF4444" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Below 25% (Stop Req)
                </SvgText>

                {/* Axis Labels */}
                <SvgText x="10" y="125" fill="#64748B" fontSize="9">Kochi (0m)</SvgText>
                <SvgText x="130" y="125" fill="#64748B" fontSize="9">Neriamangalam</SvgText>
                <SvgText x="250" y="125" fill="#64748B" fontSize="9">Munnar (1550m)</SvgText>
              </Svg>
            </View>

            {/* Matched Highway Pitstops */}
            <Text style={styles.pitstopsHeader}>Matched Highway Charging Pitstops (3 Verified)</Text>
            <View style={styles.pitstopsList}>
              {CORRIDOR_PINS.map((pit) => (
                <View key={pit.id} style={styles.pitCard}>
                  <View style={styles.pitTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pitTitle}>{pit.title}</Text>
                      <Text style={styles.pitSub}>{pit.amenity} • {pit.distKm} km from departure</Text>
                    </View>
                    <View style={styles.pitRateBadge}>
                      <Text style={styles.pitRateText}>₹{pit.pricePerKwh}/u</Text>
                    </View>
                  </View>

                  <View style={styles.pitBottom}>
                    <View style={styles.pitPowerPill}>
                      <Zap size={12} color="#00F59B" />
                      <Text style={styles.pitPowerText}>{pit.powerKw} kW Fast</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleBookPitstop(pit)}
                      style={styles.bookPitBtn}
                    >
                      <Text style={styles.bookPitBtnText}>Book Pitstop Slot</Text>
                      <ArrowRight size={14} color="#06090E" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F1622",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  miniMapWrapper: {
    height: 180,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 16,
    position: "relative",
  },
  mapOverlayTag: {
    position: "absolute",
    top: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 9, 14, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  mapOverlayTagText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "800",
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 14,
  },
  presetChip: {
    backgroundColor: "#0F1622",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  presetChipActive: {
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    borderColor: "#00F59B",
  },
  presetChipText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  presetChipTextActive: {
    color: "#00F59B",
    fontWeight: "700",
  },
  inputsCard: {
    backgroundColor: "#0F1622",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    padding: 0,
  },
  socSliderBox: {
    marginVertical: 8,
  },
  socHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  socLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },
  socValueText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00F59B",
  },
  socPillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  socPill: {
    backgroundColor: "#06090E",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  socPillActive: {
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    borderColor: "#00F59B",
  },
  socPillText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  socPillTextActive: {
    color: "#00F59B",
  },
  computeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
  },
  computeBtnText: {
    color: "#06090E",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  resultsWrap: {
    gap: 16,
  },
  telemetryCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  telemetryTitle: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  telemetryCol: {
    flex: 1,
  },
  tLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
  },
  tVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  tValSmall: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 12,
  },
  chartCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chartHeader: {
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  chartSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  pitstopsHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pitstopsList: {
    gap: 10,
  },
  pitCard: {
    backgroundColor: "#0F1622",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pitTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  pitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pitSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  pitRateBadge: {
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pitRateText: {
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "800",
  },
  pitBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pitPowerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pitPowerText: {
    fontSize: 11,
    color: "#00F59B",
    fontWeight: "700",
  },
  bookPitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00F59B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  bookPitBtnText: {
    color: "#06090E",
    fontSize: 12,
    fontWeight: "800",
  },
});
