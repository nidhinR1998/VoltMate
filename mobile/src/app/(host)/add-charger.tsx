import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
  ConnectorSpec,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";

const AMENITY_OPTIONS = [
  "Covered Parking",
  "CCTV Monitored",
  "24/7 Access",
  "Washroom",
];

const DISCOM_OPTIONS = [
  { code: "KSEB", label: "KSEB (Kerala)" },
  { code: "BESCOM", label: "BESCOM (Karnataka)" },
  { code: "TNEB", label: "TNEB (Tamil Nadu)" },
  { code: "MSEDCL", label: "MSEDCL (Maharashtra)" },
];

export default function AddChargerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stationId?: string }>();
  const { stations, user, addOrUpdateHostStation, showToast } =
    useVoltMateEngine();

  const existingStation = params.stationId
    ? stations.find((s) => s.id === params.stationId)
    : undefined;

  // Section 1: Identity & Exact GPS Pin
  const [name, setName] = useState(
    existingStation?.name || "Nidhin's Villa Covered EV Bay"
  );
  const [address, setAddress] = useState(
    existingStation?.address || "Plot 18, Edachira Rd, Kakkanad, Kochi"
  );
  const [parkingBayCode, setParkingBayCode] = useState("BAY-01 (Covered Porch)");
  const [gateInstructions, setGateInstructions] = useState(
    "Enter 6-digit VoltMate Gate Pass PIN at security or ring bell #18"
  );
  const [discomBoard, setDiscomBoard] = useState("KSEB");
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: existingStation?.latitude ?? 10.0159,
    lng: existingStation?.longitude ?? 76.3419,
  });
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Section 2: Multi-Connector & KSEB/DISCOM Tariff Builder
  const [enable15A, setEnable15A] = useState(true);
  const [rate15A, setRate15A] = useState("9.00");

  const [enableType2, setEnableType2] = useState(true);
  const [rateType2, setRateType2] = useState(
    existingStation ? existingStation.pricePerKwh.toFixed(2) : "10.50"
  );
  const [powerType2, setPowerType2] = useState("7.4");

  const [enableCcs2, setEnableCcs2] = useState(false);
  const [rateCcs2, setRateCcs2] = useState("16.50");

  // Section 3: Amenities & Auto-Approve
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "Covered Parking",
    "CCTV Monitored",
    "24/7 Access",
  ]);
  const [autoApproveHighRated, setAutoApproveHighRated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (existingStation) {
      setName(existingStation.name);
      setAddress(existingStation.address);
      setPinCoords({
        lat: existingStation.latitude,
        lng: existingStation.longitude,
      });
    }
  }, [existingStation?.id]);

  const handleUseCurrentGps = async () => {
    setIsLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (pos?.coords) {
          setPinCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          showToast(
            "GPS Pin Locked",
            `Exact driveway coordinates set (${pos.coords.latitude.toFixed(
              4
            )}, ${pos.coords.longitude.toFixed(4)})`,
            "success"
          );
        }
      } else {
        showToast(
          "Location Permission Needed",
          "Tap directly on the satellite map below to drop your driveway pin.",
          "warning"
        );
      }
    } catch {
      showToast(
        "GPS Lock Fallback",
        "Tap anywhere on the map to position your station pin.",
        "info"
      );
    } finally {
      setIsLocatingGps(false);
    }
  };

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handlePublish = async () => {
    const connectorSpecs: ConnectorSpec[] = [];
    const connectorTypes: string[] = [];

    if (enable15A) {
      const r = parseFloat(rate15A) || 9.0;
      connectorTypes.push("15A 3-Pin Socket");
      connectorSpecs.push({
        id: "conn-15a",
        name: "15A 3-Pin Socket • 3.3kW AC",
        powerKw: 3.3,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot A1 • Available",
      });
    }

    if (enableType2) {
      const r = parseFloat(rateType2) || 10.5;
      const kw = parseFloat(powerType2) || 7.4;
      connectorTypes.push("Type-2 AC");
      connectorSpecs.push({
        id: "conn-type2",
        name: `Type-2 AC • ${kw.toFixed(1)}kW`,
        powerKw: kw,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot B1 • Available",
      });
    }

    if (enableCcs2) {
      const r = parseFloat(rateCcs2) || 16.5;
      connectorTypes.push("CCS2 DC Fast");
      connectorSpecs.push({
        id: "conn-ccs2",
        name: "CCS2 DC Fast • 30kW",
        powerKw: 30.0,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot C1 • Available",
      });
    }

    if (connectorSpecs.length === 0) {
      showToast(
        "Select at Least One Connector",
        "Enable 15A 3-Pin Socket, Type-2 AC, or CCS2 before publishing.",
        "warning"
      );
      return;
    }

    setIsPublishing(true);
    const primaryPrice = Math.min(...connectorSpecs.map((c) => c.pricePerKwh));
    const maxKw = Math.max(...connectorSpecs.map((c) => c.powerKw));
    const fullAddress = `${address.trim()} • ${parkingBayCode.trim()}`;

    await addOrUpdateHostStation({
      id: existingStation?.id,
      name: name.trim() || "Kochi Home P2P Charger",
      hostName: user?.fullName || "Nidhin R",
      address: fullAddress,
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      connectorTypes,
      connectorSpecs,
      maxPowerKw: maxKw,
      pricePerKwh: primaryPrice,
      isOnline: true,
    });
    setIsPublishing(false);
    router.replace("/(host)/dashboard");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(host)/dashboard")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {existingStation ? "Edit My Host Station" : "Host My P2P Charger"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* SECTION 1: STATION IDENTITY & EXACT MAP PIN-DROP */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionStepTxt}>STEP 1 OF 3</Text>
          <Text style={styles.sectionTitle}>
            Station Identity & Exact GPS Pin-Drop
          </Text>
        </View>

        <Text style={styles.label}>Station Title</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Nidhin's Villa Covered EV Bay"
        />

        <Text style={styles.label}>House / Building Street Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Plot 18, Edachira Rd, Kakkanad, Kochi"
        />

        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Parking Bay Code</Text>
            <TextInput
              style={styles.input}
              value={parkingBayCode}
              onChangeText={setParkingBayCode}
              placeholder="BAY-01"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DISCOM Tariff Board</Text>
            <View style={styles.discomWrap}>
              {DISCOM_OPTIONS.slice(0, 2).map((d) => (
                <TouchableOpacity
                  key={d.code}
                  style={[
                    styles.discomChip,
                    discomBoard === d.code && styles.discomChipActive,
                  ]}
                  onPress={() => setDiscomBoard(d.code)}
                >
                  <Text
                    style={[
                      styles.discomChipTxt,
                      discomBoard === d.code && styles.discomChipTxtActive,
                    ]}
                  >
                    {d.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>Security Gate & Access Instructions</Text>
        <TextInput
          style={styles.input}
          value={gateInstructions}
          onChangeText={setGateInstructions}
          placeholder="Enter 6-digit Gate Pass PIN at gate"
        />

        <View style={styles.pinHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              Exact Driveway GPS Pin ({pinCoords.lat.toFixed(4)},{" "}
              {pinCoords.lng.toFixed(4)})
            </Text>
            <Text style={styles.pinHint}>
              Tap anywhere on the satellite map to move your station pin
            </Text>
          </View>
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleUseCurrentGps}
            disabled={isLocatingGps}
          >
            {isLocatingGps ? (
              <ActivityIndicator size="small" color="#096B30" />
            ) : (
              <Text style={styles.gpsBtnTxt}>📍 Use My GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.mapPreviewBox}>
          <LeafletMap
            centerLat={pinCoords.lat}
            centerLng={pinCoords.lng}
            zoom={15}
            activeLayer="hybrid"
            markers={[
              {
                id: "host-pin",
                lat: pinCoords.lat,
                lng: pinCoords.lng,
                title: name,
                price: `₹${rateType2}/kWh`,
                powerKw: 7.4,
                type: "P2P_HOME",
              },
            ]}
            selectedMarkerId="host-pin"
            onMapPress={(lat, lng) =>
              setPinCoords({
                lat: Number(lat.toFixed(6)),
                lng: Number(lng.toFixed(6)),
              })
            }
          />
        </View>
      </View>

      {/* SECTION 2: MULTI-CONNECTOR & KSEB/DISCOM TARIFF BUILDER */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionStepTxt}>STEP 2 OF 3</Text>
          <Text style={styles.sectionTitle}>
            Connectors & {discomBoard} Tariff Builder
          </Text>
        </View>

        {/* 15A 3-Pin Socket Card */}
        <View
          style={[
            styles.connectorBuilderCard,
            enable15A && styles.connectorBuilderCardActive,
          ]}
        >
          <View style={styles.connHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.connTitle}>
                🔌 15A 3-Pin Socket (3.3 kW AC)
              </Text>
              <Text style={styles.connSub}>
                Ideal for Ather, Ola S1, Chetaks & overnight Tata/MG charging
              </Text>
            </View>
            <Switch
              value={enable15A}
              onValueChange={setEnable15A}
              trackColor={{ false: "#D5DBD7", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
          {enable15A && (
            <View style={styles.tariffInputRow}>
              <Text style={styles.tariffInputLabel}>Host Rate (₹ / kWh):</Text>
              <TextInput
                style={styles.rateInput}
                value={rate15A}
                onChangeText={setRate15A}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {/* Type-2 AC Wallbox Card */}
        <View
          style={[
            styles.connectorBuilderCard,
            enableType2 && styles.connectorBuilderCardActive,
          ]}
        >
          <View style={styles.connHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.connTitle}>
                ⚡ Type-2 AC Wallbox (7.4 kW / 22 kW)
              </Text>
              <Text style={styles.connSub}>
                Fast home wallbox for Tata Nexon EV, Punch EV, MG ZS EV, BYD
              </Text>
            </View>
            <Switch
              value={enableType2}
              onValueChange={setEnableType2}
              trackColor={{ false: "#D5DBD7", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
          {enableType2 && (
            <View style={styles.tariffInputRow}>
              <Text style={styles.tariffInputLabel}>Power (kW):</Text>
              <TextInput
                style={[styles.rateInput, { width: 70, marginRight: 10 }]}
                value={powerType2}
                onChangeText={setPowerType2}
                keyboardType="decimal-pad"
              />
              <Text style={styles.tariffInputLabel}>Rate (₹/kWh):</Text>
              <TextInput
                style={styles.rateInput}
                value={rateType2}
                onChangeText={setRateType2}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {/* CCS2 DC Fast Card */}
        <View
          style={[
            styles.connectorBuilderCard,
            enableCcs2 && styles.connectorBuilderCardActive,
          ]}
        >
          <View style={styles.connHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.connTitle}>
                🚀 Commercial CCS2 DC Fast (30 kW)
              </Text>
              <Text style={styles.connSub}>
                For shopowners, cafes, and commercial plaza hosts
              </Text>
            </View>
            <Switch
              value={enableCcs2}
              onValueChange={setEnableCcs2}
              trackColor={{ false: "#D5DBD7", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
          {enableCcs2 && (
            <View style={styles.tariffInputRow}>
              <Text style={styles.tariffInputLabel}>Host Rate (₹ / kWh):</Text>
              <TextInput
                style={styles.rateInput}
                value={rateCcs2}
                onChangeText={setRateCcs2}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        <View style={styles.ksebHintBox}>
          <Text style={styles.ksebHintTxt}>
            💡 {discomBoard} Domestic EV Reference: Base domestic tariff is
            ~₹6.50/kWh. Recommended P2P host range is ₹8.50 – ₹11.00/kWh (nets
            +₹2.00 to +₹4.50/kWh clean host profit).
          </Text>
        </View>
      </View>

      {/* SECTION 3: AMENITIES & INSTANT AUTO-APPROVE */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionStepTxt}>STEP 3 OF 3</Text>
          <Text style={styles.sectionTitle}>
            Host Amenities & Booking Rules
          </Text>
        </View>

        <View style={styles.amenitiesWrap}>
          {AMENITY_OPTIONS.map((item) => {
            const active = selectedAmenities.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.amenityChip, active && styles.amenityChipActive]}
                onPress={() => toggleAmenity(item)}
              >
                <Text
                  style={[
                    styles.amenityChipTxt,
                    active && styles.amenityChipTxtActive,
                  ]}
                >
                  {active ? `✓ ${item}` : item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.autoApproveRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.autoApproveTitle}>
              Auto-Approve Verified Drivers (≥ 4.5★)
            </Text>
            <Text style={styles.autoApproveSub}>
              When OFF, every booking lands in your Host Studio queue for manual
              Accept & Gate Pass issuance.
            </Text>
          </View>
          <Switch
            value={autoApproveHighRated}
            onValueChange={setAutoApproveHighRated}
            trackColor={{ false: "#D5DBD7", true: "#05E660" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#151C18" />
          ) : (
            <Text style={styles.publishBtnText}>
              {existingStation
                ? "✓ Save & Update Live Station"
                : "🚀 Publish My Charging Station"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F3",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeaderBadge: {
    marginBottom: 14,
  },
  sectionStepTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#151C18",
    marginBottom: 12,
  },
  rowGap: {
    flexDirection: "row",
    gap: 10,
  },
  discomWrap: {
    flexDirection: "row",
    gap: 6,
    height: 46,
    alignItems: "center",
  },
  discomChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5F7F6",
    alignItems: "center",
    justifyContent: "center",
  },
  discomChipActive: {
    backgroundColor: "#151C18",
  },
  discomChipTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5C6460",
  },
  discomChipTxtActive: {
    color: "#05E660",
  },
  pinHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pinHint: {
    fontSize: 11,
    color: "#7C857F",
  },
  gpsBtn: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#16B374",
  },
  gpsBtnTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  mapPreviewBox: {
    height: 195,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2E8E4",
    marginTop: 4,
  },
  connectorBuilderCard: {
    backgroundColor: "#F7F9F8",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EDF1EF",
  },
  connectorBuilderCardActive: {
    backgroundColor: "#F2FCF6",
    borderColor: "#16B374",
  },
  connHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
  connSub: {
    fontSize: 11,
    color: "#6E7772",
    marginTop: 2,
  },
  tariffInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E3EFE8",
  },
  tariffInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151C18",
    marginRight: 8,
  },
  rateInput: {
    height: 38,
    minWidth: 86,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5CF",
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#096B30",
  },
  ksebHintBox: {
    backgroundColor: "#EAFBF0",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  ksebHintTxt: {
    fontSize: 11,
    color: "#096B30",
    fontWeight: "700",
    lineHeight: 16,
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
  },
  amenityChipActive: {
    backgroundColor: "#151C18",
  },
  amenityChipTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
  },
  amenityChipTxtActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  autoApproveRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  autoApproveTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  autoApproveSub: {
    fontSize: 11,
    color: "#6E7772",
    marginTop: 2,
  },
  publishBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
});
