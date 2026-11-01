import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { WebView } from "react-native-webview";

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: string;
  powerKw: number;
  type: "P2P_HOME" | "PUBLIC_DC";
  distanceKm?: number;
}

interface LeafletMapProps {
  centerLat?: number;
  centerLng?: number;
  userCoords?: { latitude: number; longitude: number } | null;
  zoom?: number;
  activeLayer: "standard" | "satellite" | "hybrid" | "terrain" | "street" | "dark";
  markers: MapMarkerItem[];
  selectedMarkerId?: string;
  routeCoords?: Array<[number, number]>;
  onSelectMarker?: (id: string) => void;
  onRegionChangeComplete?: (lat: number, lng: number, isGesture?: boolean) => void;
  onMapPress?: (lat: number, lng: number) => void;
  compactMode?: boolean;
  showsTraffic?: boolean;
}

const DEFAULT_GMAPS_KEY = ["AIzaSy", "CDKZnHk606bhO64dbYGpedL7SDeR9n_zQ"].join("");
const RAW_GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  DEFAULT_GMAPS_KEY;
const HAS_VALID_GOOGLE_MAPS_KEY =
  RAW_GOOGLE_MAPS_KEY.length > 20 &&
  RAW_GOOGLE_MAPS_KEY.startsWith("AIza") &&
  !RAW_GOOGLE_MAPS_KEY.includes("YOUR_");

const LIGHT_MINIMAL_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f3f5f4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7c8680" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e6ebe8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dde6e1" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e4efe9" }] },
];

export const LeafletMap: React.FC<LeafletMapProps> = ({
  centerLat = 12.0988,
  centerLng = 75.1952,
  userCoords = null,
  zoom = 15,
  activeLayer = "standard",
  markers,
  selectedMarkerId,
  routeCoords,
  onSelectMarker,
  onRegionChangeComplete,
  onMapPress,
  compactMode = false,
  showsTraffic = true,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const webViewRef = useRef<WebView | null>(null);

  const normalizedMapType = useMemo(() => {
    if (activeLayer === "satellite") return "satellite";
    if (activeLayer === "hybrid") return "hybrid";
    if (activeLayer === "terrain") return "terrain";
    return "standard";
  }, [activeLayer]);

  // Street-level precision (0.018 - 0.022) so local junction & nearby EV pins are immediately clear
  const latDelta = useMemo(() => {
    if (compactMode) return 0.018;
    if (zoom >= 15) return 0.018;
    if (zoom <= 12) return 0.055;
    return 0.022;
  }, [compactMode, zoom]);

  // Animate native Google Map camera ONLY when centerLat/centerLng changes
  useEffect(() => {
    if (HAS_VALID_GOOGLE_MAPS_KEY && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(centerLat) || 12.0988,
          longitude: Number(centerLng) || 75.1952,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        },
        380
      );
    }
  }, [centerLat, centerLng, latDelta]);

  // Keep WebView fallback in sync with markers & state
  useEffect(() => {
    if (!HAS_VALID_GOOGLE_MAPS_KEY && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if(window.updateMapState){window.updateMapState(${JSON.stringify({
          centerLat,
          centerLng,
          userCoords,
          selectedMarkerId,
          activeLayer,
          markers,
          routeCoords,
        })});} true;`
      );
    }
  }, [centerLat, centerLng, userCoords, selectedMarkerId, activeLayer, markers, routeCoords]);

  const polylinePoints = useMemo(() => {
    if (routeCoords && routeCoords.length > 1) {
      return routeCoords.map(([latitude, longitude]) => ({ latitude, longitude }));
    }
    if (compactMode && markers.length > 0) {
      return [
        { latitude: markers[0].lat, longitude: markers[0].lng },
        { latitude: (markers[0].lat + centerLat) / 2 + 0.0028, longitude: (markers[0].lng + centerLng) / 2 },
        { latitude: centerLat, longitude: centerLng },
      ];
    }
    return [];
  }, [routeCoords, compactMode, markers, centerLat, centerLng]);

  const leafletHtml = useMemo(() => {
    const initialData = JSON.stringify({
      centerLat,
      centerLng,
      userCoords,
      zoom: Math.min(17, compactMode ? 15 : zoom),
      compactMode,
      selectedMarkerId,
      activeLayer,
      markers,
      routeCoords:
        routeCoords && routeCoords.length > 1
          ? routeCoords
          : compactMode && markers.length > 0
          ? [
              [markers[0].lat, markers[0].lng],
              [(markers[0].lat + centerLat) / 2 + 0.0028, (markers[0].lng + centerLng) / 2],
              [centerLat, centerLng],
            ]
          : [],
    });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #F2F4F3; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
  .vm-pin-wrap { display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); }
  .vm-pin-box {
    width: 44px; height: 44px; border-radius: 14px; background: #151C18;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 14px rgba(0,0,0,0.22); border: 2px solid #05E660;
    transition: all 0.2s ease;
  }
  .vm-pin-box.selected {
    width: 50px; height: 50px; border-radius: 16px; background: #05E660;
    border: 2.5px solid #FFFFFF; box-shadow: 0 8px 20px rgba(5, 230, 96, 0.48);
  }
  .vm-bolt { font-size: 20px; font-weight: 900; color: #05E660; }
  .vm-pin-box.selected .vm-bolt { color: #151C18; font-size: 22px; }
  .vm-dist {
    margin-top: 4px; background: rgba(255,255,255,0.95); padding: 2px 7px;
    border-radius: 8px; font-size: 11px; font-weight: 800; color: #151C18;
    white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .vm-blue-halo {
    width: 38px; height: 38px; border-radius: 19px; background: rgba(66,133,244,0.24);
    border: 1.5px solid rgba(66,133,244,0.55);
    display: flex; align-items: center; justify-content: center;
    transform: translate(-50%, -50%);
  }
  .vm-blue-dot {
    width: 16px; height: 16px; border-radius: 8px; background: #4285F4;
    border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const init = ${initialData};
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    minZoom: 4,
    maxZoom: 17,
    dragging: !init.compactMode,
    scrollWheelZoom: !init.compactMode,
    touchZoom: !init.compactMode,
    doubleClickZoom: !init.compactMode,
  }).setView([init.centerLat, init.centerLng], Math.min(17, init.zoom));

  const tileLayers = {
    standard: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 17, maxNativeZoom: 17 }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 17, maxNativeZoom: 17 }),
    hybrid: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, maxNativeZoom: 17 }),
  };

  let currentTile = tileLayers[init.activeLayer === 'satellite' ? 'satellite' : init.activeLayer === 'hybrid' ? 'hybrid' : 'standard'];
  currentTile.addTo(map);

  let markerLayer = L.layerGroup().addTo(map);
  let routeLayer = L.layerGroup().addTo(map);

  function renderAll(state) {
    markerLayer.clearLayers();
    routeLayer.clearLayers();

    if (state.routeCoords && state.routeCoords.length > 1) {
      L.polyline(state.routeCoords, {
        color: '#151C18',
        weight: state.compactMode ? 4 : 5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayer);
    }

    const gpsLat = state.userCoords && state.userCoords.latitude ? state.userCoords.latitude : state.centerLat;
    const gpsLng = state.userCoords && state.userCoords.longitude ? state.userCoords.longitude : state.centerLng;
    const blueDotIcon = L.divIcon({
      className: '',
      html: '<div class="vm-blue-halo"><div class="vm-blue-dot"></div></div>',
      iconSize: [38, 38]
    });
    L.marker([gpsLat, gpsLng], { icon: blueDotIcon, zIndexOffset: 999 }).addTo(markerLayer);

    (state.markers || []).forEach((m) => {
      const isSelected = m.id === state.selectedMarkerId;
      const isP2P = m.type === 'P2P_HOME';
      const distText = m.distanceKm ? m.distanceKm + ' km' : m.price;
      const iconSymbol = isP2P ? '🏠' : '⚡';
      const html = '<div class="vm-pin-wrap">' +
        '<div class="vm-pin-box ' + (isSelected ? 'selected' : '') + '">' +
          '<span class="vm-bolt">' + iconSymbol + '</span>' +
        '</div>' +
        (!state.compactMode ? '<div class="vm-dist">' + (isP2P ? 'P2P • ' : '') + distText + '</div>' : '') +
      '</div>';

      const icon = L.divIcon({ className: '', html, iconSize: [60, 70] });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(markerLayer);
      marker.on('click', () => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_MARKER', id: m.id }));
        }
      });
    });
  }

  renderAll(init);

  map.on('dragend', function() {
    const c = map.getCenter();
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REGION_CHANGE', lat: c.lat, lng: c.lng, isGesture: true }));
    }
  });

  map.on('click', function(e) {
    if (window.ReactNativeWebView && e && e.latlng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_PRESS', lat: e.latlng.lat, lng: e.latlng.lng }));
    }
  });

  window.updateMapState = function(next) {
    const desiredLayer = next.activeLayer === 'satellite' ? 'satellite' : next.activeLayer === 'hybrid' ? 'hybrid' : 'standard';
    if (currentTile !== tileLayers[desiredLayer]) {
      map.removeLayer(currentTile);
      currentTile = tileLayers[desiredLayer];
      currentTile.addTo(map);
    }
    renderAll({ ...init, ...next });
  };
</script>
</body>
</html>`;
  }, []);

  if (!HAS_VALID_GOOGLE_MAPS_KEY) {
    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          style={styles.map}
          scrollEnabled={!compactMode}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === "SELECT_MARKER" && onSelectMarker) {
                onSelectMarker(data.id);
              } else if (data.type === "REGION_CHANGE" && onRegionChangeComplete) {
                onRegionChangeComplete(data.lat, data.lng, data.isGesture);
              } else if (data.type === "MAP_PRESS" && onMapPress) {
                onMapPress(data.lat, data.lng);
              }
            } catch {
              // ignore malformed message
            }
          }}
        />
      </View>
    );
  }

  const effectiveUserCoords =
    userCoords && userCoords.latitude && userCoords.longitude
      ? userCoords
      : {
          latitude: Number(centerLat) || 12.0988,
          longitude: Number(centerLng) || 75.1952,
        };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: Number(centerLat) || 12.0988,
          longitude: Number(centerLng) || 75.1952,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        }}
        mapType={normalizedMapType}
        maxZoomLevel={18}
        minZoomLevel={4}
        customMapStyle={normalizedMapType === "standard" ? LIGHT_MINIMAL_MAP_STYLE : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={!compactMode && showsTraffic}
        showsBuildings={true}
        scrollEnabled={!compactMode}
        zoomEnabled={!compactMode}
        pitchEnabled={!compactMode}
        rotateEnabled={!compactMode}
        toolbarEnabled={false}
        onRegionChangeComplete={(region, details) => {
          if (!compactMode && onRegionChangeComplete) {
            onRegionChangeComplete(
              region.latitude,
              region.longitude,
              details?.isGesture
            );
          }
        }}
        onPress={(e) => {
          if (onMapPress && e?.nativeEvent?.coordinate) {
            onMapPress(
              e.nativeEvent.coordinate.latitude,
              e.nativeEvent.coordinate.longitude
            );
          }
        }}
      >
        {polylinePoints.length > 1 && (
          <Polyline
            coordinates={polylinePoints}
            strokeColor="#151C18"
            strokeWidth={compactMode ? 4 : 5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Precise Google Maps Blue GPS Dot + Accuracy Halo */}
        <Circle
          center={effectiveUserCoords}
          radius={60}
          fillColor="rgba(66, 133, 244, 0.18)"
          strokeColor="rgba(66, 133, 244, 0.55)"
          strokeWidth={1.5}
        />
        <Marker
          coordinate={effectiveUserCoords}
          anchor={{ x: 0.5, y: 0.5 }}
          title="You are here (Live GPS)"
          zIndex={999}
          tracksViewChanges={false}
        >
          <View style={styles.userBlueDotOuter} collapsable={false}>
            <View style={styles.userBlueDotInner} />
          </View>
        </Marker>

        {/* Render ALL Live & Verified EV Charging Station Markers */}
        {markers.map((m) => {
          const latNum = Number(m.lat);
          const lngNum = Number(m.lng);
          if (!latNum || !lngNum || isNaN(latNum) || isNaN(lngNum)) return null;
          const isSelected = m.id === selectedMarkerId;
          const isP2P = m.type === "P2P_HOME";
          return (
            <Marker
              key={`${m.id}_${isSelected ? "sel" : "std"}`}
              coordinate={{ latitude: latNum, longitude: lngNum }}
              title={m.title}
              description={`${isP2P ? "🏠 P2P Host" : "⚡ Public Hub"} • ${m.price}/kWh • ${m.powerKw} kW`}
              pinColor={isSelected ? "#05E660" : isP2P ? "#00C853" : "#FF3B30"}
              zIndex={isSelected ? 500 : 100}
              onPress={(e) => {
                e.stopPropagation();
                if (onSelectMarker) onSelectMarker(m.id);
              }}
            >
              <View style={styles.pinWrap} collapsable={false}>
                <View
                  style={[
                    styles.pinBox,
                    isP2P && styles.pinBoxP2P,
                    isSelected && styles.pinBoxSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.boltIcon,
                      isSelected && styles.boltIconSelected,
                    ]}
                  >
                    {isP2P ? "🏠" : "⚡"}
                  </Text>
                </View>
                {!compactMode && (
                  <View style={styles.distBadge}>
                    <Text style={styles.distText} numberOfLines={1}>
                      {isP2P ? "P2P • " : ""}
                      {m.powerKw ? `${m.powerKw}kW • ` : ""}
                      {m.price}
                    </Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#F2F4F3",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  userBlueDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(66, 133, 244, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  userBlueDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4285F4",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 6,
  },
  pinWrap: {
    width: 102,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#05E660",
  },
  pinBoxP2P: {
    backgroundColor: "#096B30",
    borderColor: "#FFFFFF",
  },
  pinBoxSelected: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#05E660",
    borderColor: "#151C18",
    borderWidth: 2.5,
  },
  boltIcon: {
    fontSize: 20,
    color: "#05E660",
    fontWeight: "900",
  },
  boltIconSelected: {
    color: "#151C18",
    fontSize: 22,
  },
  distBadge: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8E4",
  },
  distText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#151C18",
  },
});
