import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Check, Sparkles, Receipt, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { useAuthStore } from "../../store/useAuthStore";

interface Transaction {
  id: string;
  title: string;
  driver: string;
  amountInr: number;
  date: string;
  type: "CREDIT" | "DEBIT";
  utr: string;
  energyKwh: number;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_1",
    title: "Driver Charge Settlement (Nexon EV Max)",
    driver: "Karthik M. (Verified RC)",
    amountInr: 95.20,
    energyKwh: 6.6,
    date: "Today, 04:35 PM",
    type: "CREDIT",
    utr: "UTR492019482910",
  },
  {
    id: "tx_2",
    title: "Driver Charge Settlement (Ola S1 Pro)",
    driver: "Sanjay R.",
    amountInr: 45.00,
    energyKwh: 3.5,
    date: "Yesterday, 07:15 PM",
    type: "CREDIT",
    utr: "UTR938472910382",
  },
  {
    id: "tx_3",
    title: "Direct UPI Payout to Host VPA",
    driver: "Auto-Settlement",
    amountInr: -500.00,
    energyKwh: 0,
    date: "28 Oct 2026",
    type: "DEBIT",
    utr: "PAYOUT_ICICI_829",
  },
];

export default function HostWalletScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [upiVpa, setUpiVpa] = useState(user?.upiId || "host.arun@okaxis");
  const [isEditingVpa, setIsEditingVpa] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const voltCredits = user?.voltCreditsBalance || 1860.0;

  const handleSaveVpa = () => {
    if (!upiVpa.includes("@")) {
      Alert.alert("Invalid VPA", "Please enter a valid Indian UPI VPA (e.g. name@okaxis or name@upi).");
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateUser({ upiId: upiVpa.trim() });
    setIsEditingVpa(false);
    Alert.alert("VPA Saved ⚡", "Drivers will deep-link directly into this UPI address for ₹0 gateway fee settlements.");
  };

  const handleWithdrawCredits = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert(
      "Instant UPI Payout Dispatched",
      `₹500 has been transferred directly to ${upiVpa}. UTR Reference: UTR_${Date.now().toString().slice(-8)}`
    );
  };

  const handleConvertToChargeCredits = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert(
      "VoltCredits Converted",
      "500 VoltCredits have been allocated for free charging across the community driver network!"
    );
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
              VoltCredits & Payouts
            </Text>
            <Text className="text-amber-solar font-jakarta text-xs">
              Zero Platform Gateway Fee Mode
            </Text>
          </View>
        </View>

        {/* 1. Main Balance Card */}
        <GlassCard className="mb-6 border-2 border-amber-solar/40 p-5 shadow-2xl">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-gray-400 text-xs font-mono uppercase tracking-wider">
              AVAILABLE VOLTCREDITS
            </Text>
            <ShieldCheck size={16} color="#FFB800" />
          </View>

          <View className="flex-row items-baseline mb-4">
            <Text className="text-4xl font-space font-bold text-white">
              ⚡ {voltCredits.toFixed(0)}
            </Text>
            <Text className="text-amber-solar font-mono text-sm ml-2 font-bold">
              (≈ ₹{voltCredits.toFixed(2)})
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleWithdrawCredits}
              className="flex-1 py-3 bg-amber-solar rounded-xl items-center flex-row justify-center mr-2 shadow-lg"
            >
              <ArrowUpRight size={16} color="#06090E" style={{ marginRight: 4 }} />
              <Text className="text-[#06090E] font-bold text-xs font-space uppercase">
                WITHDRAW TO UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConvertToChargeCredits}
              className="flex-1 py-3 bg-[#06090E] rounded-xl border border-white/20 items-center flex-row justify-center"
            >
              <RefreshCw size={14} color="#00F59B" style={{ marginRight: 5 }} />
              <Text className="text-white font-bold text-xs font-space uppercase">
                USE TO CHARGE
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* 2. Direct UPI Settlement VPA Card */}
        <GlassCard className="mb-6 p-4 border border-white/10">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider font-mono">
              Host Settlement UPI VPA
            </Text>
            <TouchableOpacity onPress={() => setIsEditingVpa(!isEditingVpa)}>
              <Text className="text-amber-solar text-xs font-bold font-jakarta">
                {isEditingVpa ? "Cancel" : "Edit VPA"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingVpa ? (
            <View className="flex-row items-center space-x-2 mt-2">
              <TextInput
                value={upiVpa}
                onChangeText={setUpiVpa}
                placeholder="e.g. host.arun@okaxis"
                placeholderTextColor="#64748B"
                className="flex-1 bg-[#06090E] p-3 rounded-xl border border-white/10 text-white font-mono text-xs"
              />
              <TouchableOpacity
                onPress={handleSaveVpa}
                className="bg-amber-solar px-4 py-3 rounded-xl"
              >
                <Text className="text-[#06090E] font-bold text-xs font-space">Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-[#06090E] p-3 rounded-xl border border-white/5 flex-row justify-between items-center mt-1">
              <Text className="text-[#00F59B] font-mono text-sm font-bold">
                {upiVpa}
              </Text>
              <ShieldCheck size={16} color="#00F59B" />
            </View>
          )}

          <Text className="text-gray-400 text-[11px] mt-2 font-jakarta">
            Drivers deep-link directly into GPay/PhonePe to pay your VPA without gateway deductions.
          </Text>
        </GlassCard>

        {/* 3. Transaction History Ledger */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-300 font-bold text-xs uppercase tracking-wider font-mono">
            Settlement Ledger (Quick Ride Style)
          </Text>
          <Receipt size={14} color="#64748B" />
        </View>

        <View className="space-y-2 mb-6">
          {transactions.map((tx) => (
            <View
              key={tx.id}
              className="bg-[#0F1622] p-3.5 rounded-2xl border border-white/5 flex-row justify-between items-center mb-2"
            >
              <View className="flex-1 mr-3">
                <Text className="text-white font-space font-bold text-xs">
                  {tx.title}
                </Text>
                <Text className="text-gray-400 font-jakarta text-[11px] mt-0.5">
                  {tx.date} • {tx.utr}
                </Text>
              </View>

              <Text
                style={{ color: tx.amountInr > 0 ? "#00F59B" : "#FF3B5C" }}
                className="font-mono text-sm font-bold"
              >
                {tx.amountInr > 0 ? `+₹${tx.amountInr.toFixed(2)}` : `-₹${Math.abs(tx.amountInr).toFixed(2)}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
