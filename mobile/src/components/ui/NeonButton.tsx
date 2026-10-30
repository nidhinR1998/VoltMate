import React from "react";
import {
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const { accentColor, glowColor } = useModeStore();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onPress();
  };

  // Sizing
  const sizeStyles = {
    sm: "py-2 px-3 text-xs",
    md: "py-3 px-5 text-sm",
    lg: "py-4 px-6 text-base",
  }[size];

  // Variant Styling
  let bgStyle: any = { backgroundColor: accentColor };
  let textColor = "#06090E"; // Deep Obsidian text on glowing neon
  let borderColor = accentColor;

  if (variant === "outline") {
    bgStyle = { backgroundColor: "transparent" };
    textColor = accentColor;
  } else if (variant === "secondary") {
    bgStyle = { backgroundColor: "#1A2333" };
    textColor = "#FFFFFF";
    borderColor = "rgba(255, 255, 255, 0.1)";
  } else if (variant === "danger") {
    bgStyle = { backgroundColor: "#FF3B5C" };
    textColor = "#FFFFFF";
    borderColor = "#FF3B5C";
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        bgStyle,
        { borderColor },
        variant === "primary" ? { shadowColor: glowColor, shadowOpacity: 0.8, shadowRadius: 12 } : null,
        animatedStyle,
        style,
      ]}
      className={`flex-row items-center justify-center rounded-xl border ${sizeStyles} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Animated.View className="mr-2">{icon}</Animated.View> : null}
          <Text
            style={{ color: textColor }}
            className="font-bold text-center tracking-wider"
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

