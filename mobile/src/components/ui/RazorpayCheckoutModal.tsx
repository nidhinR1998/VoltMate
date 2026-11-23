import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { ShieldCheck, X, AlertCircle } from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import { verifyRazorpayPaymentOnServer } from "../../services/razorpayService";
import { RAZORPAY_PUBLIC_KEY_ID } from "../../services/api";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";

export function RazorpayCheckoutModal() {
  const {
    activeRazorpayOrder,
    closeRazorpayCheckout,
    applyVerifiedRazorpayPayment,
    showToast,
  } = useVoltMateEngine();

  const [verifying, setVerifying] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const checkoutHtml = useMemo(() => {
    if (!activeRazorpayOrder) return "";
    const keyId =
      activeRazorpayOrder.key_id ||
      RAZORPAY_PUBLIC_KEY_ID ||
      "";
    const optionsJson = JSON.stringify({
      key: keyId,
      amount: activeRazorpayOrder.amount_paise,
      currency: activeRazorpayOrder.currency || "INR",
      name: "VoltMate EV",
      description:
        activeRazorpayOrder.purpose === "WALLET_TOPUP"
          ? `VoltMate Wallet Top-Up (₹${activeRazorpayOrder.amount_inr.toFixed(2)})`
          : `EV Charging Settlement (${activeRazorpayOrder.reference_id || ""})`,
      order_id: activeRazorpayOrder.razorpay_order_id,
      prefill: {
        name: activeRazorpayOrder.prefill?.name || "VoltMate Driver",
        email: activeRazorpayOrder.prefill?.email || "",
        contact: activeRazorpayOrder.prefill?.contact || "",
      },
      theme: {
        color: "#059669",
      },
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Razorpay Secure Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #F7F9F8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
      color: #111714;
      text-align: center;
    }
    .status-text {
      font-size: 14px;
      color: #4B5563;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div id="status" class="status-text">Opening Razorpay Secure Checkout (UPI / Cards / Netbanking)...</div>
  <script>
    (function() {
      function postToRN(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      if (typeof Razorpay === "undefined") {
        postToRN({ type: "ERROR", message: "Could not load Razorpay Checkout SDK. Please check your internet connection." });
        return;
      }
      var opts = ${optionsJson};
      opts.handler = function(response) {
        postToRN({
          type: "SUCCESS",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        });
      };
      opts.modal = {
        ondismiss: function() {
          postToRN({ type: "CANCELLED" });
        }
      };
      try {
        var rzp = new Razorpay(opts);
        rzp.on("payment.failed", function(resp) {
          var errDesc = (resp && resp.error && resp.error.description) || "Payment failed at Razorpay gateway.";
          postToRN({
            type: "FAILED",
            code: (resp && resp.error && resp.error.code) || "PAYMENT_FAILED",
            message: errDesc
          });
        });
        rzp.open();
      } catch (e) {
        postToRN({ type: "ERROR", message: e.message || "Failed to initialize Razorpay Checkout." });
      }
    })();
  </script>
</body>
</html>`;
  }, [activeRazorpayOrder]);

  if (!activeRazorpayOrder) return null;

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event?.nativeEvent?.data || "{}");
      if (msg.type === "CANCELLED") {
        closeRazorpayCheckout();
        showToast(
          "Payment Cancelled",
          "Razorpay checkout was closed without completing payment. Your balance was not changed.",
          "info"
        );
        return;
      }
      if (msg.type === "FAILED" || msg.type === "ERROR") {
        setErrorBanner(msg.message || "Payment could not be completed.");
        showToast(
          "Payment Failed",
          msg.message || "Razorpay payment failed. No funds were credited.",
          "warning"
        );
        return;
      }
      if (msg.type === "SUCCESS") {
        setVerifying(true);
        setErrorBanner(null);
        try {
          const verified = await verifyRazorpayPaymentOnServer({
            razorpay_order_id:
              msg.razorpay_order_id || activeRazorpayOrder.razorpay_order_id,
            razorpay_payment_id: msg.razorpay_payment_id,
            razorpay_signature: msg.razorpay_signature,
          });
          await applyVerifiedRazorpayPayment(verified);
          setVerifying(false);
          closeRazorpayCheckout();
        } catch (verifyErr: any) {
          setVerifying(false);
          const detail =
            verifyErr?.response?.data?.detail ||
            verifyErr?.message ||
            "Server-side HMAC-SHA256 payment verification failed.";
          setErrorBanner(detail);
          showToast("Verification Failed", detail, "warning");
        }
      }
    } catch {
      // ignore non-JSON messages
    }
  };

  return (
    <Modal
      visible={!!activeRazorpayOrder}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (!verifying) closeRazorpayCheckout();
      }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ShieldCheck size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.headerTitle}>Razorpay Secure Checkout</Text>
              <Text style={styles.headerSub}>
                Order {activeRazorpayOrder.razorpay_order_id} • ₹
                {activeRazorpayOrder.amount_inr.toFixed(2)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            disabled={verifying}
            onPress={closeRazorpayCheckout}
            accessibilityRole="button"
            accessibilityLabel="Cancel Razorpay Checkout"
          >
            <X size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {errorBanner && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color={COLORS.destructive} />
            <Text style={styles.errorText}>{errorBanner}</Text>
          </View>
        )}

        {verifying ? (
          <View style={styles.verifyingCenter}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.verifyingTitle}>
              Verifying Payment Signature...
            </Text>
            <Text style={styles.verifyingSub}>
              Validating HMAC-SHA256 signature and updating your PostgreSQL EDW
              wallet ledger.
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{
              html: checkoutHtml,
              baseUrl: "https://api.razorpay.com",
            }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleWebViewMessage}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.screenMargin,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.errorBg,
    paddingHorizontal: SPACING.screenMargin,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  errorText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.destructive,
    flex: 1,
  },
  verifyingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  verifyingTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  verifyingSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
});
