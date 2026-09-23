"""preprocessing.py — load, clean, and feature-engineer machine_logs + tasks CSVs."""
import pandas as pd
import numpy as np
import os

DATA = os.path.join(os.path.dirname(__file__), "data")

def load_machine_logs():
    df = pd.read_csv(f"{DATA}/machine_logs.csv", parse_dates=["timestamp"])
    # Fill missing
    df["fault_codes"].fillna("NONE", inplace=True)
    df["fuel_level"].fillna(df["fuel_level"].median(), inplace=True)
    # Derived fields
    df["idle_ratio"]         = df["idle_time_min"] / (df["idle_time_min"] + df["active_time_min"] + 1)
    df["seatbelt_violation"] = (df["seatbelt"] == "unfastened").astype(int)
    df["overheat"]           = (df["temperature_c"] > 98).astype(int)
    df["high_pressure"]      = (df["hydraulic_pressure"] > 270).astype(int)
    df["over_rev"]           = (df["rpm"] > 2100).astype(int)
    df["excessive_idle"]     = (df["idle_ratio"] > 0.5).astype(int)
    df["hour"]               = df["timestamp"].dt.hour
    df["is_night"]           = ((df["hour"] >= 20) | (df["hour"] < 6)).astype(int)
    return df

def load_tasks():
    df = pd.read_csv(f"{DATA}/tasks.csv", parse_dates=["date"])
    df.dropna(subset=["actual_time"], inplace=True)
    # One-hot encode categoricals
    df = pd.get_dummies(df, columns=["task_type", "weather", "soil_type", "operator_skill"], drop_first=False)
    return df

def get_safety_features(logs_df):
    """Aggregate machine-level safety metrics."""
    return logs_df.groupby("machine_id").agg(
        seatbelt_violations=("seatbelt_violation", "sum"),
        avg_idle_ratio=("idle_ratio", "mean"),
        overheat_events=("overheat", "sum"),
        high_pressure_events=("high_pressure", "sum"),
        over_rev_events=("over_rev", "sum"),
        proximity_alerts=("proximity_alert", "sum"),
        avg_fuel_used=("fuel_used_l", "mean"),
        total_rows=("log_id", "count"),
    ).reset_index()

if __name__ == "__main__":
    logs = load_machine_logs()
    tasks = load_tasks()
    print("machine_logs:", logs.shape)
    print("tasks:", tasks.shape)
    print("safety agg:\n", get_safety_features(logs).to_string())
