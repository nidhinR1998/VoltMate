import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";

interface OtpInputGridProps {
  length?: number;
  onComplete: (code: string) => void;
  onResend: () => void;
  isError?: boolean;
}

export const OtpInputGrid: React.FC<OtpInputGridProps> = ({
  length = 6,
  onComplete,
  onResend,
  isError = false,
}) => {
  const { accentColor } = useModeStore();
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const shakeX = useSharedValue(0);

  // 60-second countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Shake animation on error
  useEffect(() => {
    if (isError) {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  }, [isError]);

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleChangeText = (text: string, index: number) => {
    // Check if user pasted complete 6-digit code
    if (text.length > 1) {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, length);
      const newDigits = [...digits];
      for (let i = 0; i < cleaned.length; i++) {
        newDigits[i] = cleaned[i];
      }
      setDigits(newDigits);
      if (cleaned.length === length) {
        onComplete(cleaned);
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = text.replace(/[^0-9]/g, "");
    setDigits(newDigits);

    // Auto-advance
    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    const fullCode = newDigits.join("");
    if (fullCode.length === length) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      onComplete(fullCode);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendPress = () => {
    if (secondsLeft > 0) return;
    setDigits(Array(length).fill(""));
    setSecondsLeft(60);
    inputsRef.current[0]?.focus();
    onResend();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  return (
    <View className="items-center w-full my-4">
      <Animated.View
        style={[styles.row, animatedShakeStyle]}
        className="flex-row justify-between w-full max-w-[360px]"
      >
        {Array.from({ length }).map((_, idx) => {
          const isFilled = Boolean(digits[idx]);
          const borderColor = isError
            ? "#FF3B5C"
            : isFilled
            ? accentColor
            : "rgba(255, 255, 255, 0.15)";

          return (
            <TextInput
              key={idx}
              ref={(ref) => (inputsRef.current[idx] = ref)}
              value={digits[idx]}
              onChangeText={(txt) => handleChangeText(txt, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[
                styles.box,
                { borderColor },
                isFilled ? { shadowColor: accentColor, shadowOpacity: 0.3 } : null,
              ]}
              className="w-12 h-14 bg-[#0F1622] rounded-xl text-center text-white text-2xl font-mono border"
            />
          );
        })}
      </Animated.View>

      {/* Countdown Timer and Resend Button */}
      <View className="flex-row items-center justify-between w-full max-w-[360px] mt-6 px-1">
        <Text className="text-gray-400 text-xs">
          {secondsLeft > 0 ? (
            `Resend code in ${secondsLeft}s`
          ) : (
            "Didn't receive the OTP?"
          )}
        </Text>
        <TouchableOpacity
          onPress={handleResendPress}
          disabled={secondsLeft > 0}
          activeOpacity={0.7}
        >
          <Text
            style={{ color: secondsLeft === 0 ? accentColor : "#64748B" }}
            className="text-xs font-bold uppercase tracking-wider"
          >
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 8,
  },
  box: {
    elevation: 4,
  },
});

