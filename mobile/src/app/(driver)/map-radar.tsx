import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import MapLibreGL from "@maplibre/maplibre-react-native";
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
  Home,
  Sliders,
  Layers,
  CheckCircle2,
  Phone,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useModeStore } from "../../store/useModeStore";

// Initialize MapLibre with open vector tiles
MapLibreGL.setAccessToken(null);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

const CARTO_DARK_MATTER =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
  reviewsCount: number;
  society: string;
  address: string;
  instantBook: boolean;
  amenities: string[];
  lat: number;
  lng: number;
  busyWaitMins?: number;
  socketType: string;
}

const KOCHI_NODES: NodeItem[] = [
  {
    id: "node-1",
    title: "Lotus Greens Villa 15A Socket",
    type: "P2P_AVAILABLE",
    nodeType: "P2P Home Plug",
    powerKw: 3.3,
    pricePerKwh: 8.5,
    distanceKm: 0.8,
    host: "Arun Kumar (Verified Host)",
    rating: 4.9,
    reviewsCount: 38,
    society: "Lotus Greens Enclave",
    address: "Villa 14, Kakkanad, Kochi",
    instantBook: true,
    amenities: ["CCTV", "WASHROOM", "COVERED_PARKING"],
    lat: 9.9976,
    lng: 76.3584,
    socketType: "15A 3-Pin Domestic",
  },
  {
    id: "node-2",
    title: "Infopark Phase 2 DC Fast Hub",
    type: "PUBLIC_DC",
    nodeType: "Public DC Fast",
    powerKw: 60.0,
    pricePerKwh: 16.0,
    distanceKm: 1.4,
    host: "VoltMate Public Grid",
    rating: 4.8,
    reviewsCount: 142,
    society: "Infopark SEZ Expressway",
    address: "Kakkanad South Entry, Kochi",
    instantBook: false,
    amenities: ["CAFE", "WASHROOM", "FAST_FOOD"],
    lat: 10.008,
    lng: 76.362,
    socketType: "CCS2 Fast (60kW)",
  },
  {
    id: "node-3",
    title: "Prestige Cyber Green Wallbox",
    type: "P2P_AVAILABLE",
    nodeType: "P2P AC Wallbox",
    powerKw: 7.4,
    pricePerKwh: 9.2,
    distanceKm: 2.1,
    host: "Deepa Nair (Society Rep)",
    rating: 4.9,
    reviewsCount: 64,
    society: "Prestige Cyber Towers",
    address: "Infopark Road, Kakkanad",
    instantBook: true,
    amenities: ["SECURITY_PASS", "COVERED_PARKING"],
    lat: 10.0125,
    lng: 76.3512,
    socketType: "Type-2 AC (7.4kW)",
  },
  {
    id: "node-4",
    title: "Skyline Imperial Bay Socket",
    type: "P2P_BUSY",
    nodeType: "P2P Home Plug",
    powerKw: 3.3,
    pricePerKwh: 8.0,
    distanceKm: 3.2,
    host: "Mathew Varghese",
    rating: 4.7,
    reviewsCount: 22,
    society: "Skyline Bayfront",
    address: "Marine Drive, Kochi",
    instantBook: true,
    amenities: ["WATER_DISPENSER", "SHADE"],
    lat: 9.982,
    lng: 76.275,
    busyWaitMins: 25,
    socketType: "15A 3-Pin Domestic",
  },
  {
    id: "node-5",
    title: "Edappally Metro Station DC Hub",
    type: "PUBLIC_DC",
    nodeType: "Public Fast DC",
    powerKw: 60.0,
    pricePerKwh: 16.5,
    distanceKm: 3.9,
    host: "KMRL VoltGrid",
    rating: 4.8,
    reviewsCount: 210,
    society: "Lulu Mall Corridor",
    address: "Edappally Toll, NH 544",
    instantBook: false,
    amenities: ["SHOPPING", "FOOD_COURT", "RESTROOM"],
    lat: 10.026,
    lng: 76.308,
    socketType: "Dual CCS2 (60kW)",
  },
  {
    id: "node-6",
    title: "Vyttila Mobility Hub Charger",
    type: "PUBLIC_DC",
    nodeType: "Public Fast DC",
    powerKw: 50.0,
    pricePerKwh: 15.8,
    distanceKm: 4.5,
    host: "KSEB e-Mobility Hub",
    rating: 4.6,
    reviewsCount: 95,
    society: "Vyttila Hub Bus Terminal",
    address: "Mobility Hub Road, Kochi",
    instantBook: false,
    amenities: ["TRANSIT", "COFFEE", "RESTROOM"],
    lat: 9.968,
    lng: 76.319,
    socketType: "CCS2 + Type-2",
  },
  {
    id: "node-7",
    title: "Kalamassery Premier Enclave Plug",
    type: "P2P_AVAILABLE",
    nodeType: "P2P Home Plug",
    powerKw: 3.3,
    pricePerKwh: 8.0,
    distanceKm: 5.1,
    host: "Dr. K. George (Verified)",
    rating: 5.0,
    reviewsCount: 19,
    society: "Premier Hill Enclave",
    address: "Near CUSAT Gate, Kalamassery",
    instantBook: true,
    amenities: ["GATED", "SHADE", "TEA_SERVED"],
    lat: 10.045,
    lng: 76.321,
    socketType: "15A Domestic (Heavy Duty)",
  },
  {
    id: "node-8",
    title: "Palarivattom Stadium Link Wallbox",
    type: "P2P_AVAILABLE",
    nodeType: "P2P AC Wallbox",
    powerKw: 7.4,
    pricePerKwh: 9.5,
    distanceKm: 3.0,
    host: "Rohan Thomas",
    rating: 4.8,
    reviewsCount: 31,
    society: "JLN Stadium Road",
    address: "Palarivattom, Kochi",
    instantBook: true,
    amenities: ["COVERED", "CCTV"],
    lat: 10.002,
    lng: 76.305,
    socketType: "Type-2 AC",
  },
  {
    id: "node-9",
    title: "SmartCity Kochi Campus Hub",
    type: "P2P_AVAILABLE",
    nodeType: "Smart Campus Plug",
    powerKw: 3.3,
    pricePerKwh: 8.2,
    distanceKm: 2.3,
    host: "Infopark IT Association",
    rating: 4.9,
    reviewsCount: 54,
    society: "SmartCity Pavilion",
    address: "SmartCity Road, Kakkanad",
    instantBook: true,
    amenities: ["WIFI", "CAFETERIA", "WORKSPACE"],
    lat: 10.002,
    lng: 76.368,
    socketType: "15A 3-Pin Smart Socket",
  },
  {
    id: "node-10",
    title: "Panampilly Nagar Central Socket",
    type: "P2P_BUSY",
    nodeType: "P2P Home Plug",
    powerKw: 3.3,
    pricePerKwh: 8.5,
    distanceKm: 5.8,
    host: "Sneha Varma",
    rating: 4.9,
    reviewsCount: 42,
    society: "Main Avenue Villa",
    address: "Panampilly Nagar, Kochi",
    instantBook: true,
    amenities: ["PARK_VIEW", "COVERED"],
    lat: 9.96,
    lng: 76.295,
    busyWaitMins: 15,
    socketType: "15A Domestic",
  },
  {
    id: "node-11",
    title: "Fort Kochi Heritage Homestay Plug",
    type: "P2P_AVAILABLE",
    nodeType: "P2P Home Plug",
    powerKw: 3.3,
    pricePerKwh: 8.5,
    distanceKm: 9.2,
    host: "Manuel Pereira",
    rating: 5.0,
    reviewsCount: 28,
    society: "Princess Street Courtyard",
    address: "Fort Kochi Heritage Zone",
    instantBook: true,
    amenities: ["HERITAGE_GARDEN", "CAFE"],
    lat: 9.965,
    lng: 76.242,
    socketType: "15A 3-Pin Domestic",
  },
  {
    id: "node-12",
    title: "Aluva Riverside Villa Wallbox",
    type: "P2P_AVAILABLE",
    nodeType: "P2P AC Wallbox",
    powerKw: 7.4,
    pricePerKwh: 9.0,
    distanceKm: 11.4,
    host: "Joy Alukkas Villa Host",
    rating: 4.9,
    reviewsCount: 37,
    society: "Periyar River Bank Enclave",
    address: "Aluva Bypass, Kochi",
    instantBook: true,
    amenities: ["SECURITY_PASS", "RIVER_VIEW"],
    lat: 10.108,
    lng: 76.355,
    socketType: "Type-2 AC (7.4kW)",
  },
];

const FILTER_PILLS = [
  "All Plugs",
  "P2P Home Hosts",
  "Public DC Fast",
  "15A Sockets",
  "Type-2 (7.4kW)",
  "Covered Parking",
];

export default function MapRadarScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const flatListRef = useRef<FlatList>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All Plugs");
  const [selectedNode, setSelectedNode] = useState<NodeItem>(KOCHI_NODES[0]);

  // Center coordinate: Kochi, Kakkanad corridor
  const initialCoord: [number, number] = [76.3419, 10.0159];

  // Filter nodes based on selected filter pill and search query
  const filteredNodes = KOCHI_NODES.filter((node) => {
    const matchesSearch =
      node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.society.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === "P2P Home Hosts") {
      return node.type === "P2P_AVAILABLE" || node.type === "P2P_BUSY";
    }
    if (selectedFilter === "Public DC Fast") {
      return node.type === "PUBLIC_DC";
    }
    if (selectedFilter === "15A Sockets") {
      return node.powerKw <= 3.3;
    }
    if (selectedFilter === "Type-2 (7.4kW)") {
      return node.powerKw > 3.3 && node.powerKw <= 11.0;
    }
    if (selectedFilter === "Covered Parking") {
      return node.amenities.includes("COVERED_PARKING") || node.amenities.includes("COVERED");
    }
    return true;
  });

  const animateToNode = useCallback((node: NodeItem) => {
    setSelectedNode(node);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [node.lng, node.lat],
        zoomLevel: 14.5,
        animationDuration: 700,
        animationMode: "flyTo",
      });
    }
  }, []);

  const handleMarkerPress = (node: NodeItem, index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    animateToNode(node);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleBookSlot = (node: NodeItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.push({
      pathname: "/(driver)/booking-sheet",
      params: { stationId: node.id },
    } as any);
  };

  const handleOpenGoogleMaps = (node: NodeItem) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${node.lat},${node.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* 100% Real Dark Street Map */}
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={CARTO_DARK_MATTER}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCoord,
            zoomLevel: 13,
          }}
        />

        {/* Realistic Custom Markers */}
        {filteredNodes.map((node, index) => {
          const isSelected = selectedNode.id === node.id;
          const isAvailableP2P = node.type === "P2P_AVAILABLE";
          const isBusyP2P = node.type === "P2P_BUSY";
          const isPublicDc = node.type === "PUBLIC_DC";

          const badgeBg = isAvailableP2P
            ? "#00F59B"
            : isBusyP2P
            ? "#FFB800"
            : "#00E5FF";

          const badgeTextColor = isAvailableP2P || isBusyP2P ? "#06090E" : "#06090E";

          return (
            <MapLibreGL.PointAnnotation
              key={node.id}
              id={node.id}
              coordinate={[node.lng, node.lat]}
              onSelected={() => handleMarkerPress(node, index)}
            >
              <View style={[styles.markerWrapper, isSelected && styles.markerSelected]}>
                <View style={[styles.markerPill, { backgroundColor: badgeBg }]}>
                  {isAvailableP2P && <Home size={12} color={badgeTextColor} style={{ marginRight: 3 }} />}
                  {isBusyP2P && <Clock size={12} color={badgeTextColor} style={{ marginRight: 3 }} />}
                  {isPublicDc && <Zap size={12} color={badgeTextColor} style={{ marginRight: 3 }} />}
                  <Text style={[styles.markerText, { color: badgeTextColor }]}>
                    {isAvailableP2P
                      ? `₹${node.pricePerKwh}/u`
                      : isBusyP2P
                      ? `⏳ ${node.busyWaitMins}m`
                      : `⚡ ${node.powerKw}kW`}
                  </Text>
                </View>
                {/* Pointer Arrow */}
                <View style={[styles.markerArrow, { borderTopColor: badgeBg }]} />
              </View>
            </MapLibreGL.PointAnnotation>
          );
        })}
      </MapLibreGL.MapView>

      {/* Floating Top Search & Filter Bar */}
      <View style={styles.topContainer}>
        {/* Search Input Box */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search Kakkanad, Infopark, Vyttila, Lulu..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isSelected = selectedFilter === pill;
            return (
              <TouchableOpacity
                key={pill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilter(pill);
                }}
                style={[
                  styles.filterPill,
                  isSelected && {
                    backgroundColor: "rgba(0, 245, 155, 0.18)",
                    borderColor: "#00F59B",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && { color: "#00F59B", fontWeight: "700" },
                  ]}
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom Swipable Station Card Carousel */}
      <View style={styles.bottomCarouselContainer} pointerEvents="box-none">
        <FlatList
          ref={flatListRef}
          data={filteredNodes}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16)
            );
            if (filteredNodes[index]) {
              animateToNode(filteredNodes[index]);
            }
          }}
          renderItem={({ item }) => {
            const isP2P = item.type === "P2P_AVAILABLE" || item.type === "P2P_BUSY";

            return (
              <View style={[styles.card, { width: CARD_WIDTH }]}>
                {/* Card Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.cardAddress}>
                      {item.address}
                    </Text>
                  </View>

                  <View style={styles.priceBadge}>
                    <Text style={styles.priceAmount}>₹{item.pricePerKwh}</Text>
                    <Text style={styles.priceUnit}>/kWh</Text>
                  </View>
                </View>

                {/* Host Info & Verified Badge */}
                <View style={styles.hostRow}>
                  <View style={styles.hostAvatarCircle}>
                    <Text style={styles.hostAvatarText}>{item.host.charAt(0)}</Text>
                  </View>
                  <View style={styles.hostDetails}>
                    <View style={styles.hostVerifiedWrap}>
                      <Text numberOfLines={1} style={styles.hostName}>
                        {item.host}
                      </Text>
                      <ShieldCheck size={14} color="#00F59B" />
                    </View>
                    <Text style={styles.societySub}>{item.society}</Text>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Star size={12} color="#FFB800" fill="#FFB800" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                    <Text style={styles.reviewsText}>({item.reviewsCount})</Text>
                  </View>
                </View>

                {/* Specs & Distance Row */}
                <View style={styles.specsRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>SOCKET TYPE</Text>
                    <Text style={styles.specValue}>{item.socketType}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>POWER</Text>
                    <Text style={styles.specValueHighlight}>{item.powerKw} kW</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>DISTANCE</Text>
                    <Text style={styles.specValue}>{item.distanceKm} km</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleOpenGoogleMaps(item)}
                    style={styles.navigateBtn}
                  >
                    <Navigation size={16} color="#00F59B" />
                    <Text style={styles.navigateBtnText}>Navigate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleBookSlot(item)}
                    style={styles.bookSlotBtn}
                  >
                    <Text style={styles.bookSlotBtnText}>
                      {item.type === "P2P_BUSY" ? "Queue Slot" : "Book Slot"}
                    </Text>
                    <ArrowRight size={16} color="#06090E" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06090E",
  },
  topContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 44,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 22, 34, 0.94)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#FFFFFF",
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: "#64748B",
    fontSize: 14,
  },
  filterScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    backgroundColor: "rgba(15, 22, 34, 0.88)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterPillText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  markerWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },
  markerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  markerText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  bottomCarouselContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 92,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(15, 22, 34, 0.96)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  cardAddress: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(0, 245, 155, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#00F59B",
  },
  priceUnit: {
    fontSize: 10,
    color: "#00F59B",
    fontWeight: "600",
    marginLeft: 1,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  hostAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 245, 155, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.3)",
  },
  hostAvatarText: {
    color: "#00F59B",
    fontSize: 14,
    fontWeight: "800",
  },
  hostDetails: {
    flex: 1,
  },
  hostVerifiedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hostName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  societySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    color: "#FFB800",
    fontSize: 11,
    fontWeight: "700",
  },
  reviewsText: {
    color: "#64748B",
    fontSize: 10,
  },
  specsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    backgroundColor: "#06090E",
    borderRadius: 12,
    padding: 10,
  },
  specItem: {
    alignItems: "flex-start",
  },
  specLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  specValue: {
    fontSize: 12,
    color: "#E2E8F0",
    fontWeight: "600",
    marginTop: 2,
  },
  specValueHighlight: {
    fontSize: 12,
    color: "#00F59B",
    fontWeight: "800",
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090E",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(0, 245, 155, 0.4)",
    gap: 6,
  },
  navigateBtnText: {
    color: "#00F59B",
    fontSize: 13,
    fontWeight: "700",
  },
  bookSlotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00F59B",
    borderRadius: 14,
    paddingVertical: 11,
    gap: 6,
  },
  bookSlotBtnText: {
    color: "#06090E",
    fontSize: 14,
    fontWeight: "800",
  },
});
