import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";

export const ToastBanner: React.FC = () => {
  const { toast, hideToast } = useAuthStore();
  const translateY = useRef(new Animated.Value(-130)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -130,
          duration: 240,
          useNativeDriver: true,
        }).start(() => hideToast());
      }, 3600);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-130);
    }
  }, [toast.visible, toast.title, toast.message]);

  if (!toast.visible) return null;

  const badgeBg =
    toast.type === "success"
      ? "#16B374"
      : toast.type === "warning"
      ? "#F59E0B"
      : "#10241B";

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={hideToast}
      >
        <View style={[styles.iconCircle, { backgroundColor: badgeBg }]}>
          <Text style={styles.iconText}>
            {toast.type === "success" ? "✓" : toast.type === "warning" ? "⏰" : "⚡"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 46,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 30,
  },
  card: {
    backgroundColor: "#151C18",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(22, 179, 116, 0.45)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  message: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 16,
  },
  closeTxt: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
});

