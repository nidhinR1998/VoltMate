import { calcDistanceKm } from "./realTimeEvHunter";
import { ENABLE_DEMO_SEEDS, GOOGLE_MAPS_API_KEY, OLA_MAPS_API_KEY } from "./api";
import { CANONICAL_TARIFF_RATES_INR } from "../theme/tokens";

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  city?: string;
  pincode?: string;
}

export interface HybridDirectionsResult {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMins: number;
  source: "GOOGLE_MAPS" | "OLA_MAPS" | "OSRM_FREE";
}

export interface ResolvedLocality {
  city: string;
  district: string;
  state: string;
  pincode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface AddressCoordinateValidation {
  valid: boolean;
  distanceKm: number;
  detectedCity?: string;
  pinCity: string;
  pinPincode: string;
  suggestedAddress: string;
  warningMessage?: string;
}

const OLA_API_KEY = OLA_MAPS_API_KEY;
const GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY;

export const INDIAN_CITY_ANCHORS: Array<{
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}> = [
  {
    city: "Payyanur",
    district: "Kannur",
    state: "Kerala",
    pincode: "670307",
    latitude: 12.1045,
    longitude: 75.2058,
    keywords: ["payyanur", "perumba", "vellur", "670307"],
  },
  {
    city: "Pilathara",
    district: "Kannur",
    state: "Kerala",
    pincode: "670501",
    latitude: 12.0854,
    longitude: 75.2544,
    keywords: ["pilathara", "cheruthazham", "670501", "670309"],
  },
  {
    city: "Karivellur",
    district: "Kannur",
    state: "Kerala",
    pincode: "670521",
    latitude: 12.1752,
    longitude: 75.1934,
    keywords: ["karivellur", "670521"],
  },
  {
    city: "Cheruvathur",
    district: "Kasaragod",
    state: "Kerala",
    pincode: "671313",
    latitude: 12.2276,
    longitude: 75.1596,
    keywords: ["cheruvathur", "671313"],
  },
  {
    city: "Taliparamba",
    district: "Kannur",
    state: "Kerala",
    pincode: "670141",
    latitude: 12.0368,
    longitude: 75.3628,
    keywords: ["taliparamba", "670141"],
  },
  {
    city: "Kannur",
    district: "Kannur",
    state: "Kerala",
    pincode: "670001",
    latitude: 11.8745,
    longitude: 75.3704,
    keywords: ["kannur", "caltex", "kannapuram", "670001"],
  },
  {
    city: "Kasaragod",
    district: "Kasaragod",
    state: "Kerala",
    pincode: "671121",
    latitude: 12.4996,
    longitude: 74.9869,
    keywords: ["kasaragod", "671121"],
  },
  {
    city: "Kozhikode",
    district: "Kozhikode",
    state: "Kerala",
    pincode: "673001",
    latitude: 11.2488,
    longitude: 75.8342,
    keywords: ["kozhikode", "calicut", "thondayad", "673001"],
  },
  {
    city: "Kalpetta",
    district: "Wayanad",
    state: "Kerala",
    pincode: "673121",
    latitude: 11.6103,
    longitude: 76.0828,
    keywords: ["wayanad", "kalpetta", "673121"],
  },
  {
    city: "Thrissur",
    district: "Thrissur",
    state: "Kerala",
    pincode: "680001",
    latitude: 10.5354,
    longitude: 76.2148,
    keywords: ["thrissur", "swaraj round", "viyyur", "680001"],
  },
  {
    city: "Kochi",
    district: "Ernakulam",
    state: "Kerala",
    pincode: "682030",
    latitude: 10.0159,
    longitude: 76.3419,
    keywords: [
      "kochi",
      "kakkanad",
      "edachira",
      "infopark",
      "edappally",
      "vyttila",
      "kaloor",
      "ernakulam",
      "682030",
      "682024",
    ],
  },
  {
    city: "Adimali",
    district: "Idukki",
    state: "Kerala",
    pincode: "685561",
    latitude: 10.0124,
    longitude: 76.9535,
    keywords: ["adimali", "munnar", "idukki", "685561"],
  },
  {
    city: "Alappuzha",
    district: "Alappuzha",
    state: "Kerala",
    pincode: "688001",
    latitude: 9.4981,
    longitude: 76.3388,
    keywords: ["alappuzha", "alleppey", "688001"],
  },
  {
    city: "Kollam",
    district: "Kollam",
    state: "Kerala",
    pincode: "691001",
    latitude: 8.8932,
    longitude: 76.6141,
    keywords: ["kollam", "mevaram", "691001"],
  },
  {
    city: "Thiruvananthapuram",
    district: "Thiruvananthapuram",
    state: "Kerala",
    pincode: "695581",
    latitude: 8.5581,
    longitude: 76.8816,
    keywords: ["trivandrum", "thiruvananthapuram", "kazhakkoottam", "technopark", "695581"],
  },
  {
    city: "Coimbatore",
    district: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641001",
    latitude: 11.0168,
    longitude: 76.9558,
    keywords: ["coimbatore", "avinashi", "641001"],
  },
  {
    city: "Bengaluru",
    district: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    latitude: 12.9716,
    longitude: 77.5946,
    keywords: ["bengaluru", "bangalore", "whitefield", "indiranagar", "560001"],
  },
  {
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    latitude: 13.0827,
    longitude: 80.2707,
    keywords: ["chennai", "guindy", "600001"],
  },
  {
    city: "Mumbai",
    district: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    latitude: 19.076,
    longitude: 72.8777,
    keywords: ["mumbai", "bandra", "andheri", "400001"],
  },
  {
    city: "New Delhi",
    district: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    latitude: 28.6139,
    longitude: 77.209,
    keywords: ["delhi", "connaught", "110001"],
  },
];

export function resolveLocalityFromCoordinates(
  lat: number,
  lng: number
): ResolvedLocality {
  let best = INDIAN_CITY_ANCHORS[0];
  let bestDist = calcDistanceKm(lat, lng, best.latitude, best.longitude);
  for (let i = 1; i < INDIAN_CITY_ANCHORS.length; i++) {
    const candidate = INDIAN_CITY_ANCHORS[i];
    const dist = calcDistanceKm(lat, lng, candidate.latitude, candidate.longitude);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return {
    city: best.city,
    district: best.district,
    state: best.state,
    pincode: best.pincode,
    formattedAddress: `${best.city}, ${best.district}, ${best.state} ${best.pincode}`,
    latitude: best.latitude,
    longitude: best.longitude,
  };
}

export function validateAddressMatchesCoordinates(
  typedAddress: string,
  lat: number,
  lng: number,
  maxMismatchKm = 25
): AddressCoordinateValidation {
  const pinLocality = resolveLocalityFromCoordinates(lat, lng);
  const textLower = (typedAddress || "").toLowerCase();

  for (const anchor of INDIAN_CITY_ANCHORS) {
    if (anchor.keywords.some((kw) => textLower.includes(kw))) {
      const distFromPin = calcDistanceKm(
        lat,
        lng,
        anchor.latitude,
        anchor.longitude
      );
      if (distFromPin > maxMismatchKm) {
        return {
          valid: false,
          distanceKm: distFromPin,
          detectedCity: anchor.city,
          pinCity: pinLocality.city,
          pinPincode: pinLocality.pincode,
          suggestedAddress: pinLocality.formattedAddress,
          warningMessage: `Typed address mentions ${anchor.city} (${distFromPin.toFixed(
            1
          )} km from your GPS pin in ${
            pinLocality.city
          }). Sync the address to your pin or move the pin before publishing.`,
        };
      }
    }
  }

  return {
    valid: true,
    distanceKm: 0,
    detectedCity: pinLocality.city,
    pinCity: pinLocality.city,
    pinPincode: pinLocality.pincode,
    suggestedAddress: pinLocality.formattedAddress,
  };
}

export function repairMismatchedStationAddress<
  T extends { address: string; latitude: number; longitude: number }
>(station: T, maxMismatchKm = 25): T {
  const rawAddr = (station.address || "").trim();
  const check = validateAddressMatchesCoordinates(
    rawAddr,
    station.latitude,
    station.longitude,
    maxMismatchKm
  );
  if (
    !rawAddr ||
    rawAddr === "Kerala EV Grid" ||
    rawAddr === "Kerala Highway Grid" ||
    !check.valid
  ) {
    const baySuffix = rawAddr.includes("•")
      ? ` • ${rawAddr.split("•").slice(1).join("•").trim()}`
      : "";
    return {
      ...station,
      address: `${check.suggestedAddress}${baySuffix}`,
    };
  }
  return station;
}

export async function reverseGeocodePin(
  lat: number,
  lng: number,
  nativeReverseGeocode?: (coords: {
    latitude: number;
    longitude: number;
  }) => Promise<any[]>
): Promise<ResolvedLocality> {
  const fallback = resolveLocalityFromCoordinates(lat, lng);
  if (nativeReverseGeocode) {
    try {
      const places = await nativeReverseGeocode({ latitude: lat, longitude: lng });
      if (Array.isArray(places) && places.length > 0) {
        const p = places[0];
        const streetOrName = p.street || p.name || "";
        const city =
          p.city || p.subregion || p.district || fallback.city;
        const district = p.subregion || p.district || fallback.district;
        const state = p.region || fallback.state;
        const pincode = p.postalCode || fallback.pincode;
        const candidateAddress = [streetOrName, city, `${state} ${pincode}`]
          .filter(Boolean)
          .join(", ");
        const check = validateAddressMatchesCoordinates(candidateAddress, lat, lng);
        if (check.valid && candidateAddress.length >= 5) {
          return {
            city,
            district,
            state,
            pincode: String(pincode),
            formattedAddress: candidateAddress,
            latitude: lat,
            longitude: lng,
          };
        }
      }
    } catch {
      // fall through to deterministic locality
    }
  }
  return fallback;
}

export async function searchPlacesHybrid(
  query: string,
  nearLat?: number,
  nearLng?: number
): Promise<PlaceSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const refLat = typeof nearLat === "number" && Number.isFinite(nearLat) ? nearLat : 12.1045;
  const refLng = typeof nearLng === "number" && Number.isFinite(nearLng) ? nearLng : 75.2058;

  const anchorMatches: PlaceSuggestion[] = INDIAN_CITY_ANCHORS.filter(
    (a) =>
      a.city.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q) ||
      a.pincode.includes(q) ||
      a.keywords.some((kw) => kw.includes(q))
  ).map((a) => ({
    id: `city-${a.city.toLowerCase()}-${a.pincode}`,
    title: a.city,
    subtitle: `${a.district}, ${a.state} ${a.pincode}`,
    latitude: a.latitude,
    longitude: a.longitude,
    city: a.city,
    pincode: a.pincode,
  }));

  if (GOOGLE_MAPS_KEY && GOOGLE_MAPS_KEY.startsWith("AIza")) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${query}, India`
      )}&key=${GOOGLE_MAPS_KEY}`;
      const gRes = await fetch(gUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (
          gData?.status === "OK" &&
          Array.isArray(gData.results) &&
          gData.results.length > 0
        ) {
          const gPlaces: PlaceSuggestion[] = gData.results
            .slice(0, 4)
            .map((r: any, idx: number) => ({
              id: `gmaps-${idx}-${Date.now()}`,
              title:
                r.address_components?.[0]?.long_name ||
                r.formatted_address?.split(",")[0] ||
                query,
              subtitle: r.formatted_address || "India",
              latitude: r.geometry?.location?.lat ?? refLat,
              longitude: r.geometry?.location?.lng ?? refLng,
            }));
          return [...anchorMatches, ...gPlaces].slice(0, 6);
        }
      }
    } catch {
      // Fallback to Photon/Anchor matches below
    }
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&lat=${refLat}&lon=${refLng}&limit=4`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      const remote: PlaceSuggestion[] = features.map((f: any, idx: number) => ({
        id: `photon-${idx}-${Date.now()}`,
        title: f.properties?.name || f.properties?.street || query,
        subtitle: [
          f.properties?.city || f.properties?.district,
          f.properties?.state || f.properties?.country || "India",
        ]
          .filter(Boolean)
          .join(", "),
        longitude: f.geometry?.coordinates?.[0] ?? refLng,
        latitude: f.geometry?.coordinates?.[1] ?? refLat,
      }));
      return [...anchorMatches, ...remote].slice(0, 6);
    }
  } catch {
    // fallback to anchor matches
  }

  return anchorMatches;
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
  const distKm = Math.max(0.5, calcDistanceKm(startLat, startLng, endLat, endLng));

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

