import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
} from "../../store/useVoltMateEngine";
import {
  fireNativePushNotification,
  launchNativePhoneCall,
} from "../../services/notificationService";

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
  } = useVoltMateEngine();

  const [gatePassAlerts, setGatePassAlerts] = useState(true);
  const [completionAlerts, setCompletionAlerts] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const [editName, setEditName] = useState(user?.fullName || "Nidhin R");
  const [editEmail, setEditEmail] = useState(
    user?.email || "nidhinrajesh1998@gmail.com"
  );
  const [editPhone, setEditPhone] = useState(
    user?.phoneNumber || "+91 98470 49210"
  );
  const [editUpi, setEditUpi] = useState(
    user?.upiId || "nidhinrajesh@okaxis"
  );

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];

  const handleSaveProfile = async () => {
    await updateProfile({
      fullName: editName.trim() || "Nidhin R",
      email: editEmail.trim() || "nidhinrajesh1998@gmail.com",
      phoneNumber: editPhone.trim() || "+91 98470 49210",
      upiId: editUpi.trim() || "nidhinrajesh@okaxis",
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
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(user?.fullName || user?.email || "N")[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.fullName || "Nidhin R"}</Text>
          <Text style={styles.userEmail}>
            {user?.email || "nidhinrajesh1998@gmail.com"}
          </Text>
          <Text style={styles.userPhoneText}>
            {user?.phoneNumber || "+91 98470 49210"} • UPI:{" "}
            {user?.upiId || "nidhinrajesh@okaxis"}
          </Text>
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedText}>
              ✓ Verified Driver & Kochi Host
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editIconBtn}
          onPress={() => {
            setEditName(user?.fullName || "Nidhin R");
            setEditEmail(user?.email || "nidhinrajesh1998@gmail.com");
            setEditPhone(user?.phoneNumber || "+91 98470 49210");
            setEditUpi(user?.upiId || "nidhinrajesh@okaxis");
            setEditModalVisible(true);
          }}
        >
          <Text style={styles.editIconText}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push("/(driver)/garage-wallet")}
        >
          <Text style={styles.statVal}>
            ₹{(user?.voltCreditsBalance ?? 1450.0).toFixed(0)}
          </Text>
          <Text style={styles.statLbl}>Wallet Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push("/(driver)/bookings")}
        >
          <Text style={styles.statVal}>
            {bookings.length + chargingHistory.length}
          </Text>
          <Text style={styles.statLbl}>Total Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push("/(driver)/garage-wallet")}
        >
          <Text style={styles.statVal}>{vehicles.length}</Text>
          <Text style={styles.statLbl}>Saved EVs</Text>
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
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.hostBannerOverline}>
            P2P CHARGING NETWORK • KERALA
          </Text>
          <Text style={styles.hostBannerTitle}>
            Switch to {activeMode === "DRIVER" ? "Host Studio" : "Driver Mode"}
          </Text>
          <Text style={styles.hostBannerSub}>
            Share your home 15A / Type-2 wallbox & earn ₹ INR payouts
          </Text>
        </View>
        <View style={styles.hostArrowCircle}>
          <Text style={styles.hostArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Menu Links */}
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(driver)/garage-wallet")}
        >
          <Text style={styles.menuIcon}>🚘</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>EV Garage & Wallet</Text>
            <Text style={styles.menuSub}>
              {activeVehicle?.makeModel} ({activeVehicle?.plateNumber}) •{" "}
              {activeVehicle?.connectorLabel}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(driver)/route-planner")}
        >
          <Text style={styles.menuIcon}>🧭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Highway Corridor Planner</Text>
            <Text style={styles.menuSub}>
              Multi-stop Kerala EV routing with live SOC prediction
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(driver)/bookings")}
        >
          <Text style={styles.menuIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>
              Charging History & GST Receipts
            </Text>
            <Text style={styles.menuSub}>
              Download MoP / KSEB compliant charging invoices
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App Preferences */}
      <Text style={styles.sectionHeader}>Preferences & Smart Controls</Text>
      <View style={styles.menuGroup}>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>🎟️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Instant Gate Pass Alerts</Text>
            <Text style={styles.menuSub}>
              Push OTP code to Android notification tray 15m before slot
            </Text>
          </View>
          <Switch
            value={gatePassAlerts}
            onValueChange={async (val) => {
              setGatePassAlerts(val);
              const msg = val
                ? "Instant Gate Pass push notifications enabled."
                : "Instant Gate Pass push notifications muted.";
              showToast("Notification Preference Updated", msg, "info");
              await fireNativePushNotification("VoltMate Gate Pass Alerts", msg);
            }}
            trackColor={{ false: "#D5DBD7", true: "#05E660" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Charging Completion Alerts</Text>
            <Text style={styles.menuSub}>
              Notify at 80% SOC before idle overstay fees begin
            </Text>
          </View>
          <Switch
            value={completionAlerts}
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
            trackColor={{ false: "#D5DBD7", true: "#05E660" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View
          style={[
            styles.menuItem,
            { flexDirection: "column", alignItems: "flex-start" },
          ]}
        >
          <Text style={styles.menuTitle}>Default Radar Map Style</Text>
          <View style={styles.mapPrefRow}>
            {(
              [
                { key: "hybrid", label: "Clean Light" },
                { key: "standard", label: "Street Detail" },
                { key: "satellite", label: "Satellite" },
              ] as const
            ).map((style) => (
              <TouchableOpacity
                key={style.key}
                style={[
                  styles.mapPrefChip,
                  preferredMapLayer === style.key &&
                    styles.mapPrefChipActive,
                ]}
                onPress={() => setPreferredMapLayer(style.key)}
              >
                <Text
                  style={[
                    styles.mapPrefText,
                    preferredMapLayer === style.key &&
                      styles.mapPrefTextActive,
                  ]}
                >
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setHelpModalVisible(true)}
        >
          <Text style={styles.menuIcon}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Help Center & 24/7 Support</Text>
            <Text style={styles.menuSub}>
              Roadside assistance, KSEB tariff FAQs & P2P dispute desk
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setTermsModalVisible(true)}
        >
          <Text style={styles.menuIcon}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>
              Terms of Service & Privacy Policy
            </Text>
            <Text style={styles.menuSub}>
              Ministry of Power P2P EV Charging Compliance • v2.5.0
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await logout();
          router.replace("/(auth)/login");
        }}
      >
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile & UPI ID</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your Name"
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone Number (India +91)</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>
              Linked UPI VPA (For Refunds & Host Payouts)
            </Text>
            <TextInput
              style={styles.input}
              value={editUpi}
              onChangeText={setEditUpi}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveModalText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Center & 24/7 Support Modal */}
      <Modal visible={helpModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>VoltMate Kerala 24/7 Support</Text>
            <Text style={styles.modalSubText}>
              Instant assistance for P2P home hosts and EV drivers across Kochi
              & Kerala.
            </Text>

            <View style={styles.faqBox}>
              <Text style={styles.faqQ}>
                1. How are P2P Home Host rates calculated?
              </Text>
              <Text style={styles.faqA}>
                Domestic 15A 3-Pin sockets are billed at ₹8.50/kWh and Type-2 AC
                Wallboxes at ₹10.50/kWh in accordance with KSEB EV domestic
                guidelines.
              </Text>
              <Text style={[styles.faqQ, { marginTop: 10 }]}>
                2. What if a Host gate is locked when I arrive?
              </Text>
              <Text style={styles.faqA}>
                Present your 6-digit Gate Pass OTP. If unreachable within 5
                minutes, 100% of your pre-authorized hold is refunded to your
                VoltMate Wallet.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.callSupportBtn}
              onPress={() => launchNativePhoneCall("+914842900100")}
            >
              <Text style={styles.callSupportTxt}>
                📞 Call 24/7 Kochi EV Roadside Desk (+91 484 290 0100)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullWidthModalBtn}
              onPress={() => setHelpModalVisible(false)}
            >
              <Text style={styles.saveModalText}>Close Support Desk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms & MoP Guidelines Modal */}
      <Modal visible={termsModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>MoP India P2P EV Guidelines</Text>
            <Text style={styles.modalSubText}>
              VoltMate v2.5.0 • Compliant with Ministry of Power (Govt. of
              India) & KSEB EV Charging Standards.
            </Text>
            <View style={styles.faqBox}>
              <Text style={styles.faqA}>
                • No license is required for EV charging station operations
                under the Electricity Act, 2003 (MoP Revised Guidelines).
                {"\n\n"}• All wallet balances and session settlements are
                denominated in Indian Rupees (₹ INR) with instant UPI VPA
                settlement.{"\n\n"}• Cryptographic 6-digit Gate Pass OTPs verify
                physical arrival before energizing P2P residential sockets.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fullWidthModalBtn}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.saveModalText}>Acknowledge & Close</Text>
            </TouchableOpacity>
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
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 18,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "800",
    color: "#05E660",
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151C18",
  },
  userEmail: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  userPhoneText: {
    fontSize: 11,
    color: "#4B534E",
    fontWeight: "600",
    marginTop: 2,
  },
  verifiedPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EAFBF0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#096B30",
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  statVal: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151C18",
  },
  statLbl: {
    fontSize: 11,
    color: "#7C857F",
    fontWeight: "600",
    marginTop: 2,
  },
  hostBanner: {
    backgroundColor: "#151C18",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  hostBannerOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: "#05E660",
    letterSpacing: 0.8,
  },
  hostBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  hostBannerSub: {
    fontSize: 12,
    color: "#9AA39D",
    marginTop: 4,
  },
  hostArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  hostArrow: {
    fontSize: 18,
    fontWeight: "900",
    color: "#151C18",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 10,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F2",
    gap: 14,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#151C18",
  },
  menuSub: {
    fontSize: 12,
    color: "#7C857F",
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: "#8C948E",
    fontWeight: "600",
  },
  mapPrefRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    width: "100%",
  },
  mapPrefChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
  },
  mapPrefChipActive: {
    backgroundColor: "#151C18",
  },
  mapPrefText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5C6460",
  },
  mapPrefTextActive: {
    color: "#05E660",
    fontWeight: "800",
  },
  logoutBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#E0E4E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E03131",
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
    marginBottom: 10,
  },
  modalSubText: {
    fontSize: 13,
    color: "#6B746E",
    marginBottom: 14,
    lineHeight: 18,
  },
  faqBox: {
    backgroundColor: "#F5F7F6",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  faqQ: {
    fontSize: 13,
    fontWeight: "800",
    color: "#151C18",
    marginBottom: 4,
  },
  faqA: {
    fontSize: 12,
    color: "#4B534E",
    lineHeight: 18,
  },
  callSupportBtn: {
    backgroundColor: "#EAFBF0",
    borderWidth: 1.5,
    borderColor: "#16B374",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  callSupportTxt: {
    color: "#096B30",
    fontSize: 13,
    fontWeight: "800",
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
    color: "#151C18",
    fontWeight: "600",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelModalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8ECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151C18",
  },
  saveModalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidthModalBtn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
