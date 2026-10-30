import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Zap } from "lucide-react-native";

/**
 * Centralized Studio Asset Registry from /mobile/assets/
 */
export const EV_ASSETS = {
  cars: {
    sedan: require("../../../assets/Electric sedan.jpg"),
    suv: require("../../../assets/Electric SUV.jpg"),
  },
  connectors: {
    type1Ac: require("../../../assets/Type 1 charging connector (AC).jpg"),
    type2Ac: require("../../../assets/Type 2 charging connector (AC).jpg"),
    chademoDc: require("../../../assets/CHAdeMO connector (DC).jpg"),
    ccsCombo2Dc: require("../../../assets/CCS Combo 2 (DC).jpg"),
  },
  stations: {
    acStation: require("../../../assets/AC charging station.jpg"),
    dcFastStation: require("../../../assets/DC fast charging station.jpg"),
    ultraFastCharger: require("../../../assets/Ultra-fast EV charger.jpg"),
    homeWallCharger: require("../../../assets/Home wall charger.jpg"),
  },
};

interface BatteryProps {
  percentage: number;
  isCharging?: boolean;
}

/**
 * Replicates the vertical 3D-style Battery Indicator from Phone 1 of the reference design.
 */
export const VerticalBatteryWidget: React.FC<BatteryProps> = ({
  percentage = 72,
  isCharging = true,
}) => {
  const clamped = Math.max(8, Math.min(100, percentage));
  const fillHeight = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    fillHeight.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    if (isCharging) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1100 }),
          withTiming(1, { duration: 1100 })
        ),
        -1,
        true
      );
    }
  }, [clamped, isCharging]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value}%`,
  }));

  const animatedBoltStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.batteryWrapper}>
      {/* Top Battery Terminal Cap */}
      <View style={styles.batteryCap} />

      {/* Main Dark Charcoal Battery Body */}
      <View style={styles.batteryBody}>
        {/* Animated Electric Green Fill */}
        <Animated.View style={[styles.batteryFill, animatedFillStyle]}>
          <View style={styles.batteryFillHighlight} />
        </Animated.View>

        {/* Foreground Content (Lightning Bolt + Percentage + Label) */}
        <View style={styles.batteryContent}>
          <Animated.View style={[styles.boltWrap, animatedBoltStyle]}>
            <Zap
              size={18}
              color={clamped > 55 ? "#0B9E43" : "#05E660"}
              fill={clamped > 55 ? "#0B9E43" : "#05E660"}
            />
          </Animated.View>

          <View style={styles.batteryTextBlock}>
            <Text
              style={[
                styles.batteryPercentText,
                { color: clamped > 35 ? "#111714" : "#FFFFFF" },
              ]}
            >
              {clamped}%
            </Text>
            <Text
              style={[
                styles.batteryLabelText,
                { color: clamped > 35 ? "#1E2E24" : "#A0ABA5" },
              ]}
            >
              Battery
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * High-Resolution Studio Photograph Render of the EV Vehicle
 * Uses Electric sedan.jpg or Electric SUV.jpg from mobile/assets/.
 */
export const EvCarHeroRender: React.FC<{
  width?: number;
  height?: number;
  variant?: "sedan" | "suv" | string;
}> = ({ width = 235, height = 148, variant = "sedan" }) => {
  const normalized = (variant || "").toLowerCase();
  const isSuv =
    normalized.includes("suv") ||
    normalized.includes("model x") ||
    normalized.includes("nexon") ||
    normalized.includes("ioniq");

  const imgSource: ImageSourcePropType = isSuv
    ? EV_ASSETS.cars.suv
    : EV_ASSETS.cars.sedan;

  return (
    <View
      style={[
        styles.carImageContainer,
        { width, height },
      ]}
    >
      <Image
        source={imgSource}
        style={{ width: width * 1.04, height: height * 1.04, borderRadius: 20 }}
        resizeMode="contain"
      />
    </View>
  );
};

/**
 * Studio Photograph of the EV Charging Connector Plug from mobile/assets/
 * Supports Type A (Type 1 AC), Type 2 AC, CHAdeMO (DC), and Type B / CCS Combo 2 (DC).
 */
export const ConnectorPlugIllustration: React.FC<{
  variant?: "Type A" | "CHAdeMO" | "Type B" | "Type 2" | string;
  size?: number;
}> = ({ variant = "Type A", size = 56 }) => {
  const v = (variant || "").toLowerCase();
  let source: ImageSourcePropType = EV_ASSETS.connectors.type1Ac;

  if (v.includes("chademo")) {
    source = EV_ASSETS.connectors.chademoDc;
  } else if (v.includes("type b") || v.includes("ccs")) {
    source = EV_ASSETS.connectors.ccsCombo2Dc;
  } else if (v.includes("type 2") || v.includes("type-2")) {
    source = EV_ASSETS.connectors.type2Ac;
  } else {
    source = EV_ASSETS.connectors.type1Ac;
  }

  return (
    <View
      style={[
        styles.connectorImageWrap,
        { width: size * 1.15, height: size },
      ]}
    >
      <Image
        source={source}
        style={{ width: size * 1.05, height: size * 0.95, borderRadius: 12 }}
        resizeMode="contain"
      />
    </View>
  );
};

/**
 * Helper to pick a station cover image from mobile/assets/ based on station type or ID
 */
export function getStationAssetImage(
  stationTypeOrTitle?: string
): ImageSourcePropType {
  const t = (stationTypeOrTitle || "").toLowerCase();
  if (t.includes("home") || t.includes("villa") || t.includes("15a") || t.includes("wall")) {
    return EV_ASSETS.stations.homeWallCharger;
  }
  if (t.includes("ultra") || t.includes("120") || t.includes("150") || t.includes("spark")) {
    return EV_ASSETS.stations.ultraFastCharger;
  }
  if (t.includes("ac") || t.includes("22") || t.includes("green")) {
    return EV_ASSETS.stations.acStation;
  }
  return EV_ASSETS.stations.dcFastStation;
}

const styles = StyleSheet.create({
  batteryWrapper: {
    alignItems: "center",
    width: 88,
  },
  batteryCap: {
    width: 42,
    height: 9,
    backgroundColor: "#2C322F",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginBottom: 2,
  },
  batteryBody: {
    width: 86,
    height: 152,
    backgroundColor: "#2C322F",
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
    padding: 3,
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  batteryFill: {
    position: "absolute",
    bottom: 3,
    left: 3,
    right: 3,
    backgroundColor: "#05E660",
    borderRadius: 19,
    overflow: "hidden",
  },
  batteryFillHighlight: {
    height: 10,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  batteryContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 14,
  },
  boltWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  batteryTextBlock: {
    alignItems: "center",
  },
  batteryPercentText: {
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  batteryLabelText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  carImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  connectorImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
  },
});
