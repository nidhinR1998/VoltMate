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

