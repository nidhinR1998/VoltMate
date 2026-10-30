import { Stack } from "expo-router";

export default function HostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#06090E" },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="add-charger" />
      <Stack.Screen name="schedule-matrix" />
      <Stack.Screen name="incoming-requests" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}

