import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { COLORS } from "../../theme/tokens";

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
  carContainer: {
    width: 220,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "visible",
  },
  carHeroImage: {
    width: 220,
    height: 148,
  },
  plugWrap: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
