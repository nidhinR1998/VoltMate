import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  ChevronRight,
  Check,
  Zap,
  BatteryCharging,
  Gauge,
  X,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  INDIAN_EV_BRANDS,
  INDIAN_EV_CATALOG,
  IndianEvModelPreset,
  IndianEvBrandCategory,
} from "../../store/useVoltMateEngine";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";
import { COLORS, ELEVATION, SPACING, TYPOGRAPHY } from "../../theme/tokens";

export default function GarageSetupScreen() {
  const router = useRouter();
  const { addVehicle } = useVoltMateEngine();

  const defaultPreset =
    INDIAN_EV_CATALOG.find((m) => m.id === "tata-nexon-45") ||
    INDIAN_EV_CATALOG[0];

  const [selectedPreset, setSelectedPreset] =
    useState<IndianEvModelPreset>(defaultPreset);
  const [selectedBrand, setSelectedBrand] =
    useState<IndianEvBrandCategory | "ALL">("Tata Motors");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [plateError, setPlateError] = useState("");
  const [connectorChoice, setConnectorChoice] = useState<
    "CCS2" | "TYPE_2" | "SOCKET_15A"
  >(defaultPreset.connectorType);

  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return INDIAN_EV_CATALOG.filter((m) => {
      const matchesBrand =
        selectedBrand === "ALL" || m.brand === selectedBrand;
      if (!q) return matchesBrand;
      return (
        m.makeModel.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.segment.toLowerCase().includes(q)
      );
    });
  }, [selectedBrand, searchQuery]);

  const handleSelectModel = (preset: IndianEvModelPreset) => {
    setSelectedPreset(preset);
    setConnectorChoice(preset.connectorType);
    setPickerVisible(false);
  };

  const handleCompleteSetup = async () => {
    const rawPlate = plateNumber.trim().toUpperCase() || "KL-07-EV-2026";
    if (plateNumber.trim().length > 0 && plateNumber.trim().length < 6) {
      setPlateError("Enter a valid Indian registration number (e.g. KL-07-CS-4921).");
      return;
    }
    setPlateError("");

    const resolvedConnectorLabel =
      connectorChoice === "SOCKET_15A"
        ? "15A 3-Pin Socket & LECCS"
        : connectorChoice === "TYPE_2"
        ? "Type-2 AC Wallbox (7.4–22 kW)"
        : "CCS2 DC Fast & Type-2 AC";

    await addVehicle({
      makeModel: selectedPreset.makeModel,
      year: "2025",
      plateNumber: rawPlate,
      batteryCapacityKwh: selectedPreset.batteryCapacityKwh,
      connectorType: connectorChoice,
      connectorLabel: resolvedConnectorLabel,
      socPercent: 78,
      rangeKm: Math.round(selectedPreset.maxRangeKm * 0.78),
      maxRangeKm: selectedPreset.maxRangeKm,
    });
    router.replace("/(driver)/home");
  };

  const cleanModelTitle = (name: string) =>
    name.replace(/\s*\([\d.]+\s*kWh\)\s*$/i, "").trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Progress Header */}
        <View style={styles.topHeader}>
          <View style={styles.stepPill}>
            <Zap size={12} color="#05E660" fill="#05E660" />
            <Text style={styles.stepPillText}>STEP 2 OF 2 • EV GARAGE SETUP</Text>
          </View>
          <Text style={styles.title}>Select Your Electric Vehicle</Text>
          <Text style={styles.subtitle}>
            We automatically configure battery capacity, real-world range & fast-charging compatibility.
          </Text>
        </View>

        {/* Studio Hero Showcase Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.brandTag}>
              <Text style={styles.brandTagText}>
                {selectedPreset.manufacturer.toUpperCase()} • {selectedPreset.segment.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeEvBtn}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.changeEvBtnText}>Change EV</Text>
              <ChevronRight size={14} color="#096B30" />
            </TouchableOpacity>
          </View>

          <View style={styles.carImageWrap}>
            <EvCarHeroRender
              model={selectedPreset.makeModel}
              width={240}
              height={155}
            />
          </View>

          <Text style={styles.selectedModelName}>
            {cleanModelTitle(selectedPreset.makeModel)}
          </Text>

          {/* 3 Auto-Configured Spec Pills */}
          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <BatteryCharging size={16} color="#096B30" />
              <Text style={styles.specValue}>
                {selectedPreset.batteryCapacityKwh} kWh
              </Text>
              <Text style={styles.specLabel}>Battery Pack</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specBox}>
              <Gauge size={16} color="#096B30" />
              <Text style={styles.specValue}>
                {selectedPreset.maxRangeKm} km
              </Text>
              <Text style={styles.specLabel}>Real Range</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specBox}>
              <Zap size={16} color="#096B30" />
              <Text style={styles.specValue}>
                {selectedPreset.maxDcPowerKw} kW
              </Text>
              <Text style={styles.specLabel}>Max Fast Charge</Text>
            </View>
          </View>
        </View>

        {/* Configuration Form Card */}
        <View style={styles.formCard}>
          {/* 1. Tap to open full-screen model selector */}
          <Text style={styles.fieldLabel}>1. Electric Vehicle Model</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.selectorButton}
            onPress={() => setPickerVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.selectorTitle} numberOfLines={1}>
                {cleanModelTitle(selectedPreset.makeModel)}
              </Text>
              <Text style={styles.selectorSub}>
                {selectedPreset.manufacturer} • {selectedPreset.batteryCapacityKwh} kWh •{" "}
                {selectedPreset.maxRangeKm} km range • Tap to browse {INDIAN_EV_CATALOG.length} EVs
              </Text>
            </View>
            <View style={styles.browseBadge}>
              <Search size={14} color="#151C18" />
              <Text style={styles.browseBadgeText}>Browse</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Quick Brand Filter Strip */}
          <Text style={styles.fieldLabel}>Quick Filter by Brand</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandChipRow}
          >
            {INDIAN_EV_BRANDS.map((brand) => {
              const isSelected = selectedPreset.brand === brand;
              return (
                <TouchableOpacity
                  key={brand}
                  style={[
                    styles.brandChip,
                    isSelected && styles.brandChipActive,
                  ]}
                  onPress={() => {
                    setSelectedBrand(brand);
                    setSearchQuery("");
                    setPickerVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.brandChipText,
                      isSelected && styles.brandChipTextActive,
                    ]}
                  >
                    {brand}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 3. Registration Number Input */}
          <Text style={styles.fieldLabel}>
            2. Vehicle Registration Number (Optional)
          </Text>
          <View style={styles.plateInputWrap}>
            <View style={styles.indPlateBadge}>
              <Text style={styles.indPlateText}>IND</Text>
            </View>
            <TextInput
              style={styles.plateInput}
              value={plateNumber}
              onChangeText={(txt) => {
                setPlateNumber(txt.toUpperCase());
                if (plateError) setPlateError("");
              }}
              placeholder="KL-07-CS-4921"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={15}
            />
          </View>
          {plateError ? (
            <Text style={styles.errorText}>{plateError}</Text>
          ) : null}

          {/* 4. Preferred Charging Connector */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
            3. Compatible Charging Port
          </Text>
          <View style={styles.connectorList}>
            {(
              [
                {
                  key: "CCS2",
                  title: "CCS2 DC Fast + Type-2 AC",
                  desc: "30–350 kW Highway DC & 7.4 kW Home AC (4W Cars & SUVs)",
                },
                {
                  key: "TYPE_2",
                  title: "Type-2 AC Wallbox",
                  desc: "7.4–22 kW AC Destination & Home Chargers",
                },
                {
                  key: "SOCKET_15A",
                  title: "15A 3-Pin Domestic & LECCS",
                  desc: "3.3 kW Universal Plug & 2-Wheeler Fast Grid (Ather/Ola/TVS)",
                },
              ] as const
            ).map((item) => {
              const active = connectorChoice === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.85}
                  style={[
                    styles.connectorCard,
                    active && styles.connectorCardActive,
                  ]}
                  onPress={() => setConnectorChoice(item.key)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      active && styles.radioCircleActive,
                    ]}
                  >
                    {active && <Check size={12} color="#151C18" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.connectorTitle,
                        active && styles.connectorTitleActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.connectorDesc}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.saveBtn}
            onPress={handleCompleteSetup}
          >
            <Text style={styles.saveBtnText}>Save EV & Launch Dashboard</Text>
            <ChevronRight size={18} color="#151C18" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full-Screen Clean Vertical EV Catalog Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Choose Your Electric Vehicle</Text>
              <Text style={styles.modalSubtitle}>
                {INDIAN_EV_CATALOG.length} Official Indian 4W, Luxury & 2W Models
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setPickerVisible(false)}
            >
              <X size={20} color="#151C18" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrap}>
            <Search size={18} color="#6B746E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search model or brand (e.g. Nexon, BE 6, Windsor, Creta, Ather...)"
              placeholderTextColor="#8A928D"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#6B746E" />
              </TouchableOpacity>
            )}
          </View>

          {/* Brand Filter Tabs */}
          <View style={{ height: 48 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalBrandTabs}
            >
              {(["ALL", ...INDIAN_EV_BRANDS] as const).map((brand) => {
                const active = selectedBrand === brand;
                const count =
                  brand === "ALL"
                    ? INDIAN_EV_CATALOG.length
                    : INDIAN_EV_CATALOG.filter((m) => m.brand === brand).length;
                return (
                  <TouchableOpacity
                    key={brand}
                    style={[
                      styles.modalBrandTab,
                      active && styles.modalBrandTabActive,
                    ]}
                    onPress={() => setSelectedBrand(brand)}
                  >
                    <Text
                      style={[
                        styles.modalBrandTabText,
                        active && styles.modalBrandTabTextActive,
                      ]}
                    >
                      {brand === "ALL" ? "All Brands" : brand} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Vertical Scrollable List of Vehicle Cards */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modelListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredModels.map((item) => {
              const isSelected = selectedPreset.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.modelRowCard,
                    isSelected && styles.modelRowCardActive,
                  ]}
                  onPress={() => handleSelectModel(item)}
                >
                  <View style={styles.modelThumbWrap}>
                    <EvCarHeroRender
                      model={item.makeModel}
                      width={78}
                      height={54}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.modelBadgeLine}>
                      <Text style={styles.modelManufacturer}>
                        {item.manufacturer.toUpperCase()}
                      </Text>
                      <Text style={styles.modelSegmentDot}>•</Text>
                      <Text style={styles.modelSegment}>{item.segment}</Text>
                    </View>

                    <Text style={styles.modelRowTitle}>
                      {cleanModelTitle(item.makeModel)}
                    </Text>

                    <View style={styles.modelSpecPillsRow}>
                      <View style={styles.miniSpecPill}>
                        <Text style={styles.miniSpecText}>
                          {item.batteryCapacityKwh} kWh
                        </Text>
                      </View>
                      <View style={styles.miniSpecPill}>
                        <Text style={styles.miniSpecText}>
                          {item.maxRangeKm} km
                        </Text>
                      </View>
                      <View style={styles.miniSpecPill}>
                        <Text style={styles.miniSpecText}>
                          {item.maxDcPowerKw} kW
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.selectCircle,
                      isSelected && styles.selectCircleActive,
                    ]}
                  >
                    {isSelected ? (
                      <Check size={14} color="#151C18" />
                    ) : (
                      <ChevronRight size={16} color="#6B746E" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F5",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },
  topHeader: {
    marginBottom: 16,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#151C18",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  stepPillText: {
    color: "#05E660",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B746E",
    marginTop: 4,
    lineHeight: 18,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandTag: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  brandTagText: {
    color: "#096B30",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  changeEvBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F5F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  changeEvBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  carImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  selectedModelName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
    textAlign: "center",
    marginBottom: 14,
  },
  specsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  specBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  specDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E0E5E2",
  },
  specValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B746E",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2C3530",
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F7",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#16B374",
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
  selectorSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#096B30",
    marginTop: 3,
  },
  browseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#05E660",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
  },
  browseBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151C18",
  },
  brandChipRow: {
    gap: 8,
    paddingBottom: 16,
  },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
  },
  brandChipActive: {
    backgroundColor: "#151C18",
  },
  brandChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5550",
  },
  brandChipTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  plateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F7",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E7E4",
    overflow: "hidden",
    height: 50,
  },
  indPlateBadge: {
    backgroundColor: "#1E3A8A",
    height: "100%",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  indPlateText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: 1,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  connectorList: {
    gap: 10,
    marginBottom: 20,
  },
  connectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F7",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5EAE7",
    padding: 13,
    gap: 12,
  },
  connectorCardActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16B374",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    backgroundColor: "#05E660",
    borderColor: "#05E660",
  },
  connectorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  connectorTitleActive: {
    color: "#096B30",
  },
  connectorDesc: {
    fontSize: 11,
    color: "#6B746E",
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    height: 54,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...ELEVATION.level1,
  },
  saveBtnText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textInverse,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F4F6F5",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B746E",
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E0E6E3",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#151C18",
  },
  modalBrandTabs: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  modalBrandTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E8ECEA",
  },
  modalBrandTabActive: {
    backgroundColor: "#151C18",
  },
  modalBrandTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#37413D",
  },
  modalBrandTabTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  modelListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 10,
  },
  modelRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
    gap: 12,
  },
  modelRowCardActive: {
    borderColor: "#16B374",
    backgroundColor: "#F2FDF7",
  },
  modelThumbWrap: {
    width: 82,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#F7F9F8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modelBadgeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  modelManufacturer: {
    fontSize: 10,
    fontWeight: "800",
    color: "#096B30",
    letterSpacing: 0.5,
  },
  modelSegmentDot: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  modelSegment: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B746E",
  },
  modelRowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 6,
  },
  modelSpecPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniSpecPill: {
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniSpecText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#37413D",
  },
  selectCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  selectCircleActive: {
    backgroundColor: "#05E660",
  },
});
