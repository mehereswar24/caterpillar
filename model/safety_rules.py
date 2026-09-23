"""safety_rules.py — rule-based safety alert engine (no ML, pure logic)."""
from typing import List, Dict, Any
from datetime import datetime

SEVERITY = {"critical": 3, "high": 2, "medium": 1, "low": 0}

def evaluate(row: Dict[str, Any]) -> List[Dict]:
    """
    row keys: rpm, hydraulic_pressure, temperature_c, fuel_level,
              idle_time_min, active_time_min, speed_kph, tilt_angle,
              seatbelt, proximity_alert, fuel_used_l, machine_id, operator_id
    Returns list of alert dicts.
    """
    alerts = []
    ts = datetime.utcnow().isoformat()

    idle_ratio = row.get("idle_time_min", 0) / max(row.get("idle_time_min", 0) + row.get("active_time_min", 1), 1)

    # ── Critical ──────────────────────────────────────────────────────────────
    if row.get("seatbelt") == "unfastened" and row.get("speed_kph", 0) > 1:
        alerts.append({
            "type": "SEATBELT_VIOLATION",
            "severity": "critical",
            "reason": "Seatbelt unfastened while machine is moving.",
            "action": "Stop machine immediately and fasten seatbelt.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("proximity_alert") == 1:
        alerts.append({
            "type": "PROXIMITY_BREACH",
            "severity": "critical",
            "reason": "Worker detected within 3m exclusion zone.",
            "action": "Halt all movement. Sound horn. Wait for zone clearance.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("tilt_angle", 0) > 15:
        alerts.append({
            "type": "SLOPE_INSTABILITY",
            "severity": "critical",
            "reason": f"Tilt angle {row['tilt_angle']:.1f}° exceeds safe limit (15°).",
            "action": "Lower boom immediately. Move to flat ground.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    # ── High ──────────────────────────────────────────────────────────────────
    if row.get("rpm", 0) > 2100:
        alerts.append({
            "type": "OVER_REV",
            "severity": "high",
            "reason": f"Engine RPM {row['rpm']} exceeds 2100 limit.",
            "action": "Reduce throttle. Check for stuck accelerator.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("hydraulic_pressure", 0) > 270:
        alerts.append({
            "type": "HIGH_HYDRAULIC_PRESSURE",
            "severity": "high",
            "reason": f"Hydraulic pressure {row['hydraulic_pressure']:.0f} bar (limit 270).",
            "action": "Reduce load. Inspect hydraulic lines for blockage.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("temperature_c", 0) > 98:
        alerts.append({
            "type": "ENGINE_OVERHEAT",
            "severity": "high",
            "reason": f"Engine temp {row['temperature_c']:.0f}°C — overheating.",
            "action": "Idle for 5 min to cool. Check coolant level.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    # ── Medium ────────────────────────────────────────────────────────────────
    if idle_ratio > 0.5 and row.get("active_time_min", 0) > 0:
        alerts.append({
            "type": "EXCESSIVE_IDLE",
            "severity": "medium",
            "reason": f"Idle ratio {idle_ratio:.0%} — machine idle over 50% of shift.",
            "action": "Shut down engine if no task scheduled. Reduces fuel waste.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("fuel_level", 100) < 15:
        alerts.append({
            "type": "LOW_FUEL",
            "severity": "medium",
            "reason": f"Fuel level {row['fuel_level']:.0f}% — below 15% threshold.",
            "action": "Refuel before next shift.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    if row.get("fuel_used_l", 0) > 12:
        alerts.append({
            "type": "FUEL_ANOMALY",
            "severity": "medium",
            "reason": f"Fuel consumption {row['fuel_used_l']:.1f}L — unusually high.",
            "action": "Check for leaks. Verify load is within rated capacity.",
            "machine_id": row.get("machine_id"),
            "operator_id": row.get("operator_id"),
            "timestamp": ts,
        })

    return sorted(alerts, key=lambda a: SEVERITY.get(a["severity"], 0), reverse=True)


if __name__ == "__main__":
    sample = {
        "machine_id": "EXC001", "operator_id": "OP001",
        "rpm": 2200, "hydraulic_pressure": 280, "temperature_c": 101,
        "fuel_level": 12, "idle_time_min": 55, "active_time_min": 30,
        "speed_kph": 5, "tilt_angle": 3, "seatbelt": "unfastened",
        "proximity_alert": 1, "fuel_used_l": 14,
    }
    for a in evaluate(sample):
        print(f"[{a['severity'].upper()}] {a['type']}: {a['reason']}")
