import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ShieldCheck, Check, Calendar } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface DaySlot {
  day: string;
  short: string;
  active: boolean;
  timeSlot: string;
}

const INITIAL_SCHEDULE: DaySlot[] = [
  { day: "Monday", short: "Mon", active: true, timeSlot: "09:00 – 18:00" },
  { day: "Tuesday", short: "Tue", active: true, timeSlot: "09:00 – 18:00" },
  { day: "Wednesday", short: "Wed", active: true, timeSlot: "09:00 – 18:00" },
  { day: "Thursday", short: "Thu", active: true, timeSlot: "09:00 – 18:00" },
  { day: "Friday", short: "Fri", active: true, timeSlot: "09:00 – 18:00" },
  { day: "Saturday", short: "Sat", active: false, timeSlot: "Reserved for private use" },
  { day: "Sunday", short: "Sun", active: false, timeSlot: "Reserved for private use" },
];

export default function ScheduleMatrixScreen() {
  const router = useRouter();

  const [schedule, setSchedule] = useState<DaySlot[]>(INITIAL_SCHEDULE);
  const [autoApproveVerified, setAutoApproveVerified] = useState(true);
  const [overnightAllowed, setOvernightAllowed] = useState(false);

  const toggleDay = (index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const updated = [...schedule];
    updated[index].active = !updated[index].active;
    updated[index].timeSlot = updated[index].active
      ? "09:00 – 18:00"
      : "Reserved for private use";
    setSchedule(updated);
  };

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert("Schedule Saved", "Your recurring weekly availability and auto-approval rules are now active.");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Availability Schedule</Text>
            <Text style={styles.subtitle}>
              Configure recurring station hours & auto-approval
            </Text>
          </View>
        </View>

        {/* Auto-Approve Rules Card */}
        <View style={styles.rulesCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <ShieldCheck size={16} color="#047835" />
                <Text style={styles.switchTitle}>Smart Auto-Approval</Text>
              </View>
              <Text style={styles.switchSub}>
                Automatically issue gate passes to verified EV drivers with rating ≥ 4.5★
              </Text>
            </View>
            <Switch
              value={autoApproveVerified}
              onValueChange={setAutoApproveVerified}
              trackColor={{ false: "#DCE2DF", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.switchTitle}>Allow Overnight Charging (22:00 – 06:00)</Text>
              <Text style={styles.switchSub}>
                Enable extended overnight sessions for long-range EV guests
              </Text>
            </View>
            <Switch
              value={overnightAllowed}
              onValueChange={setOvernightAllowed}
              trackColor={{ false: "#DCE2DF", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>WEEKLY DAYTIME SCHEDULE</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {schedule.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => toggleDay(idx)}
              activeOpacity={0.85}
              style={[
                styles.dayCard,
                item.active && styles.dayCardActive,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={[
                    styles.dayIconCircle,
                    item.active && styles.dayIconCircleActive,
                  ]}
                >
                  <Calendar size={17} color={item.active ? "#05E660" : "#757F7A"} />
                </View>
                <View>
                  <Text style={styles.dayName}>{item.day}</Text>
                  <Text
                    style={[
                      styles.dayTime,
                      item.active && { color: "#047835", fontWeight: "700" },
                    ]}
                  >
                    {item.timeSlot}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.checkCircle,
                  item.active && styles.checkCircleActive,
                ]}
              >
                {item.active && <Check size={13} color="#111714" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>Save Weekly Schedule</Text>
        </TouchableOpacity>
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
  rulesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  switchSub: {
    fontSize: 11,
    color: "#757F7A",
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2F0",
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757F7A",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E8ECEA",
  },
  dayCardActive: {
    borderColor: "#151C18",
  },
  dayIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  dayIconCircleActive: {
    backgroundColor: "#151C18",
  },
  dayName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111714",
  },
  dayTime: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleActive: {
    backgroundColor: "#05E660",
    borderColor: "#05E660",
  },
  saveBtn: {
    backgroundColor: "#05E660",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#111714",
    fontSize: 15,
    fontWeight: "800",
  },
});
