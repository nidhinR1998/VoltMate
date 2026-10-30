import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

export type MapTileMode = "street" | "satellite" | "dark";

export interface MapStationMarker {
  id: string;
  title: string;
  lat: number;
  lng: number;
  pricePerKwh: number;
  powerKw: number;
  type: "P2P_AVAILABLE" | "P2P_BUSY" | "PUBLIC_DC";
  busyWaitMins?: number;
}

interface LeafletMapProps {
  markers: MapStationMarker[];
  selectedMarkerId?: string;
  onSelectMarker: (id: string) => void;
  tileMode: MapTileMode;
  userLocation: { lat: number; lng: number };
  showRouteLine?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  tileMode,
  userLocation,
  showRouteLine = false,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Generate HTML for Leaflet
  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background: #06090E; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-attribution { display: none !important; }
    .custom-pill {
      display: flex; align-items: center; justify-content: center;
      padding: 4px 8px; border-radius: 12px; font-weight: 800; font-size: 11px;
      white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer;
      transform: translate(-50%, -100%);
    }
    .custom-pill::after {
      content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
      border-width: 6px 5px 0 5px; border-style: solid;
    }
    .pill-emerald { background: #00F59B; color: #06090E; }
    .pill-emerald::after { border-color: #00F59B transparent transparent transparent; }
    .pill-amber { background: #FFB800; color: #06090E; }
    .pill-amber::after { border-color: #FFB800 transparent transparent transparent; }
    .pill-cyan { background: #00E5FF; color: #06090E; }
    .pill-cyan::after { border-color: #00E5FF transparent transparent transparent; }
    .pill-selected {
      transform: translate(-50%, -100%) scale(1.22);
      border-color: #FFFFFF !important;
      box-shadow: 0 0 16px rgba(0,245,155,0.8);
      z-index: 1000 !important;
    }
    .user-pulse {
      width: 16px; height: 16px; background: #3B82F6; border: 2.5px solid #FFFFFF;
      border-radius: 50%; box-shadow: 0 0 12px #3B82F6;
      animation: pulse 2s infinite; transform: translate(-50%, -50%);
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { box-shadow: 0 0 0 16px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true
    }).setView([${userLocation.lat}, ${userLocation.lng}], 13);

    // Tile Layers
    var tileLayers = {
      street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }),
      dark: L.tileLayer('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { maxZoom: 19 })
    };

    var currentLayer = tileLayers['${tileMode}'] || tileLayers.street;
    currentLayer.addTo(map);

    // User GPS Marker
    var userIcon = L.divIcon({
      className: '',
      html: '<div class="user-pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    var userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon }).addTo(map);

    // Station Markers
    var markerLayer = L.layerGroup().addTo(map);
    var routeLine = null;
    var markersData = ${JSON.stringify(markers)};
    var selectedId = "${selectedMarkerId || ""}";

    function renderMarkers() {
      markerLayer.clearLayers();
      markersData.forEach(function(m) {
        var isSel = (m.id === selectedId);
        var cls = m.type === 'P2P_AVAILABLE' ? 'pill-emerald' : (m.type === 'P2P_BUSY' ? 'pill-amber' : 'pill-cyan');
        if (isSel) cls += ' pill-selected';

        var label = m.type === 'P2P_AVAILABLE' ? '⚡ ₹' + m.pricePerKwh + '/u' :
                    (m.type === 'P2P_BUSY' ? '⏳ ' + (m.busyWaitMins || 25) + 'm' : '⚡ ' + m.powerKw + 'kW');

        var icon = L.divIcon({
          className: '',
          html: '<div class="custom-pill ' + cls + '">' + label + '</div>',
          iconSize: [60, 24],
          iconAnchor: [30, 24]
        });

        var marker = L.marker([m.lat, m.lng], { icon: icon });
        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_MARKER', id: m.id, lat: m.lat, lng: m.lng }));
          }
        });
        markerLayer.addLayer(marker);
      });
    }

    renderMarkers();

    // Route Polyline function
    function updateRoute(destLat, destLng) {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      if (destLat && destLng) {
        // Road-like intermediate waypoints from user GPS to destination
        var midLat = (${userLocation.lat} + destLat) / 2;
        var midLng = (${userLocation.lng} + destLng) / 2 + 0.003;
        var waypoints = [
          [${userLocation.lat}, ${userLocation.lng}],
          [midLat, midLng],
          [destLat, destLng]
        ];
        routeLine = L.polyline(waypoints, {
          color: '#00F59B',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineJoin: 'round'
        }).addTo(map);
      }
    }

    // Listen for events from React Native
    window.setTileMode = function(mode) {
      map.removeLayer(currentLayer);
      currentLayer = tileLayers[mode] || tileLayers.street;
      currentLayer.addTo(map);
    };

    window.flyToCoordinate = function(lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 14.5, { duration: 0.8 });
    };

    window.setSelectedMarker = function(id, lat, lng, showRoute) {
      selectedId = id;
      renderMarkers();
      if (lat && lng) {
        map.flyTo([lat, lng], 14.5, { duration: 0.8 });
        if (showRoute) {
          updateRoute(lat, lng);
        } else if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }
      }
    };

    window.toggleRouteLine = function(enabled, lat, lng) {
      if (enabled && lat && lng) {
        updateRoute(lat, lng);
      } else if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
    };
  </script>
</body>
</html>
  `;

  // Update tile mode when changed in React Native
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.setTileMode('${tileMode}'); true;`);
    }
  }, [tileMode]);

  // Update selected marker and route when selectedMarkerId changes
  useEffect(() => {
    if (webViewRef.current && selectedMarkerId) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (marker) {
        webViewRef.current.injectJavaScript(
          `window.setSelectedMarker('${marker.id}', ${marker.lat}, ${marker.lng}, ${showRouteLine}); true;`
        );
      }
    }
  }, [selectedMarkerId, showRouteLine]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "SELECT_MARKER" && data.id) {
        onSelectMarker(data.id);
      }
    } catch {}
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: leafletHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
        onMessage={handleMessage}
        renderLoading={() => <View style={{ flex: 1, backgroundColor: "#06090E" }} />}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: "#06090E",
  },
});

