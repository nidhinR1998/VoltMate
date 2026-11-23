import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Zap, MapPin, ShieldCheck, ArrowRight, CalendarCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";
import { AppButton, StatusBadge } from "../../components/ui/DesignSystem";
import { COLORS, ELEVATION, ICON_STROKE_WIDTH, SPACING, TYPOGRAPHY } from "../../theme/tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  metric: string;
  metricSub: string;
  icon: any;
}

const slides: Slide[] = [
  {
    id: "1",
    tag: "Step 1 • Find chargers",
    title: "Find verified chargers near you",
    subtitle: "Live availability for CCS2 DC, Type-2 AC, and 15A home hosts.",
    metric: "72% SoC",
    metricSub: "Live telemetry",
    icon: MapPin,
  },
  {
    id: "2",
    tag: "Step 2 • Book a slot",
    title: "Reserve your charging bay in seconds",
    subtitle: "Pick a time chip and lock your slot with an instant 6-digit gate pass.",
    metric: "0.4 km",
    metricSub: "Nearest fast hub",
    icon: CalendarCheck,
  },
  {
    id: "3",
    tag: "Step 3 • Charge & pay",
    title: "Plug in and pay transparently in ₹",
    subtitle: "Track live kWh and settle automatically from your VoltMate wallet.",
    metric: "₹11.50/kWh",
    metricSub: "Transparent rates",
    icon: ShieldCheck,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleSkip = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot}>
            <Zap size={14} color={COLORS.volt} fill={COLORS.volt} />
          </View>
          <Text style={styles.brandText}>VoltMate</Text>
        </View>

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(idx);
          }}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const Icon = item.icon;
            return (
              <View style={[styles.slideWrapper, { width: SCREEN_WIDTH }]}>
                <View style={styles.visualCard}>
                  {index === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 10 }}>
                      <EvCarHeroRender width={240} height={140} />
                    </View>
                  ) : (
                    <View style={styles.iconCircle}>
                      <Icon
                        size={42}
                        color={COLORS.primary}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    </View>
                  )}

                  <StatusBadge
                    status="available"
                    label={`${item.metric} • ${item.metricSub}`}
                    style={{ marginTop: SPACING.md }}
                  />
                </View>

                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>{item.tag}</Text>
                </View>

                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
              </View>
            );
          }}
        />
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.dotsRow}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    idx === currentIndex ? COLORS.primary : COLORS.borderStrong,
                  width: idx === currentIndex ? 26 : 8,
                },
              ]}
            />
          ))}
        </View>

        <AppButton
          label={currentIndex === slides.length - 1 ? "Get started" : "Continue"}
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={
            <ArrowRight
              size={18}
              color={COLORS.textInverse}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          }
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.mist,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.screenMargin,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  brandDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.ink,
  },
  skipBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: SPACING.chipRadius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
  },
  skipText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.textSecondary,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slideWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxl,
  },
  visualCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxl,
    ...ELEVATION.level1,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: SPACING.md,
  },
  tagPill: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: SPACING.chipRadius,
    marginBottom: SPACING.md,
  },
  tagText: {
    ...TYPOGRAPHY.captionSemibold,
    color: COLORS.primary,
  },
  slideTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  slideSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.sm,
  },
  footerContainer: {
    paddingHorizontal: SPACING.screenMargin,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
});
