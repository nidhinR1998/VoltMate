import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore, TAB_BAR_SAFE_PADDING } from "../../store/useAuthStore";

export default function HostWalletScreen() {
  const router = useRouter();
  const {
    user,
    hostEarningsBalance,
    hostTransactions,
    withdrawHostEarnings,
    convertHostEarningsToWallet,
    updateProfile,
  } = useAuthStore();

  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [editUpiModalVisible, setEditUpiModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const [upiVpa, setUpiVpa] = useState(user?.upiId || "nidhinrajesh@okaxis");

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount) || 500;
    await withdrawHostEarnings(amt, upiVpa);
    setWithdrawModalVisible(false);
  };

  const handleSaveUpi = async () => {
    await updateProfile({ upiId: upiVpa.trim() || "nidhinrajesh@okaxis" });
    setEditUpiModalVisible(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(host)/dashboard")
          }
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Host Earnings & UPI</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Balance Card (₹ INR) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>AVAILABLE HOST PAYOUT (₹ INR)</Text>
        <Text style={styles.balanceVal}>
          ₹{hostEarningsBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.upiSubLine}>
          Linked UPI VPA: {user?.upiId || "nidhinrajesh@okaxis"} (Zero Commission)
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => {
              setWithdrawAmount(Math.min(1000, hostEarningsBalance).toString());
              setWithdrawModalVisible(true);
            }}
          >
            <Text style={styles.withdrawBtnText}>Withdraw to Bank / UPI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.convertBtn}
            onPress={() => convertHostEarningsToWallet(500)}
          >
            <Text style={styles.convertBtnText}>Use to Charge (+10%)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Linked Bank / UPI VPA */}
      <View style={styles.upiCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.upiLabel}>Primary Settlement Account (IMPS / UPI)</Text>
          <Text style={styles.upiVal}>
            {user?.upiId || "nidhinrajesh@okaxis"} • Federal Bank / Axis
          </Text>
        </View>
        <TouchableOpacity
          style={styles.verifiedTag}
          onPress={() => {
            setUpiVpa(user?.upiId || "nidhinrajesh@okaxis");
            setEditUpiModalVisible(true);
          }}
        >
          <Text style={styles.verifiedTagText}>✎ Edit UPI</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Host Settlement Ledger (₹ INR)</Text>
      <View style={styles.ledgerCard}>
        {hostTransactions.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.ledgerTitle}>{p.title}</Text>
              <Text style={styles.ledgerDate}>{p.date}</Text>
            </View>
            <Text
              style={[
                styles.ledgerAmount,
                { color: p.isCredit ? "#096B30" : "#151C18" },
              ]}
            >
              {p.amount}
            </Text>
          </View>
        ))}
      </View>

      {/* Withdraw to UPI Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Instant UPI Payout</Text>
            <Text style={styles.modalSub}>
              Available Host Balance: ₹{hostEarningsBalance.toFixed(2)}
            </Text>

            <Text style={styles.inputLabel}>Amount to Withdraw (₹ INR)</Text>
            <TextInput
              style={styles.input}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              placeholder="1000"
            />

            <View style={styles.quickAmtRow}>
              {[500, 1000, 2000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmtChip}
                  onPress={() => setWithdrawAmount(amt.toString())}
                >
                  <Text style={styles.quickAmtTxt}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Destination UPI VPA</Text>
            <TextInput
              style={styles.input}
              value={upiVpa}
              onChangeText={setUpiVpa}
              autoCapitalize="none"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleWithdraw}
              >
                <Text style={styles.confirmBtnTxt}>Transfer Instantly</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit UPI VPA Modal */}
      <Modal visible={editUpiModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Settlement UPI ID</Text>
            <Text style={styles.modalSub}>
              All P2P charging payouts will settle directly to this VPA.
            </Text>
            <TextInput
              style={styles.input}
              value={upiVpa}
              onChangeText={setUpiVpa}
              autoCapitalize="none"
              placeholder="nidhinrajesh@okaxis"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditUpiModalVisible(false)}
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveUpi}
              >
                <Text style={styles.confirmBtnTxt}>Save UPI ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F3",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: TAB_BAR_SAFE_PADDING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: "#151C18",
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
  },
  balanceCard: {
    backgroundColor: "#151C18",
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8E9892",
    letterSpacing: 0.8,
  },
  balanceVal: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 6,
  },
  upiSubLine: {
    fontSize: 12,
    color: "#A7F3D0",
    marginBottom: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  withdrawBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
  },
  convertBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#26302A",
    alignItems: "center",
    justifyContent: "center",
  },
  convertBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  upiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  upiLabel: {
    fontSize: 12,
    color: "#7C857F",
    fontWeight: "600",
  },
  upiVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
    marginTop: 2,
  },
  verifiedTag: {
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  verifiedTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#096B30",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 12,
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F2",
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151C18",
  },
  ledgerDate: {
    fontSize: 11,
    color: "#8A928D",
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151C18",
  },
  modalSub: {
    fontSize: 13,
    color: "#6B746E",
    marginTop: 4,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5C6460",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
    marginBottom: 12,
  },
  quickAmtRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  quickAmtChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EAFBF0",
    alignItems: "center",
  },
  quickAmtTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: "#096B30",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnTxt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  confirmBtn: {
    flex: 1.3,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnTxt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151C18",
  },
});
