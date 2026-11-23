import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FloatingBottomTabBar } from "../components/navigation/FloatingBottomTabBar";
import { ToastBanner } from "../components/ui/ToastBanner";
import { ActiveChargingModal } from "../components/ui/ActiveChargingModal";
import { RazorpayCheckoutModal } from "../components/ui/RazorpayCheckoutModal";
import { COLORS } from "../theme/tokens";

const queryClient = new QueryClient();

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected UI error occurred.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>VoltMate Cockpit Recovery</Text>
          <Text style={styles.errorSubtitle}>{this.state.errorMessage}</Text>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={() => this.setState({ hasError: false, errorMessage: "" })}
            accessibilityRole="button"
            accessibilityLabel="Retry and reload cockpit"
          >
            <Text style={styles.errorRetryText}>Retry & Reload Cockpit</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const { isLoading, initializeAuth, token } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const currentGroup = segments[0];
  const currentLeaf = (segments as string[])[1] || "";
  const isAuthScreen = !currentGroup || currentGroup === "(auth)";
  const isGarageSetupScreen = currentLeaf === "garage-setup";

  useEffect(() => {
    if (isLoading) return;
    if (token && isAuthScreen && !isGarageSetupScreen) {
      router.replace("/(driver)/home");
    } else if (!token && !isAuthScreen) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, token, isAuthScreen, isGarageSetupScreen]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.root}>
            <StatusBar style="dark" backgroundColor={COLORS.background} />
            <ToastBanner />
            <ActiveChargingModal />
            <RazorpayCheckoutModal />
            <View style={styles.container}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: COLORS.background },
                  animation: "fade",
                  animationDuration: 200,
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
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  errorRetryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorRetryText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
});
