"""Generate machine_logs.csv and tasks.csv matching the architecture diagram."""
import pandas as pd
import numpy as np
import os

rng = np.random.default_rng(42)
N = 2000
OUT = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT, exist_ok=True)

# ── machine_logs.csv ──────────────────────────────────────────────────────────
machine_ids  = [f"EXC{i:03d}" for i in range(1, 6)]
operator_ids = [f"OP{i:03d}"  for i in range(1, 11)]

logs = pd.DataFrame({
    "log_id":         range(1, N + 1),
    "machine_id":     rng.choice(machine_ids,  N),
    "operator_id":    rng.choice(operator_ids, N),
    "timestamp":      pd.date_range("2024-01-01", periods=N, freq="30min"),
    "engine_hours":   rng.uniform(100, 8000, N).round(1),
    "rpm":            rng.integers(600, 2400, N),
    "hydraulic_pressure": rng.uniform(100, 320, N).round(1),
    "fuel_level":     rng.uniform(5, 100, N).round(1),
    "fuel_used_l":    rng.uniform(0.5, 15, N).round(2),
    "idle_time_min":  rng.integers(0, 90, N),
    "active_time_min":rng.integers(10, 120, N),
    "speed_kph":      rng.uniform(0, 18, N).round(1),
    "tilt_angle":     rng.uniform(0, 22, N).round(1),
    "temperature_c":  rng.uniform(30, 105, N).round(1),
    "seatbelt":       rng.choice(["fastened", "unfastened"], N, p=[0.88, 0.12]),
    "proximity_alert":rng.choice([0, 1], N, p=[0.85, 0.15]),
    "fault_codes":    rng.choice(["NONE", "P0100", "P0217", "P0562"], N, p=[0.80, 0.07, 0.07, 0.06]),
    "weather":        rng.choice(["sunny", "cloudy", "rainy", "windy"], N),
    "soil_type":      rng.choice(["clay", "sand", "rock", "loam"], N),
    "shift":          rng.choice(["day", "night"], N),
})

# Inject realistic anomaly signals
for i, row in logs.iterrows():
    if rng.random() < 0.08:   # excessive idle
        logs.at[i, "idle_time_min"] = rng.integers(60, 90)
        logs.at[i, "rpm"] = rng.integers(600, 900)
    if rng.random() < 0.05:   # over-rev
        logs.at[i, "rpm"] = rng.integers(2200, 2400)
    if rng.random() < 0.06:   # high pressure
        logs.at[i, "hydraulic_pressure"] = rng.uniform(290, 320)
    if rng.random() < 0.04:   # overheat
        logs.at[i, "temperature_c"] = rng.uniform(100, 110)

logs.to_csv(f"{OUT}/machine_logs.csv", index=False)
print(f"machine_logs.csv → {len(logs)} rows")

# ── tasks.csv ─────────────────────────────────────────────────────────────────
task_types = ["dig", "load", "grade", "compact", "trench"]
T = 1500

base_times = {"dig": 55, "load": 30, "grade": 45, "compact": 40, "trench": 70}

tasks_rows = []
for i in range(1, T + 1):
    task_type = rng.choice(task_types)
    weather   = rng.choice(["sunny", "cloudy", "rainy", "windy"])
    soil      = rng.choice(["clay", "sand", "rock", "loam"])
    op_skill  = rng.choice(["junior", "mid", "senior"])
    machine_age = rng.uniform(0, 15)

    base = base_times[task_type]
    est  = base + rng.normal(0, 5)
    adj  = est
    if weather == "rainy":  adj += rng.uniform(8, 20)
    if weather == "windy":  adj += rng.uniform(3, 8)
    if soil    == "rock":   adj += rng.uniform(10, 25)
    if soil    == "clay":   adj += rng.uniform(5, 12)
    if op_skill == "junior":adj += rng.uniform(5, 15)
    if op_skill == "senior":adj -= rng.uniform(3, 8)
    if machine_age > 10:    adj += rng.uniform(3, 10)
    actual = max(10, adj + rng.normal(0, 3))

    tasks_rows.append({
        "task_id":         i,
        "machine_id":      rng.choice(machine_ids),
        "operator_id":     rng.choice(operator_ids),
        "task_type":       task_type,
        "estimated_time":  round(float(est), 1),
        "actual_time":     round(float(actual), 1),
        "weather":         weather,
        "soil_type":       soil,
        "operator_skill":  op_skill,
        "machine_age_yrs": round(float(machine_age), 1),
        "load_weight_t":   round(float(rng.uniform(1, 25)), 1),
        "completed":       rng.choice([1, 0], p=[0.92, 0.08]),
        "date":            str(pd.Timestamp("2024-01-01") + pd.Timedelta(days=int(rng.integers(0, 365)))),
    })

tasks_df = pd.DataFrame(tasks_rows)
tasks_df.to_csv(f"{OUT}/tasks.csv", index=False)
print(f"tasks.csv → {len(tasks_df)} rows")
