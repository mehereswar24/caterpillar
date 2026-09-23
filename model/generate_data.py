"""
generate_data.py — Rich 20-feature dataset per architecture spec.
Generates:
  data/tasks.csv        — 2000-row historical task dataset for ML training
  data/machine_logs.csv — 2000-row live machine telemetry
"""
import pandas as pd
import numpy as np
import os

rng = np.random.default_rng(42)
N_TASKS = 2000
N_LOGS  = 2000
OUT = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT, exist_ok=True)

machine_ids  = [f"EXC{i:03d}" for i in range(1, 6)]
operator_ids = [f"OP{i:03d}"  for i in range(1, 11)]

# ── tasks.csv ─────────────────────────────────────────────────────────────────
task_types   = ["Earth Excavation", "Trenching", "Material Loading", "Grading", "Compaction", "Demolition"]
materials    = ["Soil", "Clay", "Rock", "Gravel", "Sand", "Mixed"]
complexities = ["Low", "Medium", "High"]
weathers     = ["Sunny", "Cloudy", "Rainy", "Windy"]
grounds      = ["Dry", "Wet", "Muddy", "Frozen"]
skills       = ["Beginner", "Intermediate", "Expert"]

BASE = {
    "Earth Excavation": 65,
    "Trenching":        80,
    "Material Loading": 35,
    "Grading":          50,
    "Compaction":       45,
    "Demolition":       110,
}

rows = []
for i in range(1, N_TASKS + 1):
    task_type  = rng.choice(task_types)
    complexity = rng.choice(complexities)
    material   = rng.choice(materials)
    weather    = rng.choice(weathers)
    ground     = rng.choice(grounds)
    skill      = rng.choice(skills)

    quantity     = round(float(rng.uniform(30, 250)), 1)
    depth        = round(float(rng.uniform(0.5, 6.0)), 1)
    haul_dist    = round(float(rng.uniform(5, 100)), 1)
    temperature  = round(float(rng.uniform(5, 42)), 1)
    rainfall     = round(float(rng.uniform(0, 50) if weather == "Rainy" else 0), 1)
    wind_speed   = round(float(rng.uniform(10, 60) if weather == "Windy" else rng.uniform(0, 15)), 1)
    op_exp       = round(float(rng.uniform(0.5, 15)), 1)
    machine_age  = round(float(rng.uniform(0.5, 15)), 1)
    engine_hours = round(float(rng.uniform(200, 12000)), 0)
    bucket_cap   = round(float(rng.choice([0.8, 1.0, 1.2, 1.5, 2.0])), 1)
    engine_load  = round(float(rng.uniform(50, 95)), 1)
    mach_eff     = round(float(rng.uniform(65, 98)), 1)
    prev_tasks   = int(rng.integers(0, 300))
    prev_avg     = round(float(BASE[task_type] + rng.normal(0, 8)), 1)

    # Compute actual_completion_time with realistic multi-factor relationships
    base = BASE[task_type]
    vol_factor   = (quantity / 100) ** 0.6
    depth_factor = 1 + (depth - 2) * 0.05
    haul_factor  = 1 + (haul_dist - 25) * 0.003
    bucket_factor= 1.2 / bucket_cap
    comp_factor  = {"Low": 0.85, "Medium": 1.0, "High": 1.25}[complexity]
    mat_factor   = {"Soil":1.0,"Sand":0.95,"Gravel":1.05,"Clay":1.15,"Mixed":1.1,"Rock":1.35}[material]
    wx_factor    = {"Sunny":1.0,"Cloudy":1.03,"Rainy":1.20,"Windy":1.08}[weather]
    gnd_factor   = {"Dry":1.0,"Wet":1.12,"Muddy":1.25,"Frozen":1.18}[ground]
    rain_factor  = 1 + rainfall * 0.003
    wind_factor  = 1 + max(0, wind_speed - 20) * 0.004
    skill_factor = {"Beginner":1.25,"Intermediate":1.0,"Expert":0.82}[skill]
    exp_factor   = max(0.75, 1.15 - op_exp * 0.025)
    age_factor   = 1 + machine_age * 0.015
    eff_factor   = 1 + (90 - mach_eff) * 0.005
    load_factor  = 1 + max(0, engine_load - 80) * 0.003
    hist_factor  = max(0.85, 1.0 - prev_tasks * 0.0005) if prev_tasks > 10 else 1.0

    actual = (base * vol_factor * depth_factor * haul_factor * bucket_factor
              * comp_factor * mat_factor * wx_factor * gnd_factor
              * rain_factor * wind_factor * skill_factor * exp_factor
              * age_factor * eff_factor * load_factor * hist_factor
              + rng.normal(0, 3))
    actual    = max(10, min(300, round(float(actual), 1)))
    estimated = max(5,  round(float(actual + rng.normal(0, 8)), 1))

    rows.append({
        "task_id":                     i,
        "machine_id":                  rng.choice(machine_ids),
        "operator_id":                 rng.choice(operator_ids),
        "task_type":                   task_type,
        "task_complexity":             complexity,
        "material_type":               material,
        "quantity_m3":                 quantity,
        "target_depth_m":              depth,
        "haul_distance_m":             haul_dist,
        "weather":                     weather,
        "temperature_c":               temperature,
        "rainfall_mm":                 rainfall,
        "wind_speed_kmh":              wind_speed,
        "ground_condition":            ground,
        "operator_skill":              skill,
        "operator_experience_yrs":     op_exp,
        "previous_similar_tasks":      prev_tasks,
        "previous_avg_completion_min": prev_avg,
        "machine_age_yrs":             machine_age,
        "engine_hours":                engine_hours,
        "bucket_capacity_m3":          bucket_cap,
        "avg_engine_load_pct":         engine_load,
        "machine_efficiency_pct":      mach_eff,
        "estimated_time_min":          estimated,
        "actual_completion_time_min":  actual,   # TARGET
        "completed":                   int(rng.random() > 0.05),
        "date": str(pd.Timestamp("2024-01-01") + pd.Timedelta(days=int(rng.integers(0, 365)))),
    })

tasks_df = pd.DataFrame(rows)
tasks_df.to_csv(f"{OUT}/tasks.csv", index=False)
print(f"tasks.csv → {len(tasks_df)} rows, {len(tasks_df.columns)} columns")

# ── machine_logs.csv ──────────────────────────────────────────────────────────
logs = pd.DataFrame({
    "log_id":             range(1, N_LOGS + 1),
    "machine_id":         rng.choice(machine_ids,  N_LOGS),
    "operator_id":        rng.choice(operator_ids, N_LOGS),
    "timestamp":          pd.date_range("2024-01-01", periods=N_LOGS, freq="30min"),
    "engine_hours":       rng.uniform(100, 12000, N_LOGS).round(1),
    "rpm":                rng.integers(600, 2400, N_LOGS),
    "hydraulic_pressure": rng.uniform(100, 320, N_LOGS).round(1),
    "fuel_level":         rng.uniform(5, 100, N_LOGS).round(1),
    "fuel_used_l":        rng.uniform(0.5, 18, N_LOGS).round(2),
    "idle_time_min":      rng.integers(0, 90, N_LOGS),
    "active_time_min":    rng.integers(10, 120, N_LOGS),
    "speed_kph":          rng.uniform(0, 18, N_LOGS).round(1),
    "tilt_angle":         rng.uniform(0, 22, N_LOGS).round(1),
    "temperature_c":      rng.uniform(30, 110, N_LOGS).round(1),
    "engine_load_pct":    rng.uniform(40, 98, N_LOGS).round(1),
    "seatbelt":           rng.choice(["fastened", "unfastened"], N_LOGS, p=[0.88, 0.12]),
    "proximity_alert":    rng.choice([0, 1], N_LOGS, p=[0.85, 0.15]),
    "fault_codes":        rng.choice(["NONE", "P0100", "P0217", "P0562"], N_LOGS, p=[0.80, 0.07, 0.07, 0.06]),
    "weather":            rng.choice(["Sunny", "Cloudy", "Rainy", "Windy"], N_LOGS),
    "ground_condition":   rng.choice(["Dry", "Wet", "Muddy", "Frozen"], N_LOGS),
    "shift":              rng.choice(["day", "night"], N_LOGS),
})

for i in range(N_LOGS):
    if rng.random() < 0.08:
        logs.at[i, "idle_time_min"] = int(rng.integers(60, 90))
        logs.at[i, "rpm"] = int(rng.integers(600, 900))
    if rng.random() < 0.05:
        logs.at[i, "rpm"] = int(rng.integers(2200, 2400))
    if rng.random() < 0.06:
        logs.at[i, "hydraulic_pressure"] = float(rng.uniform(290, 320))
    if rng.random() < 0.04:
        logs.at[i, "temperature_c"] = float(rng.uniform(100, 110))

logs.to_csv(f"{OUT}/machine_logs.csv", index=False)
print(f"machine_logs.csv → {len(logs)} rows, {len(logs.columns)} columns")
