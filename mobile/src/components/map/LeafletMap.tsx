import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { WebView } from "react-native-webview";
import { Zap, Home as HomeIcon } from "lucide-react-native";
import { COLORS, TYPOGRAPHY } from "../../theme/tokens";
import { GOOGLE_MAPS_API_KEY } from "../../services/api";

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
  focusSeq?: number;
  activeLayer: "standard" | "satellite" | "hybrid" | "terrain" | "street" | "dark";
  markers: MapMarkerItem[];
  selectedMarkerId?: string;
  routeCoords?: Array<[number, number]>;
  onSelectMarker?: (id: string) => void;
  onRegionChangeComplete?: (lat: number, lng: number, isGesture?: boolean) => void;
  onMapPress?: (lat: number, lng: number) => void;
  compactMode?: boolean;
  showsTraffic?: boolean;
  preferredEngine?: "auto" | "google" | "leaflet";
}

const RAW_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY;

const HAS_VALID_GOOGLE_MAPS_KEY =
  RAW_GOOGLE_MAPS_KEY.length > 20 &&
  RAW_GOOGLE_MAPS_KEY.startsWith("AIza") &&
  !RAW_GOOGLE_MAPS_KEY.includes("YOUR_") &&
  !RAW_GOOGLE_MAPS_KEY.includes("CDKZnHk606");

export const LeafletMap: React.FC<LeafletMapProps> = ({
  centerLat = 12.1045,
  centerLng = 75.2058,
  userCoords = null,
  zoom = 15,
  focusSeq = 0,
  activeLayer = "standard",
  markers,
  selectedMarkerId,
  routeCoords,
  onSelectMarker,
  onRegionChangeComplete,
  onMapPress,
  compactMode = false,
  showsTraffic = true,
  preferredEngine = "auto",
}) => {
  const mapRef = useRef<MapView | null>(null);
  const webViewRef = useRef<WebView | null>(null);

  const isWeb = Platform.OS === "web";
  const useGoogleMaps =
    !isWeb &&
    (preferredEngine === "google"
      ? HAS_VALID_GOOGLE_MAPS_KEY
      : preferredEngine === "leaflet"
      ? false
      : HAS_VALID_GOOGLE_MAPS_KEY);

  const normalizedMapType = useMemo(() => {
    if (activeLayer === "satellite") return "satellite";
    if (activeLayer === "hybrid") return "hybrid";
    if (activeLayer === "terrain") return "terrain";
    return "standard";
  }, [activeLayer]);

  const latDelta = useMemo(() => {
    if (compactMode) return 0.018;
    if (zoom >= 15) return 0.018;
    if (zoom <= 12) return 0.055;
    return 0.022;
  }, [compactMode, zoom]);

  const pushStateToWebView = () => {
    if (webViewRef.current) {
      const payload = JSON.stringify({
        centerLat,
        centerLng,
        userCoords,
        zoom,
        focusSeq,
        selectedMarkerId,
        activeLayer,
        showsTraffic: compactMode ? false : showsTraffic,
        markers,
        routeCoords,
      });
      webViewRef.current.injectJavaScript(
        `if(window.updateMapState){window.updateMapState(${payload});} true;`
      );
    }
  };

  useEffect(() => {
    if (useGoogleMaps && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(centerLat) || 12.1045,
          longitude: Number(centerLng) || 75.2058,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        },
        320
      );
    }
  }, [useGoogleMaps, centerLat, centerLng, latDelta, focusSeq]);

  useEffect(() => {
    if (!useGoogleMaps) {
      pushStateToWebView();
    }
  }, [
    useGoogleMaps,
    centerLat,
    centerLng,
    userCoords,
    zoom,
    focusSeq,
    selectedMarkerId,
    activeLayer,
    showsTraffic,
    markers,
    routeCoords,
    compactMode,
  ]);

  const polylinePoints = useMemo(() => {
    if (routeCoords && routeCoords.length > 1) {
      return routeCoords.map(([latitude, longitude]) => ({ latitude, longitude }));
    }
    return [];
  }, [routeCoords]);

  const leafletHtml = useMemo(() => {
    const initialData = JSON.stringify({
      centerLat,
      centerLng,
      userCoords,
      zoom: Math.min(18, compactMode ? 15 : zoom),
      compactMode,
      selectedMarkerId,
      activeLayer,
      showsTraffic: compactMode ? false : showsTraffic,
      markers,
      routeCoords: routeCoords && routeCoords.length > 1 ? routeCoords : [],
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
  html, body {
    width: 100%; height: 100%; margin: 0; padding: 0;
    overflow: hidden; background: #E5E3DF;
    font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  #map {
    position: absolute; top: 0; bottom: 0; left: 0; right: 0;
    width: 100%; height: 100%; background: #E5E3DF;
  }
  .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }

  @keyframes pinDrop {
    0% { transform: translate(-50%, -120%) scale(0.75); opacity: 0; }
    100% { transform: translate(-50%, -92%) scale(1); opacity: 1; }
  }
  .gm-marker-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -92%);
    cursor: pointer;
    animation: pinDrop 0.22s ease-out;
  }
  .gm-price-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #FFFFFF;
    color: #111814;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(15,23,19,0.22);
    border: 1.5px solid #0B6E3F;
    transition: all 0.2s ease-out;
  }
  .gm-price-pill.p2p {
    border-color: #1D4ED8;
  }
  .gm-price-pill.selected {
    background: #0B6E3F;
    color: #FFFFFF;
    border-color: #FFFFFF;
    padding: 5px 12px;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(11, 110, 63, 0.45);
    transform: scale(1.08);
  }
  .gm-cluster-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: #0B6E3F;
    color: #FFFFFF;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    border: 2px solid #FFFFFF;
    box-shadow: 0 4px 12px rgba(15,23,19,0.32);
  }
  .gm-pin-head {
    margin-top: 2px;
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    background: #0B6E3F;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #FFFFFF;
    box-shadow: 0 3px 8px rgba(0,0,0,0.28);
    transition: all 0.2s ease-out;
  }
  .gm-pin-head.p2p-blue {
    background: #1D4ED8;
  }
  .gm-pin-head.selected {
    width: 38px;
    height: 38px;
    background: #074D2B;
    border: 2.5px solid #FFFFFF;
    box-shadow: 0 5px 14px rgba(0,0,0,0.38);
  }
  .gm-pin-inner {
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
  }
  .gm-pin-shadow {
    width: 10px;
    height: 4px;
    border-radius: 50%;
    background: rgba(0,0,0,0.22);
    margin-top: 2px;
  }

  @keyframes gmPulse {
    0% { transform: scale(0.85); opacity: 0.85; }
    70% { transform: scale(1.65); opacity: 0.15; }
    100% { transform: scale(1.85); opacity: 0; }
  }
  .gm-blue-wrap {
    position: relative;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
  }
  .gm-blue-pulse {
    position: absolute;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(66, 133, 244, 0.28);
    border: 1px solid rgba(66, 133, 244, 0.55);
    animation: gmPulse 2.2s infinite ease-out;
  }
  .gm-blue-dot {
    position: relative;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4285F4;
    border: 3px solid #FFFFFF;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var init = ${initialData};
  var currentState = init;
  var map = null;
  var markerLayer = null;
  var routeLayer = null;
  var currentTile = null;
  var tileLayers = null;

  var SVG_BOLT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
  var SVG_HOME = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';

  function resolveDesiredTileKey(state) {
    if (state.activeLayer === 'satellite') return 'satellite';
    if (state.activeLayer === 'hybrid') return 'hybrid';
    if (state.activeLayer === 'terrain') return 'terrain';
    if (!state.compactMode && state.showsTraffic) return 'traffic';
    return 'standard';
  }

  function clusterMarkers(rawMarkers, selectedId, currentZoom, isCompact) {
    if (!rawMarkers || !rawMarkers.length) return [];
    // Cluster threshold in degrees (~0.0012 deg at zoom 15, smaller when zoomed in)
    var threshold = isCompact ? 0.0022 : (currentZoom >= 16 ? 0.00055 : currentZoom >= 14 ? 0.0014 : 0.004);
    var clusters = [];

    rawMarkers.forEach(function(m) {
      var isSel = m.id === selectedId;
      var matchedCluster = null;
      if (!isSel) {
        for (var i = 0; i < clusters.length; i++) {
          var c = clusters[i];
          if (c.hasSelected) continue;
          var dLat = Math.abs(c.lat - m.lat);
          var dLng = Math.abs(c.lng - m.lng);
          if (dLat < threshold && dLng < threshold) {
            matchedCluster = c;
            break;
          }
        }
      }
      if (matchedCluster) {
        matchedCluster.items.push(m);
      } else {
        clusters.push({
          lat: m.lat,
          lng: m.lng,
          hasSelected: isSel,
          items: [m]
        });
      }
    });
    return clusters;
  }

  function renderAll(state) {
    if (!map || typeof L === 'undefined' || !markerLayer || !routeLayer) return;
    markerLayer.clearLayers();
    routeLayer.clearLayers();

    if (state.routeCoords && state.routeCoords.length > 1) {
      L.polyline(state.routeCoords, {
        color: '#0B6E3F',
        weight: state.compactMode ? 6 : 7,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.92
      }).addTo(routeLayer);
    }

    var gpsLat = state.userCoords && state.userCoords.latitude ? state.userCoords.latitude : state.centerLat;
    var gpsLng = state.userCoords && state.userCoords.longitude ? state.userCoords.longitude : state.centerLng;
    var blueDotIcon = L.divIcon({
      className: '',
      html: '<div class="gm-blue-wrap"><div class="gm-blue-pulse"></div><div class="gm-blue-dot"></div></div>',
      iconSize: [44, 44]
    });
    L.marker([gpsLat, gpsLng], { icon: blueDotIcon, zIndexOffset: 999 }).addTo(markerLayer);

    var zoomLvl = map.getZoom() || state.zoom || 15;
    var grouped = clusterMarkers(state.markers || [], state.selectedMarkerId, zoomLvl, state.compactMode);

    grouped.forEach(function(cluster) {
      if (cluster.items.length > 1) {
        var first = cluster.items[0];
        var count = cluster.items.length;
        var clusterHtml = '<div class="gm-marker-wrap">' +
          '<div class="gm-cluster-pill">' + count + ' Chargers • ' + (first.price || '') + '</div>' +
          '<div class="gm-pin-head"><span class="gm-pin-inner">' + SVG_BOLT + '</span></div>' +
          '<div class="gm-pin-shadow"></div>' +
        '</div>';
        var cIcon = L.divIcon({ className: '', html: clusterHtml, iconSize: [110, 66] });
        var cMarker = L.marker([cluster.lat, cluster.lng], { icon: cIcon, zIndexOffset: 250 }).addTo(markerLayer);
        cMarker.on('click', function() {
          if (map.getZoom() < 17) {
            map.flyTo([cluster.lat, cluster.lng], Math.min(18, map.getZoom() + 2), { animate: true, duration: 0.3 });
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_MARKER', id: first.id }));
          }
        });
        return;
      }

      var m = cluster.items[0];
      var isSelected = m.id === state.selectedMarkerId;
      var isP2P = m.type === 'P2P_HOME';
      var badgeText = (m.powerKw ? m.powerKw + 'kW • ' : '') + (m.price || '');
      var iconSvg = isP2P ? SVG_HOME : SVG_BOLT;
      var pillClass = 'gm-price-pill' + (isP2P ? ' p2p' : '') + (isSelected ? ' selected' : '');
      var pinClass = 'gm-pin-head' + (isP2P ? ' p2p-blue' : '') + (isSelected ? ' selected' : '');

      var html = '<div class="gm-marker-wrap">' +
        (!state.compactMode || isSelected ? '<div class="' + pillClass + '">' + badgeText + '</div>' : '') +
        '<div class="' + pinClass + '">' +
          '<span class="gm-pin-inner">' + iconSvg + '</span>' +
        '</div>' +
        '<div class="gm-pin-shadow"></div>' +
      '</div>';

      var icon = L.divIcon({ className: '', html: html, iconSize: [96, 66] });
      var marker = L.marker([m.lat, m.lng], {
        icon: icon,
        zIndexOffset: isSelected ? 600 : 100
      }).addTo(markerLayer);
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_MARKER', id: m.id }));
        }
      });
    });
  }

  function startMap() {
    if (typeof L === 'undefined') {
      setTimeout(startMap, 50);
      return;
    }
    if (map) return;

    try {
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        minZoom: 4,
        maxZoom: 20,
        dragging: !currentState.compactMode,
        scrollWheelZoom: !currentState.compactMode,
        touchZoom: !currentState.compactMode,
        doubleClickZoom: !currentState.compactMode,
      }).setView([Number(currentState.centerLat) || 12.0988, Number(currentState.centerLng) || 75.1952], Math.min(17, currentState.zoom || 15));

      tileLayers = {
        standard: L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }),
        traffic: L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }),
        satellite: L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }),
        hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }),
        terrain: L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
          maxZoom: 20,
        }),
      };

      var desiredKey = resolveDesiredTileKey(currentState);
      currentTile = tileLayers[desiredKey] || tileLayers.standard;
      currentTile.addTo(map);

      markerLayer = L.layerGroup().addTo(map);
      routeLayer = L.layerGroup().addTo(map);

      map.on('zoomend', function() {
        renderAll(currentState);
      });

      map.on('dragend', function() {
        var c = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REGION_CHANGE', lat: c.lat, lng: c.lng, isGesture: true }));
        }
      });

      map.on('click', function(e) {
        if (window.ReactNativeWebView && e && e.latlng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_PRESS', lat: e.latlng.lat, lng: e.latlng.lng }));
        }
      });

      renderAll(currentState);

      setTimeout(function() { if (map) map.invalidateSize(); }, 150);
      setTimeout(function() { if (map) map.invalidateSize(); }, 500);
    } catch (err) {
      console.error(err);
    }
  }

  window.updateMapState = function(next) {
    if (!next) return;
    var prevSeq = currentState.focusSeq;
    var prevLat = currentState.centerLat;
    var prevLng = currentState.centerLng;
    currentState = Object.assign({}, currentState, next);
    if (!map || typeof L === 'undefined') {
      return;
    }
    var desiredKey = resolveDesiredTileKey(currentState);
    if (tileLayers && tileLayers[desiredKey] && currentTile !== tileLayers[desiredKey]) {
      map.removeLayer(currentTile);
      currentTile = tileLayers[desiredKey];
      currentTile.addTo(map);
    }
    if (next.centerLat && next.centerLng) {
      var targetLat = Number(next.centerLat) + (currentState.compactMode ? 0 : -0.0018);
      var targetLng = Number(next.centerLng);
      if (next.focusSeq && next.focusSeq !== prevSeq) {
        map.flyTo([targetLat, targetLng], Math.max(map.getZoom(), next.zoom || 16), { animate: true, duration: 0.35 });
      } else if (next.centerLat !== prevLat || next.centerLng !== prevLng) {
        map.panTo([targetLat, targetLng], { animate: true, duration: 0.28 });
      }
    }
    renderAll(currentState);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMap);
  } else {
    startMap();
  }
</script>
</body>
</html>`;
  }, []);

  if (!useGoogleMaps) {
    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: leafletHtml, baseUrl: "https://mt1.google.com" }}
          style={styles.map}
          scrollEnabled={!compactMode}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
          androidLayerType="hardware"
          scalesPageToFit={false}
          onLoadEnd={pushStateToWebView}
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
        maxZoomLevel={19}
        minZoomLevel={4}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={!compactMode && showsTraffic}
        showsBuildings={!compactMode}
        showsPointsOfInterest={!compactMode}
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
            strokeColor={COLORS.primary}
            strokeWidth={compactMode ? 4 : 6}
            lineCap="round"
            lineJoin="round"
          />
        )}

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
              description={`${isP2P ? "P2P Host" : "Public Hub"} • ${m.price}/kWh • ${m.powerKw} kW`}
              pinColor={isSelected ? COLORS.primary : isP2P ? "#1D4ED8" : COLORS.primary}
              zIndex={isSelected ? 500 : 100}
              onPress={(e) => {
                e.stopPropagation();
                if (onSelectMarker) onSelectMarker(m.id);
              }}
            >
              <View style={styles.pinWrap} collapsable={false}>
                {(!compactMode || isSelected) && (
                  <View
                    style={[
                      styles.distBadge,
                      isSelected && styles.distBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.distText,
                        isSelected && styles.distTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {m.powerKw ? `${m.powerKw}kW • ` : ""}
                      {m.price}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.pinBox,
                    isP2P && styles.pinBoxP2P,
                    isSelected && styles.pinBoxSelected,
                  ]}
                >
                  {isP2P ? (
                    <HomeIcon size={15} color="#FFFFFF" />
                  ) : (
                    <Zap size={15} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
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
    backgroundColor: "#E5E3DF",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  userBlueDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    width: 108,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 5,
  },
  pinBoxP2P: {
    backgroundColor: "#1D4ED8",
  },
  pinBoxSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    borderColor: "#FFFFFF",
    borderWidth: 2.5,
  },
  distBadge: {
    marginBottom: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    elevation: 3,
  },
  distBadgeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: "#FFFFFF",
  },
  distText: {
    fontSize: 10,
    fontWeight: "800",
    ...TYPOGRAPHY.tabular,
    color: "#111814",
  },
  distTextSelected: {
    color: "#FFFFFF",
  },
});
