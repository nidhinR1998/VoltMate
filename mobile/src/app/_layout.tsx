import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FloatingBottomTabBar } from "../components/navigation/FloatingBottomTabBar";
import { ToastBanner } from "../components/ui/ToastBanner";
import { ActiveChargingModal } from "../components/ui/ActiveChargingModal";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isLoading, initializeAuth, token } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const currentGroup = segments[0];
  const isAuthScreen = !currentGroup || currentGroup === "(auth)";

  useEffect(() => {
    if (isLoading) return;
    if (token && isAuthScreen) {
      router.replace("/(driver)/home");
    }
  }, [isLoading, token, isAuthScreen]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#05E660" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <StatusBar style="dark" backgroundColor="#F2F4F3" />
          <ToastBanner />
          <ActiveChargingModal />
          <View style={styles.container}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#F2F4F3" },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(driver)" options={{ headerShown: false }} />
              <Stack.Screen name="(host)" options={{ headerShown: false }} />
            </Stack>
          </View>
          <FloatingBottomTabBar />
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
});
