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
import { ArrowLeft, Clock, ShieldCheck, Check, Calendar, Sparkles, PauseCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";

interface DaySlot {
  day: string;
  short: string;
  active: boolean;
  timeSlot: string;
  isWorkHours: boolean;
}

const INITIAL_SCHEDULE: DaySlot[] = [
  { day: "Monday", short: "Mon", active: true, timeSlot: "09:00 AM - 06:00 PM", isWorkHours: true },
  { day: "Tuesday", short: "Tue", active: true, timeSlot: "09:00 AM - 06:00 PM", isWorkHours: true },
  { day: "Wednesday", short: "Wed", active: true, timeSlot: "09:00 AM - 06:00 PM", isWorkHours: true },
  { day: "Thursday", short: "Thu", active: true, timeSlot: "09:00 AM - 06:00 PM", isWorkHours: true },
  { day: "Friday", short: "Fri", active: true, timeSlot: "09:00 AM - 06:00 PM", isWorkHours: true },
  { day: "Saturday", short: "Sat", active: false, timeSlot: "Closed for personal use", isWorkHours: false },
  { day: "Sunday", short: "Sun", active: false, timeSlot: "Closed for personal use", isWorkHours: false },
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
      ? "09:00 AM - 06:00 PM"
      : "Closed for personal use";
    setSchedule(updated);
  };

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert("Matrix Saved ⚡", "Your recurring weekly availability and auto-approval rules are active.");
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <ScrollView className="flex-1 px-6 pt-4 pb-12" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#0F1622] items-center justify-center mr-4 border border-white/10"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-space font-bold text-white">
              Availability Matrix
            </Text>
            <Text className="text-amber-solar font-jakarta text-xs">
              Automate Driveway Slots While at Work
            </Text>
          </View>
        </View>

        {/* 1. Quick-Ride Style Auto-Approve Rules Card */}
        <GlassCard className="mb-6 p-4 border border-amber-solar/40 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center mb-1">
                <ShieldCheck size={16} color="#00F59B" style={{ marginRight: 6 }} />
                <Text className="text-white font-space font-bold text-sm">
                  Smart Auto-Approval
                </Text>
              </View>
              <Text className="text-gray-400 text-xs font-jakarta">
                Instantly accept drivers with Rating ≥ 4.5★ and verified RC shield
              </Text>
            </View>

            <Switch
              value={autoApproveVerified}
              onValueChange={setAutoApproveVerified}
              trackColor={{ false: "#1E293B", true: "#FFB800" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="h-[1px] bg-white/10 my-2" />

          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-1 mr-3">
              <Text className="text-white font-space font-semibold text-xs">
                Allow Overnight Charging (10 PM - 6 AM)
              </Text>
              <Text className="text-gray-400 text-[11px] font-jakarta">
                Popular with highway road-trippers and homestays
              </Text>
            </View>

            <Switch
              value={overnightAllowed}
              onValueChange={setOvernightAllowed}
              trackColor={{ false: "#1E293B", true: "#FFB800" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </GlassCard>

        {/* 2. Weekly Recurring Day-by-Day Slots */}
        <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
          Weekly Daytime Schedule
        </Text>
        <Text className="text-gray-400 text-xs mb-3 font-jakarta">
          Toggle active days to monetize your parking bay while you commute to office:
        </Text>

        <View className="space-y-2 mb-8">
          {schedule.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => toggleDay(idx)}
              className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                item.active
                  ? "bg-[#0F1622] border-amber-solar/50 shadow-md"
                  : "bg-[#0F1622]/40 border-white/5 opacity-60"
              }`}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                    item.active ? "bg-amber-solar/20 border border-amber-solar/40" : "bg-black/40"
                  }`}
                >
                  <Calendar size={18} color={item.active ? "#FFB800" : "#64748B"} />
                </View>

                <View>
                  <Text className="text-white font-space font-bold text-sm">
                    {item.day}
                  </Text>
                  <Text
                    style={{ color: item.active ? "#00F59B" : "#64748B" }}
                    className="font-mono text-xs mt-0.5"
                  >
                    {item.timeSlot}
                  </Text>
                </View>
              </View>

              <View
                className={`w-6 h-6 rounded-full items-center justify-center border ${
                  item.active
                    ? "bg-amber-solar border-amber-solar"
                    : "border-white/20"
                }`}
              >
                {item.active && <Check size={14} color="#06090E" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <NeonButton
          title="SAVE RECURRING MATRIX"
          onPress={handleSave}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
