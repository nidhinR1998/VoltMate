import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, Car, Check, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { apiClient } from "../../services/api";

interface BookingRequest {
  id: string;
  driverName: string;
  driverRating: number;
  vehicleModel: string;
  vehicleReg: string;
  scheduledTime: string;
  estimatedEarnings: number;
  secondsRemaining: number;
  estimatedKwh: number;
}

const INITIAL_REQUESTS: BookingRequest[] = [
  {
    id: "req_1",
    driverName: "James Carter",
    driverRating: 4.9,
    vehicleModel: "Tesla Model X",
    vehicleReg: "EV-2026-X",
    scheduledTime: "Today • 16:30 - 18:00",
    estimatedEarnings: 18.5,
    estimatedKwh: 22.0,
    secondsRemaining: 240,
  },
  {
    id: "req_2",
    driverName: "Sophie Laurent",
    driverRating: 4.8,
    vehicleModel: "Hyundai IONIQ 5",
    vehicleReg: "LDN-884-E",
    scheduledTime: "Today • 19:00 - 20:30",
    estimatedEarnings: 14.0,
    estimatedKwh: 18.5,
    secondsRemaining: 175,
  },
];

export default function IncomingRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<BookingRequest[]>(INITIAL_REQUESTS);

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
    } catch {}

    setRequests(requests.filter((r) => r.id !== id));
    Alert.alert(
      accept ? "Booking Accepted!" : "Booking Declined",
      accept
        ? "Digital Gate Pass & 6-digit access code have been issued to the driver."
        : "Slot has been released back to the station map."
    );
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} color="#111714" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Booking Requests</Text>
            <Text style={styles.subtitle}>
              Approve or decline incoming station reservations
            </Text>
          </View>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Clock size={44} color="#757F7A" />
            <Text style={styles.emptyTitle}>All Requests Handled</Text>
            <Text style={styles.emptySub}>
              New reservation requests will appear here with a 5-minute confirmation timer.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {requests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.driverName}>{req.driverName}</Text>
                    <Text style={styles.ratingText}>
                      ★ {req.driverRating} • Verified EV Driver
                    </Text>
                  </View>

                  <View style={styles.timerPill}>
                    <Text style={styles.timerText}>
                      ⏱ {formatCountdown(req.secondsRemaining)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsBox}>
                  <View style={styles.detailRow}>
                    <Car size={15} color="#757F7A" />
                    <Text style={styles.detailText}>
                      {req.vehicleModel} ({req.vehicleReg})
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={15} color="#757F7A" />
                    <Text style={styles.detailText}>{req.scheduledTime}</Text>
                  </View>
                  <View style={styles.payoutRow}>
                    <Text style={styles.energyLabel}>
                      Est. Delivery (~{req.estimatedKwh} kWh)
                    </Text>
                    <Text style={styles.payoutAmount}>
                      ${req.estimatedEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() => handleRespond(req.id, false)}
                    style={styles.declineBtn}
                  >
                    <X size={16} color="#DC2626" />
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRespond(req.id, true)}
                    style={styles.acceptBtn}
                  >
                    <Check size={16} color="#111714" strokeWidth={2.5} />
                    <Text style={styles.acceptText}>Accept & Issue Pass</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F4F3",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9E6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111714",
  },
  subtitle: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECEA",
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111714",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#757F7A",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECEA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111714",
  },
  ratingText: {
    fontSize: 12,
    color: "#757F7A",
    marginTop: 2,
    fontWeight: "600",
  },
  timerPill: {
    backgroundColor: "#151C18",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  timerText: {
    color: "#05E660",
    fontSize: 12,
    fontWeight: "800",
  },
  detailsBox: {
    backgroundColor: "#F7F9F8",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EBF0ED",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#111714",
    fontSize: 13,
    fontWeight: "600",
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E6EAE8",
  },
  energyLabel: {
    fontSize: 12,
    color: "#757F7A",
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111714",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 22,
    gap: 6,
  },
  declineText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05E660",
    paddingVertical: 13,
    borderRadius: 22,
    gap: 6,
  },
  acceptText: {
    color: "#111714",
    fontWeight: "800",
    fontSize: 13,
  },
});
