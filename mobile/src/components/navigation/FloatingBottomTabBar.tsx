import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
  AppState,
  LayoutChangeEvent,
} from "react-native";
import { useRouter, usePathname, useSegments } from "expo-router";
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

export interface TabItem {
  id: string;
  label: string;
  route: string;
  matchKeys: string[];
  icon: any;
}

export const DRIVER_TABS: ReadonlyArray<TabItem> = [
  { id: "home", label: "Home", route: "/(driver)/home", matchKeys: ["home"], icon: Home },
  { id: "map", label: "Map", route: "/(driver)/map-radar", matchKeys: ["map-radar", "route-planner"], icon: Map },
  { id: "bookings", label: "Bookings", route: "/(driver)/bookings", matchKeys: ["bookings"], icon: CalendarClock },
  { id: "profile", label: "Profile", route: "/(driver)/profile", matchKeys: ["profile", "garage-wallet"], icon: User },
];

export const HOST_TABS: ReadonlyArray<TabItem> = [
  { id: "dashboard", label: "Studio", route: "/(host)/dashboard", matchKeys: ["dashboard"], icon: LayoutDashboard },
  { id: "requests", label: "Requests", route: "/(host)/incoming-requests", matchKeys: ["incoming-requests"], icon: Inbox },
  { id: "chargers", label: "Schedule", route: "/(host)/schedule-matrix", matchKeys: ["schedule-matrix"], icon: CalendarCog },
  { id: "payouts", label: "Payouts", route: "/(host)/wallet", matchKeys: ["wallet"], icon: Wallet },
];

// Constant stadium geometry: corner radius is ALWAYS PILL_HEIGHT / 2 (never animated, never toggled)
export const DOCK_MAX_WIDTH = 420;
export const DOCK_HEIGHT = 64;
export const DOCK_RADIUS = DOCK_HEIGHT / 2; // 32
export const DOCK_PADDING_H = 6;
export const PILL_HEIGHT = 48;
export const PILL_RADIUS = PILL_HEIGHT / 2; // 24 (exact stadium height / 2)
export const PILL_INSET_H = 2;

export function resolveIsHostMode(
  pathname: string,
  segments: string[],
  activeMode: "DRIVER" | "HOST"
): boolean {
  const topSegment = segments[0] || "";
  if (topSegment === "(host)") return true;
  if (topSegment === "(driver)") return false;
  if (
    pathname.includes("(host)") ||
    pathname.includes("/dashboard") ||
    pathname.includes("/incoming-requests") ||
    pathname.includes("/schedule-matrix") ||
    pathname === "/wallet"
  ) {
    return true;
  }
  if (
    pathname.includes("(driver)") ||
    pathname.includes("/home") ||
    pathname.includes("/map-radar") ||
    pathname.includes("/bookings") ||
    pathname.includes("/profile")
  ) {
    return false;
  }
  return activeMode === "HOST";
}

export function resolveActiveTabIndex(
  pathname: string,
  tabs: ReadonlyArray<TabItem>,
  optimisticTabId?: string | null
): number {
  if (optimisticTabId) {
    const optIdx = tabs.findIndex((t) => t.id === optimisticTabId);
    if (optIdx >= 0) return optIdx;
  }
  const matchedIdx = tabs.findIndex((tab) =>
    tab.matchKeys.some((k) => pathname.includes(k))
  );
  return matchedIdx >= 0 ? matchedIdx : 0;
}

export const FloatingBottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { activeMode } = useVoltMateEngine();
  const reduceMotion = useReduceMotion();

  const initialDockWidth = Math.min(
    Dimensions.get("window").width - SPACING.screenMargin * 2,
    DOCK_MAX_WIDTH
  );
  const [dockWidth, setDockWidth] = useState<number>(initialDockWidth);
  const [optimisticTabId, setOptimisticTabId] = useState<string | null>(null);

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

  const isHostScreen = resolveIsHostMode(pathname, segments, activeMode);
  const tabs = isHostScreen ? HOST_TABS : DRIVER_TABS;

  // Clear optimistic tab override once pathname updates or mode switches
  useEffect(() => {
    setOptimisticTabId(null);
  }, [pathname, isHostScreen]);

  const activeIndex = resolveActiveTabIndex(pathname, tabs, optimisticTabId);

  // Single persistent sliding indicator animated value (0..3)
  const slideIndexAnim = useRef(new Animated.Value(activeIndex)).current;
  const modeAnim = useRef(new Animated.Value(1)).current;

  // Retarget sliding pill immediately on tab change or rapid taps (no state depends on animation completion)
  useEffect(() => {
    if (reduceMotion) {
      slideIndexAnim.setValue(activeIndex);
      return;
    }
    Animated.spring(slideIndexAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
    }).start();
  }, [activeIndex, reduceMotion, slideIndexAnim]);

  // Snap indicator to exact active tab when app returns from background to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        slideIndexAnim.setValue(activeIndex);
      }
    });
    return () => sub.remove();
  }, [activeIndex, slideIndexAnim]);

  useEffect(() => {
    if (reduceMotion) return;
    modeAnim.setValue(0.95);
    Animated.spring(modeAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    }).start();
  }, [isHostScreen, reduceMotion, modeAnim]);

  if (isHiddenScreen) {
    return null;
  }

  const innerDockWidth = Math.max(0, dockWidth - DOCK_PADDING_H * 2);
  const slotWidth = tabs.length > 0 ? innerDockWidth / tabs.length : 0;
  const pillWidth = Math.max(64, slotWidth - PILL_INSET_H * 2);

  const pillTranslateX = slideIndexAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, slotWidth, slotWidth * 2, slotWidth * 3],
    extrapolate: "clamp",
  });

  const handleDockLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - dockWidth) > 0.5) {
      setDockWidth(w);
    }
  };

  const handleTabPress = (tab: TabItem) => {
    setOptimisticTabId(tab.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const route = tab.route;
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
          onLayout={handleDockLayout}
          collapsable={false}
          style={[
            styles.dockBar,
            {
              transform: [{ scale: modeAnim }],
            },
          ]}
        >
          {/* ONE Persistent Sliding Stadium Indicator Pill (constant borderRadius = PILL_HEIGHT / 2, never toggled) */}
          <Animated.View
            pointerEvents="none"
            collapsable={false}
            testID="sliding-nav-indicator-pill"
            style={[
              styles.slidingIndicatorPill,
              {
                width: pillWidth,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          >
            <View collapsable={false} style={styles.slidingIndicatorFill} />
          </Animated.View>

          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = idx === activeIndex;

            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTabPress(tab)}
                android_ripple={null}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.label} tab`}
                accessibilityState={{ selected: isActive }}
                style={styles.tabSlot}
              >
                <View collapsable={false} style={styles.tabPill}>
                  <Icon
                    size={18}
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
              </Pressable>
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
    borderRadius: DOCK_RADIUS,
    height: DOCK_HEIGHT,
    paddingHorizontal: DOCK_PADDING_H,
    width: "100%",
    maxWidth: DOCK_MAX_WIDTH,
    borderWidth: 0,
    overflow: "hidden",
    ...ELEVATION.level2,
  },
  slidingIndicatorPill: {
    position: "absolute",
    left: DOCK_PADDING_H + PILL_INSET_H,
    top: (DOCK_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: COLORS.primary,
    overflow: "hidden",
  },
  slidingIndicatorFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_RADIUS,
    backgroundColor: COLORS.primary,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: SPACING.touchTarget,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    overflow: "hidden",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: PILL_RADIUS,
    height: PILL_HEIGHT,
    width: "100%",
    gap: 4,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  tabLabel: {
    ...TYPOGRAPHY.captionSemibold,
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  activeTabLabel: {
    color: COLORS.textInverse,
  },
});
