import { Stack } from "expo-router";
import { COLORS } from "../../theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background, opacity: 1 },
        animation: "fade",
        animationDuration: 200,
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="otp-verify" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="garage-setup" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
