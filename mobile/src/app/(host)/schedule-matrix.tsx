import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import {
  useVoltMateEngine,
  HostScheduleDay,
} from "../../store/useVoltMateEngine";
import { COLORS, SPACING, TYPOGRAPHY } from "../../theme/tokens";
import {
  AppButton,
  AppCard,
  AppToggle,
} from "../../components/ui/DesignSystem";

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
                ? "Active (09:00 – 18:00)"
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
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Availability Schedule</Text>
        <View style={{ width: SPACING.touchTarget }} />
      </View>

      <Text style={styles.subText}>
        Toggle any day to switch between Active (09:00 – 18:00) and Closed
        (Reserved for private use).
      </Text>

      <AppCard style={styles.card}>
        {days.map((item, idx) => (
          <TouchableOpacity
            key={item.day}
            style={[
              styles.dayRow,
              idx === days.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => toggleDay(idx)}
            activeOpacity={0.78}
          >
            <View style={{ flex: 1, paddingRight: SPACING.sm }}>
              <Text style={styles.dayName}>{item.day}</Text>
              <Text
                style={[
                  styles.daySlot,
                  !item.active && { color: COLORS.textMuted },
                ]}
              >
                {item.active
                  ? "Active (09:00 – 18:00)"
                  : "Closed (Reserved for private use)"}
              </Text>
            </View>
            <AppToggle
              value={item.active}
              onValueChange={() => toggleDay(idx)}
              accessibilityLabel={`Toggle ${item.day} availability`}
            />
          </TouchableOpacity>
        ))}
      </AppCard>

      <AppButton
        label="Save Recurring Schedule"
        variant="primary"
        size="lg"
        icon={<Check size={18} color={COLORS.textInverse} />}
        onPress={handleSave}
      />
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
    marginBottom: SPACING.xs,
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
  subText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  card: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayName: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  daySlot: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
    marginTop: 2,
  },
});
