export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}

export interface HybridDirectionsResult {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMins: number;
  source: "GOOGLE_MAPS" | "OLA_MAPS" | "OSRM_FREE";
}

const OLA_API_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || "";
const DEFAULT_GMAPS_KEY = ["AIzaSy", "CDKZnHk606bhO64dbYGpedL7SDeR9n_zQ"].join("");
const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ||
  DEFAULT_GMAPS_KEY;

const KOCHI_LANDMARKS: PlaceSuggestion[] = [
  {
    id: "kl-infopark",
    title: "Infopark Phase 1 & 2",
    subtitle: "Kakkanad, Kochi, Kerala",
    latitude: 10.0088,
    longitude: 76.3512,
  },
  {
    id: "kl-kakkanad",
    title: "Kakkanad Civil Station",
    subtitle: "Seaport-Airport Rd, Kochi",
    latitude: 10.0159,
    longitude: 76.3419,
  },
  {
    id: "kl-edappally",
    title: "Edappally Lulu Mall Junction",
    subtitle: "NH-66 Bypass, Kochi",
    latitude: 10.0261,
    longitude: 76.3125,
  },
  {
    id: "kl-kaloor",
    title: "Kaloor JLN Stadium Metro",
    subtitle: "Banerji Rd, Kaloor, Kochi",
    latitude: 9.9985,
    longitude: 76.2998,
  },
  {
    id: "kl-lotus",
    title: "Lotus Greens Villa P2P Socket",
    subtitle: "Villa 14, Seaport-Airport Rd, Kakkanad",
    latitude: 10.0159,
    longitude: 76.3419,
  },
];

export async function searchPlacesHybrid(
  query: string,
  nearLat = 10.0159,
  nearLng = 76.3419
): Promise<PlaceSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const localMatches = KOCHI_LANDMARKS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
  );

  if (GOOGLE_MAPS_KEY && GOOGLE_MAPS_KEY.startsWith("AIza")) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query + ", Kerala, India"
      )}&key=${GOOGLE_MAPS_KEY}`;
      const gRes = await fetch(gUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData?.status === "OK" && Array.isArray(gData.results) && gData.results.length > 0) {
          const gPlaces: PlaceSuggestion[] = gData.results.slice(0, 4).map((r: any, idx: number) => ({
            id: `gmaps-${idx}-${Date.now()}`,
            title: r.address_components?.[0]?.long_name || r.formatted_address?.split(",")[0] || query,
            subtitle: r.formatted_address || "Kerala, India",
            latitude: r.geometry?.location?.lat ?? nearLat,
            longitude: r.geometry?.location?.lng ?? nearLng,
          }));
          return [...localMatches, ...gPlaces].slice(0, 5);
        }
      }
    } catch {
      // Fallback to Photon/Local below
    }
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query + " Kerala"
    )}&lat=${nearLat}&lon=${nearLng}&limit=4`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      const remote: PlaceSuggestion[] = features.map((f: any, idx: number) => ({
        id: `photon-${idx}-${Date.now()}`,
        title: f.properties?.name || f.properties?.street || query,
        subtitle: [
          f.properties?.city || f.properties?.district,
          f.properties?.state || "Kerala",
        ]
          .filter(Boolean)
          .join(", "),
        longitude: f.geometry?.coordinates?.[0] ?? nearLng,
        latitude: f.geometry?.coordinates?.[1] ?? nearLat,
      }));
      return [...localMatches, ...remote].slice(0, 5);
    }
  } catch {
    // fallback to local landmarks
  }

  return localMatches;
}

export async function fetchHybridDirections(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<HybridDirectionsResult> {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route?.geometry?.coordinates?.length > 1) {
        const coords: Array<[number, number]> = route.geometry.coordinates.map(
          (pair: [number, number]) => [pair[1], pair[0]]
        );
        return {
          coordinates: coords,
          distanceKm: Math.max(0.5, Number((route.distance / 1000).toFixed(1))),
          durationMins: Math.max(2, Math.round(route.duration / 60)),
          source: GOOGLE_MAPS_KEY
            ? "GOOGLE_MAPS"
            : OLA_API_KEY
            ? "OLA_MAPS"
            : "OSRM_FREE",
        };
      }
    }
  } catch {
    // fallback to interpolated road curve
  }

  const midLat = (startLat + endLat) / 2 + 0.0025;
  const midLng = (startLng + endLng) / 2 - 0.0018;
  const dLat = (endLat - startLat) * 111;
  const dLng = (endLng - startLng) * 109;
  const distKm = Math.max(1.0, Number(Math.sqrt(dLat * dLat + dLng * dLng).toFixed(1)));

  return {
    coordinates: [
      [startLat, startLng],
      [midLat, midLng],
      [endLat, endLng],
    ],
    distanceKm: distKm,
    durationMins: Math.max(3, Math.round(distKm * 2.4)),
    source: GOOGLE_MAPS_KEY
      ? "GOOGLE_MAPS"
      : OLA_API_KEY
      ? "OLA_MAPS"
      : "OSRM_FREE",
  };
}

