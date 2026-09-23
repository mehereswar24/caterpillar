"""
predictor.py — Random Forest task-time predictor.
  train()   → trains model, saves task_time_model.joblib + feature_cols.json
  predict() → loads model, returns predicted minutes
Called by Express via: python predictor.py predict '<json>'
                       python predictor.py train
"""
import sys, json, os, joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder

DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(DIR, "task_time_model.joblib")
FCOLS = os.path.join(DIR, "feature_cols.json")
DATA  = os.path.join(DIR, "data", "tasks.csv")

CATEGORICALS = ["task_type", "weather", "soil_type", "operator_skill"]


def train():
    df = pd.read_csv(DATA)
    df.dropna(subset=["actual_time"], inplace=True)

    # One-hot encode
    df_enc = pd.get_dummies(df, columns=CATEGORICALS, drop_first=False)

    feature_cols = [c for c in df_enc.columns if c not in
                    ["task_id", "machine_id", "operator_id", "date",
                     "actual_time", "estimated_time", "completed"]]

    X = df_enc[feature_cols].fillna(0)
    y = df_enc["actual_time"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mae  = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds) ** 0.5
    print(json.dumps({"status": "trained", "mae": round(mae,2), "rmse": round(rmse,2),
                      "n_train": len(X_train), "n_test": len(X_test)}))

    joblib.dump(model, MODEL)
    with open(FCOLS, "w") as f:
        json.dump(feature_cols, f)


def predict(payload: dict) -> dict:
    if not os.path.exists(MODEL):
        return {"error": "Model not trained. Run: python predictor.py train"}

    model = joblib.load(MODEL)
    with open(FCOLS) as f:
        feature_cols = json.load(f)

    # Build feature row
    row = {c: 0 for c in feature_cols}

    # Numeric
    for k in ["load_weight_t", "machine_age_yrs"]:
        if k in payload:
            row[k] = float(payload[k])

    # One-hot flags
    for cat, val in [
        ("task_type",      payload.get("task_type",      "dig")),
        ("weather",        payload.get("weather",         "sunny")),
        ("soil_type",      payload.get("soil_type",       "sand")),
        ("operator_skill", payload.get("operator_skill",  "mid")),
    ]:
        col = f"{cat}_{val}"
        if col in row:
            row[col] = 1

    X = pd.DataFrame([row])[feature_cols]
    predicted = float(model.predict(X)[0])

    # Feature importances (top 5)
    importances = sorted(
        zip(feature_cols, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )[:5]
    shap_text = ", ".join(f"{c.replace('_',' ')} ({v:.2f})" for c, v in importances if v > 0.01)

    return {
        "predicted_minutes": round(predicted, 1),
        "factors": shap_text,
        "task_type": payload.get("task_type", "dig"),
        "weather":   payload.get("weather", "sunny"),
        "soil_type": payload.get("soil_type", "sand"),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: predictor.py train|predict <json>"}))
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "train":
        train()
    elif cmd == "predict":
        payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
        print(json.dumps(predict(payload)))
    else:
        print(json.dumps({"error": f"unknown command: {cmd}"}))
