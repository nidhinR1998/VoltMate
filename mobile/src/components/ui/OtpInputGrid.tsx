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
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

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

    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

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
    <View style={styles.container}>
      <Animated.View style={[styles.row, animatedShakeStyle]}>
        {Array.from({ length }).map((_, idx) => {
          const isFilled = Boolean(digits[idx]);
          const borderColor = isError
            ? "#DC2626"
            : isFilled
            ? "#151C18"
            : "#E2E8E5";

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
                isFilled && styles.boxFilled,
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={styles.footerRow}>
        <Text style={styles.timerText}>
          {secondsLeft > 0
            ? `Resend code in ${secondsLeft}s`
            : "Didn't receive the code?"}
        </Text>
        <TouchableOpacity
          onPress={handleResendPress}
          disabled={secondsLeft > 0}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.resendText,
              { color: secondsLeft === 0 ? "#111714" : "#9CA3AF" },
            ]}
          >
            Resend Code
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  box: {
    flex: 1,
    height: 54,
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    textAlign: "center",
    color: "#111714",
    fontSize: 22,
    fontWeight: "800",
    borderWidth: 1.5,
  },
  boxFilled: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  timerText: {
    color: "#757F7A",
    fontSize: 12,
    fontWeight: "500",
  },
  resendText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
