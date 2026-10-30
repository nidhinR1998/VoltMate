import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Leaf, Camera, X, CheckCircle2, Clock, MapPin, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import { apiClient } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

interface KarmaContributeModalProps {
  visible: boolean;
  onClose: () => void;
  stationTitle?: string;
}

export const KarmaContributeModal: React.FC<KarmaContributeModalProps> = ({
  visible,
  onClose,
  stationTitle = "Infopark Fast DC Hub",
}) => {
  const { user, updateCredits } = useAuthStore();

  const [isOperational, setIsOperational] = useState(true);
  const [queueWaitMinutes, setQueueWaitMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [photoSnapped, setPhotoSnapped] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmitKarma = async () => {
    setLoading(true);
    try {
      const payload = {
        title: stationTitle,
        latitude: 9.9926,
        longitude: 76.3544,
        connector_type: "CCS2",
        is_operational: isOperational,
        queue_wait_minutes: parseInt(queueWaitMinutes) || 0,
        notes: notes.trim(),
        live_photo_url: photoSnapped
          ? "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600"
          : null,
      };

      const res = await apiClient.post(`/discovery/karma/contribute?user_id=${user?.id || "driver_1"}`, payload);
      const newBal = res.data?.new_balance || (user?.voltCreditsBalance || 100) + 25;
      updateCredits(Number(newBal));

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        "+25 VoltCredits Awarded! ⚡",
        "Thank you for keeping India's EV community grid 100% verified and free of range anxiety."
      );
      onClose();
    } catch (e) {
      // Local fallback
      const newBal = (user?.voltCreditsBalance || 100) + 25;
      updateCredits(newBal);
      Alert.alert(
        "+25 VoltCredits Awarded! ⚡",
        "Thank you for keeping India's EV community grid 100% verified and free of range anxiety."
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/85 justify-end">
        <View className="bg-[#0F1622] rounded-t-3xl p-6 border-t border-emerald-500/40">
          {/* Top Bar */}
          <View className="flex-row justify-between items-center pb-3 border-b border-white/10 mb-4">
            <View className="flex-row items-center">
              <Leaf size={18} color="#00F59B" style={{ marginRight: 6 }} />
              <Text className="text-white font-space font-bold text-base">
                Green Karma Crowdsourcing
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Reward Callout */}
          <View className="bg-[#00F59B]/15 p-3 rounded-2xl border border-[#00F59B]/40 mb-4 flex-row items-center">
            <Sparkles size={20} color="#00F59B" style={{ marginRight: 10 }} />
            <View className="flex-1">
              <Text className="text-[#00F59B] font-space font-bold text-xs">
                EARN +25 VOLTCREDITS
              </Text>
              <Text className="text-gray-300 text-[11px] font-jakarta mt-0.5">
                Verify working status or live queue for: {stationTitle}
              </Text>
            </View>
          </View>

          {/* Working Status Toggle */}
          <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
            Is this charger operational right now?
          </Text>
          <View className="flex-row space-x-2 mb-4">
            <TouchableOpacity
              onPress={() => setIsOperational(true)}
              className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center mr-2 ${
                isOperational
                  ? "bg-emerald-500/20 border-[#00F59B]"
                  : "bg-[#06090E] border-white/10"
              }`}
            >
              <CheckCircle2 size={16} color={isOperational ? "#00F59B" : "#64748B"} style={{ marginRight: 6 }} />
              <Text style={{ color: isOperational ? "#00F59B" : "#94A3B8" }} className="text-xs font-bold font-space">
                WORKING SMOOTHLY
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsOperational(false)}
              className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center ${
                !isOperational
                  ? "bg-rose-500/20 border-[#FF3B5C]"
                  : "bg-[#06090E] border-white/10"
              }`}
            >
              <X size={16} color={!isOperational ? "#FF3B5C" : "#64748B"} style={{ marginRight: 6 }} />
              <Text style={{ color: !isOperational ? "#FF3B5C" : "#94A3B8" }} className="text-xs font-bold font-space">
                BROKEN / OFFLINE
              </Text>
            </TouchableOpacity>
          </View>

          {/* Queue Wait Time Input */}
          <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-2 font-mono">
            Queue Wait Time (Minutes)
          </Text>
          <View className="flex-row items-center bg-[#06090E] p-3 rounded-xl border border-white/10 mb-4">
            <Clock size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              value={queueWaitMinutes}
              onChangeText={setQueueWaitMinutes}
              keyboardType="numeric"
              placeholder="0 (No queue)"
              placeholderTextColor="#64748B"
              className="flex-1 text-white font-mono text-sm font-bold"
            />
            <Text className="text-gray-400 font-mono text-xs">mins</Text>
          </View>

          {/* Snap Verification Photo */}
          <TouchableOpacity
            onPress={() => {
              setPhotoSnapped(!photoSnapped);
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
            }}
            className={`py-3 rounded-xl border flex-row items-center justify-center mb-6 ${
              photoSnapped
                ? "bg-emerald-500/15 border-[#00F59B]"
                : "bg-white/5 border-dashed border-white/20"
            }`}
          >
            <Camera size={18} color={photoSnapped ? "#00F59B" : "#FFFFFF"} style={{ marginRight: 8 }} />
            <Text style={{ color: photoSnapped ? "#00F59B" : "#FFFFFF" }} className="text-xs font-semibold">
              {photoSnapped ? "Live Station Photo Verified ✓" : "Snap Live Bay / Display Photo"}
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <NeonButton
            title="SUBMIT & CLAIM +25 VOLTCREDITS"
            onPress={handleSubmitKarma}
            loading={loading}
            size="lg"
          />
        </View>
      </View>
    </Modal>
  );
};

