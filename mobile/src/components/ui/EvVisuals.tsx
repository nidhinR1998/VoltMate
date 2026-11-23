import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType, Animated } from "react-native";
import { Zap } from "lucide-react-native";
import { COLORS, TYPOGRAPHY } from "../../theme/tokens";
import { useReduceMotion } from "./DesignSystem";

const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  TATA_NEXON: require("../../../assets/vehicles/tata_nexon_ev.png"),
  TATA_CURVV: require("../../../assets/vehicles/tata_curvv_ev.png"),
  MG: require("../../../assets/vehicles/mg_zs_ev.png"),
  MAHINDRA: require("../../../assets/vehicles/mahindra_ev.png"),
  BYD_HYUNDAI: require("../../../assets/vehicles/byd_hyundai_ev.png"),
  ATHER: require("../../../assets/vehicles/ather_450x.png"),
};

const PLUG_IMAGES: Record<string, ImageSourcePropType> = {
  TYPE_A: require("../../../assets/connectors/plug_type_a.png"),
  CHADEMO: require("../../../assets/connectors/plug_chademo.png"),
  TYPE_B: require("../../../assets/connectors/plug_type_b.png"),
};

export const STEERING_COCKPIT_IMAGE = require("../../../assets/onboarding/ev_steering_cockpit.png");
export const STATION_HERO_BANNER_IMAGE = require("../../../assets/stations/station_hero_banner.png");

export const VerticalBatteryIndicator: React.FC<{
  socPercent: number;
  isCharging?: boolean;
}> = ({ socPercent, isCharging = false }) => {
  const clamped = Math.max(5, Math.min(100, socPercent));
  const reduceMotion = useReduceMotion();
  const fillAnim = useRef(new Animated.Value(reduceMotion ? clamped : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      fillAnim.setValue(clamped);
      return;
    }
    Animated.timing(fillAnim, {
      toValue: clamped,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [clamped, reduceMotion]);

  useEffect(() => {
    if (!isCharging || reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCharging, reduceMotion]);

  const animatedHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={styles.batteryOuterWrap}
      accessible
      accessibilityLabel={`Battery state of charge ${clamped} percent`}
    >
      <View style={styles.batteryCapTop} />
      <View style={styles.batteryBody}>
        <Animated.View style={[styles.batteryFill, { height: animatedHeight }]} />
        <View style={styles.batteryContentOverlay}>
          <Animated.View style={[styles.boltBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Zap size={16} color={COLORS.primary} fill={COLORS.primary} />
          </Animated.View>
          <Text style={styles.batteryPctText}>{clamped}%</Text>
          <Text style={styles.batterySubLabel}>SoC</Text>
        </View>
      </View>
    </View>
  );
};

export const EvCarHeroRender: React.FC<{ model?: string; width?: number; height?: number }> = ({
  model = "",
  width = 220,
  height = 148,
}) => {
  const upper = model.toUpperCase();
  const source =
    upper.includes("ATHER") ||
    upper.includes("OLA") ||
    upper.includes("TVS") ||
    upper.includes("IQUBE") ||
    upper.includes("BAJAJ") ||
    upper.includes("CHETAK") ||
    upper.includes("RIZTA") ||
    upper.includes("VIDA") ||
    upper.includes("RIVER") ||
    upper.includes("INDIE") ||
    upper.includes("SIMPLE") ||
    upper.includes("ULTRAVIOLETTE") ||
    upper.includes("F77") ||
    upper.includes("REVOLT") ||
    upper.includes("RV400") ||
    upper.includes("OBEN") ||
    upper.includes("RORR") ||
    upper.includes("AMPERE") ||
    upper.includes("ROADSTER") ||
    upper.includes("SCOOTER") ||
    upper.includes("TREO") ||
    upper.includes("2W")
      ? VEHICLE_IMAGES.ATHER
      : upper.includes("MAHINDRA") ||
        upper.includes("BE 6") ||
        upper.includes("BE.05") ||
        upper.includes("XEV") ||
        upper.includes("XUV") ||
        upper.includes("EVERITO")
      ? VEHICLE_IMAGES.MAHINDRA
      : upper.includes("CURVV") ||
        upper.includes("PUNCH") ||
        upper.includes("TIAGO") ||
        upper.includes("TIGOR") ||
        upper.includes("XPRES") ||
        upper.includes("CITROEN") ||
        upper.includes("EC3") ||
        upper.includes("MINI") ||
        upper.includes("TAYCAN") ||
        upper.includes("E-TRON GT") ||
        upper.includes("I4") ||
        upper.includes("I5") ||
        upper.includes("I7") ||
        upper.includes("EQS 580 4MATIC SEDAN")
      ? VEHICLE_IMAGES.TATA_CURVV
      : upper.includes("HYUNDAI") ||
        upper.includes("CRETA") ||
        upper.includes("IONIQ") ||
        upper.includes("KONA") ||
        upper.includes("KIA") ||
        upper.includes("EV6") ||
        upper.includes("EV9") ||
        upper.includes("CARENS") ||
        upper.includes("BYD") ||
        upper.includes("ATTO") ||
        upper.includes("SEAL") ||
        upper.includes("EMAX") ||
        upper.includes("E6") ||
        upper.includes("MARUTI") ||
        upper.includes("VITARA") ||
        upper.includes("BMW") ||
        upper.includes("MERCEDES") ||
        upper.includes("EQA") ||
        upper.includes("EQB") ||
        upper.includes("EQE") ||
        upper.includes("EQS") ||
        upper.includes("AUDI") ||
        upper.includes("VOLVO") ||
        upper.includes("EX40") ||
        upper.includes("C40") ||
        upper.includes("PORSCHE") ||
        upper.includes("MACAN") ||
        upper.includes("JAGUAR") ||
        upper.includes("SKODA") ||
        upper.includes("ENYAQ")
      ? VEHICLE_IMAGES.BYD_HYUNDAI
      : upper.includes("MG") ||
        upper.includes("WINDSOR") ||
        upper.includes("ZS") ||
        upper.includes("COMET") ||
        upper.includes("CYBERSTER")
      ? VEHICLE_IMAGES.MG
      : VEHICLE_IMAGES.TATA_NEXON;

  return (
    <View style={[styles.carContainer, { width: Math.min(220, width), height: Math.min(156, height) }]}>
      <Image source={source} style={[styles.carHeroImage, { width, height }]} resizeMode="contain" />
    </View>
  );
};

export const ConnectorPlugIllustration: React.FC<{
  type: "TYPE_A" | "CHADEMO" | "TYPE_B" | "Type A" | "CHAdeMO" | "Type B" | string;
  size?: "sm" | "md" | "lg";
}> = ({ type, size = "md" }) => {
  const normalized = type.toUpperCase();
  const imgSource =
    normalized.includes("CHADEMO") || normalized.includes("CCS2")
      ? PLUG_IMAGES.CHADEMO
      : normalized.includes("TYPE B") ||
        normalized.includes("TYPE_B") ||
        normalized.includes("TYPE-2") ||
        normalized.includes("TYPE_2") ||
        normalized.includes("WALLBOX")
        ? PLUG_IMAGES.TYPE_B
        : PLUG_IMAGES.TYPE_A;

  const boxSize = size === "sm" ? 48 : size === "lg" ? 72 : 56;
  const imgSize = size === "sm" ? 40 : size === "lg" ? 62 : 48;

  return (
    <View style={[styles.plugWrap, { width: boxSize, height: boxSize }]}>
      <Image
        source={imgSource}
        style={{ width: imgSize, height: imgSize }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  batteryOuterWrap: {
    alignItems: "center",
    width: 88,
  },
  batteryCapTop: {
    width: 34,
    height: 8,
    backgroundColor: "#2C3530",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginBottom: -1,
  },
  batteryBody: {
    width: 86,
    height: 148,
    backgroundColor: "#2C3530",
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
    padding: 3,
  },
  batteryFill: {
    width: "100%",
    backgroundColor: COLORS.neonLive,
    borderRadius: 17,
  },
  batteryContentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  boltBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  batteryPctText: {
    ...TYPOGRAPHY.h2,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  batterySubLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  carContainer: {
    width: 220,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 18,
    overflow: "hidden",
  },
  carHeroImage: {
    width: 220,
    height: 148,
  },
  plugWrap: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
