import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Zap,
  TrendingUp,
  Leaf,
  PlusCircle,
  Calendar,
  Bell,
  Wallet,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { Badge } from "../../components/ui/Badge";
import { useModeStore } from "../../store/useModeStore";

const WEEKLY_DATA = [
  { day: "Mon", kwh: 14.2, inr: 140 },
  { day: "Tue", kwh: 22.0, inr: 210 },
  { day: "Wed", kwh: 18.5, inr: 180 },
  { day: "Thu", kwh: 28.0, inr: 275 },
  { day: "Fri", kwh: 35.4, inr: 340 },
  { day: "Sat", kwh: 42.1, inr: 415 },
  { day: "Sun", kwh: 31.0, inr: 300 },
];

export default function HostDashboardScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const [isPaused, setIsPaused] = useState(false);

  const totalKwh = 191.2;
  const totalEarnings = 1860.0;
  const co2OffsetKg = 156.8;

  const handleTogglePause = (val: boolean) => {
    setIsPaused(val);
    try {
      Haptics.notificationAsync(
        val
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    } catch {}
    Alert.alert(
      val ? "Charger Paused" : "Charger Active",
      val
        ? "Your charger is now hidden from the community radar for maintenance or vacation."
        : "Your charger is live and bookable on the community map!"
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <ScrollView className="flex-1 px-6 pt-4 pb-12" showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <View className="flex-row items-center mb-0.5">
              <Sparkles size={16} color="#FFB800" style={{ marginRight: 6 }} />
              <Text className="text-2xl font-space font-bold text-white">
                Host Command Center
              </Text>
            </View>
            <Text className="text-amber-solar font-jakarta text-xs font-semibold">
              Villa 14 • 15A Smart Socket (MCB 16A)
            </Text>
          </View>

          {/* Pending Alerts Pill */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/incoming-requests")}
            className="w-10 h-10 rounded-xl bg-[#0F1622] border border-amber-solar/40 items-center justify-center relative shadow-lg"
          >
            <Bell size={18} color="#FFB800" />
            <View className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C] absolute top-2 right-2 border-2 border-[#06090E]" />
          </TouchableOpacity>
        </View>

        {/* 1-Tap Vacation Pause Card */}
        <GlassCard className="mb-6 border border-amber-solar/40 flex-row items-center justify-between p-4 shadow-xl">
          <View className="flex-row items-center flex-1 mr-2">
            {isPaused ? (
              <PauseCircle size={24} color="#FF3B5C" style={{ marginRight: 10 }} />
            ) : (
              <PlayCircle size={24} color="#00F59B" style={{ marginRight: 10 }} />
            )}
            <View className="flex-1">
              <Text className="text-white font-space font-bold text-xs">
                {isPaused ? "Charger Currently Paused" : "Charger Live & Accepting"}
              </Text>
              <Text className="text-gray-400 font-jakarta text-[11px] mt-0.5">
                {isPaused ? "Hidden from drivers for maintenance" : "Available for ad-hoc & commuter slots"}
              </Text>
            </View>
          </View>

          <Switch
            value={!isPaused}
            onValueChange={(val) => handleTogglePause(!val)}
            trackColor={{ false: "#1E293B", true: "#FFB800" }}
            thumbColor="#FFFFFF"
          />
        </GlassCard>

        {/* Primary KPI Metrics Trio */}
        <View className="flex-row space-x-2 mb-6">
          {/* Earnings */}
          <GlassCard className="flex-1 p-3.5 border border-amber-solar/30 mr-2 shadow-lg">
            <TrendingUp size={16} color="#FFB800" className="mb-2" />
            <Text className="text-gray-400 text-[10px] font-mono">THIS WEEK</Text>
            <Text className="text-white font-mono text-xl font-bold mt-0.5">
              ₹{totalEarnings.toFixed(0)}
            </Text>
          </GlassCard>

          {/* Energy Shared */}
          <GlassCard className="flex-1 p-3.5 border border-amber-solar/30 mr-2 shadow-lg">
            <Zap size={16} color="#00E5FF" className="mb-2" />
            <Text className="text-gray-400 text-[10px] font-mono">ENERGY</Text>
            <Text className="text-white font-mono text-xl font-bold mt-0.5">
              {totalKwh.toFixed(0)} <Text className="text-xs">kWh</Text>
            </Text>
          </GlassCard>

          {/* CO2 Offset */}
          <GlassCard className="flex-1 p-3.5 border border-amber-solar/30 shadow-lg">
            <Leaf size={16} color="#00F59B" className="mb-2" />
            <Text className="text-gray-400 text-[10px] font-mono">CO2 SAVED</Text>
            <Text className="text-white font-mono text-xl font-bold mt-0.5">
              {co2OffsetKg.toFixed(0)} <Text className="text-xs">kg</Text>
            </Text>
          </GlassCard>
        </View>

        {/* Weekly Energy Output Chart */}
        <GlassCard className="mb-6 p-4 border border-white/10 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-space font-bold text-sm">
                Energy Output (kWh)
              </Text>
              <Text className="text-gray-400 text-[11px] font-jakarta">
                7-Day community sharing volume
              </Text>
            </View>
            <Badge type="rating" label="4.9 ★ Rating" variant="amber" />
          </View>

          {/* Daily Output Bars */}
          <View className="flex-row items-end justify-between h-36 pt-2 px-1">
            {WEEKLY_DATA.map((item, idx) => {
              const barHeight = (item.kwh / 45) * 100;
              return (
                <View key={idx} className="items-center flex-1">
                  <Text className="text-[9px] font-mono text-gray-400 mb-1">
                    {item.kwh}
                  </Text>
                  <View
                    style={{ height: `${barHeight}%` }}
                    className="w-5 rounded-t-lg bg-amber-solar shadow-md shadow-amber-500/40"
                  />
                  <Text className="text-[10px] font-mono text-gray-300 mt-2 font-bold">
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Overstay Idle-Fee Protection Status Banner */}
        <View className="flex-row items-center bg-[#FF3B5C]/10 p-3 rounded-2xl border border-[#FF3B5C]/30 mb-6">
          <Clock size={16} color="#FF3B5C" style={{ marginRight: 8 }} />
          <View className="flex-1">
            <Text className="text-[#FF3B5C] font-mono text-xs font-bold">
              Overstay Idle-Fee Protection Active
            </Text>
            <Text className="text-gray-300 text-[11px] font-jakarta mt-0.5">
              ₹2.00/min penalty ticker automatically begins 15 minutes after booking slot expiry.
            </Text>
          </View>
        </View>

        {/* Host Action Quick Grid */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-3 font-mono">
          Host Control Modules
        </Text>

        <View className="space-y-3 mb-6">
          {/* Add Charger */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/add-charger")}
            className="flex-row items-center justify-between bg-[#0F1622] p-4 rounded-2xl border border-white/10 mb-2 shadow-md"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <PlusCircle size={20} color="#FFB800" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-white font-space font-bold text-sm">
                  Add New Charger / Socket
                </Text>
                <Text className="text-gray-400 text-xs font-jakarta">
                  3-minute listing wizard with DISCOM helper
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          {/* Schedule Matrix */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/schedule-matrix")}
            className="flex-row items-center justify-between bg-[#0F1622] p-4 rounded-2xl border border-white/10 mb-2 shadow-md"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Calendar size={20} color="#00E5FF" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-white font-space font-bold text-sm">
                  Weekly Availability Matrix
                </Text>
                <Text className="text-gray-400 text-xs font-jakarta">
                  Auto-open daytime slots while you're at work
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>

          {/* Wallet & VoltCredits */}
          <TouchableOpacity
            onPress={() => router.push("/(host)/wallet")}
            className="flex-row items-center justify-between bg-[#0F1622] p-4 rounded-2xl border border-white/10 shadow-md"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Wallet size={20} color="#00F59B" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-white font-space font-bold text-sm">
                  VoltCredits & UPI Payouts
                </Text>
                <Text className="text-gray-400 text-xs font-jakarta">
                  Zero-gateway-fee direct community earnings
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
