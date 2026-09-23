"""
train_xgb.py — XGBoost task-time predictor.
Saves xgb_task_model.joblib + xgb_feature_cols.json
"""
import json, os, joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

DIR  = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(DIR, "data", "tasks.csv")
CATEGORICALS = ["task_type","task_complexity","material_type","weather","ground_condition","operator_skill"]

df = pd.read_csv(DATA)
df.dropna(subset=["actual_completion_time_min"], inplace=True)
df_enc = pd.get_dummies(df, columns=CATEGORICALS, drop_first=False)
feature_cols = [c for c in df_enc.columns if c not in
    ["task_id","machine_id","operator_id","date","actual_completion_time_min","estimated_time_min","completed"]]

X = df_enc[feature_cols].fillna(0)
y = df_enc["actual_completion_time_min"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBRegressor(
    n_estimators=500, max_depth=8, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    random_state=42, n_jobs=-1, verbosity=0
)
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
preds = model.predict(X_test)
mae  = mean_absolute_error(y_test, preds)
rmse = mean_squared_error(y_test, preds) ** 0.5
print(json.dumps({"model":"XGBoost","mae_min":round(mae,2),"rmse_min":round(rmse,2),"n_features":len(feature_cols)}))

joblib.dump(model, os.path.join(DIR, "xgb_task_model.joblib"))
with open(os.path.join(DIR, "xgb_feature_cols.json"), "w") as f:
    json.dump(feature_cols, f)
