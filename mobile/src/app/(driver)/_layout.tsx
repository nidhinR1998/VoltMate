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
      <Stack.Screen name="booking-sheet" />
      <Stack.Screen name="gate-pass" />
      <Stack.Screen name="active-charge" />
    </Stack>
  );
}

