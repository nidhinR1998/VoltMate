import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";

import { useAuthStore } from "../store/useAuthStore";
import { FloatingBottomTabBar } from "../components/navigation/FloatingBottomTabBar";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2,
    },
  },
});

export default function RootLayout() {
  const { loadSession } = useAuthStore();

  useEffect(() => {
    loadSession().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });

    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1200);

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#F2F4F3" }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" backgroundColor="#F2F4F3" />

          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#F2F4F3" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="(host)" />
          </Stack>

          {/* Floating Light Dock Bottom Tab Bar */}
          <FloatingBottomTabBar />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
