import { Linking, Alert, Platform } from "react-native";

export interface UpiPaymentDetails {
  hostVpa: string;
  hostName: string;
  amount: number | string;
  bookingId: string;
  note?: string;
}

export const buildUpiUri = (details: UpiPaymentDetails): string => {
  const formattedAmount = Number(details.amount).toFixed(2);
  const transactionRef = `VM${details.bookingId.replace(/-/g, "").substring(0, 10).toUpperCase()}`;
  const note = details.note || `VoltMate EV Charge ref ${details.bookingId.substring(0, 6)}`;

  const params = new URLSearchParams({
    pa: details.hostVpa,
    pn: details.hostName,
    am: formattedAmount,
    tr: transactionRef,
    tn: note,
    cu: "INR",
  });

  return `upi://pay?${params.toString()}`;
};

export const launchUpiPayment = async (details: UpiPaymentDetails): Promise<boolean> => {
  const uri = buildUpiUri(details);

  try {
    const supported = await Linking.canOpenURL(uri);
    if (supported || Platform.OS === "android") {
      await Linking.openURL(uri);
      return true;
    } else {
      Alert.alert(
        "No UPI App Found",
        `Could not open native UPI. Please pay directly via GPay / PhonePe to:\n\nVPA: ${details.hostVpa}\nAmount: ₹${details.amount}`,
        [{ text: "Copy VPA & OK" }]
      );
      return false;
    }
  } catch (error) {
    Alert.alert(
      "Payment Handshake",
      `Pay directly to Host VPA: ${details.hostVpa}\nAmount: ₹${details.amount}`
    );
    return false;
  }
};

