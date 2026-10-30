import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, Car, Star, ShieldCheck, Check, X, Bell, Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../services/api";

interface BookingRequest {
  id: string;
  driverName: string;
  driverRating: number;
  vehicleModel: string;
  vehicleReg: string;
  durationHours: number;
  scheduledTime: string;
  estimatedEarnings: number;
  secondsRemaining: number;
  estimatedKwh: number;
}

const INITIAL_REQUESTS: BookingRequest[] = [
  {
    id: "req_1",
    driverName: "Karthik Menon",
    driverRating: 4.9,
    vehicleModel: "Tata Nexon EV Max",
    vehicleReg: "KL-07-CD-4921",
    durationHours: 2,
    scheduledTime: "Today • 02:30 PM - 04:30 PM",
    estimatedEarnings: 95.0,
    estimatedKwh: 6.6,
    secondsRemaining: 240, // 4 mins countdown
  },
  {
    id: "req_2",
    driverName: "Sanjay Rajan",
    driverRating: 4.8,
    vehicleModel: "Ather 450X Gen 3",
    vehicleReg: "KL-01-BX-1024",
    durationHours: 1.5,
    scheduledTime: "Today • 05:00 PM - 06:30 PM",
    estimatedEarnings: 52.5,
    estimatedKwh: 3.5,
    secondsRemaining: 175,
  },
];

export default function IncomingRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<BookingRequest[]>(INITIAL_REQUESTS);

  // Live 5-minute countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setRequests((prev) =>
        prev
          .map((r) => ({ ...r, secondsRemaining: Math.max(0, r.secondsRemaining - 1) }))
          .filter((r) => r.secondsRemaining > 0)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      Haptics.notificationAsync(
        accept
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch {}

    try {
      await apiClient.patch(`/bookings/${id}/respond?host_id=host_1`, {
        accept,
        rejection_reason: accept ? null : "Host declined slot request.",
      });
    } catch (e) {
      // Local demo transition
    }

    setRequests(requests.filter((r) => r.id !== id));
    Alert.alert(
      accept ? "Booking Accepted! ⚡" : "Booking Declined",
      accept
        ? "Digital Gate Pass & 4-digit start PIN have been automatically issued to the driver."
        : "Slot has been released back to the community radar."
    );
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
              Booking Requests
            </Text>
            <Text className="text-amber-solar font-jakarta text-xs">
              5-Minute Handshake Confirmation Window
            </Text>
          </View>
        </View>

        {requests.length === 0 ? (
          <View className="items-center justify-center py-24">
            <Clock size={48} color="#64748B" />
            <Text className="text-white font-space font-bold text-base mt-4 text-center">
              All Requests Handled!
            </Text>
            <Text className="text-gray-400 font-jakarta text-xs mt-1 text-center px-8">
              New booking alerts will ring with heavy haptics and a 5-minute countdown.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {requests.map((req) => (
              <GlassCard key={req.id} className="border border-amber-solar/40 p-4 mb-3 shadow-xl">
                {/* Header: Driver info + Countdown badge */}
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="text-white font-space font-bold text-base">
                      {req.driverName}
                    </Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <Badge type="rating" label={`${req.driverRating} ★`} variant="amber" />
                      <Badge type="verified" label="Verified RC" variant="emerald" />
                    </View>
                  </View>

                  {/* 5-minute countdown ring */}
                  <View className="bg-amber-solar/15 px-3 py-1 rounded-full border border-amber-solar/50">
                    <Text className="text-amber-solar font-mono text-xs font-bold">
                      ⏱ {formatCountdown(req.secondsRemaining)}
                    </Text>
                  </View>
                </View>

                {/* Vehicle & Time Details */}
                <View className="bg-[#06090E] p-3 rounded-xl border border-white/5 space-y-2 mb-4">
                  <View className="flex-row items-center">
                    <Car size={16} color="#64748B" style={{ marginRight: 8 }} />
                    <Text className="text-white font-mono text-xs">
                      {req.vehicleReg} ({req.vehicleModel})
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Clock size={16} color="#64748B" style={{ marginRight: 8 }} />
                    <Text className="text-gray-300 font-jakarta text-xs">
                      {req.scheduledTime}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center pt-2 border-t border-white/5">
                    <Text className="text-gray-400 text-xs font-jakarta">
                      Estimated Delivery (~{req.estimatedKwh} kWh)
                    </Text>
                    <Text className="text-amber-solar font-mono text-base font-bold">
                      ₹{req.estimatedEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Actions: Accept or Decline */}
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => handleRespond(req.id, false)}
                    className="py-3 px-4 bg-[#FF3B5C]/15 rounded-xl border border-[#FF3B5C]/40 flex-row items-center justify-center mr-2"
                  >
                    <X size={16} color="#FF3B5C" style={{ marginRight: 6 }} />
                    <Text className="text-[#FF3B5C] font-bold text-xs font-mono">DECLINE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRespond(req.id, true)}
                    className="py-3 px-4 bg-amber-solar rounded-xl flex-row items-center justify-center flex-1 shadow-lg"
                  >
                    <Check size={16} color="#06090E" strokeWidth={3} style={{ marginRight: 6 }} />
                    <Text className="text-[#06090E] font-bold text-xs font-space tracking-wider uppercase">
                      ACCEPT & ISSUE PASS
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
