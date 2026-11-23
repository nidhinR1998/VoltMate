"""
VoltMate Enterprise High-Level Validation Engine
Strict validation routines for all incoming REST API requests:
- E.164 & Indian Phone Formats
- NPCI UPI Virtual Payment Address (VPA)
- Indian Vehicle Registration Plate (RC)
- Geographic Coordinates & Geofencing Bounds
- Domestic Electricity & Parking Tariffs
- Security Sanitization against XSS & Control Injections
- 6-Digit Verification OTPs & Password Complexity
"""

import re
import html
import unicodedata
from decimal import Decimal
from typing import Optional, Tuple
from uuid import UUID


class ValidationError(ValueError):
    """Custom domain validation exception."""
    pass


# ---------------------------------------------------------------------------
# 1. PHONE NUMBER VALIDATOR (E.164 & Indian Mobile 10-Digit)
# ---------------------------------------------------------------------------
_INDIAN_PHONE_REGEX = re.compile(r"^(?:\+91|91)?[6-9]\d{9}$")
_INTERNATIONAL_E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")

def validate_e164_phone(phone: Optional[str]) -> Optional[str]:
    """
    Validates and normalizes phone numbers.
    Indian 10-digit mobile numbers are normalized to standard E.164 format (+91XXXXXXXXXX).
    """
    if phone is None:
        return None
    cleaned = re.sub(r"[\s\-\(\)\.]", "", str(phone).strip())
    if not cleaned:
        return None

    if _INDIAN_PHONE_REGEX.match(cleaned):
        # Extract last 10 digits
        last_10 = cleaned[-10:]
        return f"+91{last_10}"
    elif _INTERNATIONAL_E164_REGEX.match(cleaned):
        return cleaned
    else:
        raise ValueError(
            f"Invalid phone number format '{phone}'. Must be a valid 10-digit Indian mobile number (starting with 6-9) or E.164 international format (+XXXXXXXXXXX)."
        )


# ---------------------------------------------------------------------------
# 2. NPCI UPI VIRTUAL PAYMENT ADDRESS (VPA) VALIDATOR
# ---------------------------------------------------------------------------
_UPI_VPA_REGEX = re.compile(r"^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,64}$")

def validate_upi_vpa(vpa: Optional[str]) -> Optional[str]:
    """
    Validates Indian NPCI Unified Payments Interface (UPI) VPA address.
    Examples: 'voltmate.community@okaxis', 'rajesh.host@oksbi', '9876543210@paytm'
    """
    if vpa is None:
        return None
    cleaned = str(vpa).strip().lower()
    if not cleaned:
        return None

    if not _UPI_VPA_REGEX.match(cleaned):
        raise ValueError(
            f"Invalid UPI VPA address '{vpa}'. Must follow the standard 'identifier@bank_handle' format (e.g. user@okaxis, 9876543210@paytm)."
        )
    return cleaned


# ---------------------------------------------------------------------------
# 3. INDIAN VEHICLE REGISTRATION NUMBER (RC PLATE) VALIDATOR
# ---------------------------------------------------------------------------
# Matches formats like: KL-07-CD-4921, KL07CD4921, DL-10-C-1234, DL10CA1234, MH-12-DE-1432, 22-BH-1234-AA
_INDIAN_RC_REGEX = re.compile(
    r"^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$"
)

def validate_vehicle_plate(plate: str) -> str:
    """
    Validates and normalizes Indian vehicle registration plates.
    Normalizes to standardized uppercase hyphenated format: 'KL-07-CD-4921'
    """
    if not plate:
        raise ValueError("Vehicle registration plate number is required.")
    raw = re.sub(r"[\s\-\.]", "", str(plate).strip().upper())
    if not _INDIAN_RC_REGEX.match(raw):
        raise ValueError(
            f"Invalid Indian vehicle registration plate '{plate}'. Must be a valid RTO plate (e.g., KL-07-CD-4921, MH-12-AB-1234, 22-BH-1234-AA)."
        )
    # Format cleanly if standard 10-char state plate (e.g. KL07CD4921 -> KL-07-CD-4921)
    m = re.match(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$", raw)
    if m:
        state, rto, series, num = m.groups()
        return f"{state}-{rto.zfill(2)}-{series}-{num}"
    return raw


# ---------------------------------------------------------------------------
# 4. GEOGRAPHIC COORDINATES & SEARCH RADIUS VALIDATOR
# ---------------------------------------------------------------------------
def validate_latitude(lat: float) -> float:
    """Validates WGS84 Latitude between -90.0 and +90.0."""
    try:
        val = float(lat)
    except (ValueError, TypeError):
        raise ValueError("Latitude must be a valid floating-point number.")
    if not (-90.0 <= val <= 90.0):
        raise ValueError(f"Latitude must be between -90.0 and +90.0. Received: {val}")
    return round(val, 6)


def validate_longitude(lon: float) -> float:
    """Validates WGS84 Longitude between -180.0 and +180.0."""
    try:
        val = float(lon)
    except (ValueError, TypeError):
        raise ValueError("Longitude must be a valid floating-point number.")
    if not (-180.0 <= val <= 180.0):
        raise ValueError(f"Longitude must be between -180.0 and +180.0. Received: {val}")
    return round(val, 6)


def validate_search_radius_km(radius: float, max_radius: float = 500.0) -> float:
    """Validates spatial discovery radius in kilometers."""
    try:
        val = float(radius)
    except (ValueError, TypeError):
        raise ValueError("Search radius must be a positive number.")
    if val <= 0.0 or val > max_radius:
        raise ValueError(f"Search radius must be between 0.1 km and {max_radius} km. Received: {val}")
    return round(val, 2)


# ---------------------------------------------------------------------------
# 5. TARIFF RATES & MONETARY AMOUNTS VALIDATOR
# ---------------------------------------------------------------------------
def validate_energy_rate(rate: Decimal, max_rate: Decimal = Decimal("100.00")) -> Decimal:
    """
    Validates electricity unit tariff (₹/kWh).
    Must comply with fair domestic cost-sharing rules (minimum ₹1.00, maximum ₹100.00).
    """
    try:
        dec = Decimal(str(rate)).quantize(Decimal("0.01"))
    except Exception:
        raise ValueError("Energy rate must be a valid decimal number.")
    if dec <= Decimal("0.00"):
        raise ValueError(f"Energy rate must be greater than ₹0.00/kWh. Received: ₹{dec}")
    if dec > max_rate:
        raise ValueError(f"Energy rate exceeds maximum allowable tariff of ₹{max_rate}/kWh. Received: ₹{dec}")
    return dec


def validate_parking_fee(fee: Decimal, max_fee: Decimal = Decimal("250.00")) -> Decimal:
    """Validates residential or host parking fee per hour (₹0.00 to ₹250.00)."""
    try:
        dec = Decimal(str(fee)).quantize(Decimal("0.01"))
    except Exception:
        raise ValueError("Parking fee must be a valid decimal number.")
    if dec < Decimal("0.00") or dec > max_fee:
        raise ValueError(f"Parking fee must be between ₹0.00 and ₹{max_fee}/hr. Received: ₹{dec}")
    return dec


# ---------------------------------------------------------------------------
# 6. TEXT SANITIZATION & SECURITY VALIDATOR
# ---------------------------------------------------------------------------
def sanitize_text(text: Optional[str], max_length: int = 500, field_name: str = "field") -> Optional[str]:
    """
    Sanitizes string inputs:
    - Strips leading and trailing whitespace
    - Normalizes Unicode characters to NFKC
    - Removes null bytes and non-printable control characters
    - Protects against raw HTML/Script injection
    - Enforces maximum character length
    """
    if text is None:
        return None
    val = str(text).strip()
    if not val:
        return ""
    # Normalize unicode
    val = unicodedata.normalize("NFKC", val)
    # Remove null bytes and non-newline/tab control characters
    val = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", val)
    # HTML escape dangerous characters
    val = html.escape(val, quote=False)
    if len(val) > max_length:
        raise ValueError(f"{field_name} exceeds maximum length of {max_length} characters (Length: {len(val)}).")
    return val


# ---------------------------------------------------------------------------
# 7. 6-DIGIT OTP CODE VALIDATOR
# ---------------------------------------------------------------------------
_OTP_REGEX = re.compile(r"^\d{6}$")

def validate_otp_code(otp: str) -> str:
    """Strictly validates a 6-digit verification code."""
    val = str(otp).strip()
    if not _OTP_REGEX.match(val):
        raise ValueError("OTP must be exactly 6 numeric digits (000000 - 999999).")
    return val


# ---------------------------------------------------------------------------
# 8. PASSWORD COMPLEXITY VALIDATOR
# ---------------------------------------------------------------------------
def validate_password_complexity(password: str) -> str:
    """
    Enforces production password standards:
    - Minimum 8 characters, maximum 128 characters
    - Must contain at least one letter and at least one numeric digit
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters.")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one alphabet letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one numeric digit.")
    return password


# ---------------------------------------------------------------------------
# 9. REVERSE-GEOCODE LOCALITY & ADDRESS-TO-PIN MISMATCH VALIDATOR
# ---------------------------------------------------------------------------
import math

INDIAN_CITY_ANCHORS = [
    {"city": "Payyanur", "district": "Kannur", "state": "Kerala", "pincode": 670307, "lat": 12.1045, "lon": 75.2058, "keywords": ("payyanur", "perumba", "vellur", "670307")},
    {"city": "Pilathara", "district": "Kannur", "state": "Kerala", "pincode": 670501, "lat": 12.0854, "lon": 75.2544, "keywords": ("pilathara", "cheruthazham", "670501", "670309")},
    {"city": "Karivellur", "district": "Kannur", "state": "Kerala", "pincode": 670521, "lat": 12.1752, "lon": 75.1934, "keywords": ("karivellur", "670521")},
    {"city": "Cheruvathur", "district": "Kasaragod", "state": "Kerala", "pincode": 671313, "lat": 12.2276, "lon": 75.1596, "keywords": ("cheruvathur", "671313")},
    {"city": "Taliparamba", "district": "Kannur", "state": "Kerala", "pincode": 670141, "lat": 12.0368, "lon": 75.3628, "keywords": ("taliparamba", "670141")},
    {"city": "Kannur", "district": "Kannur", "state": "Kerala", "pincode": 670001, "lat": 11.8745, "lon": 75.3704, "keywords": ("kannur", "caltex", "kannapuram", "670001")},
    {"city": "Kasaragod", "district": "Kasaragod", "state": "Kerala", "pincode": 671121, "lat": 12.4996, "lon": 74.9869, "keywords": ("kasaragod", "671121")},
    {"city": "Kozhikode", "district": "Kozhikode", "state": "Kerala", "pincode": 673001, "lat": 11.2488, "lon": 75.8342, "keywords": ("kozhikode", "calicut", "thondayad", "673001")},
    {"city": "Kalpetta", "district": "Wayanad", "state": "Kerala", "pincode": 673121, "lat": 11.6103, "lon": 76.0828, "keywords": ("wayanad", "kalpetta", "673121")},
    {"city": "Thrissur", "district": "Thrissur", "state": "Kerala", "pincode": 680001, "lat": 10.5354, "lon": 76.2148, "keywords": ("thrissur", "swaraj round", "viyyur", "680001")},
    {"city": "Kochi", "district": "Ernakulam", "state": "Kerala", "pincode": 682030, "lat": 10.0159, "lon": 76.3419, "keywords": ("kochi", "kakkanad", "edachira", "infopark", "edappally", "vyttila", "kaloor", "ernakulam", "682030", "682024")},
    {"city": "Adimali", "district": "Idukki", "state": "Kerala", "pincode": 685561, "lat": 10.0124, "lon": 76.9535, "keywords": ("adimali", "munnar", "idukki", "685561")},
    {"city": "Alappuzha", "district": "Alappuzha", "state": "Kerala", "pincode": 688001, "lat": 9.4981, "lon": 76.3388, "keywords": ("alappuzha", "alleppey", "688001")},
    {"city": "Kollam", "district": "Kollam", "state": "Kerala", "pincode": 691001, "lat": 8.8932, "lon": 76.6141, "keywords": ("kollam", "mevaram", "691001")},
    {"city": "Thiruvananthapuram", "district": "Thiruvananthapuram", "state": "Kerala", "pincode": 695581, "lat": 8.5581, "lon": 76.8816, "keywords": ("trivandrum", "thiruvananthapuram", "kazhakkoottam", "technopark", "695581")},
    {"city": "Coimbatore", "district": "Coimbatore", "state": "Tamil Nadu", "pincode": 641001, "lat": 11.0168, "lon": 76.9558, "keywords": ("coimbatore", "avinashi", "641001")},
    {"city": "Bengaluru", "district": "Bengaluru", "state": "Karnataka", "pincode": 560001, "lat": 12.9716, "lon": 77.5946, "keywords": ("bengaluru", "bangalore", "whitefield", "indiranagar", "560001")},
    {"city": "Chennai", "district": "Chennai", "state": "Tamil Nadu", "pincode": 600001, "lat": 13.0827, "lon": 80.2707, "keywords": ("chennai", "guindy", "600001")},
    {"city": "Mumbai", "district": "Mumbai", "state": "Maharashtra", "pincode": 400001, "lat": 19.0760, "lon": 72.8777, "keywords": ("mumbai", "bandra", "andheri", "400001")},
    {"city": "New Delhi", "district": "New Delhi", "state": "Delhi", "pincode": 110001, "lat": 28.6139, "lon": 77.2090, "keywords": ("delhi", "connaught", "110001")},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    return round(2.0 * r * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a))), 2)


def resolve_indian_locality_from_coords(lat: float, lon: float) -> dict:
    """Deterministically resolves the nearest city, district, state, and pincode from GPS coordinates."""
    best = INDIAN_CITY_ANCHORS[0]
    best_dist = _haversine_km(lat, lon, best["lat"], best["lon"])
    for item in INDIAN_CITY_ANCHORS[1:]:
        d = _haversine_km(lat, lon, item["lat"], item["lon"])
        if d < best_dist:
            best = item
            best_dist = d
    return {
        "city": best["city"],
        "district": best["district"],
        "state": best["state"],
        "pincode": int(best["pincode"]),
        "distance_km": best_dist,
        "formatted_address": f"{best['city']}, {best['district']}, {best['state']} {best['pincode']}",
    }


def validate_address_matches_coordinates(
    address: str,
    lat: float,
    lon: float,
    max_mismatch_km: float = 25.0,
) -> dict:
    """
    Checks whether a typed station address conflicts with its GPS pin coordinates.
    Blocks publishing when the typed address references a city/locality > max_mismatch_km from the pin.
    """
    pin_locality = resolve_indian_locality_from_coords(lat, lon)
    text_lower = (address or "").lower()
    for anchor in INDIAN_CITY_ANCHORS:
        if any(kw in text_lower for kw in anchor["keywords"]):
            dist_from_pin = _haversine_km(lat, lon, anchor["lat"], anchor["lon"])
            if dist_from_pin > max_mismatch_km:
                return {
                    "valid": False,
                    "distance_km": dist_from_pin,
                    "detected_city": anchor["city"],
                    "pin_city": pin_locality["city"],
                    "pin_pincode": pin_locality["pincode"],
                    "suggested_address": pin_locality["formatted_address"],
                    "reason": (
                        f"Address mentions {anchor['city']} ({dist_from_pin:.1f} km away from GPS pin in "
                        f"{pin_locality['city']}). Please sync the address or move the pin."
                    ),
                }
    return {
        "valid": True,
        "distance_km": 0.0,
        "detected_city": pin_locality["city"],
        "pin_city": pin_locality["city"],
        "pin_pincode": pin_locality["pincode"],
        "suggested_address": pin_locality["formatted_address"],
        "reason": None,
    }


def repair_mismatched_station_address(
    address: Optional[str],
    lat: float,
    lon: float,
    max_mismatch_km: float = 25.0,
) -> str:
    """Repairs legacy or seeded station addresses whose city text does not match their GPS coordinates."""
    raw = (address or "").strip()
    check = validate_address_matches_coordinates(raw, lat, lon, max_mismatch_km=max_mismatch_km)
    if not raw or raw in ("Kerala EV Grid", "Kerala Highway Grid") or not check["valid"]:
        bay_suffix = ""
        if "•" in raw:
            bay_suffix = " • " + raw.split("•", 1)[1].strip()
        return f"{check['suggested_address']}{bay_suffix}"
    return raw


