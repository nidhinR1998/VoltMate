import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../store/useAuthStore";

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  const navigateNext = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (isAuthenticated) {
      router.replace("/(driver)/home");
    } else {
      router.replace("/(auth)/onboarding");
    }
  };

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSequence(
      withTiming(1.06, { duration: 700, easing: Easing.out(Easing.back(1.4)) }),
      withTiming(1.0, { duration: 250 }),
      withTiming(1.0, { duration: 350 }, () => {
        runOnJS(navigateNext)();
      })
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={styles.emblemBox}>
          <Svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <Path
              d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
              fill="#05E660"
              stroke="#05E660"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.brandTitle}>VoltMate</Text>
        <Text style={styles.brandTagline}>Smart EV Mobility & Charging</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  emblemBox: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#05E660",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.6,
  },
  brandTagline: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 6,
    fontWeight: "500",
  },
});
