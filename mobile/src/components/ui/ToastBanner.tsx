import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { COLORS, SPACING, TYPOGRAPHY, ELEVATION } from "../../theme/tokens";
import { useReduceMotion } from "./DesignSystem";

export const ToastBanner: React.FC = () => {
  const { toast, hideToast } = useAuthStore();
  const reduceMotion = useReduceMotion();
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      if (reduceMotion) {
        translateY.setValue(0);
        opacity.setValue(1);
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 70,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      }

      const timer = setTimeout(() => {
        if (reduceMotion) {
          hideToast();
        } else {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 120,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => hideToast());
        }
      }, 3400);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(120);
      opacity.setValue(0);
    }
  }, [toast.visible, toast.title, toast.message, reduceMotion]);

  if (!toast.visible) return null;

  const badgeBg =
    toast.type === "success"
      ? COLORS.primary
      : toast.type === "warning"
      ? COLORS.warning
      : COLORS.info;

  const IconComponent =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "warning"
      ? AlertTriangle
      : Info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: badgeBg }]}>
          <IconComponent size={18} color={COLORS.textInverse} strokeWidth={2.4} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={hideToast}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <X size={18} color={COLORS.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 98 : 90,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
    zIndex: 9998,
  },
  card: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: SPACING.cardRadius,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    ...ELEVATION.level2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    paddingVertical: 2,
  },
  title: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textInverse,
  },
  message: {
    ...TYPOGRAPHY.caption,
    color: "#D0D8D3",
    marginTop: 2,
  },
  closeBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
