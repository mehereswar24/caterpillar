"""
predict_anomaly.py — LightGBM anomaly classifier inference.
Called by Express: python predict_anomaly.py '<json>'
"""
import sys, json, os, joblib
import numpy as np
import pandas as pd

DIR = os.path.dirname(os.path.abspath(__file__))
WEATHER_MAP = {"Sunny":0,"Cloudy":1,"Rainy":2,"Windy":3}
GROUND_MAP  = {"Dry":0,"Wet":1,"Muddy":2,"Frozen":3}

def predict(payload):
    model = joblib.load(os.path.join(DIR, "anomaly_model.joblib"))
    le    = joblib.load(os.path.join(DIR, "anomaly_label_encoder.joblib"))
    with open(os.path.join(DIR, "anomaly_feature_cols.json")) as f:
        features = json.load(f)

    idle     = float(payload.get("idle_time_min", 10))
    active   = float(payload.get("active_time_min", 50))
    rpm      = float(payload.get("rpm", 1500))
    pressure = float(payload.get("hydraulic_pressure", 200))
    fuel_used= float(payload.get("fuel_used_l", 5))

    idle_ratio     = idle / (idle + active + 1)
    rpm_x_pressure = rpm * pressure / 1000
    fuel_per_active= fuel_used / (active + 1)
    weather_enc    = WEATHER_MAP.get(payload.get("weather","Sunny"), 0)
    ground_enc     = GROUND_MAP.get(payload.get("ground_condition","Dry"), 0)

    row = {
        "rpm":              rpm,
        "hydraulic_pressure": pressure,
        "temperature_c":    float(payload.get("temperature_c", 80)),
        "fuel_level":       float(payload.get("fuel_level", 70)),
        "fuel_used_l":      fuel_used,
        "idle_time_min":    idle,
        "active_time_min":  active,
        "speed_kph":        float(payload.get("speed_kph", 3)),
        "tilt_angle":       float(payload.get("tilt_angle", 2)),
        "engine_load_pct":  float(payload.get("engine_load_pct", 70)),
        "idle_ratio":       idle_ratio,
        "hour":             int(payload.get("hour", 10)),
        "is_night":         int(payload.get("is_night", 0)),
        "seatbelt_enc":     1 if payload.get("seatbelt") == "unfastened" else 0,
        "proximity_alert":  int(payload.get("proximity_alert", 0)),
        "rpm_x_pressure":   rpm_x_pressure,
        "fuel_per_active":  fuel_per_active,
        "weather_enc":      weather_enc,
        "ground_enc":       ground_enc,
    }

    X = pd.DataFrame([row])[features]
    pred_idx  = model.predict(X)[0]
    proba     = model.predict_proba(X)[0]
    label     = le.inverse_transform([pred_idx])[0]
    confidence= round(float(np.max(proba)) * 100, 1)

    severity_map = {
        "NORMAL":"none","EXCESSIVE_IDLE":"medium","OVER_REV":"high",
        "HIGH_PRESSURE":"high","OVERHEAT":"high",
        "SEATBELT_VIOLATION":"critical","PROXIMITY_BREACH":"critical"
    }

    return {
        "label":      label,
        "confidence": confidence,
        "severity":   severity_map.get(label,"medium"),
        "all_scores": {le.classes_[i]: round(float(p)*100,1) for i,p in enumerate(proba)},
    }

if __name__ == "__main__":
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    print(json.dumps(predict(payload)))
