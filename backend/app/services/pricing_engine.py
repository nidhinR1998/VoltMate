import urllib.parse
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Indian State DISCOM Domestic Tariff Slabs (Average Domestic Telescopic Units)
DISCOM_TARIFF_GUIDELINES = {
    "KSEB_KERALA": {
        "state": "Kerala",
        "discom": "Kerala State Electricity Board (KSEB)",
        "base_unit_rate_inr": Decimal("6.80"),
        "max_community_markup_inr": Decimal("2.50"),
        "recommended_price_per_kwh": Decimal("8.50"),
        "recommended_parking_per_hr": Decimal("15.00"),
    },
    "BESCOM_KARNATAKA": {
        "state": "Karnataka",
        "discom": "Bangalore Electricity Supply Company (BESCOM)",
        "base_unit_rate_inr": Decimal("7.00"),
        "max_community_markup_inr": Decimal("2.50"),
        "recommended_price_per_kwh": Decimal("9.00"),
        "recommended_parking_per_hr": Decimal("20.00"),
    },
    "MSEDCL_MAHARASHTRA": {
        "state": "Maharashtra",
        "discom": "Maharashtra State Electricity Distribution (MSEDCL)",
        "base_unit_rate_inr": Decimal("8.20"),
        "max_community_markup_inr": Decimal("3.00"),
        "recommended_price_per_kwh": Decimal("10.50"),
        "recommended_parking_per_hr": Decimal("25.00"),
    },
    "TPDDL_DELHI": {
        "state": "Delhi",
        "discom": "Tata Power Delhi Distribution Ltd (TPDDL)",
        "base_unit_rate_inr": Decimal("6.50"),
        "max_community_markup_inr": Decimal("2.00"),
        "recommended_price_per_kwh": Decimal("8.00"),
        "recommended_parking_per_hr": Decimal("20.00"),
    },
    "TANGEDCO_TAMIL_NADU": {
        "state": "Tamil Nadu",
        "discom": "Tamil Nadu Generation and Distribution Corp",
        "base_unit_rate_inr": Decimal("6.20"),
        "max_community_markup_inr": Decimal("2.30"),
        "recommended_price_per_kwh": Decimal("8.00"),
        "recommended_parking_per_hr": Decimal("15.00"),
    }
}

class PricingEngine:
    OVERSTAY_GRACE_PERIOD_MINUTES = 15
    OVERSTAY_PENALTY_RATE_PER_MIN_INR = Decimal("2.00") # ₹2/min

    @staticmethod
    def calculate_session_settlement(
        kwh_consumed: float,
        price_per_kwh: Decimal,
        parking_fee_per_hr: Decimal,
        scheduled_end: datetime,
        actual_end: datetime,
        actual_start: datetime,
    ) -> Dict[str, Any]:
        """
        Calculates exact energy, parking, and idle penalty fees.
        0% platform fee in community P2P mode.
        """
        kwh_decimal = Decimal(str(max(0.0, kwh_consumed)))
        energy_amount = (kwh_decimal * price_per_kwh).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Parking duration
        total_duration_hours = Decimal(str(max(0.0, (actual_end - actual_start).total_seconds() / 3600.0)))
        parking_amount = (total_duration_hours * parking_fee_per_hr).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Overstay Idle Fee
        overstay_minutes = 0
        overstay_penalty = Decimal("0.00")
        if actual_end > scheduled_end:
            excess_seconds = (actual_end - scheduled_end).total_seconds()
            excess_mins = int(excess_seconds // 60)
            if excess_mins > PricingEngine.OVERSTAY_GRACE_PERIOD_MINUTES:
                overstay_minutes = excess_mins - PricingEngine.OVERSTAY_GRACE_PERIOD_MINUTES
                overstay_penalty = (Decimal(str(overstay_minutes)) * PricingEngine.OVERSTAY_PENALTY_RATE_PER_MIN_INR).quantize(Decimal("0.01"))

        total_amount = (energy_amount + parking_amount + overstay_penalty).quantize(Decimal("0.01"))
        platform_fee = Decimal("0.00") # Community P2P operates with 0% platform fee

        return {
            "energy_amount_inr": energy_amount,
            "parking_amount_inr": parking_amount,
            "overstay_minutes": overstay_minutes,
            "overstay_penalty_inr": overstay_penalty,
            "platform_fee_inr": platform_fee,
            "total_amount_inr": total_amount,
        }

    @staticmethod
    def generate_upi_intent_uri(
        host_upi_id: str,
        host_name: str,
        amount_inr: Decimal,
        booking_id: str,
        note: str = "VoltMate EV Charge"
    ) -> str:
        """
        Generates standard NPCI UPI Intent URI for zero-fee peer-to-peer settlement.
        upi://pay?pa=...&pn=...&am=...&tr=...&tn=...&cu=INR
        """
        params = {
            "pa": host_upi_id,
            "pn": host_name,
            "am": f"{amount_inr:.2f}",
            "tr": f"VM_{str(booking_id)[:8].upper()}",
            "tn": f"{note} Ref:{str(booking_id)[:8]}",
            "cu": "INR"
        }
        return f"upi://pay?{urllib.parse.urlencode(params)}"

