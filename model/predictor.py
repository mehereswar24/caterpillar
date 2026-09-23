"""
predictor.py — Random Forest task-time predictor with 20 features + confidence range.
  train()   -> trains model, saves task_time_model.joblib + feature_cols.json
  predict() -> returns predicted minutes + confidence range + top factors
Called by Express: python predictor.py train
                   python predictor.py predict '<json>'
"""
import sys, json, os, joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(DIR, "task_time_model.joblib")
FCOLS = os.path.join(DIR, "feature_cols.json")
DATA  = os.path.join(DIR, "data", "tasks.csv")

CATEGORICALS = ["task_type", "task_complexity", "material_type",
                "weather", "ground_condition", "operator_skill"]

NUMERIC = [
    "quantity_m3", "target_depth_m", "haul_distance_m",
    "temperature_c", "rainfall_mm", "wind_speed_kmh",
    "operator_experience_yrs", "previous_similar_tasks",
    "previous_avg_completion_min", "machine_age_yrs", "engine_hours",
    "bucket_capacity_m3", "avg_engine_load_pct", "machine_efficiency_pct",
]

def train():
    df = pd.read_csv(DATA)
    df.dropna(subset=["actual_completion_time_min"], inplace=True)
    df_enc = pd.get_dummies(df, columns=CATEGORICALS, drop_first=False)
    feature_cols = [c for c in df_enc.columns if c not in [
        "task_id","machine_id","operator_id","date",
        "actual_completion_time_min","estimated_time_min","completed"]]
    X = df_enc[feature_cols].fillna(0)
    y = df_enc["actual_completion_time_min"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=300, max_depth=15, min_samples_leaf=2, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae  = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds) ** 0.5
    print(json.dumps({"status":"trained","mae_min":round(mae,2),"rmse_min":round(rmse,2),"n_train":len(X_train),"n_test":len(X_test),"n_features":len(feature_cols)}))
    joblib.dump(model, MODEL)
    with open(FCOLS,"w") as f: json.dump(feature_cols, f)

def predict(payload):
    if not os.path.exists(MODEL):
        return {"error":"Model not trained. Run: python predictor.py train"}
    model = joblib.load(MODEL)
    with open(FCOLS) as f: feature_cols = json.load(f)
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
    X = pd.DataFrame([row])[feature_cols]
    tree_preds = np.array([t.predict(X)[0] for t in model.estimators_])
    predicted  = float(np.mean(tree_preds))
    low        = float(np.percentile(tree_preds, 10))
    high       = float(np.percentile(tree_preds, 90))
    importances = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: x[1], reverse=True)[:5]
    factors = [{"feature": c.replace("_"," "), "importance": round(float(v),3)} for c,v in importances if v>0.01]
    return {
        "predicted_minutes":  round(predicted, 1),
        "confidence_range":   {"low": round(low,1), "high": round(high,1)},
        "factors":            factors,
        "task_type":          payload.get("task_type","Earth Excavation"),
        "weather":            payload.get("weather","Sunny"),
        "material_type":      payload.get("material_type","Soil"),
        "ground_condition":   payload.get("ground_condition","Dry"),
        "operator_skill":     payload.get("operator_skill","Intermediate"),
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error":"usage: predictor.py train|predict <json>"})); sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "train": train()
    elif cmd == "predict":
        payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
        print(json.dumps(predict(payload)))
    else:
        print(json.dumps({"error":f"unknown command: {cmd}"}))
