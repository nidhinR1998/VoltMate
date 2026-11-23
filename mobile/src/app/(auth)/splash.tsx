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
import { COLORS, ELEVATION, SPACING, TYPOGRAPHY } from "../../theme/tokens";

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
              fill={COLORS.volt}
              stroke={COLORS.volt}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.brandTitle}>VoltMate</Text>
        <Text style={styles.brandTagline}>Smart EV charging & P2P network</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.mist,
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
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
    ...ELEVATION.level2,
  },
  brandTitle: {
    ...TYPOGRAPHY.display,
    color: COLORS.ink,
  },
  brandTagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});
