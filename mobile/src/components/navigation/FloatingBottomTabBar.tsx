import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Compass,
  Route,
  Zap,
  Car,
  User,
  Activity,
  BellRing,
  Sliders,
  Wallet,
} from "lucide-react-native";
import { useModeStore } from "../../store/useModeStore";

interface TabItem {
  id: string;
  label: string;
  route: string;
  icon: any;
}

const DRIVER_TABS: TabItem[] = [
  { id: "explore", label: "Explore", route: "/(driver)/map-radar", icon: Compass },
  { id: "trip", label: "Trip Planner", route: "/(driver)/route-planner", icon: Route },
  { id: "bookings", label: "My Bookings", route: "/(driver)/bookings", icon: Zap },
  { id: "garage", label: "Garage & Wallet", route: "/(driver)/garage-wallet", icon: Car },
  { id: "profile", label: "Profile", route: "/(driver)/profile", icon: User },
];

const HOST_TABS: TabItem[] = [
  { id: "dashboard", label: "Command", route: "/(host)/dashboard", icon: Activity },
  { id: "requests", label: "Requests", route: "/(host)/incoming-requests", icon: BellRing },
  { id: "chargers", label: "My Chargers", route: "/(host)/schedule-matrix", icon: Sliders },
  { id: "payouts", label: "Payouts", route: "/(host)/wallet", icon: Wallet },
];

export const FloatingBottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMode, accentColor } = useModeStore();

  // Hide tab bar on auth screens and fullscreen flow screens
  const isDetailScreen =
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

  if (isDetailScreen) {
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
      <View style={[styles.glassBar, { borderColor: `${accentColor}30` }]}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.includes(tab.id) || 
            (tab.id === "explore" && pathname.includes("map-radar")) ||
            (tab.id === "trip" && pathname.includes("route-planner")) ||
            (tab.id === "dashboard" && pathname.includes("dashboard")) ||
            (tab.id === "requests" && pathname.includes("incoming-requests")) ||
            (tab.id === "chargers" && pathname.includes("schedule-matrix")) ||
            (tab.id === "payouts" && pathname.includes("wallet"));

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.7}
              style={[
                styles.tabButton,
                isActive && {
                  backgroundColor: `${accentColor}15`,
                },
              ]}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  size={20}
                  color={isActive ? accentColor : "#64748B"}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {isActive && (
                  <View style={[styles.activeDot, { backgroundColor: accentColor }]} />
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? "#FFFFFF" : "#64748B",
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
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
    bottom: Platform.OS === "ios" ? 28 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  glassBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(15, 22, 34, 0.94)",
    borderRadius: 36,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 24,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 26,
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
