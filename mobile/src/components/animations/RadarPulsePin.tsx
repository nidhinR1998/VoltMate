import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Zap, Home, Clock } from "lucide-react-native";

interface RadarPulsePinProps {
  type: "P2P_AVAILABLE" | "P2P_BUSY" | "PUBLIC_DC";
  powerKw?: number;
  pricePerKwh?: number;
}

export const RadarPulsePin: React.FC<RadarPulsePinProps> = ({
  type = "P2P_AVAILABLE",
  powerKw = 3.3,
  pricePerKwh = 8.5,
}) => {
  const sonarScale = useSharedValue(1);
  const sonarOpacity = useSharedValue(0.8);
  const orbitRotation = useSharedValue(0);

  useEffect(() => {
    if (type === "P2P_AVAILABLE" || type === "PUBLIC_DC") {
      sonarScale.value = withRepeat(
        withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      sonarOpacity.value = withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else if (type === "P2P_BUSY") {
      orbitRotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [type]);

  const animatedSonarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sonarScale.value }],
    opacity: sonarOpacity.value,
  }));

  const animatedOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  // Colors based on status
  const isPublic = type === "PUBLIC_DC";
  const isBusy = type === "P2P_BUSY";

  const primaryColor = isPublic ? "#00E5FF" : isBusy ? "#FFB800" : "#00F59B";

  return (
    <View className="items-center justify-center relative w-14 h-14">
      {/* Sonar Ripple Wave for Available Nodes */}
      {!isBusy && (
        <Animated.View
          style={[
            styles.sonar,
            { borderColor: primaryColor, backgroundColor: `${primaryColor}20` },
            animatedSonarStyle,
          ]}
        />
      )}

      {/* Orbiting Ring for Busy Nodes */}
      {isBusy && (
        <Animated.View
          style={[styles.orbitRing, { borderColor: `${primaryColor}40` }, animatedOrbitStyle]}
        >
          <View style={[styles.orbitDot, { backgroundColor: primaryColor }]} />
        </Animated.View>
      )}

      {/* Central Pin Core */}
      <View
        style={[
          styles.core,
          { borderColor: primaryColor, shadowColor: primaryColor },
        ]}
        className="w-10 h-10 rounded-full bg-[#0F1622] items-center justify-center border-2"
      >
        {isPublic ? (
          <Zap size={18} color="#00E5FF" fill="#00E5FF" />
        ) : isBusy ? (
          <Clock size={16} color="#FFB800" />
        ) : (
          <Home size={16} color="#00F59B" />
        )}
      </View>

      {/* Kw / Price Tag Pill */}
      <View
        style={{ borderColor: `${primaryColor}80` }}
        className="bg-[#06090E] px-1.5 py-0.5 rounded-full border mt-1 shadow-sm"
      >
        <Text style={{ color: primaryColor }} className="text-[9px] font-mono font-bold">
          {isPublic ? `${powerKw}kW` : `₹${pricePerKwh}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sonar: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
  orbitRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  orbitDot: {
    position: "absolute",
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  core: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
});

