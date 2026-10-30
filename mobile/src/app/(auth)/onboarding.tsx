import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Zap, Mountain, Wallet, ArrowRight, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Slide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  highlightText: string;
  icon: any;
  accent: string;
  metrics: string;
  metricsLabel: string;
}

const slides: Slide[] = [
  {
    id: "1",
    tag: "COMMUNITY P2P GRID",
    title: "Every Driveway is a",
    highlightText: "Charging Station",
    subtitle: "Unlock 10,000+ verified 15A home sockets, apartment wallboxes, and gated villas across India with MyGate-style instant gate passes.",
    icon: Zap,
    accent: "#00F59B",
    metrics: "10,000+",
    metricsLabel: "Verified P2P Plugs",
  },
  {
    id: "2",
    tag: "ELEVATION-AWARE ROUTING",
    title: "Zero Range Anxiety on",
    highlightText: "Ghats & Highways",
    subtitle: "OSRM routing engine simulates potential energy consumption and regenerative braking on steep hairpins (Wayanad, Munnar, Lonavala).",
    icon: Mountain,
    accent: "#00E5FF",
    metrics: "2 km",
    metricsLabel: "Buffer Highway Matching",
  },
  {
    id: "3",
    tag: "PASSIVE VOLTCREDITS",
    title: "Host Your Idle Socket.",
    highlightText: "Power Neighbors.",
    subtitle: "Share your driveway plug while away at work. Earn direct zero-fee UPI payouts or VoltCredits matching legal DISCOM energy tariff slabs.",
    icon: Wallet,
    accent: "#FFB800",
    metrics: "₹0 Fee",
    metricsLabel: "Direct UPI Settlement",
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

  const activeSlide = slides[currentIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#06090E" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>
            Volt<Text style={{ color: activeSlide.accent }}>Mate</Text>
          </Text>
          <View
            style={[
              styles.p2pBadge,
              { backgroundColor: `${activeSlide.accent}15`, borderColor: `${activeSlide.accent}40` },
            ]}
          >
            <Text style={[styles.p2pBadgeText, { color: activeSlide.accent }]}>
              INDIA P2P
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel View */}
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
          renderItem={({ item }) => {
            const Icon = item.icon;
            return (
              <View style={[styles.slideWrapper, { width: SCREEN_WIDTH }]}>
                {/* 3D Glass Artwork Container */}
                <View style={styles.artworkContainer}>
                  {/* Outer Ambient Glow Ring */}
                  <View
                    style={[
                      styles.glowRing,
                      { borderColor: item.accent, shadowColor: item.accent },
                    ]}
                  >
                    {/* Inner Glass Orb */}
                    <View
                      style={[
                        styles.innerOrb,
                        { borderColor: item.accent, backgroundColor: `${item.accent}15` },
                      ]}
                    >
                      <Icon size={56} color={item.accent} />
                    </View>
                  </View>

                  {/* Floating Metric Pill */}
                  <View
                    style={[
                      styles.metricPill,
                      { borderColor: `${item.accent}60` },
                    ]}
                  >
                    <ShieldCheck size={14} color={item.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.metricValue}>
                      {item.metrics}{" "}
                      <Text style={styles.metricLabel}>{item.metricsLabel}</Text>
                    </Text>
                  </View>
                </View>

                {/* Tag */}
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: `${item.accent}15`, borderColor: `${item.accent}40` },
                  ]}
                >
                  <Text style={[styles.tagText, { color: item.accent }]}>
                    {item.tag}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.slideTitle}>
                  {item.title}{" "}
                  <Text style={{ color: item.accent }}>{item.highlightText}</Text>
                </Text>

                {/* Subtitle */}
                <Text style={styles.slideSubtitle}>
                  {item.subtitle}
                </Text>
              </View>
            );
          }}
        />
      </View>

      {/* Footer Actions & Carousel Indicators */}
      <View style={styles.footerContainer}>
        {/* Animated Indicator Dots */}
        <View style={styles.dotsRow}>
          {slides.map((s, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === currentIndex ? activeSlide.accent : "rgba(255, 255, 255, 0.2)",
                  width: idx === currentIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          style={[styles.actionBtn, { backgroundColor: activeSlide.accent }]}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === slides.length - 1 ? "ENTER VOLTMATE RADAR" : "NEXT SLIDE"}
          </Text>
          <ArrowRight size={18} color="#06090E" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  p2pBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  p2pBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skipText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 12,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slideWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  artworkContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  glowRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 22, 34, 0.6)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 8,
  },
  innerOrb: {
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
  },
  metricPill: {
    position: "absolute",
    bottom: -10,
    backgroundColor: "#06090E",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 10,
  },
  slideSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
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
    height: 6,
    borderRadius: 3,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtnText: {
    color: "#06090E",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
