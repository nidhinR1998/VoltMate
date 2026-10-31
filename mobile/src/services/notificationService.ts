import { NativeModules, Platform, Linking, Alert } from "react-native";
import * as Haptics from "expo-haptics";

const { GoogleAccountPicker } = NativeModules;

export async function initializeNativeNotifications(): Promise<void> {
  try {
    if (Platform.OS === "android" && GoogleAccountPicker?.requestNotificationPermission) {
      await GoogleAccountPicker.requestNotificationPermission();
    }
  } catch {
    // ignore
  }
}

export async function fireNativePushNotification(
  title: string,
  message: string
): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore haptics error
  }

  try {
    if (Platform.OS === "android" && GoogleAccountPicker?.showLocalNotification) {
      await GoogleAccountPicker.showLocalNotification(title, message);
    }
  } catch {
    // fallback handled by in-app ToastBanner
  }
}

export async function launchNativePhoneCall(phoneNumber: string): Promise<void> {
  const cleaned = phoneNumber.replace(/\s+/g, "");
  const telUrl = `tel:${cleaned}`;
  try {
    await Linking.openURL(telUrl);
  } catch {
    Alert.alert("Call Host", `Dial ${phoneNumber} on your phone.`);
  }
}

export async function launchNativeTurnByTurnMaps(
  lat: number,
  lng: number,
  stationName?: string
): Promise<void> {
  const navUrl = `google.navigation:q=${lat},${lng}`;
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  try {
    const canOpenNav = await Linking.canOpenURL(navUrl);
    if (canOpenNav) {
      await Linking.openURL(navUrl);
    } else {
      await Linking.openURL(webFallback);
    }
  } catch {
    await Linking.openURL(webFallback);
  }
}

export async function launchNativeUpiPayment(
  amountInr: number,
  payeeVpa = "voltmate.escrow@okaxis",
  payeeName = "VoltMate Energy"
): Promise<boolean> {
  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    payeeVpa
  )}&pn=${encodeURIComponent(payeeName)}&am=${amountInr.toFixed(2)}&cu=INR`;
  try {
    const supported = await Linking.canOpenURL(upiUrl);
    if (supported) {
      await Linking.openURL(upiUrl);
      return true;
    }
  } catch {
    // No external UPI app installed or user cancelled
  }
  return false;
}

