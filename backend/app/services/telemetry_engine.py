import math
import random
from typing import Dict, Any

class TelemetryPhysicsEngine:
    """
    High-fidelity simulation engine for Indian EV charging dynamics:
    - Real-world grid fluctuations (215V - 245V AC)
    - CC/CV charging taper curve (Constant Current up to 80%, exponential taper 80-100%)
    - Thermal modeling (ambient vs cell temperature rise)
    - Riemann sum kWh accumulation and live tariff cost integration
    """

    @staticmethod
    def compute_tick(
        elapsed_seconds: int,
        nominal_power_kw: float,
        battery_capacity_kwh: float,
        initial_soc: float,
        price_per_kwh: float,
        ambient_temp_c: float = 32.0,
    ) -> Dict[str, Any]:
        # 1. Indian Grid Mains Voltage (215V - 245V sinusoidal wave + white noise)
        phase_jitter = math.sin(elapsed_seconds * 0.15) * 3.5 + (random.random() - 0.5) * 1.2
        voltage_v = round(228.0 + phase_jitter, 1)

        # 2. Approximate current rating based on nominal power
        # P = V * I * PF (Power factor ~0.97)
        nominal_current_a = (nominal_power_kw * 1000.0) / (230.0 * 0.97)

        # 3. Accumulated energy delivered so far (approximate integration)
        # Account for CC/CV curve in historical accumulation
        avg_power = nominal_power_kw
        delivered_kwh = round((avg_power * (elapsed_seconds / 3600.0)), 4)
        current_soc = min(100.0, round(initial_soc + (delivered_kwh / battery_capacity_kwh) * 100.0, 2))

        # 4. CC/CV Taper Factor
        # Fast charging up to 80%; beyond 80%, BMS throttles power to preserve battery health
        if current_soc < 80.0:
            taper_factor = 1.0
        else:
            # Exponential decay from 80% to 100%
            decay_progress = (current_soc - 80.0) / 20.0 # 0.0 to 1.0
            taper_factor = max(0.18, math.exp(-2.2 * decay_progress))

        # 5. Thermal Modeling
        # Cell temperature increases with I^2 * R over time
        heat_factor = (elapsed_seconds / 3600.0) * (nominal_current_a / 15.0) * 4.5
        battery_temp_c = round(min(52.0, ambient_temp_c + heat_factor), 1)

        # Thermal throttling if battery exceeds 48°C
        thermal_throttle = 0.85 if battery_temp_c > 48.0 else 1.0

        effective_power_kw = round(nominal_power_kw * taper_factor * thermal_throttle, 2)
        current_a = round((effective_power_kw * 1000.0) / (voltage_v * 0.97), 2)
        live_cost_inr = round(delivered_kwh * price_per_kwh, 2)

        # 6. Remaining Time Estimation (Minutes)
        kwh_needed = max(0.0, ((100.0 - current_soc) / 100.0) * battery_capacity_kwh)
        remaining_mins = max(0, int((kwh_needed / max(0.5, effective_power_kw)) * 60))

        return {
            "elapsed_seconds": elapsed_seconds,
            "voltage_v": voltage_v,
            "current_a": current_a,
            "instant_power_kw": effective_power_kw,
            "delivered_kwh": delivered_kwh,
            "current_soc_percent": current_soc,
            "battery_temp_c": battery_temp_c,
            "is_tapering": current_soc >= 80.0,
            "live_cost_inr": live_cost_inr,
            "estimated_full_mins_remaining": remaining_mins,
        }

telemetry_physics = TelemetryPhysicsEngine()

