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
import { Zap, MapPin, ShieldCheck, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { EvCarHeroRender } from "../../components/ui/EvVisuals";

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
    tag: "INTELLIGENT EV COCKPIT",
    title: "Real-Time Telemetry & Range Control",
    subtitle:
      "Monitor live battery state-of-charge, estimated range, compatible charging ports, and nearest verified stations from one clean dashboard.",
    metric: "72% Battery",
    metricSub: "Live Vehicle Sync",
    icon: Zap,
  },
  {
    id: "2",
    tag: "INSTANT STATION DISCOVERY",
    title: "Find & Book High-Speed Chargers in Seconds",
    subtitle:
      "Browse nearby stations on a crystal-clear street map, inspect Type A, CHAdeMO, and Type B connector slots, and reserve your bay ahead of arrival.",
    metric: "1.0 km",
    metricSub: "Nearest Fast Hub",
    icon: MapPin,
  },
  {
    id: "3",
    tag: "SEAMLESS GATE PASS & BILLING",
    title: "Zero-Friction Arrival & Transparent Pricing",
    subtitle:
      "Unlock residential and commercial bays with instant 6-digit gate passes and pay per kWh with hardware-secured wallet protection.",
    metric: "$0.50/kWh",
    metricSub: "Transparent Rates",
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
            <Zap size={14} color="#05E660" fill="#05E660" />
          </View>
          <Text style={styles.brandText}>VoltMate</Text>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
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
                      <Icon size={42} color="#05E660" />
                    </View>
                  )}

                  <View style={styles.metricBadge}>
                    <Text style={styles.metricValue}>{item.metric}</Text>
                    <Text style={styles.metricDivider}>•</Text>
                    <Text style={styles.metricSub}>{item.metricSub}</Text>
                  </View>
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
                  backgroundColor: idx === currentIndex ? "#151C18" : "#D5DBD8",
                  width: idx === currentIndex ? 26 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Continue"}
          </Text>
          <ArrowRight size={18} color="#111714" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111714",
    letterSpacing: -0.4,
  },
  skipBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9E6",
  },
  skipText: {
    color: "#757F7A",
    fontWeight: "700",
    fontSize: 12,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slideWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  visualCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  metricBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F3",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginTop: 12,
    gap: 6,
  },
  metricValue: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 12,
  },
  metricDivider: {
    color: "#757F7A",
    fontSize: 12,
  },
  metricSub: {
    color: "#757F7A",
    fontSize: 12,
    fontWeight: "600",
  },
  tagPill: {
    backgroundColor: "rgba(5, 230, 96, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagText: {
    color: "#047835",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111714",
    textAlign: "center",
    lineHeight: 31,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  slideSubtitle: {
    fontSize: 13,
    color: "#757F7A",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 20,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
    shadowColor: "#05E660",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 15,
  },
});
