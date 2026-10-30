import React, { useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useModeStore } from "../../store/useModeStore";

const { width, height } = Dimensions.get("window");
const maxRadius = Math.sqrt(width * width + height * height);

export const ModeShockwave: React.FC = () => {
  const { isShockwaveActive, currentMode } = useModeStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isShockwaveActive) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 750,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }
  }, [isShockwaveActive]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0, (maxRadius * 2) / 60]);
    const opacity = interpolate(progress.value, [0, 0.4, 0.85, 1], [0.8, 0.7, 0.3, 0]);

    return {
      opacity,
      transform: [
        { translateX: width / 2 - 30 },
        { translateY: 40 },
        { scale },
      ],
    };
  });

  if (!isShockwaveActive) return null;

  const shockwaveColor = currentMode === "HOST" ? "#FFB800" : "#00F59B";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shockwave,
        { backgroundColor: shockwaveColor },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  shockwave: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 9999,
  },
});

