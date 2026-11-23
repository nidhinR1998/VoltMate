import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Maximize2,
  PlugZap,
  Zap,
  Info,
  AlertTriangle,
  Check,
  X,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  ConnectorSpec,
} from "../../store/useVoltMateEngine";
import { LeafletMap } from "../../components/map/LeafletMap";
import {
  resolveLocalityFromCoordinates,
  reverseGeocodePin,
  validateAddressMatchesCoordinates,
} from "../../services/hybridMapService";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppChip,
  AppToggle,
  SectionHeader,
  StepProgress,
} from "../../components/ui/DesignSystem";

const AMENITY_OPTIONS = [
  "Covered Parking",
  "CCTV Monitored",
  "24/7 Access",
  "Washroom",
];

const DISCOM_OPTIONS = [
  { code: "KSEB", label: "KSEB" },
  { code: "BESCOM", label: "BESCOM" },
  { code: "TNEB", label: "TNEB" },
  { code: "MSEDCL", label: "MSEDCL" },
];

export default function AddChargerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stationId?: string }>();
  const {
    stations,
    user,
    userLocation,
    addOrUpdateHostStation,
    showToast,
    hideToast,
  } = useVoltMateEngine();

  const existingStation = params.stationId
    ? stations.find((s) => s.id === params.stationId)
    : undefined;

  const initialLat =
    existingStation?.latitude ?? userLocation?.latitude ?? 12.1045;
  const initialLng =
    existingStation?.longitude ?? userLocation?.longitude ?? 75.2058;
  const initialLocality = resolveLocalityFromCoordinates(initialLat, initialLng);

  // 3-Step Wizard State (0: Location, 1: Connectors & Tariffs, 2: Rules & Publish)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1: Identity & Exact GPS Pin
  const [name, setName] = useState(
    existingStation?.name || `${user?.fullName || "Home"} Covered EV Bay`
  );
  const [address, setAddress] = useState(
    existingStation?.address
      ? existingStation.address.split("•")[0].trim()
      : initialLocality.formattedAddress
  );
  const [city, setCity] = useState(
    existingStation?.city || initialLocality.city
  );
  const [pincode, setPincode] = useState(
    existingStation?.pincode || initialLocality.pincode
  );
  const [parkingBayCode, setParkingBayCode] = useState(
    "BAY-01 (Covered Porch)"
  );
  const [gateInstructions, setGateInstructions] = useState(
    "Ask security guard for Bay B-1 or ring doorbell #18 upon arrival."
  );
  const [discomBoard, setDiscomBoard] = useState("KSEB");
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [fullScreenMapVisible, setFullScreenMapVisible] = useState(false);

  // Step 2: Multi-Connector & Tariff Builder
  const [enable15A, setEnable15A] = useState(true);
  const [rate15A, setRate15A] = useState("8.50");

  const [enableType2, setEnableType2] = useState(true);
  const [rateType2, setRateType2] = useState(
    existingStation ? existingStation.pricePerKwh.toFixed(2) : "10.50"
  );
  const [powerType2, setPowerType2] = useState("7.4");

  const [enableCcs2, setEnableCcs2] = useState(false);
  const [rateCcs2, setRateCcs2] = useState("14.50");

  // Step 3: Amenities & Auto-Approve
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "Covered Parking",
    "CCTV Monitored",
    "24/7 Access",
  ]);
  const [autoApproveHighRated, setAutoApproveHighRated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccessModal, setPublishedSuccessModal] = useState(false);

  const reverseGeocodeAndSetAddress = async (lat: number, lng: number) => {
    const resolved = await reverseGeocodePin(lat, lng, (coords) =>
      Location.reverseGeocodeAsync(coords)
    );
    setAddress(resolved.formattedAddress);
    setCity(resolved.city);
    setPincode(resolved.pincode);
  };

  const addressValidation = validateAddressMatchesCoordinates(
    `${address}, ${city} ${pincode}`,
    pinCoords.lat,
    pinCoords.lng,
    25
  );

  useEffect(() => {
    if (existingStation) {
      setName(existingStation.name);
      const loc = resolveLocalityFromCoordinates(
        existingStation.latitude,
        existingStation.longitude
      );
      const check = validateAddressMatchesCoordinates(
        existingStation.address,
        existingStation.latitude,
        existingStation.longitude,
        25
      );
      setAddress(
        check.valid
          ? existingStation.address.split("•")[0].trim()
          : loc.formattedAddress
      );
      setCity(existingStation.city || loc.city);
      setPincode(existingStation.pincode || loc.pincode);
      setPinCoords({
        lat: existingStation.latitude,
        lng: existingStation.longitude,
      });
      return;
    }
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown?.coords) {
            const lat = Number(lastKnown.coords.latitude.toFixed(6));
            const lng = Number(lastKnown.coords.longitude.toFixed(6));
            setPinCoords({ lat, lng });
            await reverseGeocodeAndSetAddress(lat, lng);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [existingStation?.id]);

  const handleUseCurrentGps = async () => {
    setIsLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
        ]);
        const coords =
          pos?.coords || (await Location.getLastKnownPositionAsync())?.coords;
        if (coords) {
          const lat = Number(coords.latitude.toFixed(6));
          const lng = Number(coords.longitude.toFixed(6));
          setPinCoords({ lat, lng });
          await reverseGeocodeAndSetAddress(lat, lng);
          showToast(
            "GPS Location Updated",
            "Driveway pin and street address synced with your current GPS.",
            "success"
          );
        }
      } else {
        showToast(
          "Location Permission Needed",
          "Tap on the map preview to position your driveway pin.",
          "warning"
        );
      }
    } catch {
      showToast(
        "Manual Pin Mode",
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

  // Tariff validation warnings (Step 4 requirement)
  const num15A = parseFloat(rate15A) || 0;
  const numType2 = parseFloat(rateType2) || 0;
  const numCcs2 = parseFloat(rateCcs2) || 0;

  const hasTariffWarning =
    (enable15A && (num15A < 6.5 || num15A > 12.5)) ||
    (enableType2 && (numType2 < 7.0 || numType2 > 14.0)) ||
    (enableCcs2 && (numCcs2 < 10.0 || numCcs2 > 15.5));

  const validateAndAdvance = (nextStep: number) => {
    setFormError(null);
    if (currentStep === 0 && nextStep > 0) {
      if (!name.trim() || name.trim().length < 3) {
        setFormError("Please enter a valid Station Title (min 3 characters).");
        return;
      }
      if (!address.trim() || address.trim().length < 5) {
        setFormError("Please enter a readable street address for EV drivers.");
        return;
      }
      if (!addressValidation.valid) {
        setFormError(
          addressValidation.warningMessage ||
            "Your typed address/city does not match the GPS pin on the map."
        );
        return;
      }
    }
    if (currentStep === 1 && nextStep > 1) {
      if (!enable15A && !enableType2 && !enableCcs2) {
        setFormError(
          "Enable at least one EV connector (15A, Type-2, or CCS2) to continue."
        );
        return;
      }
    }
    setCurrentStep(nextStep);
  };

  const handlePublish = async () => {
    setFormError(null);
    if (!addressValidation.valid) {
      setFormError(
        addressValidation.warningMessage ||
          "Your typed address/city does not match the GPS pin on the map."
      );
      return;
    }
    const connectorSpecs: ConnectorSpec[] = [];
    const connectorTypes: string[] = [];

    if (enable15A) {
      const r = parseFloat(rate15A) || 8.5;
      connectorTypes.push("15A 3-Pin Socket");
      connectorSpecs.push({
        id: "conn-15a",
        name: "15A 3-Pin Socket • 3.3 kW AC",
        powerKw: 3.3,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot A1 • Available",
        plugImage: "TYPE_A",
      });
    }

    if (enableType2) {
      const r = parseFloat(rateType2) || 10.5;
      const kw = parseFloat(powerType2) || 7.4;
      connectorTypes.push("Type-2 AC");
      connectorSpecs.push({
        id: "conn-type2",
        name: `Type-2 AC • ${kw.toFixed(1)} kW`,
        powerKw: kw,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot B1 • Available",
        plugImage: "TYPE_B",
      });
    }

    if (enableCcs2) {
      const r = parseFloat(rateCcs2) || 14.5;
      connectorTypes.push("CCS2 DC Fast");
      connectorSpecs.push({
        id: "conn-ccs2",
        name: "CCS2 DC Fast • 30 kW",
        powerKw: 30.0,
        pricePerKwh: r,
        priceLabel: `₹${r.toFixed(2)}/kWh`,
        slotLabel: "Slot C1 • Available",
        plugImage: "CHADEMO",
      });
    }

    if (connectorSpecs.length === 0) {
      setFormError("Enable at least one connector before publishing.");
      return;
    }

    setIsPublishing(true);
    const primaryPrice = Math.min(...connectorSpecs.map((c) => c.pricePerKwh));
    const maxKw = Math.max(...connectorSpecs.map((c) => c.powerKw));
    const addrWithCity = address.toLowerCase().includes(city.toLowerCase())
      ? address.trim()
      : `${address.trim()}, ${city.trim()} ${pincode.trim()}`.trim();
    const fullAddress = `${addrWithCity} • ${parkingBayCode.trim()}`;

    try {
      await addOrUpdateHostStation({
        id: existingStation?.id,
        name: name.trim() || "Home P2P EV Charger",
        hostName: user?.fullName || "Verified EV Host",
        address: fullAddress,
        city: city.trim(),
        pincode: pincode.trim(),
        latitude: pinCoords.lat,
        longitude: pinCoords.lng,
        connectorTypes,
        connectorSpecs,
        maxPowerKw: maxKw,
        pricePerKwh: primaryPrice,
        isOnline: true,
      });
      hideToast();
      setIsPublishing(false);
      setPublishedSuccessModal(true);
    } catch (err: any) {
      setIsPublishing(false);
      setFormError(
        err?.message ||
          "Could not publish station: address does not match GPS pin."
      );
    }
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
          onPress={() => {
            if (currentStep > 0) {
              setCurrentStep(currentStep - 1);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(host)/dashboard");
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {existingStation ? "Edit My Host Station" : "Host My P2P Charger"}
        </Text>
        <View style={{ width: SPACING.touchTarget }} />
      </View>

      {/* Real 3-Step Progress Bar */}
      <View style={styles.progressWrap}>
        <StepProgress
          steps={["1. Location", "2. Connectors", "3. Rules & Publish"]}
          currentStep={currentStep}
          onStepPress={(idx) => validateAndAdvance(idx)}
        />
      </View>

      {formError && (
        <View style={styles.errorBanner}>
          <AlertTriangle size={16} color={COLORS.destructive} />
          <Text style={styles.errorBannerTxt}>{formError}</Text>
        </View>
      )}

      {/* STEP 1: LOCATION & ACCESS */}
      {currentStep === 0 && (
        <AppCard style={styles.card}>
          <Text style={styles.sectionStepTxt}>STEP 1 OF 3</Text>
          <Text style={styles.sectionTitle}>
            Station Location & Driveway Access
          </Text>

          <Text style={styles.label}>Station Title</Text>
          <TextInput
            style={[
              styles.input,
              focusedField === "name" && styles.inputFocused,
            ]}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            placeholder="e.g. Green Villa Covered EV Bay"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Street Address & Locality</Text>
          <TextInput
            style={[
              styles.input,
              focusedField === "address" && styles.inputFocused,
              !addressValidation.valid && { borderColor: COLORS.destructive },
            ]}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setFocusedField("address")}
            onBlur={() => setFocusedField(null)}
            placeholder="House / Building, Road, Town"
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>City / Town (From Pin)</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "city" && styles.inputFocused,
                ]}
                value={city}
                onChangeText={setCity}
                onFocus={() => setFocusedField("city")}
                onBlur={() => setFocusedField(null)}
                placeholder="Payyanur"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ width: 124 }}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "pincode" && styles.inputFocused,
                ]}
                value={pincode}
                onChangeText={setPincode}
                onFocus={() => setFocusedField("pincode")}
                onBlur={() => setFocusedField(null)}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="670307"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {!addressValidation.valid && (
            <View style={styles.warningCallout}>
              <AlertTriangle size={16} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningCalloutTxt}>
                  {addressValidation.warningMessage}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAddress(addressValidation.suggestedAddress);
                    setCity(addressValidation.pinCity);
                    setPincode(addressValidation.pinPincode);
                    setFormError(null);
                  }}
                  style={{ marginTop: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Sync address to pin in ${addressValidation.pinCity}`}
                >
                  <Text
                    style={{
                      ...TYPOGRAPHY.captionSemibold,
                      color: COLORS.primary,
                    }}
                  >
                    Sync Address to Pin ({addressValidation.pinCity}{" "}
                    {addressValidation.pinPincode}) →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Parking Bay Code</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "bay" && styles.inputFocused,
                ]}
                value={parkingBayCode}
                onChangeText={setParkingBayCode}
                onFocus={() => setFocusedField("bay")}
                onBlur={() => setFocusedField(null)}
                placeholder="BAY-01"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>State Grid Tariff</Text>
              <View style={styles.discomWrap}>
                {DISCOM_OPTIONS.slice(0, 2).map((d) => (
                  <AppChip
                    key={d.code}
                    label={d.code === "KSEB" ? "Kerala" : "Karnataka"}
                    selected={discomBoard === d.code}
                    style={{ flex: 1 }}
                    onPress={() => setDiscomBoard(d.code)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Readable Address Label + Coordinates as Secondary Text Only */}
          <View style={styles.pinHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label} numberOfLines={1}>
                Driveway Pin: {address}
              </Text>
              <Text style={styles.coordSecondaryTxt}>
                GPS: {pinCoords.lat.toFixed(4)}° N, {pinCoords.lng.toFixed(4)}°
                E
              </Text>
            </View>
            <AppButton
              label="Use My GPS"
              variant="secondary"
              size="md"
              loading={isLocatingGps}
              icon={<MapPin size={15} color={COLORS.primary} />}
              onPress={handleUseCurrentGps}
            />
          </View>

          <View style={styles.mapPreviewBox}>
            <LeafletMap
              centerLat={pinCoords.lat}
              centerLng={pinCoords.lng}
              zoom={16}
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
              onMapPress={(lat, lng) => {
                const nextLat = Number(lat.toFixed(6));
                const nextLng = Number(lng.toFixed(6));
                setPinCoords({ lat: nextLat, lng: nextLng });
                void reverseGeocodeAndSetAddress(nextLat, nextLng);
              }}
            />
            <TouchableOpacity
              style={styles.fullScreenMapBtn}
              onPress={() => setFullScreenMapVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open full screen pin drop map"
            >
              <Maximize2 size={14} color={COLORS.textPrimary} />
              <Text style={styles.fullScreenMapBtnTxt}>
                Full-Screen Pin Drop
              </Text>
            </TouchableOpacity>
          </View>

          {/* Multiline Gate Instructions with Proper Helper Text */}
          <Text style={[styles.label, { marginTop: SPACING.sm }]}>
            Gate & Arrival Instructions
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              focusedField === "gate" && styles.inputFocused,
            ]}
            value={gateInstructions}
            onChangeText={setGateInstructions}
            onFocus={() => setFocusedField("gate")}
            onBlur={() => setFocusedField(null)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Describe where the charger is located and how the driver should enter..."
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.helperText}>
            Helper: Tell drivers which gate, security guard, or bell to use upon
            arrival.
          </Text>

          <AppButton
            label="Next: Connectors & Tariffs"
            variant="primary"
            size="lg"
            style={{ marginTop: SPACING.md }}
            icon={<ArrowRight size={18} color={COLORS.textInverse} />}
            onPress={() => validateAndAdvance(1)}
          />
        </AppCard>
      )}

      {/* STEP 2: CONNECTORS & TARIFF BUILDER */}
      {currentStep === 1 && (
        <AppCard style={styles.card}>
          <Text style={styles.sectionStepTxt}>STEP 2 OF 3</Text>
          <SectionHeader
            title="Connectors & Tariff Builder"
            infoTitle="Home Tariff Guide"
            infoText="Base domestic EV tariff is ~₹6.50/kWh. Hosting at ₹8.50–₹11.00/kWh earns +₹2 to +₹4.50/kWh net profit while keeping rates attractive to drivers."
          />

          {/* 15A 3-Pin Socket Card */}
          <View
            style={[
              styles.connectorBuilderCard,
              enable15A && styles.connectorBuilderCardActive,
            ]}
          >
            <View style={styles.connHeaderRow}>
              <View style={styles.connIconBox}>
                <PlugZap size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connTitle}>
                  15A 3-Pin Socket (3.3 kW AC)
                </Text>
                <Text style={styles.connSub}>
                  For Ather, Ola S1, Chetak & overnight 4W charging
                </Text>
              </View>
              <AppToggle
                value={enable15A}
                onValueChange={setEnable15A}
                accessibilityLabel="Enable 15A 3-Pin Socket"
              />
            </View>
            {enable15A && (
              <View style={styles.tariffStackedGrid}>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Max Power (kW)</Text>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyFieldTxt}>3.3 kW AC</Text>
                  </View>
                </View>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Rate (₹/kWh)</Text>
                  <TextInput
                    style={styles.rateInputBox}
                    value={rate15A}
                    onChangeText={setRate15A}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Type-2 AC Wallbox Card — P0 Bug #3 Fix: Flexible 2-Column Stacked Fields */}
          <View
            style={[
              styles.connectorBuilderCard,
              enableType2 && styles.connectorBuilderCardActive,
            ]}
          >
            <View style={styles.connHeaderRow}>
              <View style={styles.connIconBox}>
                <Zap size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connTitle}>
                  Type-2 AC Wallbox (7.4 / 22 kW)
                </Text>
                <Text style={styles.connSub}>
                  Fast home wallbox for Tata Nexon.ev, MG ZS, Mahindra, BYD
                </Text>
              </View>
              <AppToggle
                value={enableType2}
                onValueChange={setEnableType2}
                accessibilityLabel="Enable Type-2 AC Wallbox"
              />
            </View>
            {enableType2 && (
              <View style={styles.tariffStackedGrid}>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Power (kW)</Text>
                  <TextInput
                    style={styles.rateInputBox}
                    value={powerType2}
                    onChangeText={setPowerType2}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Rate (₹/kWh)</Text>
                  <TextInput
                    style={styles.rateInputBox}
                    value={rateType2}
                    onChangeText={setRateType2}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Commercial CCS2 DC Fast Card */}
          <View
            style={[
              styles.connectorBuilderCard,
              enableCcs2 && styles.connectorBuilderCardActive,
            ]}
          >
            <View style={styles.connHeaderRow}>
              <View style={styles.connIconBox}>
                <Zap size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connTitle}>
                  Commercial CCS2 DC Fast (30 kW)
                </Text>
                <Text style={styles.connSub}>
                  For commercial properties, highway cafes & retail plazas
                </Text>
              </View>
              <AppToggle
                value={enableCcs2}
                onValueChange={setEnableCcs2}
                accessibilityLabel="Enable Commercial CCS2 DC Fast"
              />
            </View>
            {enableCcs2 && (
              <View style={styles.tariffStackedGrid}>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Max Power (kW)</Text>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyFieldTxt}>30.0 kW DC</Text>
                  </View>
                </View>
                <View style={styles.tariffFieldCol}>
                  <Text style={styles.tariffFieldLabel}>Rate (₹/kWh)</Text>
                  <TextInput
                    style={styles.rateInputBox}
                    value={rateCcs2}
                    onChangeText={setRateCcs2}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Tariff Range Warning Banner when outside recommended domestic range */}
          {hasTariffWarning && (
            <View style={styles.warningCallout}>
              <AlertTriangle size={16} color={COLORS.warning} />
              <Text style={styles.warningCalloutTxt}>
                Tariff outside recommended range (₹8.50–₹12.50/kWh for AC or
                ≤₹15.00/kWh for DC). High rates may reduce driver bookings.
              </Text>
            </View>
          )}

          <View style={styles.wizardNavRow}>
            <AppButton
              label="Back"
              variant="secondary"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => setCurrentStep(0)}
            />
            <AppButton
              label="Next: Rules"
              variant="primary"
              size="lg"
              style={{ flex: 1.4 }}
              onPress={() => validateAndAdvance(2)}
            />
          </View>
        </AppCard>
      )}

      {/* STEP 3: AMENITIES, BOOKING RULES & PUBLISH */}
      {currentStep === 2 && (
        <AppCard style={styles.card}>
          <Text style={styles.sectionStepTxt}>STEP 3 OF 3</Text>
          <Text style={styles.sectionTitle}>
            Host Amenities & Booking Rules
          </Text>

          <Text style={styles.label}>Available Driveway Amenities</Text>
          <View style={styles.amenitiesWrap}>
            {AMENITY_OPTIONS.map((item) => {
              const active = selectedAmenities.includes(item);
              return (
                <AppChip
                  key={item}
                  label={item}
                  selected={active}
                  onPress={() => toggleAmenity(item)}
                />
              );
            })}
          </View>

          <View style={styles.autoApproveRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.autoApproveTitle}>
                Auto-Approve Verified Drivers (≥ 4.5 Rating)
              </Text>
              <Text style={styles.autoApproveSub}>
                When OFF, bookings wait in your Host Studio queue for manual
                approval.
              </Text>
            </View>
            <AppToggle
              value={autoApproveHighRated}
              onValueChange={setAutoApproveHighRated}
              accessibilityLabel="Toggle auto-approve verified drivers"
            />
          </View>

          {/* Pre-Publish Summary Box */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>{name}</Text>
            <Text style={styles.summarySub}>
              {address} • {parkingBayCode}
            </Text>
            <Text style={styles.summaryTariff}>
              Active Connectors:{" "}
              {[
                enable15A ? `15A (₹${rate15A})` : null,
                enableType2 ? `Type-2 (₹${rateType2})` : null,
                enableCcs2 ? `CCS2 (₹${rateCcs2})` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          </View>

          <View style={styles.wizardNavRow}>
            <AppButton
              label="Back"
              variant="secondary"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => setCurrentStep(1)}
            />
            <AppButton
              label={
                existingStation ? "Save & Update" : "Publish Charging Station"
              }
              variant="primary"
              size="lg"
              loading={isPublishing}
              style={{ flex: 1.6 }}
              icon={<Check size={18} color={COLORS.textInverse} />}
              onPress={handlePublish}
            />
          </View>
        </AppCard>
      )}

      {/* Full-Screen Pin-Drop Map Modal */}
      <Modal
        visible={fullScreenMapVisible}
        animationType="slide"
        onRequestClose={() => setFullScreenMapVisible(false)}
      >
        <View style={styles.fullMapContainer}>
          <LeafletMap
            centerLat={pinCoords.lat}
            centerLng={pinCoords.lng}
            zoom={17}
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
            onMapPress={(lat, lng) => {
              const nextLat = Number(lat.toFixed(6));
              const nextLng = Number(lng.toFixed(6));
              setPinCoords({ lat: nextLat, lng: nextLng });
              void reverseGeocodeAndSetAddress(nextLat, nextLng);
            }}
          />
          <View style={styles.fullMapTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullMapTitle}>Tap Map to Position Pin</Text>
              <Text style={styles.fullMapSub} numberOfLines={1}>
                {address} ({pinCoords.lat.toFixed(4)}° N,{" "}
                {pinCoords.lng.toFixed(4)}° E)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeFullMapBtn}
              onPress={() => setFullScreenMapVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close full screen map"
            >
              <X size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fullMapBottomBar}>
            <AppButton
              label="Confirm Driveway Pin Location"
              variant="primary"
              size="lg"
              onPress={() => setFullScreenMapVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Publish Success Confirmation Modal (Step 4: Loading -> Success -> Navigate with Confirmation) */}
      <Modal
        visible={publishedSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPublishedSuccessModal(false);
          router.replace("/(host)/dashboard");
        }}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successBadgeCircle}>
              <Check size={28} color={COLORS.textInverse} strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>
              {existingStation
                ? "Station Updated Live!"
                : "Station Published Live!"}
            </Text>
            <Text style={styles.successSub}>
              {name} ({address}) is now visible to verified EV drivers on the
              VoltMate radar.
            </Text>
            <AppButton
              label="Go to Host Studio"
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              onPress={() => {
                setPublishedSuccessModal(false);
                router.replace("/(host)/dashboard");
              }}
            />
          </View>
        </View>
      </Modal>
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
    marginBottom: SPACING.sm,
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
  progressWrap: {
    marginBottom: SPACING.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 14,
    padding: 12,
    marginBottom: SPACING.sm,
  },
  errorBannerTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.destructive,
    flex: 1,
  },
  card: {
    marginBottom: SPACING.md,
  },
  sectionStepTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  multilineInput: {
    minHeight: 84,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 4,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rowGap: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  discomWrap: {
    flexDirection: "row",
    gap: 6,
    height: 48,
    alignItems: "center",
  },
  pinHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    marginTop: 4,
  },
  coordSecondaryTxt: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  mapPreviewBox: {
    height: 196,
    borderRadius: SPACING.cardRadius,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    position: "relative",
  },
  fullScreenMapBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullScreenMapBtnTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  connectorBuilderCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  connectorBuilderCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  connHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  connIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  connTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  connSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tariffStackedGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryBorder,
  },
  tariffFieldCol: {
    flex: 1,
    minWidth: 0,
  },
  tariffFieldLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  rateInputBox: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 12,
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  readOnlyField: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  readOnlyFieldTxt: {
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  warningCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.warningBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningCalloutTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.warning,
    flex: 1,
  },
  ksebHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  ksebHintTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
    flex: 1,
  },
  wizardNavRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.md,
  },
  autoApproveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  autoApproveTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  autoApproveSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  summaryTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  summarySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryTariff: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
    marginTop: 6,
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fullMapTopBar: {
    position: "absolute",
    top: 20,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullMapTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  fullMapSub: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeFullMapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  fullMapBottomBar: {
    position: "absolute",
    bottom: 28,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    paddingHorizontal: SPACING.screenMargin,
  },
  successModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: "center",
  },
  successBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  successTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  successSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
});
