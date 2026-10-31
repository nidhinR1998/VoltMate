import React from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType } from "react-native";

const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  NEXON: require("../../../assets/vehicles/white_ev_sedan.png"),
  TESLA: require("../../../assets/vehicles/white_ev_sedan.png"),
  MG: require("../../../assets/vehicles/mg_zs_ev.png"),
  ATHER: require("../../../assets/vehicles/ather_450x.png"),
};

const PLUG_IMAGES: Record<string, ImageSourcePropType> = {
  TYPE_A: require("../../../assets/connectors/plug_type_a.png"),
  CHADEMO: require("../../../assets/connectors/plug_chademo.png"),
  TYPE_B: require("../../../assets/connectors/plug_type_b.png"),
};

export const STEERING_COCKPIT_IMAGE = require("../../../assets/onboarding/ev_steering_cockpit.png");
export const STATION_HERO_BANNER_IMAGE = require("../../../assets/stations/station_hero_banner.png");

export const VerticalBatteryIndicator: React.FC<{ socPercent: number }> = ({ socPercent }) => {
  const clamped = Math.max(5, Math.min(100, socPercent));
  return (
    <View style={styles.batteryOuterWrap}>
      <View style={styles.batteryCapTop} />
      <View style={styles.batteryBody}>
        <View style={[styles.batteryFill, { height: `${clamped}%` }]} />
        <View style={styles.batteryContentOverlay}>
          <Text style={styles.batteryBolt}>⚡</Text>
          <Text style={styles.batteryPctText}>{clamped}%</Text>
          <Text style={styles.batterySubLabel}>Battery</Text>
        </View>
      </View>
    </View>
  );
};

export const EvCarHeroRender: React.FC<{ model?: string; width?: number; height?: number }> = ({
  model = "",
  width = 245,
  height = 175,
}) => {
  const upper = model.toUpperCase();
  const source =
    upper.includes("ATHER") || upper.includes("OLA") || upper.includes("SCOOTER")
      ? VEHICLE_IMAGES.ATHER
      : upper.includes("MG") || upper.includes("WINDSOR") || upper.includes("SUV") || upper.includes("MAHINDRA") || upper.includes("CURVV")
        ? VEHICLE_IMAGES.MG
        : VEHICLE_IMAGES.NEXON;

  return (
    <View style={styles.carContainer}>
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

  const boxSize = size === "sm" ? 50 : size === "lg" ? 76 : 60;
  const imgSize = size === "sm" ? 42 : size === "lg" ? 66 : 52;

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
    width: 108,
  },
  batteryCapTop: {
    width: 44,
    height: 10,
    backgroundColor: "#333A36",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginBottom: -1,
  },
  batteryBody: {
    width: 106,
    height: 196,
    backgroundColor: "#333A36",
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
    padding: 3,
  },
  batteryFill: {
    width: "100%",
    backgroundColor: "#05E660",
    borderRadius: 20,
  },
  batteryContentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 22,
  },
  batteryBolt: {
    fontSize: 22,
    color: "#096B30",
    marginBottom: 8,
  },
  batteryPctText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#151C18",
    letterSpacing: -0.5,
  },
  batterySubLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#25332B",
    marginTop: 2,
  },
  carContainer: {
    width: 230,
    height: 185,
    alignItems: "center",
    justifyContent: "center",
  },
  carHeroImage: {
    width: 245,
    height: 175,
  },
  plugWrap: {
    backgroundColor: "#F6F7F6",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
