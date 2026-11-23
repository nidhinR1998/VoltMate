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
import { ArrowLeft, Pencil, Wallet } from "lucide-react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppChip,
  EmptyState,
} from "../../components/ui/DesignSystem";

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
  const [upiVpa, setUpiVpa] = useState(user?.upiId || "host@okaxis");

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount) || 500;
    await withdrawHostEarnings(amt, upiVpa);
    setWithdrawModalVisible(false);
  };

  const handleSaveUpi = async () => {
    await updateProfile({
      upiId: upiVpa.trim() || user?.upiId || "host@okaxis",
    });
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
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Host Earnings & UPI</Text>
        <View style={{ width: SPACING.touchTarget }} />
      </View>

      {/* Balance Card (₹ INR) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>AVAILABLE HOST PAYOUT (₹ INR)</Text>
        <Text style={styles.balanceVal}>
          ₹
          {hostEarningsBalance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text style={styles.upiSubLine}>
          Linked UPI VPA: {user?.upiId || "host@okaxis"} (Zero Commission)
        </Text>

        <View style={styles.actionRow}>
          <AppButton
            label="Withdraw to UPI"
            variant="primary"
            size="md"
            style={{ flex: 1.2 }}
            onPress={() => {
              setWithdrawAmount(Math.min(1000, hostEarningsBalance).toString());
              setWithdrawModalVisible(true);
            }}
          />

          <AppButton
            label="Move to Wallet"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            onPress={() => convertHostEarningsToWallet(500)}
          />
        </View>
      </View>

      {/* Linked Bank / UPI VPA */}
      <AppCard style={styles.upiCard}>
        <View style={styles.upiCardInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.upiLabel}>
              Primary Settlement Account (IMPS / UPI)
            </Text>
            <Text style={styles.upiVal}>
              {user?.upiId || "host@okaxis"} • Instant Settlement
            </Text>
          </View>
          <TouchableOpacity
            style={styles.verifiedTag}
            onPress={() => {
              setUpiVpa(user?.upiId || "host@okaxis");
              setEditUpiModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit UPI VPA"
          >
            <Pencil size={13} color={COLORS.primary} />
            <Text style={styles.verifiedTagText}>Edit UPI</Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Host Settlement Ledger (₹ INR)</Text>
      {hostTransactions.length === 0 ? (
        <EmptyState
          icon={<Wallet size={24} color={COLORS.primary} />}
          title="No Payout Activity Yet"
          subtitle="Completed P2P charging sessions and UPI payouts will appear in your host ledger."
        />
      ) : (
        <AppCard style={styles.ledgerCard}>
          {hostTransactions.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.ledgerRow,
                idx === hostTransactions.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.ledgerTitle}>{p.title}</Text>
                <Text style={styles.ledgerDate}>{p.date}</Text>
              </View>
              <Text
                style={[
                  styles.ledgerAmount,
                  { color: p.isCredit ? COLORS.primary : COLORS.textPrimary },
                ]}
              >
                {p.amount}
              </Text>
            </View>
          ))}
        </AppCard>
      )}

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
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.quickAmtRow}>
              {[500, 1000, 2000].map((amt) => (
                <AppChip
                  key={amt}
                  label={`₹${amt}`}
                  selected={withdrawAmount === amt.toString()}
                  style={{ flex: 1 }}
                  onPress={() => setWithdrawAmount(amt.toString())}
                />
              ))}
            </View>

            <Text style={styles.inputLabel}>Destination UPI VPA</Text>
            <TextInput
              style={styles.input}
              value={upiVpa}
              onChangeText={setUpiVpa}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <AppButton
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setWithdrawModalVisible(false)}
              />
              <AppButton
                label="Transfer Instantly"
                variant="primary"
                style={{ flex: 1.3 }}
                onPress={handleWithdraw}
              />
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
              placeholder="yourname@okaxis"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.modalBtnRow}>
              <AppButton
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setEditUpiModalVisible(false)}
              />
              <AppButton
                label="Save UPI ID"
                variant="primary"
                style={{ flex: 1.2 }}
                onPress={handleSaveUpi}
              />
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
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.navSafePadding,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  balanceCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadiusLarge,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: "#A7F3D0",
  },
  balanceVal: {
    ...TYPOGRAPHY.display,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textInverse,
    marginVertical: 4,
  },
  upiSubLine: {
    ...TYPOGRAPHY.caption,
    color: "#D1FAE5",
    marginBottom: SPACING.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  upiCard: {
    marginBottom: SPACING.lg,
  },
  upiCardInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  upiLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  upiVal: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SPACING.chipRadius,
  },
  verifiedTagText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  ledgerCard: {
    paddingVertical: SPACING.xs,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ledgerTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  ledgerDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ledgerAmount: {
    ...TYPOGRAPHY.title,
    ...TYPOGRAPHY.tabular,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  modalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 14,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  quickAmtRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: 4,
  },
});
