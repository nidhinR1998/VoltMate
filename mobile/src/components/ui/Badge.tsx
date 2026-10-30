import React from "react";
import { View, Text } from "react-native";
import { ShieldCheck, Star, Zap } from "lucide-react-native";

interface BadgeProps {
  type: "verified" | "rating" | "power" | "connector" | "status";
  label: string;
  variant?: "emerald" | "amber" | "cyan" | "crimson";
}

export const Badge: React.FC<BadgeProps> = ({ type, label, variant = "emerald" }) => {
  const colorMap = {
    emerald: { bg: "bg-emerald-500/10", border: "border-[#00F59B]/40", text: "text-[#00F59B]" },
    amber: { bg: "bg-amber-500/10", border: "border-[#FFB800]/40", text: "text-[#FFB800]" },
    cyan: { bg: "bg-cyan-500/10", border: "border-[#00E5FF]/40", text: "text-[#00E5FF]" },
    crimson: { bg: "bg-rose-500/10", border: "border-[#FF3B5C]/40", text: "text-[#FF3B5C]" },
  };

  const scheme = colorMap[variant];

  return (
    <View
      className={`flex-row items-center px-2.5 py-1 rounded-full border ${scheme.bg} ${scheme.border}`}
    >
      {type === "verified" && (
        <ShieldCheck size={13} color="#00F59B" style={{ marginRight: 4 }} />
      )}
      {type === "rating" && (
        <Star size={13} color="#FFB800" fill="#FFB800" style={{ marginRight: 4 }} />
      )}
      {type === "power" && (
        <Zap size={13} color="#00E5FF" style={{ marginRight: 4 }} />
      )}
      <Text className={`text-xs font-semibold ${scheme.text}`}>{label}</Text>
    </View>
  );
};

