import { Stack } from "expo-router";

export default function HostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F2F4F3" },
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
