import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  MapType,
} from "react-native-maps";
import { WebView } from "react-native-webview";
import { Zap } from "lucide-react-native";
import {
  fetchZeroCostDirections,
  LatLngPoint,
} from "../../services/routingEngine";

export type MapLayerMode =
  | "light"
  | "standard"
  | "street"
  | "satellite"
  | "hybrid"
  | "terrain";

export interface MapStationMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  pricePerKwh: number;
  powerKw: number;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  nodeType: string;
  distanceKm?: number;
}

interface LeafletMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  layerMode: MapLayerMode;
  stations: MapStationMarker[];
  selectedStationId?: string;
  showRouteLine?: boolean;
  routeCoordinates?: [number, number][];
  onSelectStation?: (stationId: string) => void;
  interactive?: boolean;
  miniPreviewMode?: boolean;
  showsTraffic?: boolean;
  forceNativeGoogleMaps?: boolean;
}

const GOOGLE_ANDROID_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || "";
const GOOGLE_IOS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || "";

const hasConfiguredGoogleApiKey = (): boolean => {
  const key = Platform.OS === "ios" ? GOOGLE_IOS_KEY : GOOGLE_ANDROID_KEY;
  return Boolean(
    key &&
      key.trim().length > 15 &&
      !key.includes("YOUR_") &&
      key.startsWith("AIza")
  );
};

// Minimalist Silver/Light Google Map Style matching the UI reference image
const CLEAN_LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f2f4f3" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616b65" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757f7a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e4e9e6" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dce5e1" }],
  },
];

export const LeafletMap: React.FC<LeafletMapProps> = ({
  centerLat,
  centerLng,
  zoom = 14,
  layerMode = "standard",
  stations,
  selectedStationId,
  showRouteLine = false,
  routeCoordinates,
  onSelectStation,
  interactive = true,
  miniPreviewMode = false,
  showsTraffic = true,
  forceNativeGoogleMaps = false,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const webViewRef = useRef<WebView>(null);

  const [computedPolyline, setComputedPolyline] = useState<LatLngPoint[]>([]);
  const useNativeGoogle = forceNativeGoogleMaps || hasConfiguredGoogleApiKey();

  // Map our unified layerMode to react-native-maps MapType
  const getNativeMapType = (): MapType => {
    if (layerMode === "satellite") return "satellite";
    if (layerMode === "hybrid") return "hybrid";
    if (layerMode === "terrain") return "terrain";
    return "standard";
  };

  // Animate Native Google Map Camera when centerLat / centerLng updates (e.g. Photon Komoot Autocomplete or GPS Recenter)
  useEffect(() => {
    if (useNativeGoogle && mapRef.current) {
      const delta = miniPreviewMode ? 0.015 : 0.028;
      mapRef.current.animateToRegion(
        {
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        650
      );
    }
  }, [centerLat, centerLng, useNativeGoogle, miniPreviewMode]);

  // Fetch Zero-Cost Road Geometry (Ola Maps -> OSRM GeoJSON) when showRouteLine is active
  useEffect(() => {
    let isMounted = true;

    async function loadZeroCostRoute() {
      if (!showRouteLine) {
        if (isMounted) setComputedPolyline([]);
        return;
      }

      if (routeCoordinates && routeCoordinates.length > 1) {
        if (isMounted) {
          setComputedPolyline(
            routeCoordinates.map(([lat, lng]) => ({
              latitude: lat,
              longitude: lng,
            }))
          );
        }
        return;
      }

      const targetStation =
        stations.find((s) => s.id === selectedStationId) || stations[0];
      if (!targetStation) return;

      const routeResult = await fetchZeroCostDirections(
        { latitude: centerLat, longitude: centerLng },
        { latitude: targetStation.latitude, longitude: targetStation.longitude }
      );

      if (isMounted) {
        setComputedPolyline(routeResult.coordinates);
      }
    }

    loadZeroCostRoute();
    return () => {
      isMounted = false;
    };
  }, [
    showRouteLine,
    selectedStationId,
    stations,
    centerLat,
    centerLng,
    routeCoordinates,
  ]);

  // Sync updates to the zero-key fallback canvas when active
  useEffect(() => {
    if (!useNativeGoogle && webViewRef.current) {
      const effectiveCoords: [number, number][] =
        computedPolyline.length > 1
          ? computedPolyline.map((pt) => [pt.latitude, pt.longitude])
          : routeCoordinates || [];

      const payload = JSON.stringify({
        type: "UPDATE_MAP",
        layerMode,
        stations,
        selectedStationId,
        showRouteLine,
        routeCoordinates: effectiveCoords,
        centerLat,
        centerLng,
        miniPreviewMode,
      });
      webViewRef.current.postMessage(payload);
    }
  }, [
    useNativeGoogle,
    layerMode,
    stations,
    selectedStationId,
    showRouteLine,
    computedPolyline,
    routeCoordinates,
    centerLat,
    centerLng,
    miniPreviewMode,
  ]);

  // 1. NATIVE GOOGLE MAPS MOBILE SDK (<MapView provider={PROVIDER_GOOGLE} />)
  // Strictly omits googleMapId to guarantee ₹0.00/month Google Cloud SKU billing.
  if (useNativeGoogle) {
    const delta = miniPreviewMode ? 0.015 : 0.028;

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: delta,
            longitudeDelta: delta,
          }}
          mapType={getNativeMapType()}
          customMapStyle={
            layerMode === "light" || layerMode === "standard"
              ? CLEAN_LIGHT_MAP_STYLE
              : undefined
          }
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={showsTraffic && !miniPreviewMode}
          showsBuildings={true}
          showsCompass={false}
           toolbarEnabled={false}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={interactive}
        >
          {/* User EV Marker */}
          <Marker
            coordinate={{ latitude: centerLat, longitude: centerLng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.evCarMarkerWrap}>
              <View style={styles.evCarPill}>
                <Zap size={12} color="#151C18" fill="#05E660" />
              </View>
            </View>
          </Marker>

          {/* Station Markers (Rounded Square + Distance Badge) */}
          {stations.map((st) => {
            const isSelected = st.id === selectedStationId && !miniPreviewMode;
            const distText = st.distanceKm ? `${st.distanceKm} km` : "1.2 km";

            return (
              <Marker
                key={st.id}
                coordinate={{ latitude: st.latitude, longitude: st.longitude }}
                onPress={() => onSelectStation && onSelectStation(st.id)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.nativePinContainer}>
                  <View
                    style={[
                      styles.nativePinBox,
                      isSelected && styles.nativePinBoxSelected,
                    ]}
                  >
                    <Zap
                      size={16}
                      color={isSelected ? "#151C18" : "#05E660"}
                      fill={isSelected ? "#151C18" : "#05E660"}
                    />
                  </View>
                  {!miniPreviewMode && (
                    <View style={styles.nativePinDistBadge}>
                      <Text style={styles.nativePinDistText}>{distText}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* Zero-Cost Hybrid Route Polyline (Ola Maps -> OSRM GeoJSON) */}
          {showRouteLine && computedPolyline.length > 1 && (
            <Polyline
              coordinates={computedPolyline}
              strokeColor="#151C18"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
      </View>
    );
  }

  // 2. ZERO-KEY AUTOMATIC FALLBACK CANVAS (When EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY is placeholder)
  const initialStationsJson = JSON.stringify(stations);
  const initialRouteJson = JSON.stringify(
    computedPolyline.length > 1
      ? computedPolyline.map((p) => [p.latitude, p.longitude])
      : routeCoordinates || []
  );

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      background-color: #EDEFF0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-attribution, .leaflet-control-zoom {
      display: none !important;
    }
    .vm-pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }
    .vm-pin-box {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background-color: #151C18;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 5px 14px rgba(17, 23, 20, 0.22);
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .vm-pin-box.selected {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background-color: #05E660;
      box-shadow: 0 0 24px rgba(5, 230, 96, 0.72), 0 6px 16px rgba(5, 230, 96, 0.35);
      transform: scale(1.06);
    }
    .vm-pin-dist {
      margin-top: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #151C18;
      background: rgba(242, 244, 243, 0.92);
      padding: 1px 6px;
      border-radius: 6px;
      white-space: nowrap;
      letter-spacing: -0.2px;
    }
    .ev-car-marker {
      position: relative;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }
    .ev-car-halo {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(5, 230, 96, 0.32);
      animation: pulseHalo 2.2s infinite ease-out;
    }
    .ev-car-pill {
      position: relative;
      z-index: 2;
      background: #FFFFFF;
      border: 2px solid #05E660;
      border-radius: 14px;
      padding: 3px 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.14);
    }
    @keyframes pulseHalo {
      0% { transform: scale(0.75); opacity: 0.9; }
      100% { transform: scale(1.65); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let centerLat = ${centerLat};
    let centerLng = ${centerLng};
    const initialZoom = ${zoom};
    const isInteractive = ${interactive ? "true" : "false"};
    let isMiniPreview = ${miniPreviewMode ? "true" : "false"};

    const map = L.map('map', {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      dragging: isInteractive,
      touchZoom: isInteractive,
      scrollWheelZoom: isInteractive,
      doubleClickZoom: isInteractive
    });

    const tileLayers = {
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
      standard: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
      street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
      hybrid: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
      terrain: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    };

    let currentLayer = tileLayers['${layerMode}'] || tileLayers.standard;
    currentLayer.addTo(map);

    const carIcon = L.divIcon({
      className: '',
      html: \`
        <div class="ev-car-marker">
          <div class="ev-car-halo"></div>
          <div class="ev-car-pill">
            <svg width="20" height="12" viewBox="0 0 24 14" fill="none">
              <path d="M3 9L5 4H17L20 9H3Z" fill="#05E660" stroke="#151C18" stroke-width="1.5"/>
              <rect x="2" y="8" width="20" height="4" rx="2" fill="#151C18"/>
              <circle cx="6" cy="12" r="2" fill="#05E660"/>
              <circle cx="18" cy="12" r="2" fill="#05E660"/>
            </svg>
          </div>
        </div>
      \`,
      iconSize: [0, 0]
    });
    const userMarker = L.marker([centerLat, centerLng], { icon: carIcon, zIndexOffset: 900 }).addTo(map);

    let markersLayer = L.layerGroup().addTo(map);
    let routePolyline = null;
    let routeVertexDot = null;

    let stationsData = ${initialStationsJson};
    let selectedId = "${selectedStationId || ""}";
    let showRoute = ${showRouteLine ? "true" : "false"};
    let customRouteCoords = ${initialRouteJson};

    function boltSvg(color) {
      return \`<svg width="18" height="18" viewBox="0 0 24 24" fill="\${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke="\${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>\`;
    }

    function renderStations() {
      markersLayer.clearLayers();
      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
      if (routeVertexDot) {
        map.removeLayer(routeVertexDot);
        routeVertexDot = null;
      }

      let selectedStation = null;

      stationsData.forEach((st) => {
        const isSel = st.id === selectedId;
        if (isSel) selectedStation = st;

        const boxClass = isSel && !isMiniPreview ? 'vm-pin-box selected' : 'vm-pin-box';
        const boltColor = isSel && !isMiniPreview ? '#151C18' : '#05E660';
        const distLabel = st.distanceKm ? st.distanceKm + ' km' : '1.2 km';

        const icon = L.divIcon({
          className: '',
          html: \`
            <div class="vm-pin-wrap">
              <div class="\${boxClass}">
                \${boltSvg(boltColor)}
              </div>
              \${!isMiniPreview ? \`<div class="vm-pin-dist">\${distLabel}</div>\` : ''}
            </div>
          \`,
          iconSize: [0, 0]
        });

        const marker = L.marker([st.latitude, st.longitude], {
          icon,
          zIndexOffset: isSel ? 800 : 200
        });

        marker.on('click', () => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATION_SELECTED',
              stationId: st.id
            }));
          }
        });

        markersLayer.addLayer(marker);
      });

      if (showRoute) {
        let pts = [];
        if (customRouteCoords && customRouteCoords.length > 1) {
          pts = customRouteCoords;
        } else if (selectedStation) {
          const midLat = centerLat + (selectedStation.latitude - centerLat) * 0.65 + 0.0022;
          const midLng = centerLng + (selectedStation.longitude - centerLng) * 0.48;
          pts = [
            [selectedStation.latitude, selectedStation.longitude],
            [midLat, midLng],
            [centerLat, centerLng]
          ];
          routeVertexDot = L.circleMarker([midLat, midLng], {
            radius: 3.5,
            fillColor: '#151C18',
            color: '#151C18',
            weight: 1,
            fillOpacity: 1
          }).addTo(map);
        }

        if (pts.length > 1) {
          routePolyline = L.polyline(pts, {
            color: '#151C18',
            weight: 3.5,
            opacity: 0.92,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        }
      }
    }

    renderStations();

    function handleIncoming(raw) {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'UPDATE_MAP') {
          if (msg.layerMode && tileLayers[msg.layerMode] && currentLayer !== tileLayers[msg.layerMode]) {
            map.removeLayer(currentLayer);
            currentLayer = tileLayers[msg.layerMode];
            currentLayer.addTo(map);
          }
          if (msg.centerLat && msg.centerLng && (Math.abs(msg.centerLat - centerLat) > 0.0001 || Math.abs(msg.centerLng - centerLng) > 0.0001)) {
            centerLat = msg.centerLat;
            centerLng = msg.centerLng;
            userMarker.setLatLng([centerLat, centerLng]);
            map.flyTo([centerLat, centerLng], isMiniPreview ? 14 : 15, { duration: 0.65 });
          }
          if (msg.stations) stationsData = msg.stations;
          if (msg.selectedStationId !== undefined) selectedId = msg.selectedStationId;
          if (msg.showRouteLine !== undefined) showRoute = msg.showRouteLine;
          if (msg.routeCoordinates !== undefined) customRouteCoords = msg.routeCoordinates;
          if (msg.miniPreviewMode !== undefined) isMiniPreview = msg.miniPreviewMode;
          renderStations();
        }
      } catch (err) {}
    }

    document.addEventListener('message', (e) => handleIncoming(e.data));
    window.addEventListener('message', (e) => handleIncoming(e.data));
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "STATION_SELECTED" && onSelectStation) {
              onSelectStation(data.stationId);
            }
          } catch {}
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEFF0",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  nativePinContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  nativePinBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#151C18",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111714",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  nativePinBoxSelected: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#05E660",
    shadowColor: "#05E660",
    shadowOpacity: 0.65,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  nativePinDistBadge: {
    marginTop: 4,
    backgroundColor: "rgba(242, 244, 243, 0.94)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  nativePinDistText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#151C18",
  },
  evCarMarkerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(5, 230, 96, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  evCarPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
});
