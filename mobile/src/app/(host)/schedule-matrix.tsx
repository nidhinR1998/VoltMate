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
  AppChip,
  AppToggle,
} from "../../components/ui/DesignSystem";

const TIME_RANGE_PRESETS = [
  "09:00 – 18:00",
  "18:00 – 23:00",
  "06:00 – 22:00",
  "24 Hours",
];

export default function ScheduleMatrixScreen() {
  const router = useRouter();
  const { hostSchedule, updateHostSchedule } = useVoltMateEngine();
  const [days, setDays] = useState<HostScheduleDay[]>(hostSchedule);
  const [selectedRange, setSelectedRange] = useState<string>(
    TIME_RANGE_PRESETS[0]
  );

  const toggleDay = (idx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === idx
          ? {
              ...d,
              active: !d.active,
              slots: !d.active
                ? `Active (${selectedRange})`
                : "Closed (Private use)",
            }
          : d
      )
    );
  };

  const applyRangeToAllDays = () => {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        active: true,
        slots: `Active (${selectedRange})`,
      }))
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
        Select active hosting hours and tap days to toggle availability.
      </Text>

      {/* Compact Week View Pill Strip */}
      <View style={styles.weekPillRow}>
        {days.map((d, idx) => (
          <TouchableOpacity
            key={d.day}
            style={[styles.dayPill, d.active && styles.dayPillActive]}
            onPress={() => toggleDay(idx)}
            accessibilityRole="button"
            accessibilityLabel={`${d.day} ${d.active ? "active" : "closed"}`}
          >
            <Text
              style={[styles.dayPillTxt, d.active && styles.dayPillTxtActive]}
            >
              {d.day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time-Range Picker + Apply to All Days */}
      <AppCard style={styles.rangePickerCard}>
        <View style={styles.rangeHeaderRow}>
          <Text style={styles.dayName}>Hosting Time Window</Text>
          <TouchableOpacity
            onPress={applyRangeToAllDays}
            accessibilityRole="button"
            accessibilityLabel="Apply selected time window to all days"
          >
            <Text style={styles.applyAllLink}>Apply to all days</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rangeChipsWrap}>
          {TIME_RANGE_PRESETS.map((preset) => (
            <AppChip
              key={preset}
              label={preset}
              selected={selectedRange === preset}
              onPress={() => {
                setSelectedRange(preset);
                setDays((prev) =>
                  prev.map((d) =>
                    d.active ? { ...d, slots: `Active (${preset})` } : d
                  )
                );
              }}
            />
          ))}
        </View>
      </AppCard>

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
                {item.active ? item.slots : "Closed (Private use)"}
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
    marginBottom: SPACING.sm,
  },
  weekPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: SPACING.md,
  },
  dayPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayPillTxt: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  dayPillTxtActive: {
    color: COLORS.textInverse,
  },
  rangePickerCard: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  rangeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  applyAllLink: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  rangeChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
