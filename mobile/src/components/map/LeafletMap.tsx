import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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
  zoom?: number;
  activeLayer: "standard" | "satellite" | "hybrid" | "terrain" | "street" | "dark";
  markers: MapMarkerItem[];
  selectedMarkerId?: string;
  routeCoords?: Array<[number, number]>;
  onSelectMarker?: (id: string) => void;
  onRegionChangeComplete?: (lat: number, lng: number) => void;
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
  centerLat = 10.0159,
  centerLng = 76.3419,
  zoom = 14,
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

  const latDelta = useMemo(() => {
    if (compactMode) return 0.022;
    if (zoom >= 15) return 0.025;
    if (zoom <= 12) return 0.075;
    return 0.05;
  }, [compactMode, zoom]);

  // Animate native Google Map camera ONLY when centerLat/centerLng changes
  useEffect(() => {
    if (HAS_VALID_GOOGLE_MAPS_KEY && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(centerLat) || 10.0159,
          longitude: Number(centerLng) || 76.3419,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        },
        420
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
          selectedMarkerId,
          activeLayer,
          markers,
          routeCoords,
        })});} true;`
      );
    }
  }, [centerLat, centerLng, selectedMarkerId, activeLayer, markers, routeCoords]);

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
      zoom: Math.min(17, compactMode ? 14 : zoom),
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
    box-shadow: 0 6px 14px rgba(0,0,0,0.22); border: 2px solid #26302A;
    transition: all 0.2s ease;
  }
  .vm-pin-box.selected {
    width: 50px; height: 50px; border-radius: 16px; background: #05E660;
    border: 2.5px solid #FFFFFF; box-shadow: 0 8px 20px rgba(5, 230, 96, 0.48);
  }
  .vm-bolt { font-size: 20px; font-weight: 900; color: #05E660; }
  .vm-pin-box.selected .vm-bolt { color: #151C18; font-size: 22px; }
  .vm-dist {
    margin-top: 4px; background: rgba(255,255,255,0.94); padding: 2px 7px;
    border-radius: 8px; font-size: 11px; font-weight: 800; color: #151C18;
    white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }
  .vm-car-dot {
    width: 40px; height: 40px; border-radius: 20px; background: rgba(5,230,96,0.26);
    display: flex; align-items: center; justify-content: center;
    transform: translate(-50%, -50%);
  }
  .vm-car-inner {
    width: 28px; height: 22px; border-radius: 10px; background: #FFFFFF;
    border: 2px solid #05E660; display: flex; align-items: center; justify-content: center;
    font-size: 13px; box-shadow: 0 3px 8px rgba(0,0,0,0.18);
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

    const carIcon = L.divIcon({
      className: '',
      html: '<div class="vm-car-dot"><div class="vm-car-inner">🚘</div></div>',
      iconSize: [40, 40]
    });
    L.marker([state.centerLat, state.centerLng], { icon: carIcon }).addTo(markerLayer);

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

  map.on('moveend', function() {
    const c = map.getCenter();
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REGION_CHANGE', lat: c.lat, lng: c.lng }));
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
                onRegionChangeComplete(data.lat, data.lng);
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        }}
        mapType={normalizedMapType}
        maxZoomLevel={18}
        minZoomLevel={4}
        customMapStyle={normalizedMapType === "standard" ? LIGHT_MINIMAL_MAP_STYLE : undefined}
        showsUserLocation={!compactMode}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={!compactMode && showsTraffic}
        showsBuildings={true}
        scrollEnabled={!compactMode}
        zoomEnabled={!compactMode}
        pitchEnabled={!compactMode}
        rotateEnabled={!compactMode}
        toolbarEnabled={false}
        onRegionChangeComplete={(region) => {
          if (!compactMode && onRegionChangeComplete) {
            onRegionChangeComplete(region.latitude, region.longitude);
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

        <Marker
          coordinate={{
            latitude: Number(centerLat) || 10.0159,
            longitude: Number(centerLng) || 76.3419,
          }}
          title="Selected Radar Point"
          pinColor="#05E660"
        />

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
  pinWrap: {
    width: 84,
    height: 66,
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
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#151C18",
  },
  carMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  carMarkerGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(5, 230, 96, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  carMarkerBody: {
    width: 30,
    height: 22,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#05E660",
    alignItems: "center",
    justifyContent: "center",
  },
  carEmoji: {
    fontSize: 13,
  },
});
