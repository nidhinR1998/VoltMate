import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Zap,
  Trash2,
  Search,
  Check,
  Smartphone,
} from "lucide-react-native";
import {
  useVoltMateEngine,
  INDIAN_EV_BRANDS,
  INDIAN_EV_CATALOG,
  IndianEvModelPreset,
} from "../../store/useVoltMateEngine";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppChip,
  SectionHeader,
} from "../../components/ui/DesignSystem";

export default function GarageWalletScreen() {
  const router = useRouter();
  const {
    user,
    vehicles,
    transactions,
    topUpWallet,
    addVehicle,
    setPrimaryVehicle,
    removeVehicle,
  } = useVoltMateEngine();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] =
    useState<IndianEvModelPreset["brand"]>("Tata Motors");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [makeModel, setMakeModel] = useState(
    "Tata Nexon.ev Empowered+ 45 (45 kWh)"
  );
  const [year, setYear] = useState("2025");
  const [plateNumber, setPlateNumber] = useState("KL-07-EV-8821");
  const [batteryCapacity, setBatteryCapacity] = useState("45.0");
  const [maxRange, setMaxRange] = useState<number>(350);
  const [connectorLabel, setConnectorLabel] = useState<string>(
    "CCS2 DC & Type-2 AC"
  );
  const [upiMethod, setUpiMethod] = useState<"GPay" | "PhonePe" | "Paytm">(
    "GPay"
  );

  const brandModels = modelSearchQuery.trim()
    ? INDIAN_EV_CATALOG.filter(
        (m) =>
          m.makeModel
            .toLowerCase()
            .includes(modelSearchQuery.trim().toLowerCase()) ||
          m.manufacturer
            .toLowerCase()
            .includes(modelSearchQuery.trim().toLowerCase()) ||
          m.segment
            .toLowerCase()
            .includes(modelSearchQuery.trim().toLowerCase())
      )
    : INDIAN_EV_CATALOG.filter((m) => m.brand === selectedBrand);

  const selectModelPreset = (preset: IndianEvModelPreset) => {
    setMakeModel(preset.makeModel);
    setBatteryCapacity(String(preset.batteryCapacityKwh));
    setMaxRange(preset.maxRangeKm);
    setConnectorLabel(preset.connectorLabel);
  };

  const handleSaveVehicle = async () => {
    if (!makeModel.trim()) return;
    const capNum = parseFloat(batteryCapacity) || 40.5;
    const matchedPreset = INDIAN_EV_CATALOG.find(
      (p) => p.makeModel.toLowerCase() === makeModel.trim().toLowerCase()
    );
    const fullRange =
      matchedPreset?.maxRangeKm ||
      maxRange ||
      (capNum < 10 ? Math.round(capNum * 30) : Math.round(capNum * 7.6));

    await addVehicle({
      makeModel: makeModel.trim(),
      year: year.trim() || "2025",
      plateNumber: plateNumber.trim().toUpperCase() || "KL-07-EV-2026",
      batteryCapacityKwh: capNum,
      connectorType: connectorLabel.includes("15A")
        ? "SOCKET_15A"
        : connectorLabel.includes("Type-2 AC") &&
          !connectorLabel.includes("CCS2")
        ? "TYPE_2"
        : "CCS2",
      connectorLabel,
      socPercent: 80,
      rangeKm: Math.round(fullRange * 0.8),
      maxRangeKm: fullRange,
    });
    setAddModalVisible(false);
  };

  const confirmDeleteVehicle = (id: string, modelName: string) => {
    Alert.alert(
      "Remove EV from Garage",
      `Are you sure you want to remove ${modelName} from your VoltMate garage?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeVehicle(id),
        },
      ]
    );
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
              : router.replace("/(driver)/profile")
          }
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>EV Garage & Wallet</Text>
        <AppButton
          label="Add EV"
          variant="secondary"
          size="md"
          icon={<Plus size={16} color={COLORS.primary} />}
          onPress={() => setAddModalVisible(true)}
        />
      </View>

      {/* Wallet Card (₹ INR + Instant UPI Top-Up) */}
      <View style={styles.walletCard}>
        <View style={styles.walletTopLine}>
          <View>
            <Text style={styles.walletLabel}>
              VOLTMATE CREDITS BALANCE (₹ INR)
            </Text>
            <Text style={styles.walletBalance}>
              ₹
              {(user?.voltCreditsBalance ?? 1450.0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.upiVerifiedTag}>
            <Text style={styles.upiVerifiedTxt}>
              UPI: {user?.upiId || "driver@okaxis"}
            </Text>
          </View>
        </View>

        <View style={styles.upiSelectorRow}>
          {(["GPay", "PhonePe", "Paytm"] as const).map((app) => {
            const isSel = upiMethod === app;
            return (
              <TouchableOpacity
                key={app}
                style={[
                  styles.upiMethodChip,
                  isSel && styles.upiMethodChipActive,
                ]}
                onPress={() => setUpiMethod(app)}
              >
                <Smartphone
                  size={13}
                  color={isSel ? COLORS.neonLive : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.upiMethodChipTxt,
                    isSel && styles.upiMethodChipTxtActive,
                  ]}
                >
                  {app}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.topUpRow}>
          {[200, 500, 1000, 2000].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.topUpChip}
              onPress={() => topUpWallet(amt, `${upiMethod} UPI`)}
            >
              <Text style={styles.topUpChipText}>+₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vehicles List */}
      <SectionHeader
        title={`My Electric Vehicles (${vehicles.length})`}
        actionLabel="+ Add Vehicle"
        onPressAction={() => setAddModalVisible(true)}
      />

      {vehicles.map((v) => (
        <AppCard
          key={v.id}
          selected={v.isPrimary}
          onPress={() => setPrimaryVehicle(v.id)}
          style={styles.vehicleCard}
        >
          <View style={styles.vehicleTopRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.badgeRow}>
                {v.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>ACTIVE EV</Text>
                  </View>
                ) : (
                  <View style={styles.tapToSwitchBadge}>
                    <Text style={styles.tapToSwitchTxt}>TAP TO SET ACTIVE</Text>
                  </View>
                )}
                <Text style={styles.plateTag}>{v.plateNumber}</Text>
              </View>
              <Text style={styles.vehicleName} numberOfLines={2}>
                {v.makeModel}
              </Text>
              <Text style={styles.vehicleSub} numberOfLines={2}>
                {v.year} • {v.connectorLabel} • {v.batteryCapacityKwh} kWh
              </Text>
              <View style={styles.rangeInline}>
                <Zap size={13} color={COLORS.primary} />
                <Text style={styles.vehicleRange}>
                  {v.socPercent}% SoC • {v.rangeKm} km Est. Range
                </Text>
              </View>
            </View>
            <View style={styles.carThumb}>
              <EvCarHeroRender model={v.makeModel} width={110} height={76} />
            </View>
          </View>

          {vehicles.length > 1 && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => confirmDeleteVehicle(v.id, v.makeModel)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${v.makeModel}`}
            >
              <Trash2 size={14} color={COLORS.destructive} />
              <Text style={styles.removeBtnText}>Remove Vehicle</Text>
            </TouchableOpacity>
          )}
        </AppCard>
      ))}

      {/* Recent Wallet Transactions */}
      <Text style={styles.sectionTitle}>Recent ₹ INR Wallet Ledger</Text>
      <AppCard style={styles.txListCard}>
        {transactions.map((tx, idx) => (
          <View
            key={tx.id}
            style={[
              styles.txRow,
              idx === transactions.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{tx.title}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                { color: tx.isCredit ? COLORS.primary : COLORS.textPrimary },
              ]}
            >
              {tx.amount}
            </Text>
          </View>
        ))}
      </AppCard>

      {/* Add Vehicle Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Electric Vehicle</Text>
            <Text style={styles.modalHint}>
              {INDIAN_EV_CATALOG.length}+ Official Indian 4W, Luxury & 2W EV
              Models
            </Text>

            <View style={{ alignItems: "center", marginVertical: 4 }}>
              <EvCarHeroRender model={makeModel} width={155} height={100} />
            </View>

            <View style={styles.searchWrap}>
              <Search size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search EV model (Nexon, BE 6, Windsor, Ather...)"
                placeholderTextColor={COLORS.textMuted}
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
              />
            </View>

            <Text style={styles.inputLabel}>1. Select Brand Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScrollRow}
            >
              {INDIAN_EV_BRANDS.map((brand) => {
                const count = INDIAN_EV_CATALOG.filter(
                  (m) => m.brand === brand
                ).length;
                const isSelected =
                  selectedBrand === brand && !modelSearchQuery.trim();
                return (
                  <AppChip
                    key={brand}
                    label={`${brand} (${count})`}
                    selected={isSelected}
                    onPress={() => {
                      setModelSearchQuery("");
                      setSelectedBrand(brand);
                      const firstModel = INDIAN_EV_CATALOG.find(
                        (m) => m.brand === brand
                      );
                      if (firstModel) selectModelPreset(firstModel);
                    }}
                  />
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>
              2. Tap Your Model ({brandModels.length} matches)
            </Text>
            <ScrollView
              style={{ maxHeight: 155, marginBottom: 10 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {brandModels.map((preset) => {
                const active = makeModel === preset.makeModel;
                const cleanTitle = preset.makeModel
                  .replace(/\s*\([\d.]+\s*kWh\)\s*$/i, "")
                  .trim();
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.85}
                    style={[
                      styles.modelPresetRow,
                      active && styles.modelPresetRowActive,
                    ]}
                    onPress={() => selectModelPreset(preset)}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.modelPresetTitle} numberOfLines={2}>
                        {cleanTitle}
                      </Text>
                      <Text style={styles.modelPresetMeta}>
                        {preset.segment} • {preset.batteryCapacityKwh} kWh •{" "}
                        {preset.maxRangeKm} km • {preset.maxDcPowerKw} kW
                      </Text>
                    </View>
                    {active && (
                      <View style={styles.activeCheckBadge}>
                        <Check
                          size={13}
                          color={COLORS.textInverse}
                          strokeWidth={3}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Reg. Plate Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="KL-07-CS-4921"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                />
              </View>
              <View style={{ width: 112 }}>
                <Text style={styles.inputLabel}>Battery (kWh)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="40.5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={batteryCapacity}
                  onChangeText={setBatteryCapacity}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Charging Connector</Text>
            <View style={styles.connRow}>
              {["CCS2 & Type-2", "Type-2 AC Wallbox", "15A 3-Pin Socket"].map(
                (c) => (
                  <AppChip
                    key={c}
                    label={c}
                    selected={connectorLabel === c}
                    style={{ flex: 1 }}
                    onPress={() => setConnectorLabel(c)}
                  />
                )
              )}
            </View>

            <View style={styles.modalActions}>
              <AppButton
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setAddModalVisible(false)}
              />
              <AppButton
                label="Save Vehicle"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleSaveVehicle}
              />
            </View>
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
  walletCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadiusLarge,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  walletTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  walletLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: "#A7F3D0",
  },
  walletBalance: {
    ...TYPOGRAPHY.display,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textInverse,
    marginVertical: 4,
  },
  upiVerifiedTag: {
    backgroundColor: "rgba(5, 230, 96, 0.16)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SPACING.chipRadius,
  },
  upiVerifiedTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.neonLive,
  },
  upiSelectorRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginTop: 8,
    marginBottom: 12,
  },
  upiMethodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  upiMethodChipActive: {
    backgroundColor: "rgba(5, 230, 96, 0.18)",
    borderWidth: 1,
    borderColor: COLORS.neonLive,
  },
  upiMethodChipTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: "#D1FAE5",
  },
  upiMethodChipTxtActive: {
    color: COLORS.neonLive,
  },
  topUpRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  topUpChip: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.neonLive,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  topUpChipText: {
    ...TYPOGRAPHY.bodySemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textInverse,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  vehicleCard: {
    marginBottom: SPACING.sm,
  },
  vehicleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: SPACING.chipRadius,
  },
  primaryBadgeText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textInverse,
  },
  tapToSwitchBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tapToSwitchTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  plateTag: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vehicleName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  vehicleSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rangeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  vehicleRange: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  carThumb: {
    width: 112,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.errorBg,
  },
  removeBtnText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.destructive,
  },
  txListCard: {
    paddingVertical: SPACING.xs,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  txTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  txDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    ...TYPOGRAPHY.title,
    ...TYPOGRAPHY.tabular,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  modalHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.xs,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 12,
    marginBottom: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  presetScrollRow: {
    gap: 8,
    paddingBottom: 10,
  },
  modelPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 7,
  },
  modelPresetRowActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  modelPresetTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  modelPresetMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    marginTop: 2,
  },
  activeCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
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
    marginBottom: 10,
  },
  connRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
});
