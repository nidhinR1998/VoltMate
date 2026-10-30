import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { Zap, Home, Car } from "lucide-react-native";

import { useModeStore } from "../store/useModeStore";
import { useAuthStore } from "../store/useAuthStore";
import { ModeShockwave } from "../components/animations/ModeShockwave";
import { FloatingBottomTabBar } from "../components/navigation/FloatingBottomTabBar";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMode, accentColor, toggleMode } = useModeStore();
  const { loadSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    loadSession().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });

    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const isAuthScreen =
    pathname.includes("(auth)") ||
    pathname === "/" ||
    pathname === "/splash" ||
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/otp" ||
    !isAuthenticated;

  const handleModeToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    toggleMode();

    if (currentMode === "DRIVER") {
      router.replace("/(host)/dashboard");
    } else {
      router.replace("/(driver)/map-radar");
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#06090E" }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="light-content" backgroundColor="#06090E" />

          {/* Full Screen Circular Mode Transition Shockwave */}
          <ModeShockwave />

          {/* Persistent Top Header with Dual-Core Mode Switcher (Visible in Authenticated App) */}
          {!isAuthScreen && (
            <View className="flex-row items-center justify-between px-5 pt-12 pb-3 bg-[#06090E]/95 border-b border-white/5 z-50">
              <View className="flex-row items-center">
                <Text className="text-xl font-bold font-space text-white tracking-tight">
                  Volt<Text style={{ color: accentColor }}>Mate</Text>
                </Text>
                <View
                  style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}50` }}
                  className="ml-2 px-2 py-0.5 rounded-full border"
                >
                  <Text style={{ color: accentColor }} className="text-[10px] font-mono font-bold">
                    {currentMode} MODE
                  </Text>
                </View>
              </View>

              {/* Dual-Core Mode Switcher Pill */}
              <TouchableOpacity
                onPress={handleModeToggle}
                activeOpacity={0.8}
                style={{ borderColor: accentColor }}
                className="flex-row items-center bg-[#0F1622] px-3 py-1.5 rounded-full border shadow-md"
              >
                {currentMode === "DRIVER" ? (
                  <>
                    <Car size={14} color="#00F59B" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-semibold text-white">Switch to Host</Text>
                  </>
                ) : (
                  <>
                    <Home size={14} color="#FFB800" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-semibold text-white">Switch to Driver</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation Stack */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#06090E" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="(host)" />
          </Stack>

          {/* Floating Glassmorphic Bottom Tab Bar */}
          <FloatingBottomTabBar />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

