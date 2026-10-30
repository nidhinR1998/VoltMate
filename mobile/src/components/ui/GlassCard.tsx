import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  glowBorderColor?: string;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  glowBorderColor,
  className = "",
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        glowBorderColor ? { borderColor: glowBorderColor } : null,
        style,
      ]}
      className={`rounded-2xl p-4 bg-[#0F1622]/90 border border-white/10 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});

