import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useVoltMateEngine,
  TAB_BAR_SAFE_PADDING,
  HostScheduleDay,
} from "../../store/useVoltMateEngine";

export default function ScheduleMatrixScreen() {
  const router = useRouter();
  const { hostSchedule, updateHostSchedule } = useVoltMateEngine();
  const [days, setDays] = useState<HostScheduleDay[]>(hostSchedule);

  const toggleDay = (idx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === idx
          ? {
              ...d,
              active: !d.active,
              slots: !d.active
                ? "Active (09:00 – 18:00 ✓)"
                : "Closed (Reserved for private use)",
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    await updateHostSchedule(days);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(host)/dashboard");
    }
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
        <Text style={styles.pageTitle}>Availability Schedule</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.subText}>
        Tap any day row to toggle between Active (09:00 – 18:00 ✓) and Closed
        (Reserved for private use).
      </Text>

      <View style={styles.card}>
        {days.map((item, idx) => (
          <TouchableOpacity
            key={item.day}
            style={styles.dayRow}
            onPress={() => toggleDay(idx)}
            activeOpacity={0.78}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.dayName}>{item.day}</Text>
              <Text
                style={[
                  styles.daySlot,
                  !item.active && { color: "#A0A8A3" },
                ]}
              >
                {item.active
                  ? item.slots
                  : "Closed (Reserved for private use)"}
              </Text>
            </View>
            <Switch
              value={item.active}
              onValueChange={() => toggleDay(idx)}
              trackColor={{ false: "#D5DBD7", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Recurring Schedule</Text>
      </TouchableOpacity>
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
    paddingBottom: 150,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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
  subText: {
    fontSize: 13,
    color: "#7C857F",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 20,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F2",
  },
  dayName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151C18",
  },
  daySlot: {
    fontSize: 12,
    color: "#096B30",
    fontWeight: "700",
    marginTop: 2,
  },
  saveBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 120,
    shadowColor: "#05E660",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151C18",
  },
});
