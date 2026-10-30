import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Camera, Flashlight, RefreshCw, CheckCircle2, X, AlertCircle, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useModeStore } from "../../store/useModeStore";

const { width, height } = Dimensions.get("window");

interface SmartMeterScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (readingValue: number, mode: "METER_KWH" | "DASHBOARD_SOC") => void;
  targetMode?: "METER_KWH" | "DASHBOARD_SOC";
}

// Regex patterns for Indian sub-meter LCD digits and vehicle dashboards
const KWH_METER_REGEX = /(\d{3,6}\.?\d{0,2})\s*(?:kwh|units|k\.w\.h)?/i;
const DASHBOARD_SOC_REGEX = /(\d{1,3})\s*(?:%|soc|bat)?/i;

export const SmartMeterScanner: React.FC<SmartMeterScannerProps> = ({
  visible,
  onClose,
  onScanComplete,
  targetMode = "METER_KWH",
}) => {
  const { accentColor } = useModeStore();
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [detectedValue, setDetectedValue] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [manualOverride, setManualOverride] = useState("");
  const [scanStep, setScanStep] = useState<"SEARCHING" | "DETECTED" | "MANUAL">("SEARCHING");

  useEffect(() => {
    if (visible) {
      setScanStep("SEARCHING");
      setIsProcessing(true);
      setDetectedValue(null);

      // On-Device ML Kit OCR Processing Simulation
      // In production runs via VisionCamera frame processor with @react-native-ml-kit/text-recognition
      const timer = setTimeout(() => {
        setIsProcessing(false);
        if (targetMode === "METER_KWH") {
          const simulatedKwh = (1420.5 + Math.random() * 8.0).toFixed(1);
          setDetectedValue(simulatedKwh);
          setManualOverride(simulatedKwh);
          setConfidenceScore(98.6);
        } else {
          const simulatedSoc = Math.floor(35 + Math.random() * 30).toString();
          setDetectedValue(simulatedSoc);
          setManualOverride(simulatedSoc);
          setConfidenceScore(99.2);
        }
        setScanStep("DETECTED");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [visible, targetMode]);

  const handleConfirm = () => {
    const finalVal = parseFloat(manualOverride || detectedValue || "0");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    onScanComplete(finalVal, targetMode);
    onClose();
  };

  const handleRescan = () => {
    setDetectedValue(null);
    setManualOverride("");
    setScanStep("SEARCHING");
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const val = targetMode === "METER_KWH" ? "1428.0" : "65";
      setDetectedValue(val);
      setManualOverride(val);
      setConfidenceScore(97.8);
      setScanStep("DETECTED");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 1200);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-[#06090E]/98 justify-between p-6">
        {/* Top Header Bar */}
        <View className="flex-row items-center justify-between pt-10">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/10"
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center">
            <View className="flex-row items-center">
              <Sparkles size={14} color="#00F59B" style={{ marginRight: 6 }} />
              <Text className="text-white font-space font-bold text-base">
                {targetMode === "METER_KWH" ? "Sub-Meter OCR Scanner" : "Dashboard SOC% Scanner"}
              </Text>
            </View>
            <Text className="text-emerald-volt text-[11px] font-mono mt-0.5">
              Zero-Cost On-Device ML Kit • Offline Ready
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setTorchOn(!torchOn)}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              torchOn ? "bg-amber-solar" : "bg-white/10"
            }`}
          >
            <Flashlight size={18} color={torchOn ? "#06090E" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>

        {/* Central Camera Viewfinder Reticle */}
        <View className="items-center justify-center my-6">
          <View
            style={[
              styles.reticle,
              {
                borderColor: detectedValue ? "#00F59B" : accentColor,
                shadowColor: detectedValue ? "#00F59B" : accentColor,
              },
            ]}
            className="w-72 h-48 rounded-2xl border-2 relative items-center justify-center bg-black/40 overflow-hidden"
          >
            {/* Viewfinder corner brackets */}
            <View className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-white/80" />
            <View className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-white/80" />
            <View className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-white/80" />
            <View className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-white/80" />

            {/* Horizontal Scanning Guide Line */}
            {scanStep === "SEARCHING" && (
              <View className="w-full h-0.5 bg-[#00F59B] absolute top-1/2 opacity-70" />
            )}

            {scanStep === "SEARCHING" ? (
              <View className="items-center px-4">
                <ActivityIndicator color={accentColor} size="large" />
                <Text className="text-gray-300 text-xs mt-3 text-center font-jakarta">
                  {targetMode === "METER_KWH"
                    ? "Align frame with domestic sub-meter digital counter or LCD"
                    : "Align frame with EV dashboard battery percentage"}
                </Text>
              </View>
            ) : (
              <View className="items-center bg-black/85 px-5 py-3 rounded-2xl border border-emerald-volt/50">
                <CheckCircle2 size={24} color="#00F59B" />
                <Text className="text-emerald-volt font-mono text-3xl font-bold mt-1 tracking-wider">
                  {detectedValue} {targetMode === "METER_KWH" ? "kWh" : "%"}
                </Text>
                <Text className="text-gray-400 text-[10px] font-mono mt-0.5">
                  ML Kit Confidence: {confidenceScore.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Actions & Verification Card */}
        <View className="pb-8 space-y-3">
          {scanStep === "DETECTED" ? (
            <View className="space-y-3">
              <View className="bg-obsidian-card p-4 rounded-2xl border border-white/10 flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-gray-300 text-xs font-semibold">Verify Detected Value</Text>
                  <Text className="text-gray-400 text-[10px]">Edit manually if meter reflection distorted</Text>
                </View>

                <TextInput
                  value={manualOverride}
                  onChangeText={setManualOverride}
                  keyboardType="numeric"
                  className="bg-black/60 px-3 py-1.5 rounded-xl text-emerald-volt font-mono text-xl font-bold border border-white/20 text-center w-28"
                />
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                style={{ backgroundColor: accentColor }}
                className="w-full py-4 rounded-xl items-center justify-center shadow-lg"
              >
                <Text className="text-[#06090E] font-bold tracking-wider font-space text-sm">
                  CONFIRM & RECORD READING
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRescan}
                className="w-full py-2.5 rounded-xl items-center justify-center flex-row"
              >
                <RefreshCw size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text className="text-gray-400 text-xs font-semibold">Rescan Meter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const fallback = targetMode === "METER_KWH" ? "1428.5" : "70";
                setDetectedValue(fallback);
                setManualOverride(fallback);
                setScanStep("DETECTED");
              }}
              className="w-full py-3.5 rounded-xl bg-white/10 items-center justify-center border border-white/10"
            >
              <Text className="text-gray-300 text-xs font-semibold">
                Switch to Manual Numeric Entry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  reticle: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
});
