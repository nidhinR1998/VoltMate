import React, { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { COLORS } from "../../theme/tokens";

/**
 * Route entry wrapper for `/(driver)/active-charge` that delegates to the
 * single canonical live charging session engine & `<ActiveChargingModal />`.
 */
export default function ActiveChargeScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { activeSession, startChargingSession, openChargingModal } =
    useVoltMateEngine();

  useEffect(() => {
    if (!activeSession) {
      startChargingSession(bookingId);
    } else {
      openChargingModal();
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(driver)/home");
    }
  }, [bookingId]);

  return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
}
