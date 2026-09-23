"""
predict_maintenance.py — LightGBM maintenance inference.
Called by Express: python predict_maintenance.py '<json>'
"""
import sys, json, os, joblib
import numpy as np
import pandas as pd

DIR = os.path.dirname(os.path.abspath(__file__))
WEATHER_MAP = {"Sunny":0,"Cloudy":1,"Rainy":2,"Windy":3}
GROUND_MAP  = {"Dry":0,"Wet":1,"Muddy":2,"Frozen":3}

def predict(payload):
    model = joblib.load(os.path.join(DIR, "maintenance_model.joblib"))
    with open(os.path.join(DIR, "maintenance_feature_cols.json")) as f:
        features = json.load(f)

    idle     = float(payload.get("idle_time_min", 10))
    active   = float(payload.get("active_time_min", 50))
    rpm      = float(payload.get("rpm", 1500))
    pressure = float(payload.get("hydraulic_pressure", 200))
    fuel_used= float(payload.get("fuel_used_l", 5))
    eng_hrs  = float(payload.get("engine_hours", 2000))

    idle_ratio     = idle / (idle + active + 1)
    rpm_x_pressure = rpm * pressure / 1000
    fuel_per_active= fuel_used / (active + 1)

    row = {
        "engine_hours":       eng_hrs,
        "rpm":                rpm,
        "hydraulic_pressure": pressure,
        "temperature_c":      float(payload.get("temperature_c", 80)),
        "fuel_level":         float(payload.get("fuel_level", 70)),
        "fuel_used_l":        fuel_used,
        "idle_time_min":      idle,
        "active_time_min":    active,
        "engine_load_pct":    float(payload.get("engine_load_pct", 70)),
        "tilt_angle":         float(payload.get("tilt_angle", 2)),
        "speed_kph":          float(payload.get("speed_kph", 3)),
        "idle_ratio":         idle_ratio,
        "rpm_x_pressure":     rpm_x_pressure,
        "fuel_per_active":    fuel_per_active,
        "weather_enc":        WEATHER_MAP.get(payload.get("weather","Sunny"), 0),
        "ground_enc":         GROUND_MAP.get(payload.get("ground_condition","Dry"), 0),
        "fault_enc":          1 if payload.get("fault_codes","NONE") != "NONE" else 0,
    }

    X = pd.DataFrame([row])[features]
    hours_until = float(model.predict(X)[0])
    hours_until = max(0, round(hours_until, 1))

    urgency = "critical" if hours_until < 50 else "high" if hours_until < 150 else "medium" if hours_until < 300 else "low"

    return {
        "hours_until_service": hours_until,
        "urgency":             urgency,
        "engine_hours":        eng_hrs,
        "next_service_at":     round(eng_hrs + hours_until, 0),
        "recommendation":      f"Service due in {hours_until:.0f} operating hours." if hours_until > 0 else "Service overdue — schedule immediately.",
    }

if __name__ == "__main__":
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    print(json.dumps(predict(payload)))
