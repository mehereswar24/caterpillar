"""
predict_ensemble.py — Ensemble of RF + XGBoost for task time prediction.
Called by Express: python predict_ensemble.py '<json>'
"""
import sys, json, os, joblib
import numpy as np
import pandas as pd

DIR  = os.path.dirname(os.path.abspath(__file__))
CATEGORICALS = ["task_type","task_complexity","material_type","weather","ground_condition","operator_skill"]
NUMERIC = [
    "quantity_m3","target_depth_m","haul_distance_m","temperature_c","rainfall_mm",
    "wind_speed_kmh","operator_experience_yrs","previous_similar_tasks",
    "previous_avg_completion_min","machine_age_yrs","engine_hours",
    "bucket_capacity_m3","avg_engine_load_pct","machine_efficiency_pct",
]

def build_row(payload, feature_cols):
    row = {c: 0.0 for c in feature_cols}
    for k in NUMERIC:
        if k in payload: row[k] = float(payload[k])
    for cat, val in [
        ("task_type",        payload.get("task_type","Earth Excavation")),
        ("task_complexity",  payload.get("task_complexity","Medium")),
        ("material_type",    payload.get("material_type","Soil")),
        ("weather",          payload.get("weather","Sunny")),
        ("ground_condition", payload.get("ground_condition","Dry")),
        ("operator_skill",   payload.get("operator_skill","Intermediate")),
    ]:
        col = f"{cat}_{val}"
        if col in row: row[col] = 1.0
    return pd.DataFrame([row])[feature_cols]

def predict(payload):
    rf_model  = joblib.load(os.path.join(DIR, "task_time_model.joblib"))
    xgb_model = joblib.load(os.path.join(DIR, "xgb_task_model.joblib"))
    with open(os.path.join(DIR, "feature_cols.json")) as f:     rf_cols  = json.load(f)
    with open(os.path.join(DIR, "xgb_feature_cols.json")) as f: xgb_cols = json.load(f)

    X_rf  = build_row(payload, rf_cols)
    X_xgb = build_row(payload, xgb_cols)

    # RF confidence range from trees
    tree_preds = np.array([t.predict(X_rf.values)[0] for t in rf_model.estimators_])
    rf_pred = float(np.mean(tree_preds))
    low     = float(np.percentile(tree_preds, 10))
    high    = float(np.percentile(tree_preds, 90))

    xgb_pred   = float(xgb_model.predict(X_xgb)[0])
    ensemble   = round((rf_pred * 0.4 + xgb_pred * 0.6), 1)

    # Feature importances from XGBoost (more reliable)
    importances = sorted(zip(xgb_cols, xgb_model.feature_importances_), key=lambda x:x[1], reverse=True)[:5]
    factors = [{"feature": c.replace("_"," "), "importance": round(float(v),3)} for c,v in importances if v>0.01]

    return {
        "predicted_minutes":  ensemble,
        "rf_prediction":      round(rf_pred, 1),
        "xgb_prediction":     round(xgb_pred, 1),
        "confidence_range":   {"low": round(low,1), "high": round(high,1)},
        "factors":            factors,
        "task_type":          payload.get("task_type","Earth Excavation"),
        "weather":            payload.get("weather","Sunny"),
        "material_type":      payload.get("material_type","Soil"),
        "ground_condition":   payload.get("ground_condition","Dry"),
        "operator_skill":     payload.get("operator_skill","Intermediate"),
    }

if __name__ == "__main__":
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    print(json.dumps(predict(payload)))
