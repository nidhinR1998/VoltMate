import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from "react-native";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Home,
  Map,
  CalendarClock,
  User,
  LayoutDashboard,
  Inbox,
  CalendarCog,
  Wallet,
} from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { COLORS, SPACING, TYPOGRAPHY, ELEVATION } from "../../theme/tokens";
import { useReduceMotion } from "../ui/DesignSystem";

interface TabItem {
  id: string;
  label: string;
  route: string;
  matchKeys: string[];
  icon: any;
}

const DRIVER_TABS: TabItem[] = [
  { id: "home", label: "Home", route: "/(driver)/home", matchKeys: ["home"], icon: Home },
  { id: "map", label: "Map", route: "/(driver)/map-radar", matchKeys: ["map-radar", "route-planner"], icon: Map },
  { id: "bookings", label: "Bookings", route: "/(driver)/bookings", matchKeys: ["bookings"], icon: CalendarClock },
  { id: "profile", label: "Profile", route: "/(driver)/profile", matchKeys: ["profile", "garage-wallet"], icon: User },
];

const HOST_TABS: TabItem[] = [
  { id: "dashboard", label: "Studio", route: "/(host)/dashboard", matchKeys: ["dashboard"], icon: LayoutDashboard },
  { id: "requests", label: "Requests", route: "/(host)/incoming-requests", matchKeys: ["incoming-requests"], icon: Inbox },
  { id: "chargers", label: "Schedule", route: "/(host)/schedule-matrix", matchKeys: ["schedule-matrix"], icon: CalendarCog },
  { id: "payouts", label: "Payouts", route: "/(host)/wallet", matchKeys: ["wallet"], icon: Wallet },
];

export const FloatingBottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { activeMode } = useVoltMateEngine();
  const reduceMotion = useReduceMotion();
  const modeAnim = useRef(new Animated.Value(1)).current;

  const isHiddenScreen =
    pathname.includes("booking-sheet") ||
    pathname.includes("gate-pass") ||
    pathname.includes("active-charge") ||
    pathname.includes("add-charger") ||
    pathname.includes("(auth)") ||
    pathname === "/" ||
    pathname === "/splash" ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/otp-verify" ||
    pathname === "/garage-setup";

  const isHostScreen =
    activeMode === "HOST" ||
    pathname.includes("(host)") ||
    pathname.includes("/dashboard") ||
    pathname.includes("/incoming-requests") ||
    pathname.includes("/schedule-matrix") ||
    pathname === "/wallet";

  useEffect(() => {
    if (reduceMotion) return;
    modeAnim.setValue(0.92);
    Animated.spring(modeAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }, [isHostScreen, reduceMotion]);

  if (isHiddenScreen) {
    return null;
  }

  const tabs = isHostScreen ? HOST_TABS : DRIVER_TABS;

  const handleTabPress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (pathname && route.endsWith(pathname)) return;
    router.replace(route as any);
  };

  return (
    <View style={styles.outerWrap} pointerEvents="box-none">
      {/* Subtle Top Fade / Scrim above the Floating Bottom Nav */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(244, 247, 245, 0)",
          "rgba(244, 247, 245, 0.85)",
          COLORS.background,
        ]}
        style={styles.topFadeScrim}
      />
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dockBar,
            {
              transform: [{ scale: modeAnim }],
            },
          ]}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.matchKeys.some((k) => pathname.includes(k));

            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.route)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.label} tab`}
                accessibilityState={{ selected: isActive }}
                style={styles.tabSlot}
              >
                <View style={[styles.tabPill, isActive && styles.activeTabPill]}>
                  <Icon
                    size={19}
                    color={isActive ? COLORS.textInverse : COLORS.textSecondary}
                    strokeWidth={isActive ? 2.3 : 1.9}
                  />
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === "ios" ? 112 : 104,
    zIndex: 9999,
    justifyContent: "flex-end",
  },
  topFadeScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 12,
    left: SPACING.screenMargin,
    right: SPACING.screenMargin,
    alignItems: "center",
  },
  dockBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.chipRadius,
    height: 68,
    paddingHorizontal: SPACING.xs + 2,
    width: "100%",
    maxWidth: 420,
    borderWidth: 0,
    ...ELEVATION.level2,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: SPACING.touchTarget,
    height: "100%",
  },
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SPACING.chipRadius,
    minWidth: 68,
    minHeight: 52,
    gap: 2,
  },
  activeTabPill: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  activeTabLabel: {
    color: COLORS.textInverse,
  },
});
