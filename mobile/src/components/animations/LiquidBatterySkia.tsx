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
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { Zap, Sparkles } from "lucide-react-native";

interface LiquidBatteryProps {
  socPercent: number; // e.g. 68.5%
  isCharging?: boolean;
  powerKw?: number;
  batteryCapacityKwh?: number;
}

export const LiquidBatterySkia: React.FC<LiquidBatteryProps> = ({
  socPercent = 45,
  isCharging = true,
  powerKw = 3.3,
  batteryCapacityKwh = 40.5,
}) => {
  const waveAnim1 = useSharedValue(0);
  const waveAnim2 = useSharedValue(0);
  const electronPulse = useSharedValue(0);

  useEffect(() => {
    // Primary sine wave oscillation
    waveAnim1.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );

    // Secondary opposing phase sine wave for realistic liquid surge
    waveAnim2.value = withRepeat(
      withTiming(1, { duration: 3100, easing: Easing.linear }),
      -1,
      false
    );

    // Flowing electron particle stream speed tied dynamically to power kW
    const particleDuration = Math.max(500, 1600 - (powerKw * 80));
    electronPulse.value = withRepeat(
      withTiming(1, { duration: particleDuration, easing: Easing.linear }),
      -1,
      false
    );
  }, [powerKw]);

  // Battery Physical Geometry
  const batteryHeight = 230;
  const batteryWidth = 145;
  const clampedSoc = Math.min(100, Math.max(5, socPercent));
  const fillHeight = (clampedSoc / 100.0) * (batteryHeight - 20);

  const animatedWave1Style = useAnimatedStyle(() => {
    const translateX = interpolate(waveAnim1.value, [0, 1], [0, -145]);
    return { transform: [{ translateX }] };
  });

  const animatedWave2Style = useAnimatedStyle(() => {
    const translateX = interpolate(waveAnim2.value, [0, 1], [-145, 0]);
    return { transform: [{ translateX }] };
  });

  const animatedElectron1Style = useAnimatedStyle(() => {
    const translateY = interpolate(electronPulse.value, [0, 1], [batteryHeight - 30, 25]);
    const opacity = interpolate(electronPulse.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = interpolate(electronPulse.value, [0, 0.5, 1], [0.6, 1.25, 0.4]);
    return { opacity, transform: [{ translateY }, { scale }] };
  });

  const animatedElectron2Style = useAnimatedStyle(() => {
    const progress = (electronPulse.value + 0.5) % 1.0;
    const translateY = interpolate(progress, [0, 1], [batteryHeight - 30, 25]);
    const opacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = interpolate(progress, [0, 0.5, 1], [0.5, 1.1, 0.3]);
    return { opacity, transform: [{ translateY }, { scale }] };
  });

  return (
    <View className="items-center justify-center py-5">
      {/* Battery Top Terminal Connector */}
      <View className="flex-row items-center justify-center space-x-1 mb-0.5">
        <View className="w-14 h-3 bg-zinc-600 rounded-t-lg border border-white/20 items-center justify-center">
          <View className="w-6 h-1 bg-[#00F59B] rounded-full opacity-80" />
        </View>
      </View>

      {/* Main 3D Glass Battery Cylinder */}
      <View
        style={[styles.container, { width: batteryWidth, height: batteryHeight }]}
        className="rounded-3xl border-2 border-[#00F59B]/60 bg-[#06090E]/95 overflow-hidden relative shadow-2xl"
      >
        {/* Bioluminescent Ambient Base Glow */}
        <View
          style={[styles.glowOverlay, { height: `${clampedSoc}%` }]}
          className="absolute bottom-0 w-full bg-emerald-500/15"
        />

        {/* Dual Sine Wave Liquid Charging Shaders */}
        <View
          style={{ height: fillHeight }}
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
        >
          {/* Secondary background sine wave (opacity 0.45) */}
          <Animated.View style={[styles.waveRow, animatedWave2Style]}>
            <Svg width={batteryWidth * 3} height={fillHeight + 35} viewBox={`0 0 ${batteryWidth * 3} 65`}>
              <Defs>
                <LinearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#004D30" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Path
                d={`M 0 20 Q 36 5, 72 20 T 145 20 T 217 20 T 290 20 T 362 20 T 435 20 L 435 120 L 0 120 Z`}
                fill="url(#waveGrad2)"
              />
            </Svg>
          </Animated.View>

          {/* Primary foreground sine wave */}
          <Animated.View style={[styles.waveRow, animatedWave1Style]}>
            <Svg width={batteryWidth * 3} height={fillHeight + 35} viewBox={`0 0 ${batteryWidth * 3} 65`}>
              <Defs>
                <LinearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00F59B" stopOpacity="0.9" />
                  <Stop offset="50%" stopColor="#00B06E" stopOpacity="0.95" />
                  <Stop offset="100%" stopColor="#003D24" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Path
                d={`M 0 15 Q 36 0, 72 15 T 145 15 T 217 15 T 290 15 T 362 15 T 435 15 L 435 120 L 0 120 Z`}
                fill="url(#waveGrad1)"
              />
            </Svg>
          </Animated.View>
        </View>

        {/* Liquid Glass Highlight Reflection Curve */}
        <View className="absolute top-2 left-2 w-3 h-28 bg-white/10 rounded-full opacity-60" />

        {/* Animated Neon Electron Particles Flowing Along Axis */}
        {isCharging && (
          <>
            <Animated.View
              style={[styles.particle, animatedElectron1Style]}
              className="absolute left-[64px] w-4 h-4 rounded-full bg-[#00F59B] items-center justify-center shadow-lg"
            >
              <Zap size={10} color="#06090E" />
            </Animated.View>

            <Animated.View
              style={[styles.particle, animatedElectron2Style]}
              className="absolute left-[64px] w-3 h-3 rounded-full bg-[#00E5FF] items-center justify-center shadow-lg"
            >
              <View className="w-1.5 h-1.5 rounded-full bg-white" />
            </Animated.View>
          </>
        )}

        {/* Tabular Numerical Telemetry Overlay (JetBrains Mono) */}
        <View className="absolute inset-0 items-center justify-center z-30">
          <View className="flex-row items-baseline">
            <Text className="text-4xl font-mono text-white tracking-tighter font-bold">
              {clampedSoc.toFixed(0)}
            </Text>
            <Text className="text-xl font-mono text-[#00F59B] ml-0.5 font-bold">%</Text>
          </View>

          {isCharging && (
            <View className="flex-row items-center mt-1.5 bg-[#06090E]/80 px-2.5 py-0.5 rounded-full border border-[#00F59B]/50 shadow-md">
              <Zap size={11} color="#00F59B" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-mono text-[#00F59B] font-bold">
                {powerKw.toFixed(1)} kW AC
              </Text>
            </View>
          )}

          <Text className="text-gray-400 text-[10px] font-mono mt-1">
            {((clampedSoc / 100.0) * batteryCapacityKwh).toFixed(1)} / {batteryCapacityKwh} kWh
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  glowOverlay: {
    shadowColor: "#00F59B",
    shadowRadius: 18,
  },
  waveRow: {
    width: 435,
    position: "absolute",
    bottom: 0,
  },
  particle: {
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1.0,
    shadowRadius: 10,
    elevation: 8,
  },
});
