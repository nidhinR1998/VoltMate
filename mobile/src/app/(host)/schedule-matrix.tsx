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
  useAuthStore,
  TAB_BAR_SAFE_PADDING,
  HostScheduleDay,
} from "../../store/useAuthStore";

const SLOT_CYCLE = [
  "Daytime (09:00 – 18:00)",
  "Evening (18:00 – 23:00)",
  "24 Hours (00:00 – 23:59)",
];

export default function ScheduleMatrixScreen() {
  const router = useRouter();
  const { hostSchedule, updateHostSchedule } = useAuthStore();
  const [days, setDays] = useState<HostScheduleDay[]>(hostSchedule);

  const toggleDay = (idx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === idx
          ? {
              ...d,
              active: !d.active,
              slots: !d.active ? SLOT_CYCLE[0] : "Closed",
            }
          : d
      )
    );
  };

  const cycleTimeWindow = (idx: number) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== idx || !d.active) return d;
        const currentIndex = SLOT_CYCLE.indexOf(d.slots);
        const nextSlot = SLOT_CYCLE[(currentIndex + 1) % SLOT_CYCLE.length];
        return { ...d, slots: nextSlot };
      })
    );
  };

  const handleSave = async () => {
    await updateHostSchedule(days);
    router.back();
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
        Tap any active time window to cycle between Daytime, Evening & 24-Hour P2P hosting.
      </Text>

      <View style={styles.card}>
        {days.map((item, idx) => (
          <View key={item.day} style={styles.dayRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => cycleTimeWindow(idx)}
              activeOpacity={0.75}
            >
              <Text style={styles.dayName}>{item.day}</Text>
              <View style={styles.slotChipRow}>
                <Text
                  style={[
                    styles.daySlot,
                    !item.active && { color: "#A0A8A3" },
                  ]}
                >
                  {item.active ? item.slots : "Closed"}
                </Text>
                {item.active && (
                  <Text style={styles.tapCycleHint}>↻ Tap to change</Text>
                )}
              </View>
            </TouchableOpacity>
            <Switch
              value={item.active}
              onValueChange={() => toggleDay(idx)}
              trackColor={{ false: "#D5DBD7", true: "#05E660" }}
              thumbColor="#FFFFFF"
            />
          </View>
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
    paddingBottom: TAB_BAR_SAFE_PADDING,
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
  slotChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  daySlot: {
    fontSize: 12,
    color: "#096B30",
    fontWeight: "700",
  },
  tapCycleHint: {
    fontSize: 11,
    color: "#7C857F",
    fontWeight: "600",
  },
  saveBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 110,
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
