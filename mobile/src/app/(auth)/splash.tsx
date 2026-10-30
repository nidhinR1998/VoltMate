import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../store/useAuthStore";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const circuitProgress = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);

  const navigateNext = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (isAuthenticated) {
      router.replace("/(driver)/map-radar");
    } else {
      router.replace("/(auth)/onboarding");
    }
  };

  useEffect(() => {
    // 1. Circuit lines draw animation
    circuitProgress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // 2. Converging lightning-leaf logo surge
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSequence(
      withTiming(1.15, { duration: 900, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1.0, { duration: 300 }),
      withTiming(1.0, { duration: 400 }, () => {
        runOnJS(navigateNext)();
      })
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View className="flex-1 bg-[#06090E] items-center justify-center relative">
      {/* Background Animated SVG Circuit Lines */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="circuitGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00F59B" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Dynamic Circuit Paths Converging to Center */}
        <Path
          d={`M 0 100 L ${width * 0.3} 100 L ${width * 0.5} ${height * 0.45}`}
          stroke="url(#circuitGrad)"
          strokeWidth="2"
          strokeDasharray="400"
          strokeDashoffset="0"
          opacity="0.6"
        />
        <Path
          d={`M ${width} 180 L ${width * 0.7} 180 L ${width * 0.5} ${height * 0.45}`}
          stroke="url(#circuitGrad)"
          strokeWidth="2"
          strokeDasharray="400"
          strokeDashoffset="0"
          opacity="0.6"
        />
        <Path
          d={`M 0 ${height - 120} L ${width * 0.35} ${height - 120} L ${width * 0.5} ${height * 0.55}`}
          stroke="url(#circuitGrad)"
          strokeWidth="2"
          strokeDasharray="400"
          strokeDashoffset="0"
          opacity="0.5"
        />
        <Path
          d={`M ${width} ${height - 100} L ${width * 0.65} ${height - 100} L ${width * 0.5} ${height * 0.55}`}
          stroke="url(#circuitGrad)"
          strokeWidth="2"
          strokeDasharray="400"
          strokeDashoffset="0"
          opacity="0.5"
        />
      </Svg>

      {/* Central Glowing Lightning-Leaf VoltMate Logo */}
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]} className="items-center">
        <View className="w-24 h-24 rounded-3xl bg-[#0F1622] border-2 border-[#00F59B] items-center justify-center mb-6 shadow-2xl">
          <Svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            {/* Lightning leaf emblem */}
            <Path
              d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
              fill="#00F59B"
              stroke="#00F59B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text className="text-3xl font-space font-bold text-white tracking-tight">
          Volt<Text className="text-[#00F59B]">Mate</Text>
        </Text>
        <Text className="text-gray-400 font-jakarta text-xs mt-2 tracking-widest uppercase">
          Share the Spark • Power the Journey
        </Text>
        <Text className="text-[#00F59B]/80 font-mono text-[10px] mt-4 tracking-wider">
          ₹0 COST INFRASTRUCTURE • INDIA P2P
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
  },
});

