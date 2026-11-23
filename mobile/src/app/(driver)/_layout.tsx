import { Stack } from "expo-router";
import { COLORS } from "../../theme/tokens";

export default function DriverLayout() {
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
      {/* Top-level tabs use opaque fade-through to prevent previous-screen ghosting */}
      <Stack.Screen name="home" options={{ animation: "fade" }} />
      <Stack.Screen name="map-radar" options={{ animation: "fade" }} />
      <Stack.Screen name="bookings" options={{ animation: "fade" }} />
      <Stack.Screen name="profile" options={{ animation: "fade" }} />

      {/* Pushed detail screens use shared-axis slide_from_right */}
      <Stack.Screen
        name="route-planner"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
      <Stack.Screen
        name="garage-wallet"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
      <Stack.Screen
        name="booking-sheet"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
      <Stack.Screen
        name="gate-pass"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
      <Stack.Screen
        name="active-charge"
        options={{
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 240,
        }}
      />
    </Stack>
  );
}
