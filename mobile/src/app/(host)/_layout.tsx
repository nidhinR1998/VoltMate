import { Stack } from "expo-router";
import { COLORS } from "../../theme/tokens";

export default function HostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background, opacity: 1 },
        animation: "fade",
        animationDuration: 180,
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="dashboard" options={{ animation: "fade" }} />
      <Stack.Screen name="incoming-requests" options={{ animation: "fade" }} />
      <Stack.Screen name="schedule-matrix" options={{ animation: "fade" }} />
      <Stack.Screen name="wallet" options={{ animation: "fade" }} />
      <Stack.Screen
        name="add-charger"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
    </Stack>
  );
}
