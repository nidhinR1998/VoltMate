import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  Star,
  ChevronRight,
  Edit3,
  Check,
  X,
  Zap,
  Home,
  Info,
  Car,
  Wallet,
  Compass,
  Heart,
  LogOut,
  HelpCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";
import { useAuthStore } from "../../store/useAuthStore";
import { apiClient } from "../../services/api";

export default function ProfileScreen() {
  const router = useRouter();
  const { toggleMode } = useModeStore();
  const { user, refreshToken, logout, updateUser, vehicles, savedStationIds } = useAuthStore();

  const [mapStyle, setMapStyle] = useState<"light" | "street" | "satellite">("light");
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || "Alex Morgan");
  const [editEmail, setEditEmail] = useState(user?.email || "alex.morgan@voltmate.com");
  const [editPhone, setEditPhone] = useState(user?.phone || "+44 7700 900077");

  const handleSaveProfile = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateUser({
      fullName: editName.trim() || "Alex Morgan",
      email: editEmail.trim() || "alex.morgan@voltmate.com",
      phone: editPhone.trim() || "+44 7700 900077",
    });
    setShowEditModal(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account on this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            try {
              await apiClient.post("/auth/logout", { refresh_token: refreshToken });
            } catch {}
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const handleSwitchToHost = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    toggleMode();
    router.replace("/(host)/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Account</Text>
          <Text style={styles.subtitle}>
            Manage your vehicles, payment wallet, preferences & security
          </Text>
        </View>

        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.userTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : "AM"}
              </Text>
              <View style={styles.avatarBadge}>
                <Check size={10} color="#111714" strokeWidth={3} />
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.fullName || "Alex Morgan"}</Text>
              <Text style={styles.userEmail}>{user?.email || "alex.morgan@voltmate.com"}</Text>
              <Text style={styles.userPhone}>{user?.phone || "+44 7700 900077"}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={styles.editBtn}
            >
              <Edit3 size={16} color="#111714" />
            </TouchableOpacity>
          </View>

          {/* Stats Strip */}
          <View style={styles.trustStrip}>
            <View style={styles.trustItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Star size={13} color="#111714" fill="#111714" />
                <Text style={styles.trustScoreText}>4.94 / 5.0</Text>
              </View>
              <Text style={styles.trustLabel}>Trust Score</Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Text style={styles.trustStatValue}>{vehicles.length} EVs</Text>
              <Text style={styles.trustLabel}>In Garage</Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Text style={styles.trustStatValue}>{savedStationIds.length} Saved</Text>
              <Text style={styles.trustLabel}>Favorite Hubs</Text>
            </View>
          </View>
        </View>

        {/* Quick Navigation Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            onPress={() => router.push("/(driver)/garage-wallet")}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <View style={styles.quickIconCircle}>
              <Car size={20} color="#05E660" />
            </View>
            <Text style={styles.quickCardTitle}>My Garage & Wallet</Text>
            <Text style={styles.quickCardSub}>Manage EVs & Credits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(driver)/route-planner")}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <View style={styles.quickIconCircle}>
              <Compass size={20} color="#05E660" />
            </View>
            <Text style={styles.quickCardTitle}>Trip Corridor</Text>
            <Text style={styles.quickCardSub}>Plan Highway Stops</Text>
          </TouchableOpacity>
        </View>

        {/* Switch to Host Banner */}
        <TouchableOpacity
          onPress={handleSwitchToHost}
          activeOpacity={0.85}
          style={styles.hostBanner}
        >
          <View style={styles.hostBannerContent}>
            <View style={styles.hostIconCircle}>
              <Home size={18} color="#05E660" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostTitle}>Switch to Host Studio</Text>
              <Text style={styles.hostSub}>
                Share your charger, manage time slots & withdraw earnings.
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Verification Section */}
        <Text style={styles.sectionHeader}>ACCOUNT & UTILITY VERIFICATION</Text>
        <View style={styles.sectionBox}>
          <View style={styles.kycRow}>
            <View style={styles.kycIconWrap}>
              <ShieldCheck size={18} color="#151C18" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycName}>Driver Identity & KYC</Text>
              <Text style={styles.kycDetails}>Verified Driver • ID #VM-4819</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.kycRow}>
            <View style={styles.kycIconWrap}>
              <Zap size={18} color="#151C18" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycName}>Smart Meter Tariff Protection</Text>
              <Text style={styles.kycDetails}>Domestic & Fast-Charge Billing Active</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionHeader}>MAP & NOTIFICATION PREFERENCES</Text>
        <View style={styles.sectionBox}>
          <Text style={styles.settingLabel}>DEFAULT MAP STYLE</Text>
          <View style={styles.mapThemeRow}>
            {[
              { id: "light", label: "Clean Light" },
              { id: "street", label: "Street Detail" },
              { id: "satellite", label: "Satellite" },
            ].map((theme) => {
              const isSelected = mapStyle === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setMapStyle(theme.id as any);
                  }}
                  style={[
                    styles.themeBtn,
                    isSelected && styles.themeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      isSelected && styles.themeBtnTextActive,
                    ]}
                  >
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Instant Gate Pass Alerts</Text>
              <Text style={styles.switchSub}>
                Receive 6-digit station access codes as soon as your booking starts.
              </Text>
            </View>
            <Switch
              value={whatsappAlerts}
              onValueChange={setWhatsappAlerts}
              trackColor={{ false: "#DCE2DF", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Charging Completion Alerts</Text>
              <Text style={styles.switchSub}>
                Notify when your vehicle reaches 80% battery or session completes.
              </Text>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: "#DCE2DF", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.sectionHeader}>SUPPORT & INFORMATION</Text>
        <View style={styles.sectionBox}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "24/7 EV Roadside & Charging Support",
                "Need immediate assistance at a charging bay?\n\nCall Priority Support: 1800-VOLT-MATE\nEmail: support@voltmate.com"
              )
            }
            style={styles.menuRow}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <HelpCircle size={17} color="#111714" />
              <Text style={styles.menuText}>Help Center & 24/7 Support</Text>
            </View>
            <ChevronRight size={16} color="#757F7A" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Terms & Privacy Policy",
                "VoltMate protects all payment credentials and session tokens with hardware-backed encryption and zero-trust verification."
              )
            }
            style={styles.menuRow}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Info size={17} color="#111714" />
              <Text style={styles.menuText}>Terms of Service & Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color="#757F7A" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.menuRow}>
            <Text style={styles.menuText}>App Version</Text>
            <Text style={{ color: "#757F7A", fontSize: 12, fontWeight: "600" }}>
              v2.0.0 (Light Edition)
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeCircle}
              >
                <X size={18} color="#111714" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              style={styles.inputField}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>EMAIL ADDRESS</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputField}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PHONE NUMBER</Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              style={styles.inputField}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.saveProfileBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#757F7A",
    marginTop: 4,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    padding: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  userTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    color: "#05E660",
    fontSize: 20,
    fontWeight: "800",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111714",
  },
  userEmail: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
    fontWeight: "500",
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4F6F5",
    borderWidth: 1,
    borderColor: "#E6EAE8",
    alignItems: "center",
    justifyContent: "center",
  },
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F9F8",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#EBF0ED",
  },
  trustItem: {
    alignItems: "center",
    flex: 1,
  },
  trustScoreText: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "800",
  },
  trustStatValue: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "800",
  },
  trustLabel: {
    fontSize: 10,
    color: "#757F7A",
    marginTop: 2,
    fontWeight: "500",
  },
  trustDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E7E4",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  quickCardSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
  },
  hostBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#151C18",
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  hostBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  hostIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hostTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  hostSub: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    padding: 16,
    marginBottom: 20,
  },
  kycRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  kycIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  kycName: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "700",
  },
  kycDetails: {
    color: "#757F7A",
    fontSize: 11,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    color: "#047835",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2F0",
    marginVertical: 12,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#757F7A",
    marginBottom: 8,
  },
  mapThemeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F4F6F5",
    borderWidth: 1,
    borderColor: "#E6EAE8",
    alignItems: "center",
    justifyContent: "center",
  },
  themeBtnActive: {
    backgroundColor: "#151C18",
    borderColor: "#151C18",
  },
  themeBtnText: {
    color: "#757F7A",
    fontSize: 12,
    fontWeight: "600",
  },
  themeBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "700",
  },
  switchSub: {
    color: "#757F7A",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  menuText: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "600",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 15,
    gap: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  signOutText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 23, 20, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 38,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111714",
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputField: {
    backgroundColor: "#F7F9F8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E9E6",
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#111714",
    fontSize: 14,
    fontWeight: "600",
  },
  saveProfileBtn: {
    backgroundColor: "#05E660",
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  saveProfileBtnText: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 15,
  },
});
