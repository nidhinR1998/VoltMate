import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Car,
  Wallet,
  Zap,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Home,
  CheckCircle2,
  ChevronRight,
  BatteryCharging,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";
import { useAuthStore } from "../../store/useAuthStore";

const { width } = Dimensions.get("window");

export default function GarageWalletScreen() {
  const router = useRouter();
  const { accentColor, toggleMode } = useModeStore();
  const { user } = useAuthStore();
  const [voltCredits, setVoltCredits] = useState(485);
  const [autoRecharge, setAutoRecharge] = useState(true);

  const myVehicles = [
    {
      id: "V1",
      name: "Tata Nexon EV Max",
      plateNumber: "KL-07-CS-4921",
      batteryKwh: 40.5,
      currentSoc: 68,
      rangeKm: 284,
      connectors: ["15A Domestic", "Type-2 AC (7.2kW)", "CCS2 DC (50kW)"],
      isPrimary: true,
    },
    {
      id: "V2",
      name: "Ather 450X Gen 3",
      plateNumber: "KL-07-DF-1092",
      batteryKwh: 3.7,
      currentSoc: 92,
      rangeKm: 98,
      connectors: ["15A Domestic", "Ather Dot AC"],
      isPrimary: false,
    },
  ];

  const handleSwitchToHost = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    toggleMode();
    router.replace("/(host)/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Garage & <Text style={{ color: accentColor }}>Wallet</Text>
          </Text>
          <Text style={styles.subtitle}>
            Manage electric vehicles, VoltCredits & Host mode
          </Text>
        </View>

        {/* VoltCredits Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <View>
              <Text style={styles.walletLabel}>VOLTCREDITS BALANCE</Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceCurrency}>₹</Text>
                <Text style={styles.balanceAmount}>{voltCredits}</Text>
                <View style={styles.zeroFeeBadge}>
                  <Text style={styles.zeroFeeText}>0% Platform Fee</Text>
                </View>
              </View>
            </View>
            <View style={styles.walletIconCircle}>
              <Wallet size={24} color="#00F59B" />
            </View>
          </View>

          <Text style={styles.walletNote}>
            1 VoltCredit = ₹1.00 directly accepted across 10,000+ P2P hosts and public hubs in India.
          </Text>

          <View style={styles.walletButtonsRow}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setVoltCredits((prev) => prev + 500);
              }}
              style={styles.rechargeBtn}
            >
              <Plus size={16} color="#06090E" />
              <Text style={styles.rechargeBtnText}>Top-up ₹500 via UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAutoRecharge(!autoRecharge);
              }}
              style={[
                styles.autoRechargeBtn,
                autoRecharge && { borderColor: "rgba(0,245,155,0.4)" },
              ]}
            >
              <RefreshCw
                size={14}
                color={autoRecharge ? "#00F59B" : "#64748B"}
              />
              <Text
                style={[
                  styles.autoRechargeText,
                  autoRecharge && { color: "#00F59B" },
                ]}
              >
                Auto {autoRecharge ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Switch to Host Mode Banner */}
        <TouchableOpacity
          onPress={handleSwitchToHost}
          activeOpacity={0.85}
          style={styles.hostBanner}
        >
          <View style={styles.hostBannerContent}>
            <View style={styles.hostIconCircle}>
              <Home size={22} color="#FFB800" />
            </View>
            <View style={styles.hostTextWrap}>
              <Text style={styles.hostTitle}>Have an idle home plug?</Text>
              <Text style={styles.hostSub}>
                Switch to Host Mode. Share your driveway and earn ₹3,500+/mo passive UPI payouts.
              </Text>
            </View>
          </View>
          <View style={styles.switchPill}>
            <Text style={styles.switchPillText}>Switch</Text>
            <ArrowUpRight size={14} color="#FFB800" />
          </View>
        </TouchableOpacity>

        {/* My EV Vehicles Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Electric Vehicles</Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/garage-setup")}
            style={styles.addVehicleBtn}
          >
            <Plus size={14} color="#00F59B" />
            <Text style={styles.addVehicleText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {myVehicles.map((v) => (
          <View key={v.id} style={styles.vehicleCard}>
            <View style={styles.vehicleTop}>
              <View style={styles.vehicleTitleWrap}>
                <Car size={20} color="#00F59B" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehiclePlate}>{v.plateNumber}</Text>
                </View>
              </View>
              {v.isPrimary && (
                <View style={styles.primaryBadge}>
                  <CheckCircle2 size={12} color="#00F59B" />
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>

            {/* Battery & Range Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Battery Capacity</Text>
                <Text style={styles.statValue}>{v.batteryKwh} kWh</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Current SOC</Text>
                <Text style={styles.statValueHighlight}>{v.currentSoc}%</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Est. Range</Text>
                <Text style={styles.statValue}>{v.rangeKm} km</Text>
              </View>
            </View>

            {/* Supported Connectors */}
            <View style={styles.connectorsWrap}>
              {v.connectors.map((c, i) => (
                <View key={i} style={styles.connectorPill}>
                  <Zap size={10} color="#00F59B" />
                  <Text style={styles.connectorPillText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* KYC & Identity Badge */}
        <View style={styles.kycCard}>
          <ShieldCheck size={24} color="#00F59B" />
          <View style={styles.kycTextWrap}>
            <Text style={styles.kycTitle}>Vahan & Digilocker Verified</Text>
            <Text style={styles.kycSub}>
              Your driving license and EV registration are verified for instant gated society access across India.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.25)",
    padding: 20,
    marginBottom: 16,
  },
  walletTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    gap: 4,
  },
  balanceCurrency: {
    fontSize: 22,
    fontWeight: "800",
    color: "#00F59B",
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  zeroFeeBadge: {
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  zeroFeeText: {
    color: "#00F59B",
    fontSize: 11,
    fontWeight: "700",
  },
  walletIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,245,155,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.2)",
  },
  walletNote: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
    marginVertical: 14,
  },
  walletButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rechargeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 12,
    gap: 6,
  },
  rechargeBtnText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 13,
  },
  autoRechargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  autoRechargeText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
  },
  hostBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,184,0,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.3)",
    padding: 16,
    marginBottom: 24,
  },
  hostBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  hostIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,184,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hostTextWrap: {
    flex: 1,
  },
  hostTitle: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 14,
  },
  hostSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  switchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,184,0,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.4)",
  },
  switchPillText: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addVehicleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addVehicleText: {
    color: "#00F59B",
    fontWeight: "700",
    fontSize: 13,
  },
  vehicleCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 12,
  },
  vehicleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  vehiclePlate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  primaryBadgeText: {
    color: "#00F59B",
    fontSize: 10,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#06090E",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  statCol: {},
  statLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  statValueHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#00F59B",
    marginTop: 2,
  },
  connectorsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  connectorPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  connectorPillText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  kycCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0,245,155,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.2)",
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  kycTextWrap: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00F59B",
    marginBottom: 2,
  },
  kycSub: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
});
