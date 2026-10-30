import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Ellipse,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Zap } from "lucide-react-native";

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
 * High-Detail Studio Vector Render of the White/Silver EV (Tesla Model X / Modern Aero EV)
 * seen on the right side of the Home Dashboard in the reference image.
 */
export const EvCarHeroRender: React.FC<{ width?: number; height?: number }> = ({
  width = 235,
  height = 148,
}) => {
  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 320 195">
        <Defs>
          <LinearGradient id="carBodyGrad" x1="0" y1="0" x2="0.9" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="48%" stopColor="#F4F6F7" />
            <Stop offset="82%" stopColor="#DCE1E4" />
            <Stop offset="100%" stopColor="#B8C0C5" />
          </LinearGradient>
          <LinearGradient id="hoodGrad" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="65%" stopColor="#EEF1F3" />
            <Stop offset="100%" stopColor="#D0D6DA" />
          </LinearGradient>
          <LinearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1B2226" />
            <Stop offset="45%" stopColor="#2E373C" />
            <Stop offset="100%" stopColor="#12171A" />
          </LinearGradient>
          <LinearGradient id="sideShadowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#CFD5D9" />
            <Stop offset="100%" stopColor="#8E969C" />
          </LinearGradient>
          <RadialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
            <Stop offset="65%" stopColor="#000000" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft Studio Contact Shadow */}
        <Ellipse cx="170" cy="162" rx="142" ry="20" fill="url(#floorShadow)" />
        <Ellipse cx="165" cy="158" rx="115" ry="11" fill="#111714" opacity="0.22" />

        {/* Rear Left Tire (Tucked under front-left bumper) */}
        <Ellipse cx="44" cy="134" rx="16" ry="22" fill="#181C1E" />

        {/* Main Aerodynamic Body Shell (3/4 Front-Left View facing left) */}
        <Path
          d="M 24 118
             C 22 104, 34 90, 62 82
             L 124 66
             C 155 40, 198 28, 255 30
             C 288 32, 312 45, 318 68
             L 318 134
             L 242 144
             L 164 150
             L 52 146
             C 30 144, 24 134, 24 118 Z"
          fill="url(#carBodyGrad)"
          stroke="#D5DBDF"
          strokeWidth="0.8"
        />

        {/* Panoramic Tinted Windshield & Roof Canopy */}
        <Path
          d="M 116 70
             C 146 44, 188 33, 244 34
             L 228 74
             L 124 76 Z"
          fill="url(#glassGrad)"
        />
        {/* Windshield Reflection Highlight */}
        <Path
          d="M 134 68 C 158 48, 190 38, 226 38 L 216 54 C 186 54, 156 60, 134 68 Z"
          fill="#FFFFFF"
          opacity="0.16"
        />

        {/* Side Windows (Driver Side) */}
        <Path
          d="M 234 74 L 252 36 C 282 38, 304 48, 314 66 L 314 78 L 234 74 Z"
          fill="url(#glassGrad)"
        />
        {/* B-Pillar & Window Chrome Trim */}
        <Path d="M 230 74 L 248 35" stroke="#111714" strokeWidth="3.5" />
        <Path
          d="M 226 75 L 315 79"
          stroke="#9CA4AA"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Sculpted Hood & Front Fascia */}
        <Path
          d="M 28 112
             C 34 94, 68 82, 120 74
             L 218 76
             C 172 90, 118 106, 48 114 Z"
          fill="url(#hoodGrad)"
        />
        {/* Hood Crease Lines */}
        <Path
          d="M 46 98 C 76 88, 112 80, 152 75"
          stroke="#CFD6DA"
          strokeWidth="1.2"
          fill="none"
        />
        <Path
          d="M 74 108 C 118 98, 166 88, 218 77"
          stroke="#C4CCD1"
          strokeWidth="1.4"
          fill="none"
        />

        {/* Sleek LED Matrix Headlight (Right/Center) */}
        <Path
          d="M 108 102 L 164 94 C 160 101, 146 106, 116 107 Z"
          fill="#182024"
        />
        <Path
          d="M 111 103 L 159 96"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Path
          d="M 112 105 L 148 100"
          stroke="#05E660"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Far-Side Headlight (Left Nose) */}
        <Path
          d="M 28 102 C 32 95, 42 91, 52 90 L 46 98 C 36 100, 30 102, 28 102 Z"
          fill="#20282C"
        />

        {/* Tesla / EV Nose Cone & Lower Aero Splitter */}
        <Path
          d="M 38 116 L 96 112 L 92 117 L 36 120 Z"
          fill="#1B2226"
        />
        <Path
          d="M 26 132 C 42 138, 92 142, 156 140 L 148 147 C 88 149, 40 144, 26 137 Z"
          fill="#181E22"
        />
        {/* Lower Side Intake Vent */}
        <Path
          d="M 122 126 L 162 122 L 154 136 L 116 136 Z"
          fill="#1B2226"
        />
        <Path d="M 122 130 L 156 127" stroke="#5A6268" strokeWidth="1.2" />

        {/* Side Door Sculpting & Rocker Panel */}
        <Path
          d="M 244 116 L 316 110 L 316 128 L 242 136 Z"
          fill="url(#sideShadowGrad)"
          opacity="0.55"
        />
        <Path
          d="M 244 134 L 318 126 L 318 135 L 242 142 Z"
          fill="#1A2024"
        />

        {/* Side View Mirror */}
        <Path
          d="M 224 72 C 224 65, 236 63, 244 67 C 246 72, 238 77, 226 76 Z"
          fill="#FFFFFF"
          stroke="#B8C0C5"
          strokeWidth="1"
        />
        <Path d="M 226 74 L 242 71" stroke="#181E22" strokeWidth="2" />

        {/* Flush Door Handle */}
        <Rect x="276" y="88" width="16" height="3" rx="1.5" fill="#7D868C" />

        {/* Front Wheel Arch & Multi-Spoke Turbine Alloy Wheel */}
        <Ellipse cx="204" cy="126" rx="35" ry="37" fill="#121619" />
        {/* Tire Sidewall */}
        <Ellipse cx="206" cy="127" rx="31" ry="34" fill="#1E2327" stroke="#111518" strokeWidth="2" />
        {/* Alloy Rim Outer Ring */}
        <Ellipse cx="207" cy="127" rx="23" ry="26" fill="#2B3136" stroke="#8C949A" strokeWidth="1.8" />
        {/* Inner Brake Disc */}
        <Ellipse cx="207" cy="127" rx="16" ry="18" fill="#464E54" />
        {/* Turbine Spokes */}
        <G stroke="#A8B0B6" strokeWidth="2.4" strokeLinecap="round">
          <Path d="M 207 127 L 207 102" />
          <Path d="M 207 127 L 207 152" />
          <Path d="M 207 127 L 185 127" />
          <Path d="M 207 127 L 229 127" />
          <Path d="M 207 127 L 191 109" />
          <Path d="M 207 127 L 223 145" />
          <Path d="M 207 127 L 223 109" />
          <Path d="M 207 127 L 191 145" />
        </G>
        {/* Center Hub Cap */}
        <Circle cx="207" cy="127" r="4.5" fill="#181C1F" stroke="#CFD5D9" strokeWidth="1.2" />
      </Svg>
    </View>
  );
};

/**
 * Realistic 3D-style EV Charging Connector Plug Illustration
 * Matches the Type A, CHAdeMO, and Type B connector plugs in the reference image.
 */
export const ConnectorPlugIllustration: React.FC<{
  variant?: "Type A" | "CHAdeMO" | "Type B" | string;
  size?: number;
}> = ({ variant = "Type A", size = 56 }) => {
  const isChademo = variant.toLowerCase().includes("chademo");
  const isTypeB = variant.toLowerCase().includes("type b") || variant.toLowerCase().includes("ccs");

  return (
    <View style={{ width: size * 1.15, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 1.15} height={size} viewBox="0 0 84 72">
        <Defs>
          <LinearGradient id="shellWhite" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="65%" stopColor="#EAECEE" />
            <Stop offset="100%" stopColor="#CFD4D8" />
          </LinearGradient>
          <LinearGradient id="darkRubber" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2E3438" />
            <Stop offset="50%" stopColor="#1B2023" />
            <Stop offset="100%" stopColor="#0E1113" />
          </LinearGradient>
        </Defs>

        {/* Soft Drop Shadow */}
        <Ellipse cx="42" cy="64" rx="28" ry="4" fill="#000000" opacity="0.08" />

        {/* Rear Cable Boot */}
        <Path
          d="M 62 42 L 78 52 C 80 54, 77 60, 73 58 L 56 48 Z"
          fill="#23282B"
        />

        {/* White Ergonomic Handle Body */}
        <Path
          d="M 28 18
             C 42 14, 62 18, 70 28
             C 75 35, 72 48, 64 52
             C 58 55, 52 46, 48 40
             L 28 38 Z"
          fill="url(#shellWhite)"
          stroke="#D0D5D9"
          strokeWidth="1"
        />

        {/* Handle Trigger / Grip Cutout */}
        <Path
          d="M 42 34 C 50 34, 56 40, 56 46 C 51 47, 44 42, 42 34 Z"
          fill="#252A2E"
        />

        {/* Top Latch Release Button */}
        <Path
          d="M 36 16 C 42 14, 50 15, 54 18 L 48 20 L 36 19 Z"
          fill="#353B40"
        />

        {/* Front Matte Black Connector Barrel */}
        <Path
          d="M 16 20 L 34 18 L 34 44 L 16 42 Z"
          fill="url(#darkRubber)"
        />

        {/* Connector Pin Face (Left Front) */}
        {isTypeB ? (
          /* Type B / CCS2 Combo Dual-Section Face */
          <G>
            <Ellipse cx="16" cy="29" rx="10" ry="11" fill="#14181A" stroke="#3A4146" strokeWidth="1.5" />
            <Rect x="7" y="40" width="18" height="11" rx="5.5" fill="#14181A" stroke="#3A4146" strokeWidth="1.5" />
            {/* Top AC Pins */}
            <Circle cx="13" cy="25" r="2" fill="#8C969E" />
            <Circle cx="19" cy="25" r="2" fill="#8C969E" />
            <Circle cx="11" cy="30" r="2" fill="#8C969E" />
            <Circle cx="16" cy="30" r="2.2" fill="#05E660" />
            <Circle cx="21" cy="30" r="2" fill="#8C969E" />
            {/* Bottom High-Power DC Pins */}
            <Circle cx="12.5" cy="45.5" r="3" fill="#B0B8BF" stroke="#23282C" strokeWidth="0.8" />
            <Circle cx="19.5" cy="45.5" r="3" fill="#B0B8BF" stroke="#23282C" strokeWidth="0.8" />
          </G>
        ) : isChademo ? (
          /* CHAdeMO Heavy Round 4-Quadrant Face */
          <G>
            <Ellipse cx="16" cy="32" rx="12" ry="14" fill="#14181A" stroke="#3A4146" strokeWidth="1.8" />
            <Circle cx="12" cy="26" r="3.2" fill="#9AA3AA" />
            <Circle cx="20" cy="26" r="3.2" fill="#9AA3AA" />
            <Circle cx="12" cy="37" r="3.2" fill="#9AA3AA" />
            <Circle cx="20" cy="37" r="3.2" fill="#9AA3AA" />
            <Circle cx="16" cy="31.5" r="1.8" fill="#05E660" />
          </G>
        ) : (
          /* Type A / J1772 / Type 2 Standard 5-Pin Circular Face */
          <G>
            <Ellipse cx="16" cy="31" rx="11" ry="13" fill="#14181A" stroke="#3A4146" strokeWidth="1.6" />
            <Circle cx="12.5" cy="26" r="2.5" fill="#9AA3AA" />
            <Circle cx="19.5" cy="26" r="2.5" fill="#9AA3AA" />
            <Circle cx="11.5" cy="33" r="2.2" fill="#9AA3AA" />
            <Circle cx="20.5" cy="33" r="2.2" fill="#9AA3AA" />
            <Circle cx="16" cy="36.5" r="2.6" fill="#05E660" />
          </G>
        )}
      </Svg>
    </View>
  );
};

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
});

