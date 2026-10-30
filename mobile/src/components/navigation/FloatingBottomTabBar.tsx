import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Home,
  Map,
  MapPin,
  User,
  Activity,
  BellRing,
  Sliders,
  Wallet,
} from "lucide-react-native";
import { useModeStore } from "../../store/useModeStore";

interface TabItem {
  id: string;
  route: string;
  matchKeys: string[];
  icon: any;
}

const DRIVER_TABS: TabItem[] = [
  { id: "home", route: "/(driver)/home", matchKeys: ["home"], icon: Home },
  { id: "map", route: "/(driver)/map-radar", matchKeys: ["map-radar", "route-planner"], icon: Map },
  { id: "bookings", route: "/(driver)/bookings", matchKeys: ["bookings"], icon: MapPin },
  { id: "profile", route: "/(driver)/profile", matchKeys: ["profile", "garage-wallet"], icon: User },
];

const HOST_TABS: TabItem[] = [
  { id: "dashboard", route: "/(host)/dashboard", matchKeys: ["dashboard"], icon: Activity },
  { id: "requests", route: "/(host)/incoming-requests", matchKeys: ["incoming-requests"], icon: BellRing },
  { id: "chargers", route: "/(host)/schedule-matrix", matchKeys: ["schedule-matrix"], icon: Sliders },
  { id: "payouts", route: "/(host)/wallet", matchKeys: ["wallet"], icon: Wallet },
];

export const FloatingBottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMode } = useModeStore();

  // Hide tab bar on auth screens and fullscreen booking/charging sheets
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

  if (isHiddenScreen) {
    return null;
  }

  const tabs = currentMode === "DRIVER" ? DRIVER_TABS : HOST_TABS;

  const handleTabPress = (route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(route as any);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.dockBar}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchKeys.some((k) => pathname.includes(k));

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.75}
              style={styles.tabSlot}
            >
              <View style={[styles.iconCircle, isActive && styles.activeIconCircle]}>
                <Icon
                  size={21}
                  color={isActive ? "#05E660" : "#222A26"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 16,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  dockBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    height: 68,
    paddingHorizontal: 14,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#0F1713",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeIconCircle: {
    backgroundColor: "#151C18",
    shadowColor: "#151C18",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
});
