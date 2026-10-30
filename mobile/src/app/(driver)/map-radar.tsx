import React, { useState, useRef, useCallback } from "react";
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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  Navigation,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  MapPin,
  Clock,
  Layers,
  Crosshair,
  Route,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { LeafletMap, MapTileMode, MapStationMarker } from "../../components/map/LeafletMap";
import { useModeStore } from "../../store/useModeStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

export interface NodeItem extends MapStationMarker {
  nodeType: string;
  distanceKm: number;
  host: string;
  rating: number;
  reviewsCount: number;
  society: string;
  address: string;
  instantBook: boolean;
  amenities: string[];
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
    socketType: "15A Domestic",
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
    amenities: ["WIFI", "CAFETERIA"],
    lat: 10.002,
    lng: 76.368,
    socketType: "15A 3-Pin Socket",
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
];

export default function MapRadarScreen() {
  const router = useRouter();
  const { accentColor } = useModeStore();
  const flatListRef = useRef<FlatList>(null);

  // User GPS position: Kakkanad Infopark Corridor, Kochi
  const userGps = { lat: 10.0159, lng: 76.3419 };

  // Map state
  const [tileMode, setTileMode] = useState<MapTileMode>("street");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showRouteLine, setShowRouteLine] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All Plugs");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-1");

  // Filter nodes dynamically
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
    return true;
  });

  const selectedNode =
    filteredNodes.find((n) => n.id === selectedNodeId) || filteredNodes[0] || KOCHI_NODES[0];

  const handleSelectMarkerFromMap = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedNodeId(id);
    const idx = filteredNodes.findIndex((n) => n.id === id);
    if (idx !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true });
    }
  };

  const handleCycleTileMode = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (tileMode === "street") setTileMode("satellite");
    else if (tileMode === "satellite") setTileMode("dark");
    else setTileMode("street");
  };

  const handleNavigate = (node: NodeItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setShowRouteLine(true);
    const nativeUrl = `google.navigation:q=${node.lat},${node.lng}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${node.lat},${node.lng}`;

    Linking.canOpenURL(nativeUrl)
      .then((supported) => {
        if (supported) Linking.openURL(nativeUrl);
        else Linking.openURL(webUrl);
      })
      .catch(() => Linking.openURL(webUrl));
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

  return (
    <View style={styles.container}>
      {/* 3-Mode Leaflet Street / Satellite / Dark Map */}
      <LeafletMap
        markers={filteredNodes}
        selectedMarkerId={selectedNodeId}
        onSelectMarker={handleSelectMarkerFromMap}
        tileMode={tileMode}
        userLocation={userGps}
        showRouteLine={showRouteLine}
      />

      {/* Top Search & Filter Bar */}
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
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Map Controls Dock (Right Side) */}
      <View style={styles.rightDock}>
        {/* Layer Switcher Button */}
        <TouchableOpacity
          onPress={handleCycleTileMode}
          activeOpacity={0.8}
          style={styles.dockButton}
        >
          <Layers size={18} color="#00F59B" />
          <Text style={styles.dockButtonLabel}>
            {tileMode === "street" ? "Street" : tileMode === "satellite" ? "Satellite" : "Dark"}
          </Text>
        </TouchableOpacity>

        {/* Toggle Route Polyline */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowRouteLine(!showRouteLine);
          }}
          activeOpacity={0.8}
          style={[styles.dockButton, showRouteLine && styles.dockButtonActive]}
        >
          <Route size={18} color={showRouteLine ? "#06090E" : "#00F59B"} />
          <Text
            style={[
              styles.dockButtonLabel,
              showRouteLine && { color: "#06090E", fontWeight: "800" },
            ]}
          >
            Route
          </Text>
        </TouchableOpacity>

        {/* Recenter GPS */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedNodeId(KOCHI_NODES[0].id);
          }}
          activeOpacity={0.8}
          style={styles.dockButton}
        >
          <Crosshair size={18} color="#00E5FF" />
          <Text style={[styles.dockButtonLabel, { color: "#00E5FF" }]}>My GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Route Badge when Polyline is Active */}
      {showRouteLine && selectedNode && (
        <View style={styles.routePill}>
          <Text style={styles.routePillText}>
            🚗 ~8 mins • {selectedNode.distanceKm} km via Seaport-Airport Rd
          </Text>
        </View>
      )}

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
            const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
            if (filteredNodes[index]) {
              setSelectedNodeId(filteredNodes[index].id);
            }
          }}
          renderItem={({ item }) => (
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
                  onPress={() => handleNavigate(item)}
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
          )}
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
    backgroundColor: "rgba(15, 22, 34, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterPillActive: {
    backgroundColor: "rgba(0, 245, 155, 0.2)",
    borderColor: "#00F59B",
  },
  filterPillText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#00F59B",
    fontWeight: "700",
  },
  rightDock: {
    position: "absolute",
    top: Platform.OS === "ios" ? 170 : 160,
    right: 16,
    zIndex: 15,
    gap: 10,
  },
  dockButton: {
    backgroundColor: "rgba(15, 22, 34, 0.94)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 54,
  },
  dockButtonActive: {
    backgroundColor: "#00F59B",
    borderColor: "#00F59B",
  },
  dockButtonLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 3,
  },
  routePill: {
    position: "absolute",
    top: Platform.OS === "ios" ? 140 : 130,
    alignSelf: "center",
    backgroundColor: "rgba(0, 245, 155, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 15,
    shadowColor: "#00F59B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  routePillText: {
    color: "#06090E",
    fontSize: 11,
    fontWeight: "800",
  },
  bottomCarouselContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 95 : 88,
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
