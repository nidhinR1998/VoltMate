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
import { Zap, Mountain, Wallet, ArrowRight, ShieldCheck, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { NeonButton } from "../../components/ui/NeonButton";

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
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
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
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <View className="flex-1 justify-between px-6 pt-6 pb-8">
        {/* Top Header Bar */}
        <View className="flex-row justify-between items-center z-20">
          <View className="flex-row items-center">
            <Text className="text-2xl font-space font-bold text-white tracking-tight">
              Volt<Text style={{ color: activeSlide.accent }}>Mate</Text>
            </Text>
            <View
              style={{ backgroundColor: `${activeSlide.accent}15`, borderColor: `${activeSlide.accent}40` }}
              className="ml-2.5 px-2 py-0.5 rounded-full border"
            >
              <Text style={{ color: activeSlide.accent }} className="text-[10px] font-mono font-bold">
                INDIA P2P
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleSkip} className="py-1 px-3 rounded-full bg-white/5 border border-white/10">
            <Text className="text-gray-400 font-semibold text-xs">Skip Tour</Text>
          </TouchableOpacity>
        </View>

        {/* Carousel View */}
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48));
            setCurrentIndex(idx);
          }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const Icon = item.icon;
            return (
              <View style={{ width: SCREEN_WIDTH - 48 }} className="items-center justify-center px-2">
                {/* 3D Glass Artwork Container */}
                <View className="relative items-center justify-center my-6">
                  {/* Outer Ambient Glow Ring */}
                  <View
                    style={[
                      styles.glowRing,
                      { borderColor: item.accent, shadowColor: item.accent },
                    ]}
                    className="w-48 h-48 rounded-full border border-dashed items-center justify-center bg-[#0F1622]/60"
                  >
                    {/* Inner Glass Orb */}
                    <View
                      style={[
                        styles.innerOrb,
                        { borderColor: item.accent, backgroundColor: `${item.accent}10` },
                      ]}
                      className="w-36 h-36 rounded-3xl items-center justify-center border-2 shadow-2xl"
                    >
                      <Icon size={64} color={item.accent} />
                    </View>
                  </View>

                  {/* Floating Metric Pill */}
                  <View
                    style={{ borderColor: `${item.accent}60` }}
                    className="absolute -bottom-3 bg-[#06090E] px-4 py-1.5 rounded-full border shadow-xl flex-row items-center"
                  >
                    <ShieldCheck size={14} color={item.accent} style={{ marginRight: 6 }} />
                    <Text className="text-white font-mono font-bold text-xs">
                      {item.metrics}{" "}
                      <Text className="text-gray-400 font-jakarta text-[11px] font-normal">
                        {item.metricsLabel}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Tag */}
                <View
                  style={{ backgroundColor: `${item.accent}15`, borderColor: `${item.accent}40` }}
                  className="px-3.5 py-1 rounded-full border mb-4 mt-2"
                >
                  <Text style={{ color: item.accent }} className="text-[11px] font-mono font-bold tracking-widest uppercase">
                    {item.tag}
                  </Text>
                </View>

                {/* Title */}
                <Text className="text-2xl font-space font-bold text-white text-center mb-1 leading-8">
                  {item.title}{" "}
                  <Text style={{ color: item.accent }}>{item.highlightText}</Text>
                </Text>

                {/* Subtitle */}
                <Text className="text-gray-400 font-jakarta text-center text-xs leading-5 px-4 mt-2">
                  {item.subtitle}
                </Text>
              </View>
            );
          }}
        />

        {/* Footer Actions & Carousel Indicators */}
        <View className="space-y-6 pt-2">
          {/* Animated Indicator Dots */}
          <View className="flex-row justify-center items-center space-x-2">
            {slides.map((s, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: idx === currentIndex ? activeSlide.accent : "rgba(255, 255, 255, 0.15)",
                  width: idx === currentIndex ? 28 : 8,
                }}
                className="h-2 rounded-full transition-all duration-300"
              />
            ))}
          </View>

          {/* Action Button */}
          <NeonButton
            title={currentIndex === slides.length - 1 ? "ENTER VOLTMATE RADAR" : "NEXT SLIDE"}
            onPress={handleNext}
            size="lg"
            icon={<ArrowRight size={18} color="#06090E" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glowRing: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
  innerOrb: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
  },
});
