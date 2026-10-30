import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#06090E" },
      }}
    >
      <Stack.Screen name="map-radar" />
      <Stack.Screen name="route-planner" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="garage-wallet" />
      <Stack.Screen
        name="booking-sheet"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="gate-pass"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="active-charge"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
