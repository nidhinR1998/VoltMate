import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Zap,
  ShieldCheck,
  ArrowRight,
  Check,
  Tag,
  Car,
  Home,
  MapPin,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useSessionStore } from "../../store/useSessionStore";
import { useModeStore } from "../../store/useModeStore";

const { width } = Dimensions.get("window");

const ARRIVAL_SLOTS = [
  { id: "now", label: "Now (Immediate)", time: "Immediate" },
  { id: "slot1", label: "05:00 PM", time: "05:00 PM" },
  { id: "slot2", label: "05:30 PM", time: "05:30 PM" },
  { id: "slot3", label: "06:00 PM", time: "06:00 PM" },
  { id: "slot4", label: "07:00 PM", time: "07:00 PM" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function BookingSheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accentColor } = useModeStore();
  const { startSession } = useSessionStore();

  const stationId = (params.stationId as string) || "node-1";
  const stationTitle = "Lotus Greens Villa 15A Socket";
  const society = "Lotus Greens Enclave, Kakkanad";

  const [bookingType, setBookingType] = useState<"ADHOC" | "REGULAR_BUDDY">("ADHOC");
  const [selectedSlot, setSelectedSlot] = useState("now");
  const [durationHours, setDurationHours] = useState(2);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [loading, setLoading] = useState(false);

  // Financial calculations
  const unitRate = 8.5;
  const estimatedKwh = durationHours * 3.3; // 3.3 kW socket
  const baseEnergyCost = estimatedKwh * unitRate;
  const parkingFee = 15.0 * durationHours;

  const subtotal = baseEnergyCost + parkingFee;
  // 15% discount for Regular Buddy Commuter Pass
  const discountAmount = bookingType === "REGULAR_BUDDY" ? subtotal * 0.15 : 0;
  const totalCost = (subtotal - discountAmount).toFixed(2);

  const toggleDay = (day: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleConfirmBooking = () => {
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Initialize session state
    startSession({
      bookingId: `VM-BOOK-${Date.now().toString().slice(-4)}`,
      hostName: "Arun Kumar (Verified Host)",
      hostPhone: "+91 98460 12345",
      vehicleModel: "Tata Nexon EV Max",
      batteryCapacityKwh: 40.5,
      initialSoc: 38.0,
    });

    setTimeout(() => {
      setLoading(false);
      // PUSH to gate-pass so Back button pops cleanly
      router.push({
        pathname: "/(driver)/gate-pass",
        params: {
          bookingId: `VM-BOOK-${Date.now().toString().slice(-4)}`,
          stationTitle,
          society,
          gateCode: "#849-201",
          slotTime: selectedSlot === "now" ? "Immediate" : selectedSlot,
          totalAmount: totalCost,
        },
      } as any);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Bar with back button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Book Charging Slot</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Station Summary Card */}
        <View style={styles.stationCard}>
          <View style={styles.stationTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stationName}>{stationTitle}</Text>
              <View style={styles.locationRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.locationText}>{society}</Text>
              </View>
            </View>
            <View style={styles.ratePill}>
              <Text style={styles.rateText}>₹{unitRate}/kWh</Text>
            </View>
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specBadge}>
              <Zap size={12} color="#00F59B" />
              <Text style={styles.specBadgeText}>3.3 kW 15A Socket</Text>
            </View>
            <View style={styles.specBadge}>
              <ShieldCheck size={12} color="#00F59B" />
              <Text style={styles.specBadgeText}>MyGate Fast Pass</Text>
            </View>
          </View>
        </View>

        {/* Booking Type Toggle: Ad-Hoc vs Regular Buddy */}
        <Text style={styles.sectionHeading}>Booking Plan</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBookingType("ADHOC");
            }}
            style={[
              styles.typePill,
              bookingType === "ADHOC" && styles.typePillActive,
            ]}
          >
            <Text
              style={[
                styles.typePillText,
                bookingType === "ADHOC" && styles.typePillTextActive,
              ]}
            >
              Ad-Hoc Slot (Single)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBookingType("REGULAR_BUDDY");
            }}
            style={[
              styles.typePill,
              bookingType === "REGULAR_BUDDY" && styles.typePillActiveBuddy,
            ]}
          >
            <View style={styles.buddyBadgeWrap}>
              <Text
                style={[
                  styles.typePillText,
                  bookingType === "REGULAR_BUDDY" && { color: "#FFB800", fontWeight: "700" },
                ]}
              >
                Buddy Pass (15% OFF)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Regular Buddy Commuter Schedule */}
        {bookingType === "REGULAR_BUDDY" && (
          <View style={styles.buddyCard}>
            <View style={styles.buddyHeader}>
              <Sparkles size={16} color="#FFB800" />
              <Text style={styles.buddyTitle}>Mon–Fri Commuter Schedule</Text>
            </View>
            <Text style={styles.buddySub}>
              Reserve your recurring plug every workday. Saves 15% on monthly EV charging compared to public DC fast hubs.
            </Text>

            <View style={styles.daysRow}>
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Arrival Time Slot Selector */}
        <Text style={styles.sectionHeading}>Estimated Arrival Time</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slotsScroll}
        >
          {ARRIVAL_SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            return (
              <TouchableOpacity
                key={slot.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSlot(slot.id);
                }}
                style={[
                  styles.slotPill,
                  isSelected && styles.slotPillSelected,
                ]}
              >
                <Clock
                  size={14}
                  color={isSelected ? "#00F59B" : "#64748B"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.slotPillText,
                    isSelected && styles.slotPillTextSelected,
                  ]}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Charging Duration Picker */}
        <Text style={styles.sectionHeading}>Charging Duration</Text>
        <View style={styles.durationRow}>
          {[1, 2, 3, 4].map((hrs) => {
            const isSelected = durationHours === hrs;
            return (
              <TouchableOpacity
                key={hrs}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDurationHours(hrs);
                }}
                style={[
                  styles.durationCard,
                  isSelected && styles.durationCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.durationHours,
                    isSelected && { color: "#00F59B" },
                  ]}
                >
                  {hrs}h
                </Text>
                <Text style={styles.durationKwh}>~{(hrs * 3.3).toFixed(1)} kWh</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.priceHeading}>FAIR TARIFF BREAKDOWN</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceItemLabel}>
              Energy ({estimatedKwh.toFixed(1)} kWh @ ₹{unitRate}/u)
            </Text>
            <Text style={styles.priceItemVal}>₹{baseEnergyCost.toFixed(2)}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceItemLabel}>
              Host Bay Parking ({durationHours} hrs)
            </Text>
            <Text style={styles.priceItemVal}>₹{parkingFee.toFixed(2)}</Text>
          </View>

          {bookingType === "REGULAR_BUDDY" && (
            <View style={styles.priceRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Tag size={13} color="#FFB800" />
                <Text style={[styles.priceItemLabel, { color: "#FFB800" }]}>
                  Buddy Pass Discount (15%)
                </Text>
              </View>
              <Text style={[styles.priceItemVal, { color: "#FFB800" }]}>
                -₹{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.priceDivider} />

          <View style={styles.priceRowTotal}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.totalValue}>₹{totalCost}</Text>
              <Text style={styles.zeroFeeNote}>0% platform fee • Direct UPI</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleConfirmBooking}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.confirmBtn}
        >
          {loading ? (
            <ActivityIndicator color="#06090E" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                CONFIRM SLOT & GET DIGITAL GATE PASS
              </Text>
              <ArrowRight size={18} color="#06090E" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F1622",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stationCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    marginBottom: 20,
  },
  stationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  ratePill: {
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateText: {
    color: "#00F59B",
    fontSize: 12,
    fontWeight: "800",
  },
  specsRow: {
    flexDirection: "row",
    gap: 8,
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  specBadgeText: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#CBD5E1",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#0F1622",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  typePillActive: {
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.4)",
  },
  typePillActiveBuddy: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.4)",
  },
  typePillText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  typePillTextActive: {
    color: "#00F59B",
    fontWeight: "700",
  },
  buddyBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  buddyCard: {
    backgroundColor: "rgba(255, 184, 0, 0.07)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
    padding: 14,
    marginBottom: 18,
  },
  buddyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  buddyTitle: {
    color: "#FFB800",
    fontWeight: "700",
    fontSize: 13,
  },
  buddySub: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0F1622",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dayCircleSelected: {
    backgroundColor: "#FFB800",
    borderColor: "#FFB800",
  },
  dayText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  dayTextSelected: {
    color: "#06090E",
    fontWeight: "800",
  },
  slotsScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1622",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  slotPillSelected: {
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    borderColor: "#00F59B",
  },
  slotPillText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  slotPillTextSelected: {
    color: "#00F59B",
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  durationCard: {
    flex: 1,
    backgroundColor: "#0F1622",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  durationCardSelected: {
    borderColor: "#00F59B",
    backgroundColor: "rgba(0, 245, 155, 0.08)",
  },
  durationHours: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  durationKwh: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: "#0F1622",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  priceHeading: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceItemLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  priceItemVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  priceDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  priceRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00F59B",
  },
  zeroFeeNote: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 18,
    paddingVertical: 15,
    gap: 8,
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnText: {
    color: "#06090E",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
