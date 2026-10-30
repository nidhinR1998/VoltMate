import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export type MapLayerMode = "light" | "street" | "satellite";

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
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  centerLat,
  centerLng,
  zoom = 14,
  layerMode = "light",
  stations,
  selectedStationId,
  showRouteLine = false,
  routeCoordinates,
  onSelectStation,
  interactive = true,
  miniPreviewMode = false,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webViewRef.current) {
      const payload = JSON.stringify({
        type: "UPDATE_MAP",
        layerMode,
        stations,
        selectedStationId,
        showRouteLine,
        routeCoordinates,
        centerLat,
        centerLng,
        miniPreviewMode,
      });
      webViewRef.current.postMessage(payload);
    }
  }, [
    layerMode,
    stations,
    selectedStationId,
    showRouteLine,
    routeCoordinates,
    centerLat,
    centerLng,
    miniPreviewMode,
  ]);

  const initialStationsJson = JSON.stringify(stations);
  const initialRouteJson = JSON.stringify(routeCoordinates || []);

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

    /* Reference Image Station Marker: Rounded Square + Distance Label */
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
      background: rgba(242, 244, 243, 0.88);
      padding: 1px 6px;
      border-radius: 6px;
      white-space: nowrap;
      letter-spacing: -0.2px;
    }

    /* Glowing Green EV Car Marker for Mini Map & User GPS */
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
    const centerLat = ${centerLat};
    const centerLng = ${centerLng};
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
      street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
    };

    let currentLayer = tileLayers['${layerMode}'] || tileLayers.light;
    currentLayer.addTo(map);

    // User EV Car Marker
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
            weight: 3,
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
          if (msg.stations) stationsData = msg.stations;
          if (msg.selectedStationId !== undefined) selectedId = msg.selectedStationId;
          if (msg.showRouteLine !== undefined) showRoute = msg.showRouteLine;
          if (msg.routeCoordinates !== undefined) customRouteCoords = msg.routeCoordinates;
          if (msg.miniPreviewMode !== undefined) isMiniPreview = msg.miniPreviewMode;
          renderStations();
        } else if (msg.type === 'RECENTER') {
          map.flyTo([msg.lat || centerLat, msg.lng || centerLng], 15, { duration: 0.7 });
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
});
