import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Phone, MessageSquare, AlertOctagon, Zap, ShieldCheck, X, Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { LiquidBatterySkia } from "../../components/animations/LiquidBatterySkia";
import { SwipeToSpark } from "../../compon````````````````````````ents/animations/SwipeToSpark";
import { GlassCard } from "../../components/ui/GlassCard";
import { Badge } from "../../components/ui/Badge";
import { SmartMeterScanner } from "../../components/ocr/SmartMeterScanner";
import { useSessionStore } from "../../store/useSessionStore";
import { sessionSocket } from "../../services/socket";
import { launchUpiPayment } from "../../services/upiIntent";
import { apiClient } from "../../services/api";

export default function ActiveChargeScreen() {
  const router = useRouter();
  const {
    activeBookingId,
    hostName,
    hostPhone,
    vehicleModel,
    telemetry,
    messages,
    addChatMessage,
    endSession,
  } = useSessionStore();

  const [showEndScanner, setShowEndScanner] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState("");

  // Connect bidirectional WebSocket on mount
  useEffect(() => {
    if (activeBookingId) {
      sessionSocket.connect(activeBookingId);
    }
    return () => {
      sessionSocket.disconnect();
    };
  }, [activeBookingId]);

  // Format elapsed time (HH:MM:SS)
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sessionSocket.sendChatMessage(chatInput.trim(), "DRIVER");
    addChatMessage({
      sender: "DRIVER",
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setChatInput("");
  };

  const handleStopChargingInitiated = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch { }
    setShowEndScanner(true);
  };

  const handleFinalScanComplete = async (endReading: number) => {
    try {
      // Trigger session completion on backend
      const res = await apiClient.post(`/bookings/${activeBookingId || "sim_123"}/complete-session?user_id=driver_1&role=DRIVER`, {
        end_meter_reading: endReading,
      });

      const totalCost = res.data?.total_amount_inr || telemetry.liveCostInr || 56.10;

      // Launch Native UPI Deep-Link
      Alert.alert(
        "Charge Complete ⚡",
        `Energy delivered: ${telemetry.deliveredKwh.toFixed(2)} kWh\nTotal amount: ₹${totalCost}\n\nProceed to zero-fee UPI settlement directly to host?`,
        [
          {
            text: "Pay via UPI App (GPay/PhonePe)",
            onPress: async () => {
              await launchUpiPayment({
                hostVpa: "host.arun@okaxis",
                hostName: hostName,
                amount: totalCost,
                bookingId: activeBookingId || "VM_CHARGE",
                note: "VoltMate EV Charge Villa 14"
              });
              endSession();
              router.replace("/(driver)/map-radar");
            },
          },
          {
            text: "Done",
            onPress: () => {
              endSession();
              router.replace("/(driver)/map-radar");
            },
          },
        ]
      );
    } catch (e) {
      endSession();
      router.replace("/(driver)/map-radar");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#06090E]">
      <View className="flex-1">
        <ScrollView className="flex-1 px-6 pt-2 pb-10" showsVerticalScrollIndicator={false}>
          {/* Top Status Header */}
          <View className="flex-row items-center justify-between my-2">
            <View>
              <Text className="text-white font-space font-bold text-lg">
                Charging Session Active
              </Text>
              <Text className="text-gray-400 font-jakarta text-xs">
                {vehicleModel} • {hostName}
              </Text>
            </View>

            <Badge type="verified" label="Relay Energized" variant="emerald" />
          </View>

          {/* Liquid Battery 3D Skia Canvas */}
          <LiquidBatterySkia
            socPercent={telemetry.currentSocPercent}
            isCharging={true}
            powerKw={telemetry.instantPowerKw}
          />

          {/* Live Tabular Telemetry Grid (JetBrains Mono) */}
          <GlassCard className="mb-6 border border-[#00F59B]/40 p-4 shadow-xl">
            <View className="flex-row justify-between pb-3 border-b border-white/5">
              <View>
                <Text className="text-gray-400 text-[10px] font-mono">ELAPSED TIME</Text>
                <Text className="text-white font-mono text-xl font-bold">
                  {formatTime(telemetry.elapsedSeconds)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-gray-400 text-[10px] font-mono">DELIVERED ENERGY</Text>
                <Text className="text-[#00F59B] font-mono text-xl font-bold">
                  {telemetry.deliveredKwh.toFixed(3)} kWh
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between pt-3">
              <View>
                <Text className="text-gray-400 text-[10px] font-mono">GRID VOLTAGE / CURRENT</Text>
                <Text className="text-white font-mono text-sm font-semibold">
                  {telemetry.voltageV}V • {telemetry.currentA}A
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-gray-400 text-[10px] font-mono">LIVE COST</Text>
                <Text className="text-white font-mono text-xl font-bold">
                  ₹{telemetry.liveCostInr.toFixed(2)}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Quick Contact & Emergency SOS Controls */}
          <View className="flex-row space-x-3 mb-8">
            <TouchableOpacity
              onPress={() => setShowChatModal(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0F1622] border border-white/10 flex-row items-center justify-center mr-2"
            >
              <MessageSquare size={16} color="#00F59B" style={{ marginRight: 6 }} />
              <Text className="text-white text-xs font-semibold font-jakarta">Host Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Emergency Power Cut-Off",
                  "Instantly cut power to socket and notify host security desk?",
                  [
                    { text: "Cancel" },
                    {
                      text: "EMERGENCY CUT-OFF",
                      style: "destructive",
                      onPress: () => {
                        sessionSocket.sendChatMessage("EMERGENCY_SOS_TRIGGERED", "DRIVER");
                        Alert.alert("Power Cut", "Smart relay toggled OFF immediately.");
                      },
                    },
                  ]
                )
              }
              className="flex-1 py-3 px-4 rounded-xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/40 flex-row items-center justify-center"
            >
              <AlertOctagon size={16} color="#FF3B5C" style={{ marginRight: 6 }} />
              <Text className="text-[#FF3B5C] text-xs font-semibold font-mono">SOS CUT-OFF</Text>
            </TouchableOpacity>
          </View>

          {/* Swipe-to-Spark End Session Slider */}
          <View className="items-center mb-8">
            <SwipeToSpark
              label="SWIPE TO STOP & SETTLE"
              color="#FF3B5C"
              onSuccess={handleStopChargingInitiated}
            />
          </View>
        </ScrollView>

        {/* Host Chat Modal */}
        <Modal visible={showChatModal} animationType="slide" transparent>
          <View className="flex-1 bg-black/80 justify-end">
            <View className="bg-[#0F1622] rounded-t-3xl p-5 h-[490px] border-t border-white/10">
              <View className="flex-row justify-between items-center pb-3 border-b border-white/10 mb-3">
                <Text className="text-white font-space font-bold text-base">
                  Chat with {hostName}
                </Text>
                <TouchableOpacity onPress={() => setShowChatModal(false)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Message History */}
              <ScrollView className="flex-1 mb-3 space-y-2">
                {messages.map((m) => (
                  <View
                    key={m.id}
                    className={`p-3 rounded-xl max-w-[85%] mb-2 ${m.sender === "DRIVER"
                        ? "bg-[#00F59B]/20 self-end border border-[#00F59B]/40"
                        : "bg-[#06090E] self-start border border-white/10"
                      }`}
                  >
                    <Text className="text-white text-xs font-jakarta">{m.text}</Text>
                    <Text className="text-gray-400 text-[9px] font-mono mt-1 text-right">
                      {m.timestamp}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Input Bar */}
              <View className="flex-row items-center bg-[#06090E] rounded-xl px-3 py-2 border border-white/10">
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Ask about parking bay, extension cord..."
                  placeholderTextColor="#64748B"
                  className="flex-1 text-white text-xs font-jakarta"
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  className="ml-2 bg-[#00F59B] p-2 rounded-lg"
                >
                  <Send size={14} color="#06090E" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Final Meter Reading Scanner Modal */}
        <SmartMeterScanner
          visible={showEndScanner}
          targetMode="METER_KWH"
          onClose={() => setShowEndScanner(false)}
          onScanComplete={handleFinalScanComplete}
        />
      </View>
    </SafeAreaView>
  );
}
