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
  User,
  ShieldCheck,
  Star,
  Settings,
  Bell,
  MapPin,
  FileText,
  LogOut,
  ChevronRight,
  ExternalLink,
  Edit3,
  Check,
  X,
  Phone,
  Mail,
  Zap,
  Home,
  Info,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function ProfileScreen() {
  const router = useRouter();
  const { accentColor, toggleMode } = useModeStore();
  const { user, logout, updateUser } = useAuthStore();

  // Profile preferences
  const [mapStyle, setMapStyle] = useState<"street" | "satellite" | "dark">("dark");
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [batteryOptimization, setBatteryOptimization] = useState(true);

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || "Rahul Nair");
  const [editEmail, setEditEmail] = useState(user?.email || "rahul.nair@voltmatedemo.in");
  const [editPhone, setEditPhone] = useState(user?.phone || "+91 98470 12345");

  const handleSaveProfile = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateUser({
      fullName: editName,
      email: editEmail,
      phone: editPhone,
    });
    setShowEditModal(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out of VoltMate",
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
          <Text style={styles.title}>
            Driver <Text style={{ color: accentColor }}>Profile</Text>
          </Text>
          <Text style={styles.subtitle}>
            KYC verification, map settings & security
          </Text>
        </View>

        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.userTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : "RN"}
              </Text>
              <View style={styles.avatarBadge}>
                <Check size={10} color="#06090E" strokeWidth={3} />
              </View>
            </View>

            <View style={styles.userInfo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.userName}>{user?.fullName || "Rahul Nair"}</Text>
              </View>
              <Text style={styles.userEmail}>{user?.email || "rahul.nair@voltmatedemo.in"}</Text>
              <Text style={styles.userPhone}>{user?.phone || "+91 98470 12345"}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={styles.editBtn}
            >
              <Edit3 size={16} color="#00F59B" />
            </TouchableOpacity>
          </View>

          {/* Trust Score & Verification Strip */}
          <View style={styles.trustStrip}>
            <View style={styles.trustItem}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Star size={14} color="#FFB800" fill="#FFB800" />
                <Text style={styles.trustScoreText}>4.94 / 5.0</Text>
              </View>
              <Text style={styles.trustLabel}>Driver Trust Rating</Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Text style={styles.trustStatValue}>38 Sessions</Text>
              <Text style={styles.trustLabel}>100% Punctual</Text>
            </View>

            <View style={styles.trustDivider} />

            <View style={styles.trustItem}>
              <Text style={styles.trustStatValue}>₹0 Penalty</Text>
              <Text style={styles.trustLabel}>Clean Track Record</Text>
            </View>
          </View>
        </View>

        {/* Switch to Host Command Banner */}
        <TouchableOpacity
          onPress={handleSwitchToHost}
          activeOpacity={0.85}
          style={styles.hostBanner}
        >
          <View style={styles.hostBannerContent}>
            <View style={styles.hostIconCircle}>
              <Home size={20} color="#FFB800" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostTitle}>Switch to Host Command Center</Text>
              <Text style={styles.hostSub}>
                Manage your home chargers, track live kW output & withdraw earnings.
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#FFB800" />
        </TouchableOpacity>

        {/* Government & DigiLocker Badges Section */}
        <Text style={styles.sectionHeader}>GOVERNMENT & UTILITY VERIFICATION</Text>
        <View style={styles.sectionBox}>
          <View style={styles.kycRow}>
            <View style={styles.kycIconWrap}>
              <ShieldCheck size={18} color="#00F59B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycName}>DigiLocker Aadhaar ID</Text>
              <Text style={styles.kycDetails}>UIDAI • XXXX-XXXX-4819</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.kycRow}>
            <View style={styles.kycIconWrap}>
              <ShieldCheck size={18} color="#00F59B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycName}>Vahan Driving License & RC</Text>
              <Text style={styles.kycDetails}>MoRTH • KL07 2021008492</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.kycRow}>
            <View style={styles.kycIconWrap}>
              <Zap size={18} color="#00F59B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kycName}>KSEB Consumer Electricity Account</Text>
              <Text style={styles.kycDetails}>LT-1A Domestic • 1155829104</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* Map & Navigation Settings */}
        <Text style={styles.sectionHeader}>MAP & NAVIGATION PREFERENCES</Text>
        <View style={styles.sectionBox}>
          <Text style={styles.settingLabel}>DEFAULT MAP RADAR THEME</Text>
          <View style={styles.mapThemeRow}>
            {[
              { id: "dark", label: "🌙 Dark Cyber" },
              { id: "street", label: "🗺️ Street OSM" },
              { id: "satellite", label: "🛰️ Esri Satellite" },
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
                    isSelected && { borderColor: "#00F59B", backgroundColor: "rgba(0,245,155,0.12)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      isSelected && { color: "#00F59B", fontWeight: "700" },
                    ]}
                  >
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Toggles */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>WhatsApp Digital Gate Pass</Text>
              <Text style={styles.switchSub}>
                Instantly receive 6-digit gate code on WhatsApp when host confirms.
              </Text>
            </View>
            <Switch
              value={whatsappAlerts}
              onValueChange={setWhatsappAlerts}
              trackColor={{ false: "#1E293B", true: "rgba(0,245,155,0.4)" }}
              thumbColor={whatsappAlerts ? "#00F59B" : "#64748B"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Push Notifications</Text>
              <Text style={styles.switchSub}>
                Notify when battery reaches 80% or slot is ending.
              </Text>
            </View>
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: "#1E293B", true: "rgba(0,245,155,0.4)" }}
              thumbColor={pushNotifs ? "#00F59B" : "#64748B"}
            />
          </View>
        </View>

        {/* Legal & Regulatory Compliance */}
        <Text style={styles.sectionHeader}>LEGAL & REGULATORY</Text>
        <View style={styles.sectionBox}>
          <View style={styles.legalInfoWrap}>
            <Info size={16} color="#00F59B" style={{ marginTop: 2 }} />
            <Text style={styles.legalInfoText}>
              VoltMate operates under the Ministry of Power (MoP) Charging Infrastructure Guidelines (Jan 2022 & Nov 2024 revisions), permitting peer-to-peer EV charging at domestic tariffs with zero commercial resale license requirement.
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow}>
            <Text style={styles.menuText}>Terms of Service & MoP Tariff Slabs</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow}>
            <Text style={styles.menuText}>Community Safety & Society Guidelines</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow}>
            <Text style={styles.menuText}>App Version: v1.0.0 (Production Build)</Text>
            <Text style={{ color: "#64748B", fontSize: 12 }}>Build 104</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out of VoltMate</Text>
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
              <Text style={styles.modalTitle}>Edit Driver Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor="#64748B"
              style={styles.inputField}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>EMAIL ADDRESS</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputField}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PHONE NUMBER</Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Phone Number"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              style={styles.inputField}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.saveProfileBtn}
              activeOpacity={0.8}
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
    backgroundColor: "#06090E",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  userCard: {
    backgroundColor: "#0F1622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
    marginBottom: 16,
  },
  userTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,245,155,0.15)",
    borderWidth: 2,
    borderColor: "#00F59B",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    color: "#00F59B",
    fontSize: 20,
    fontWeight: "800",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00F59B",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userEmail: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  userPhone: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    fontFamily: "monospace",
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#06090E",
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#06090E",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  trustItem: {
    alignItems: "center",
    flex: 1,
  },
  trustScoreText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  trustStatValue: {
    color: "#00F59B",
    fontSize: 13,
    fontWeight: "800",
  },
  trustLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },
  trustDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  hostBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,184,0,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.3)",
    padding: 16,
    marginBottom: 20,
  },
  hostBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  hostIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,184,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hostTitle: {
    color: "#FFB800",
    fontWeight: "800",
    fontSize: 14,
  },
  hostSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionBox: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    marginBottom: 20,
  },
  kycRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  kycIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,245,155,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  kycName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  kycDetails: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: "rgba(0,245,155,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
  },
  verifiedText: {
    color: "#00F59B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },
  mapThemeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#06090E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  themeBtnText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  switchSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  legalInfoWrap: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,245,155,0.05)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,245,155,0.15)",
  },
  legalInfoText: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  menuText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1622",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(0,245,155,0.3)",
    padding: 24,
    paddingBottom: 36,
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
    color: "#FFFFFF",
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  inputField: {
    backgroundColor: "#06090E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  saveProfileBtn: {
    backgroundColor: "#00F59B",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  saveProfileBtnText: {
    color: "#06090E",
    fontWeight: "800",
    fontSize: 14,
  },
});

