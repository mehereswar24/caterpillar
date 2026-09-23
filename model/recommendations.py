"""
recommendations.py — rule-based training recommendations.
Called by Express: python recommendations.py <operator_id>
Returns JSON list of recommendations.
"""
import sys, json, os, csv
from datetime import datetime

DIR  = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(DIR, "data")

MODULES = [
    {"id": "m1", "title": "Proximity Safety Protocol",     "duration_min": 30, "type": "simulation"},
    {"id": "m2", "title": "Seatbelt & PPE Compliance",     "duration_min": 20, "type": "video"},
    {"id": "m3", "title": "Fuel Efficiency Techniques",    "duration_min": 45, "type": "instructor"},
    {"id": "m4", "title": "Slope & Stability Awareness",   "duration_min": 40, "type": "simulation"},
    {"id": "m5", "title": "Engine & Hydraulics Basics",    "duration_min": 60, "type": "video"},
    {"id": "m6", "title": "Task Time Optimisation",        "duration_min": 35, "type": "instructor"},
]

def get_operator_alerts(operator_id: str) -> list:
    """Read machine_logs and find alert patterns for this operator."""
    path = os.path.join(DATA, "machine_logs.csv")
    if not os.path.exists(path):
        return []
    alerts = []
    try:
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("operator_id") != operator_id:
                    continue
                idle  = int(row.get("idle_time_min", 0))
                act   = int(row.get("active_time_min", 1))
                ratio = idle / max(idle + act, 1)
                if row.get("seatbelt") == "unfastened":
                    alerts.append("seatbelt")
                if ratio > 0.5:
                    alerts.append("idle")
                if float(row.get("fuel_used_l", 0)) > 12:
                    alerts.append("fuel")
                if float(row.get("tilt_angle", 0)) > 15:
                    alerts.append("slope")
                if int(row.get("proximity_alert", 0)) == 1:
                    alerts.append("proximity")
    except Exception:
        pass
    return alerts

def recommend(operator_id: str) -> list:
    alerts = get_operator_alerts(operator_id)
    counts = {k: alerts.count(k) for k in set(alerts)}

    recs = []
    priority_map = {
        "seatbelt":  ("m2", "SEATBELT_VIOLATION",  "critical"),
        "proximity": ("m1", "PROXIMITY_BREACH",     "critical"),
        "slope":     ("m4", "SLOPE_INSTABILITY",    "high"),
        "fuel":      ("m3", "FUEL_ANOMALY",         "medium"),
        "idle":      ("m3", "EXCESSIVE_IDLE",       "medium"),
    }

    seen = set()
    for alert_type, (mod_id, label, sev) in priority_map.items():
        if counts.get(alert_type, 0) > 0 and mod_id not in seen:
            mod = next(m for m in MODULES if m["id"] == mod_id)
            recs.append({
                **mod,
                "reason":     f"Based on {counts[alert_type]} {label} events",
                "severity":   sev,
                "priority":   len(recs) + 1,
                "operator_id": operator_id,
            })
            seen.add(mod_id)

    # Always append remaining modules at lower priority
    for mod in MODULES:
        if mod["id"] not in seen:
            recs.append({
                **mod,
                "reason":   "General skill development",
                "severity": "low",
                "priority": len(recs) + 1,
                "operator_id": operator_id,
            })

    return recs


if __name__ == "__main__":
    op = sys.argv[1] if len(sys.argv) > 1 else "OP001"
    print(json.dumps(recommend(op)))
