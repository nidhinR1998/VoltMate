import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  Route,
  Navigation,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  Filter,
  MapPin,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../../components/ui/GlassCard";
import { RadarPulsePin } from "../../components/animations/RadarPulsePin";
import { Badge } from "../../components/ui/Badge";
import { KarmaContributeModal } from "../../components/ui/KarmaContributeModal";
import { useModeStore } from "../../store/useModeStore";
import { apiClient } from "../../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FILTER_PILLS = [
  "Available Now",
  "P2P Home Hosts",
  "Public DC Fast",
  "15A Socket (3.3kW)",
  "Type-2 (7.4kW)",
  "2-Wheeler Friendly",
  "Covered Parking",
  "Instant Book",
];

export interface NodeItem {
  id: string;
  title: string;
  type: "P2P_AVAILABLE" | "P2P_BUSY" | "PUBLIC_DC";
  nodeType: string;
  powerKw: number;
  pricePerKwh: number;
  distanceKm: number;
  host: string;
  rating: number;
  society: string;
  address: string;
  instantBook: boolean;
  amenities: string[];
  lat: number;
  lng: number;
}

const SAMPLE_RADAR_NODES: NodeItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Lotus Greens Villa 15A Socket",
    type: "P2P_AVAILABLE",
    nodeType: "P2P Home",
    powerKw: 3.3,
    pricePerKwh: 8.5,
    distanceKm: 0.8,
    host: "Arun Kumar (Verified Host)",
    rating: 4.9,
    society: "Lotus Greens Enclave",
    address: "Villa 14, Kakkanad",
    instantBook: true,
    amenities: ["CCTV", "WASHROOM", "COVERED_PARKING"],
    lat: 9.9976,
    lng: 76.3584,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    title: "Infopark Phase 2 Fast DC Hub",
    type: "PUBLIC_DC",
    nodeType: "Public DC Fast",
    powerKw: 60.0,
    pricePerKwh: 18.0,
    distanceKm: 1.9,
    host: "VoltMate Public Grid",
    rating: 4.8,
    society: "Infopark SEZ",
    address: "Expressway Entry, Kochi",
    instantBook: false,
    amenities: ["CAFE", "WASHROOM", "REST_AREA"],
    lat: 10.0046,
    lng: 76.3464,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    title: "Skyline Imperial Tower B Wallbox",
    type: "P2P_AVAILABLE",
    nodeType: "Apartment RWA",
    powerKw: 7.4,
    pricePerKwh: 11.0,
    distanceKm: 2.4,
    host: "Deepa Nair (Society Rep)",
    rating: 5.0,
    society: "Skyline Imperial RWA",
    address: "Basement Pillar 42, Edappally",
    instantBook: true,
    amenities: ["CCTV", "ELEVATOR", "SECURITY_GUARD"],
    lat: 9.9836,
    lng: 76.3654,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    title: "Chilavannoor Waterside 15A Plug",
    type: "P2P_BUSY",
    nodeType: "P2P Home",
    powerKw: 3.3,
    pricePerKwh: 8.0,
    distanceKm: 3.1,
    host: "Mathew V.",
    rating: 4.7,
    society: "Chilavannoor Waterfront",
    address: "Lane 4, Kadavanthra",
    instantBook: true,
    amenities: ["COVERED_PARKING", "WIFI"],
    lat: 9.9716,
    lng: 76.3324,
  },
];

export default function MapRadarScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();

  const [activeFilter, setActiveFilter] = useState("Available Now");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<NodeItem>(SAMPLE_RADAR_NODES[0]);
  const [nodes, setNodes] = useState<NodeItem[]>(SAMPLE_RADAR_NODES);
  const [drawerSnapped, setDrawerSnapped] = useState<"COLLAPSED" | "EXPANDED">("COLLAPSED");
  const [showKarmaModal, setShowKarmaModal] = useState(false);

  // Filter application
  const filteredNodes = nodes.filter((node) => {
    if (activeFilter === "Available Now" && node.type === "P2P_BUSY") return false;
    if (activeFilter === "P2P Home Hosts" && node.type === "PUBLIC_DC") return false;
    if (activeFilter === "Public DC Fast" && node.type !== "PUBLIC_DC") return false;
    if (activeFilter === "15A Socket (3.3kW)" && node.powerKw > 3.3) return false;
    if (activeFilter === "Type-2 (7.4kW)" && node.powerKw !== 7.4) return false;
    if (activeFilter === "Instant Book" && !node.instantBook) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        node.title.toLowerCase().includes(q) ||
        node.society.toLowerCase().includes(q) ||
        node.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleFilterToggle = (pill: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveFilter(pill === activeFilter ? "" : pill);
  };

  const handleSelectNode = (node: NodeItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedNode(node);
  };

  return (
    <View className="flex-1 bg-[#06090E] relative">
      {/* 1. Ola Maps / OpenFreeMap Dark Vector Map Canvas Simulation */}
      <View className="flex-1 bg-[#090D14] items-center justify-center relative overflow-hidden">
        {/* Dark map street grid simulation vector lines */}
        <View style={StyleSheet.absoluteFill} className="opacity-25 pointer-events-none">
          <View className="w-full h-full border-b border-t border-white/5 my-16" />
          <View className="w-full h-full border-l border-r border-white/5 mx-16" />
          <View className="w-full h-full border-b border-t border-emerald-500/5 my-32" />
        </View>

        {/* User Current Location GPS Pulse Beacon */}
        <View className="w-4 h-4 rounded-full bg-[#00E5FF] items-center justify-center z-10 shadow-lg">
          <View className="w-10 h-10 rounded-full bg-[#00E5FF]/25 absolute animate-ping" />
        </View>

        {/* Radar Map Pins with Breathing Sonar and Kw Chips */}
        {/* Pin 1: Lotus Greens */}
        <TouchableOpacity
          onPress={() => handleSelectNode(SAMPLE_RADAR_NODES[0])}
          style={{ position: "absolute", top: "34%", left: "26%" }}
          className="z-20"
        >
          <RadarPulsePin
            type="P2P_AVAILABLE"
            powerKw={3.3}
            pricePerKwh={8.5}
          />
        </TouchableOpacity>

        {/* Pin 2: Infopark DC Fast */}
        <TouchableOpacity
          onPress={() => handleSelectNode(SAMPLE_RADAR_NODES[1])}
          style={{ position: "absolute", top: "42%", right: "20%" }}
          className="z-20"
        >
          <RadarPulsePin
            type="PUBLIC_DC"
            powerKw={60}
          />
        </TouchableOpacity>

        {/* Pin 3: Skyline Imperial Type-2 */}
        <TouchableOpacity
          onPress={() => handleSelectNode(SAMPLE_RADAR_NODES[2])}
          style={{ position: "absolute", bottom: "36%", left: "54%" }}
          className="z-20"
        >
          <RadarPulsePin
            type="P2P_AVAILABLE"
            powerKw={7.4}
            pricePerKwh={11}
          />
        </TouchableOpacity>

        {/* Pin 4: Chilavannoor (Busy with orbiting amber ring) */}
        <TouchableOpacity
          onPress={() => handleSelectNode(SAMPLE_RADAR_NODES[3])}
          style={{ position: "absolute", bottom: "46%", left: "18%" }}
          className="z-20"
        >
          <RadarPulsePin
            type="P2P_BUSY"
            powerKw={3.3}
            pricePerKwh={8.0}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Top Floating Destination Search Bar & Highway Route Button */}
      <View className="absolute top-4 left-4 right-4 z-40 space-y-3">
        <GlassCard className="flex-row items-center py-2.5 px-3 border border-white/10 shadow-2xl">
          <Search size={18} color="#00F59B" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search society, tech park or pillar..."
            placeholderTextColor="#64748B"
            className="flex-1 text-white text-xs font-jakarta"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="mr-2">
              <Text className="text-gray-400 text-xs">✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/(driver)/route-planner")}
            className="bg-[#00F59B]/15 px-3 py-1.5 rounded-xl border border-[#00F59B]/40 flex-row items-center shadow-sm"
          >
            <Route size={14} color="#00F59B" style={{ marginRight: 5 }} />
            <Text className="text-[#00F59B] text-xs font-bold font-mono">Route</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Horizontal Scrollable Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row space-x-2"
        >
          {FILTER_PILLS.map((pill, idx) => {
            const isActive = activeFilter === pill;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleFilterToggle(pill)}
                className={`px-3 py-1.5 rounded-full border mr-1.5 ${
                  isActive
                    ? "bg-[#00F59B] border-[#00F59B]"
                    : "bg-[#0F1622]/90 border-white/10"
                }`}
              >
                <Text
                  style={{ color: isActive ? "#06090E" : "#E2E8F0" }}
                  className="text-xs font-semibold font-jakarta"
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Bottom Draggable Sheet Card (Gorhom-style Drawer) */}
      <View className="absolute bottom-5 left-4 right-4 z-40">
        <GlassCard className="p-4 border-2 border-[#00F59B]/50 shadow-2xl">
          {/* Drawer Handle */}
          <TouchableOpacity
            onPress={() =>
              setDrawerSnapped(drawerSnapped === "COLLAPSED" ? "EXPANDED" : "COLLAPSED")
            }
            className="items-center py-1 -mt-2 mb-2"
          >
            <View className="w-10 h-1 rounded-full bg-white/20" />
          </TouchableOpacity>

          {/* Node Meta Header */}
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center space-x-2 mb-1.5">
                <Badge
                  type="power"
                  label={`${selectedNode.powerKw} kW`}
                  variant={selectedNode.powerKw > 22 ? "cyan" : "emerald"}
                />
                <Badge type="rating" label={`${selectedNode.rating} ★`} variant="amber" />
                {selectedNode.instantBook && (
                  <Badge type="verified" label="Instant Book" variant="emerald" />
                )}
              </View>

              <Text className="text-white font-space font-bold text-base">
                {selectedNode.title}
              </Text>
              <Text className="text-gray-400 font-jakarta text-xs mt-0.5">
                {selectedNode.society} • {selectedNode.distanceKm} km away
              </Text>
            </View>

            {/* Price Chip */}
            <View className="items-end bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <Text className="text-[#00F59B] font-mono text-xl font-bold">
                ₹{selectedNode.pricePerKwh.toFixed(2)}
              </Text>
              <Text className="text-gray-400 text-[10px] font-mono">per kWh unit</Text>
            </View>
          </View>

          {/* Expanded Drawer Info */}
          {drawerSnapped === "EXPANDED" && (
            <View className="pt-2 pb-1 space-y-2 border-t border-white/10 mt-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Host / Contact</Text>
                <Text className="text-white font-semibold text-xs">{selectedNode.host}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Hardware Type</Text>
                <Text className="text-emerald-volt font-mono text-xs">{selectedNode.nodeType}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Amenities</Text>
                <Text className="text-white text-xs">{selectedNode.amenities.join(" • ")}</Text>
              </View>
            </View>
          )}

          {/* Reserve Slot Action CTA */}
          <View className="flex-row space-x-2 mt-3">
            {selectedNode.type === "PUBLIC_DC" && (
              <TouchableOpacity
                onPress={() => setShowKarmaModal(true)}
                className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-3.5 rounded-xl flex-row items-center justify-center mr-2"
              >
                <Sparkles size={16} color="#00F59B" />
                <Text className="text-[#00F59B] font-space font-bold text-xs ml-1.5">
                  +25 Karma
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(driver)/booking-sheet",
                  params: { nodeId: selectedNode.id, title: selectedNode.title },
                })
              }
              style={{ backgroundColor: accentColor }}
              className="flex-1 py-3.5 rounded-xl flex-row items-center justify-center shadow-lg"
            >
              <Text className="text-[#06090E] font-bold text-xs tracking-wider font-space mr-2 uppercase">
                RESERVE CHARGING SLOT
              </Text>
              <ArrowRight size={15} color="#06090E" />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Crowdsourced Green Karma Contribution Modal */}
      <KarmaContributeModal
        visible={showKarmaModal}
        onClose={() => setShowKarmaModal(false)}
        stationTitle={selectedNode.title}
      />
    </View>
  );
}
