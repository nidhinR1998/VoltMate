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
import {
  Car,
  Compass,
  Receipt,
  Ticket,
  Zap,
  Map,
  LifeBuoy,
  ShieldCheck,
  Pencil,
  ArrowRight,
  LogOut,
  Check,
  Phone,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react-native";
import { useVoltMateEngine } from "../../store/useVoltMateEngine";
import {
  fireNativePushNotification,
  launchNativePhoneCall,
} from "../../services/notificationService";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppToggle,
  ListRow,
  SegmentedControl,
  StatTile,
} from "../../components/ui/DesignSystem";

const SUPPORT_FAQS = [
  {
    id: "rates",
    question: "How are P2P Home Host rates calculated?",
    answer:
      "Domestic 15A 3-Pin sockets are billed at ₹8.50/kWh and Type-2 AC Wallboxes at ₹10.50/kWh in accordance with domestic EV tariff guidelines.",
  },
  {
    id: "gate",
    question: "What if a Host gate is locked when I arrive?",
    answer:
      "Present your 6-digit Gate Pass PIN. If the host is unreachable within 5 minutes, 100% of your pre-authorized hold is refunded automatically to your VoltMate Wallet.",
  },
  {
    id: "refund",
    question: "How do wallet refunds and UPI payouts work?",
    answer:
      "Unused pre-authorized holds are credited immediately after session completion. Host earnings can be withdrawn 24/7 to your linked UPI VPA.",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    vehicles,
    bookings,
    chargingHistory,
    activeMode,
    preferredMapLayer,
    setPreferredMapLayer,
    switchMode,
    updateProfile,
    showToast,
    logout,
    deleteAccount,
  } = useVoltMateEngine();

  const [gatePassAlerts, setGatePassAlerts] = useState(true);
  const [completionAlerts, setCompletionAlerts] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [deleteAccountConfirmVisible, setDeleteAccountConfirmVisible] =
    useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string>("rates");

  const [editName, setEditName] = useState(user?.fullName || "EV Driver");
  const [editEmail, setEditEmail] = useState(
    user?.email || "driver@voltmate.in"
  );
  const [editPhone, setEditPhone] = useState(user?.phoneNumber || "+91 ");
  const [editUpi, setEditUpi] = useState(user?.upiId || "driver@okaxis");

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const handleSaveProfile = async () => {
    await updateProfile({
      fullName: editName.trim() || user?.fullName || "EV Driver",
      email: editEmail.trim() || user?.email || "driver@voltmate.in",
      phoneNumber: editPhone.trim() || user?.phoneNumber || "",
      upiId: editUpi.trim() || user?.upiId || "driver@okaxis",
    });
    setEditModalVisible(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Profile & Account</Text>

      {/* User Card */}
      <AppCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(user?.fullName || user?.email || "E")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.fullName || "EV Driver"}</Text>
            <Text style={styles.userEmail}>
              {user?.email || "driver@voltmate.in"}
            </Text>
            <Text style={styles.userPhoneText}>
              {user?.phoneNumber || "Phone not linked"} • UPI:{" "}
              {user?.upiId || "driver@okaxis"}
            </Text>
            <View style={styles.verifiedPill}>
              <Check size={12} color={COLORS.primary} strokeWidth={2.8} />
              <Text style={styles.verifiedText}>Verified Driver & EV Host</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={() => {
              setEditName(user?.fullName || "EV Driver");
              setEditEmail(user?.email || "driver@voltmate.in");
              setEditPhone(user?.phoneNumber || "+91 ");
              setEditUpi(user?.upiId || "driver@okaxis");
              setEditModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit profile details"
          >
            <Pencil size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push("/(driver)/garage-wallet")}
        >
          <StatTile
            label="Wallet Balance"
            value={`₹${(user?.voltCreditsBalance ?? 1450.0).toFixed(0)}`}
            accent
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push("/(driver)/bookings")}
        >
          <StatTile
            label="Total Sessions"
            value={`${bookings.length + chargingHistory.length}`}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push("/(driver)/garage-wallet")}
        >
          <StatTile label="Saved EVs" value={`${vehicles.length}`} />
        </TouchableOpacity>
      </View>

      {/* Mode Switcher Banner */}
      <TouchableOpacity
        style={styles.hostBanner}
        activeOpacity={0.9}
        onPress={() => {
          const nextMode = activeMode === "DRIVER" ? "HOST" : "DRIVER";
          switchMode(nextMode);
          if (nextMode === "HOST") {
            router.push("/(host)/dashboard");
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${
          activeMode === "DRIVER" ? "Host Studio" : "Driver Mode"
        }`}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.hostBannerOverline}>
            VOLTMATE P2P CHARGING NETWORK
          </Text>
          <Text style={styles.hostBannerTitle}>
            Switch to {activeMode === "DRIVER" ? "Host Studio" : "Driver Mode"}
          </Text>
          <Text style={styles.hostBannerSub}>
            Share your home 15A / Type-2 wallbox & earn ₹ INR payouts
          </Text>
        </View>
        <View style={styles.hostArrowCircle}>
          <ArrowRight size={20} color={COLORS.textPrimary} />
        </View>
      </TouchableOpacity>

      {/* Menu Links — Consistent ListRow Icons & Left Alignment */}
      <AppCard style={styles.menuGroup}>
        <ListRow
          icon={<Car size={20} color={COLORS.primary} />}
          title="EV Garage & Wallet"
          subtitle={`${activeVehicle?.makeModel} (${activeVehicle?.plateNumber})`}
          onPress={() => router.push("/(driver)/garage-wallet")}
        />
        <ListRow
          icon={<Compass size={20} color={COLORS.primary} />}
          title="Highway Corridor Planner"
          subtitle="Multi-stop EV routing with live SoC prediction"
          onPress={() => router.push("/(driver)/route-planner")}
        />
        <ListRow
          icon={<Receipt size={20} color={COLORS.primary} />}
          title="Charging History & GST Receipts"
          subtitle="Download verified EV charging invoices"
          onPress={() => router.push("/(driver)/bookings")}
          isLast
        />
      </AppCard>

      {/* App Preferences — Aligned Left Icons + Custom AppToggle */}
      <Text style={styles.sectionHeader}>Preferences & Smart Controls</Text>
      <AppCard style={styles.menuGroup}>
        <ListRow
          icon={<Ticket size={20} color={COLORS.primary} />}
          title="Instant Gate Pass Alerts"
          subtitle="Push PIN code to notification tray 15m before slot"
          rightElement={
            <AppToggle
              value={gatePassAlerts}
              accessibilityLabel="Toggle Instant Gate Pass Alerts"
              onValueChange={async (val) => {
                setGatePassAlerts(val);
                const msg = val
                  ? "Instant Gate Pass push notifications enabled."
                  : "Instant Gate Pass push notifications muted.";
                showToast("Notification Preference Updated", msg, "info");
                await fireNativePushNotification(
                  "VoltMate Gate Pass Alerts",
                  msg
                );
              }}
            />
          }
        />

        <ListRow
          icon={<Zap size={20} color={COLORS.primary} />}
          title="Charging Completion Alerts"
          subtitle="Notify at 80% SoC before idle overstay fees begin"
          rightElement={
            <AppToggle
              value={completionAlerts}
              accessibilityLabel="Toggle Charging Completion Alerts"
              onValueChange={async (val) => {
                setCompletionAlerts(val);
                const msg = val
                  ? "80% Smart Cut-Off & Completion alerts active."
                  : "Charging completion alerts muted.";
                showToast("Completion Alerts Updated", msg, "info");
                await fireNativePushNotification(
                  "VoltMate Charging Alerts",
                  msg
                );
              }}
            />
          }
        />

        {/* Default Radar Map Style — Aligned with matching left icon box */}
        <View style={styles.alignedMapStyleBlock}>
          <View style={styles.alignedMapHeader}>
            <View style={styles.rowIconWrap}>
              <Map size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Default Radar Map Style</Text>
              <Text style={styles.rowSubtitle}>
                Choose default map tiles for Home and Map Radar
              </Text>
            </View>
          </View>
          <SegmentedControl
            value={preferredMapLayer}
            onChange={(val) => setPreferredMapLayer(val)}
            options={[
              { key: "hybrid", label: "Traffic" },
              { key: "standard", label: "Street" },
              { key: "satellite", label: "Satellite" },
            ]}
          />
        </View>
      </AppCard>

      {/* Support & Legal */}
      <AppCard style={styles.menuGroup}>
        <ListRow
          icon={<LifeBuoy size={20} color={COLORS.primary} />}
          title="Help Center & 24/7 Support"
          subtitle="Roadside assistance, tariff FAQs & P2P dispute desk"
          onPress={() => setHelpModalVisible(true)}
        />
        <ListRow
          icon={<ShieldCheck size={20} color={COLORS.primary} />}
          title="Terms of Service & Privacy Policy"
          subtitle="Ministry of Power P2P EV Charging Compliance • v2.5.0"
          onPress={() => setTermsModalVisible(true)}
          isLast
        />
      </AppCard>

      {/* Visually Separated Sign Out & Account Deletion */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={() => setSignOutConfirmVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Sign Out of VoltMate"
        >
          <LogOut size={18} color={COLORS.destructive} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { marginTop: SPACING.xs, backgroundColor: "transparent", borderColor: COLORS.border }]}
          activeOpacity={0.85}
          onPress={() => setDeleteAccountConfirmVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete VoltMate Account"
        >
          <Text style={[styles.logoutBtnText, { color: COLORS.textSecondary }]}>
            Delete Account & Scrub Personal Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteAccountConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountConfirmVisible(false)}
      >
        <View style={styles.centerModalBackdrop}>
          <View style={styles.confirmDialogCard}>
            <View style={styles.confirmIconCircle}>
              <LogOut size={22} color={COLORS.destructive} />
            </View>
            <Text style={styles.confirmDialogTitle}>Delete Account Permanently?</Text>
            <Text style={styles.confirmDialogSub}>
              This will permanently close your VoltMate account, scrub your personal identifiers (email, phone, UPI VPA, and Google link), and sign you out. Active charging sessions or open holds must be settled first.
            </Text>
            <View style={styles.confirmDialogBtns}>
              <AppButton
                label="Keep Account"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setDeleteAccountConfirmVisible(false)}
              />
              <AppButton
                label="Delete Account"
                variant="destructive"
                style={{ flex: 1 }}
                onPress={async () => {
                  try {
                    await deleteAccount();
                    setDeleteAccountConfirmVisible(false);
                    router.replace("/(auth)/login");
                  } catch {
                    setDeleteAccountConfirmVisible(false);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutConfirmVisible(false)}
      >
        <View style={styles.centerModalBackdrop}>
          <View style={styles.confirmDialogCard}>
            <View style={styles.confirmIconCircle}>
              <LogOut size={22} color={COLORS.destructive} />
            </View>
            <Text style={styles.confirmDialogTitle}>Sign Out of VoltMate?</Text>
            <Text style={styles.confirmDialogSub}>
              Your saved EVs, bookings, and wallet balance will remain safely
              linked to your account when you sign back in.
            </Text>
            <View style={styles.confirmDialogBtns}>
              <AppButton
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setSignOutConfirmVisible(false)}
              />
              <AppButton
                label="Sign Out"
                variant="destructive"
                style={{ flex: 1 }}
                onPress={async () => {
                  setSignOutConfirmVisible(false);
                  await logout();
                  router.replace("/(auth)/login");
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sheetDragHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.modalTitle}>Edit Profile & UPI ID</Text>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setEditModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close edit profile sheet"
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your Name"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Phone Number (+91)</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>
              Linked UPI VPA (For Refunds & Host Payouts)
            </Text>
            <TextInput
              style={styles.input}
              value={editUpi}
              onChangeText={setEditUpi}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalActions}>
              <AppButton
                label="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setEditModalVisible(false)}
              />
              <AppButton
                label="Save Changes"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleSaveProfile}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Center & 24/7 Support Sheet — Expandable FAQ Accordions, High-Contrast Text, Drag Handle + Close Icon, Primary Call CTA */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sheetDragHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>VoltMate 24/7 Support</Text>
                <Text style={styles.modalSubText}>
                  Instant assistance for P2P home hosts and EV drivers.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setHelpModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close support sheet"
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.faqAccordionList}>
              {SUPPORT_FAQS.map((item) => {
                const isExpanded = expandedFaqId === item.id;
                return (
                  <View key={item.id} style={styles.faqAccordionCard}>
                    <TouchableOpacity
                      style={styles.faqAccordionHeader}
                      onPress={() =>
                        setExpandedFaqId(isExpanded ? "" : item.id)
                      }
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={styles.faqQ}>{item.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={COLORS.primary} />
                      ) : (
                        <ChevronDown size={18} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <Text style={styles.faqA}>{item.answer}</Text>
                    )}
                  </View>
                );
              })}
            </View>

            <AppButton
              label="Call 24/7 EV Support (+91 484 290 0100)"
              variant="primary"
              size="lg"
              style={{ marginBottom: SPACING.xs }}
              icon={<Phone size={18} color={COLORS.textInverse} />}
              onPress={() => launchNativePhoneCall("+914842900100")}
            />

            <AppButton
              label="Close"
              variant="secondary"
              onPress={() => setHelpModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Terms & MoP Guidelines Modal */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sheetDragHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.modalTitle}>MoP India P2P EV Guidelines</Text>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setTermsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close terms sheet"
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubText}>
              VoltMate v2.5.0 • Compliant with Ministry of Power (Govt. of
              India) & State EV Charging Standards.
            </Text>
            <View style={styles.termsBox}>
              <Text style={styles.faqA}>
                • No license is required for EV charging station operations
                under the Electricity Act, 2003 (MoP Revised Guidelines).
                {"\n\n"}• All wallet balances and session settlements are
                denominated in Indian Rupees (₹ INR) with instant UPI VPA
                settlement.{"\n\n"}• Cryptographic 6-digit Gate Pass PINs verify
                physical arrival before energizing P2P residential sockets.
              </Text>
            </View>
            <AppButton
              label="Acknowledge & Close"
              variant="primary"
              onPress={() => setTermsModalVisible(false)}
            />
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
  pageTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  profileCard: {
    marginBottom: SPACING.md,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    ...TYPOGRAPHY.h1,
    color: COLORS.neonLive,
  },
  userName: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  userEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userPhoneText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.chipRadius,
    marginTop: 6,
  },
  verifiedText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  editIconBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  hostBanner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.cardPadding,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  hostBannerOverline: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.neonLive,
  },
  hostBannerTitle: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textInverse,
    marginTop: 2,
  },
  hostBannerSub: {
    ...TYPOGRAPHY.caption,
    color: "#D1FAE5",
    marginTop: 2,
  },
  hostArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neonLive,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    ...TYPOGRAPHY.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  menuGroup: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.cardPadding,
    marginBottom: SPACING.md,
  },
  alignedMapStyleBlock: {
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  alignedMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signOutContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logoutBtn: {
    minHeight: 52,
    borderRadius: SPACING.chipRadius,
    borderWidth: 1.5,
    borderColor: "#FECDCA",
    backgroundColor: COLORS.errorBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  logoutBtnText: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.destructive,
  },
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    paddingHorizontal: SPACING.screenMargin,
  },
  confirmDialogCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.errorBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  confirmDialogTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  confirmDialogSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  confirmDialogBtns: {
    flexDirection: "row",
    width: "100%",
    gap: SPACING.sm,
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: SPACING.sm,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  closeIconBtn: {
    width: SPACING.touchTarget,
    height: SPACING.touchTarget,
    borderRadius: SPACING.touchTarget / 2,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  modalSubText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  faqAccordionList: {
    gap: SPACING.xs,
    marginVertical: SPACING.sm,
  },
  faqAccordionCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqAccordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  faqQ: {
    ...TYPOGRAPHY.bodySemibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  faqA: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  termsBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  modalActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
