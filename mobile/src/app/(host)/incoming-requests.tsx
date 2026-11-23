import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, X, Inbox } from "lucide-react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  EmptyState,
} from "../../components/ui/DesignSystem";

export default function IncomingRequestsScreen() {
  const router = useRouter();
  const { hostRequests, respondHostRequest } = useAuthStore();

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
        <Text style={styles.pageTitle}>Incoming Slot Requests</Text>
        <View style={{ width: SPACING.touchTarget }} />
      </View>

      {hostRequests.length === 0 ? (
        <EmptyState
          icon={<Inbox size={26} color={COLORS.primary} />}
          title="All Caught Up!"
          subtitle="New P2P charging requests from nearby EV drivers will appear here automatically."
        />
      ) : (
        hostRequests.map((r) => (
          <AppCard key={r.id} style={styles.requestCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{r.driverName}</Text>
                <Text style={styles.vehicleText}>{r.vehicle}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{r.rating}</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Requested Slot</Text>
                <Text style={styles.infoVal}>{r.slot}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Connector</Text>
                <Text style={styles.infoVal}>{r.connector}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Est. Energy</Text>
                <Text style={styles.infoVal}>{r.estEnergy}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Host Payout (₹ INR)</Text>
                <Text style={[styles.infoVal, { color: COLORS.primary }]}>
                  {r.payout}
                </Text>
              </View>
            </View>

            {r.status === "APPROVED" ? (
              <View style={styles.approvedBanner}>
                <Check size={14} color={COLORS.primary} strokeWidth={2.6} />
                <Text style={styles.approvedText}>
                  APPROVED • Gate Pass PIN{" "}
                  {r.otpCode
                    ? `${r.otpCode.slice(0, 3)} ${r.otpCode.slice(3)}`
                    : "Issued"}{" "}
                  Issued to {r.driverName}
                </Text>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <AppButton
                  label="Decline"
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  icon={<X size={16} color={COLORS.textSecondary} />}
                  onPress={() => respondHostRequest(r.id, false)}
                />
                <AppButton
                  label="Approve & Issue Pass"
                  variant="primary"
                  size="md"
                  style={{ flex: 1.4 }}
                  icon={<Check size={16} color={COLORS.textInverse} />}
                  onPress={() => respondHostRequest(r.id, true)}
                />
              </View>
            )}
          </AppCard>
        ))
      )}
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
  requestCard: {
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  driverName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  vehicleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textPrimary,
  },
  infoBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: SPACING.md,
    gap: 8,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  infoVal: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.textPrimary,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
  },
  approvedText: {
    ...TYPOGRAPHY.captionSemibold,
    ...TYPOGRAPHY.tabular,
    color: COLORS.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
});
