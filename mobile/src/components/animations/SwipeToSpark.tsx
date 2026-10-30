import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Zap, ChevronRight } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const THUMB_SIZE = 56;
const MAX_DRAG = SLIDER_WIDTH - THUMB_SIZE - 8;

interface SwipeToSparkProps {
  label?: string;
  onSuccess: () => void;
  color?: string;
}

export const SwipeToSpark: React.FC<SwipeToSparkProps> = ({
  label = "SWIPE TO SPARK CHARGE",
  onSuccess,
  color = "#00F59B",
}) => {
  const translateX = useSharedValue(0);
  const [completed, setCompleted] = useState(false);

  const handleSuccessTrigger = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCompleted(true);
    onSuccess();
  };

  const onGestureEvent = (event: any) => {
    if (completed) return;
    const x = Math.max(0, Math.min(event.nativeEvent.translationX, MAX_DRAG));
    translateX.value = x;

    // Trigger progressive tick haptics as user swipes
    if (x > MAX_DRAG * 0.5 && x < MAX_DRAG * 0.55) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (completed) return;
    if (event.nativeEvent.state === State.END) {
      if (translateX.value >= MAX_DRAG * 0.85) {
        translateX.value = withSpring(MAX_DRAG);
        runOnJS(handleSuccessTrigger)();
      } else {
        translateX.value = withSpring(0);
      }
    }
  };

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + 4,
  }));

  return (
    <View
      style={[styles.track, { width: SLIDER_WIDTH }]}
      className="h-16 rounded-full bg-[#0F1622] border border-white/10 relative justify-center overflow-hidden"
    >
      {/* Dynamic Colored Trail */}
      <Animated.View
        style={[
          styles.progressTrail,
          { backgroundColor: `${color}35` },
          animatedProgressStyle,
        ]}
      />

      {/* Background Hint Text */}
      <View className="absolute inset-0 flex-row items-center justify-center pointer-events-none">
        <Text
          style={{ color: completed ? color : "#94A3B8" }}
          className="text-xs font-mono font-bold tracking-widest pl-6 uppercase"
        >
          {completed ? "SPARK ACTIVATED" : label}
        </Text>
      </View>

      {/* Draggable Neon Thumb Slider */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: color, shadowColor: color },
            animatedThumbStyle,
          ]}
          className="w-14 h-14 rounded-full items-center justify-center absolute left-1"
        >
          {completed ? (
            <Zap size={22} color="#06090E" fill="#06090E" />
          ) : (
            <ChevronRight size={26} color="#06090E" strokeWidth={3} />
          )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  progressTrail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
  },
  thumb: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});

