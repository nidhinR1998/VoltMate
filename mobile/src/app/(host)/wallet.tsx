import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowUpRight, ShieldCheck, Receipt, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuthStore } from "../../store/useAuthStore";

interface Transaction {
  id: string;
  title: string;
  driver: string;
  amount: number;
  date: string;
  type: "CREDIT" | "DEBIT";
  refId: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_1",
    title: "Charging Session Settlement (Model X)",
    driver: "James Carter",
    amount: 18.5,
    date: "Today, 16:35",
    type: "CREDIT",
    refId: "REF-492019",
  },
  {
    id: "tx_2",
    title: "Charging Session Settlement (IONIQ 5)",
    driver: "Sophie Laurent",
    amount: 14.0,
    date: "Yesterday, 19:15",
    type: "CREDIT",
    refId: "REF-938472",
  },
  {
    id: "tx_3",
    title: "Instant Bank Payout",
    driver: "Auto-Settlement",
    amount: -80.0,
    date: "May 28",
    type: "DEBIT",
    refId: "PAYOUT-829",
  },
];

export default function HostWalletScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [payoutAccount, setPayoutAccount] = useState(user?.upiId || "alex.morgan@bank");
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  const balance = user?.voltCreditsBalance || 186.0;

  const handleSaveAccount = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateUser({ upiId: payoutAccount.trim() });
    setIsEditingAccount(false);
    Alert.alert("Payout Account Saved", "Your instant payout destination has been updated.");
  };

  const handleWithdraw = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert(
      "Instant Payout Dispatched",
      `$50.00 has been transferred to ${payoutAccount}. Reference: PAY_${Date.now().toString().slice(-6)}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Earnings & Payouts</Text>
            <Text style={styles.subtitle}>
              Zero-fee direct settlement & ledger history
            </Text>
          </View>
        </View>

        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>AVAILABLE HOST EARNINGS</Text>
            <ShieldCheck size={16} color="#05E660" />
          </View>

          <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleWithdraw}
              style={styles.withdrawBtn}
            >
              <ArrowUpRight size={16} color="#111714" />
              <Text style={styles.withdrawBtnText}>Withdraw to Bank</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Converted to Charging Credits",
                  "$25.00 has been added to your EV driver charging wallet."
                )
              }
              style={styles.convertBtn}
            >
              <RefreshCw size={14} color="#FFFFFF" />
              <Text style={styles.convertBtnText}>Use to Charge</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settlement Account Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.sectionTitle}>PAYOUT DESTINATION</Text>
            <TouchableOpacity onPress={() => setIsEditingAccount(!isEditingAccount)}>
              <Text style={styles.editLink}>
                {isEditingAccount ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingAccount ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                value={payoutAccount}
                onChangeText={setPayoutAccount}
                placeholder="Account / VPA"
                placeholderTextColor="#9CA3AF"
                style={styles.accountInput}
              />
              <TouchableOpacity
                onPress={handleSaveAccount}
                style={styles.saveSmallBtn}
              >
                <Text style={styles.saveSmallBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.accountPill}>
              <Text style={styles.accountText}>{payoutAccount}</Text>
              <ShieldCheck size={16} color="#047835" />
            </View>
          )}
        </View>

        {/* Ledger */}
        <View style={styles.ledgerHeader}>
          <Text style={styles.sectionTitle}>SETTLEMENT LEDGER</Text>
          <Receipt size={15} color="#757F7A" />
        </View>

        <View style={{ gap: 10 }}>
          {INITIAL_TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txSub}>
                  {tx.date} • {tx.refId}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.amount > 0 ? "#047835" : "#111714" },
                ]}
              >
                {tx.amount > 0
                  ? `+$${tx.amount.toFixed(2)}`
                  : `-$${Math.abs(tx.amount).toFixed(2)}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9E6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111714",
  },
  subtitle: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: "#151C18",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    paddingVertical: 13,
    borderRadius: 22,
    gap: 6,
  },
  withdrawBtnText: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "800",
  },
  convertBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 13,
    borderRadius: 22,
    gap: 6,
  },
  convertBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 20,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
  },
  editLink: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111714",
  },
  accountPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBF0ED",
  },
  accountText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  accountInput: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111714",
    borderWidth: 1,
    borderColor: "#E4E9E6",
  },
  saveSmallBtn: {
    backgroundColor: "#05E660",
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 14,
  },
  saveSmallBtnText: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 13,
  },
  ledgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  txCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
  },
  txTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111714",
  },
  txSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
});
