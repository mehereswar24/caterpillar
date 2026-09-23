import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_dataset(num_rows=10000):
    np.random.seed(42)
    random.seed(42)

    # Base parameters
    machines = [f"EXC{i:03d}" for i in range(1, 4)] + [f"LDR{i:03d}" for i in range(1, 4)]
    operators = [f"OP{i:03d}" for i in range(1, 21)]
    weathers = ["sunny", "cloudy", "rainy", "foggy"]
    soils = ["dry", "wet", "rocky", "muddy"]
    tasks = ["dig", "load", "grade", "compact", "trench"]

    # Mapping base duration (mins)
    base_durations = {"dig": 45, "load": 30, "grade": 60, "compact": 40, "trench": 90}
    weather_factors = {"sunny": 1.0, "cloudy": 1.05, "rainy": 1.3, "foggy": 1.2}
    soil_factors = {"dry": 1.0, "wet": 1.2, "rocky": 1.5, "muddy": 1.4}
    
    # Operators experience
    op_experience = {op: np.random.randint(200, 8000) for op in operators}
    
    # Data generation
    data = []
    
    # Track machine states
    machine_engine_hours = {m: np.random.randint(1000, 10000) for m in machines}
    machine_fuel = {m: 100.0 for m in machines} # % full
    machine_last_service = {m: machine_engine_hours[m] - np.random.randint(50, 450) for m in machines}
    
    current_time = datetime(2026, 1, 1, 6, 0)
    
    for _ in range(num_rows):
        machine = random.choice(machines)
        operator = random.choice(operators)
        weather = random.choice(weathers)
        soil = random.choice(soils)
        task = random.choice(tasks)
        
        # Skill factor (more hours = faster, down to 0.8)
        skill_factor = max(0.8, 1.2 - (op_experience[operator] / 20000))
        noise = np.random.uniform(0.9, 1.1)
        
        task_duration = int(base_durations[task] * weather_factors[weather] * soil_factors[soil] * skill_factor * noise)
        
        # Increment time and hours
        shift_start = current_time
        shift_end = current_time + timedelta(minutes=task_duration)
        current_time = shift_end + timedelta(minutes=np.random.randint(5, 30))
        
        # Generate base features
        rpm = np.random.normal(1500, 200)
        hyd_pressure = np.random.normal(200, 30)
        tilt_angle = abs(np.random.normal(2, 1))
        load_cycles = int(task_duration / 5)
        arm_cycles = load_cycles * 3
        
        active_time = int(task_duration * np.random.uniform(0.7, 0.95))
        idling_time = task_duration - active_time
        
        fuel_used = task_duration * np.random.uniform(0.1, 0.3)
        machine_fuel[machine] -= fuel_used
        if machine_fuel[machine] < 10:
            machine_fuel[machine] = 100.0 # refuel
            
        temp = np.random.normal(25, 10)
        wind = np.random.normal(15, 10)
        
        # Target/Anomalies (~8% total)
        alert_triggered = False
        alert_type = "NORMAL"
        seatbelt = "FASTENED"
        speed = np.random.uniform(0, 8)
        prox_alerts = 0
        prox_dist = np.random.uniform(5, 20)
        
        # Roll for anomalies — 30% rate, balanced across 6 classes (~500 each)
        anomaly_roll = np.random.random()
        if anomaly_roll < 0.30:
            alert_triggered = True
            anomaly_type = np.random.choice(["EXCESSIVE_IDLE", "UNSAFE_SPEED", "UNFASTENED", "COLD_START_ABUSE", "FUEL_ANOMALY", "OVER_REV"])
            
            if anomaly_type == "EXCESSIVE_IDLE":
                idling_time = np.random.randint(35, 70)
                active_time = np.random.randint(1, 10)
                rpm = np.random.normal(850, 50)         # low RPM during idle
                fuel_used = np.random.uniform(1.5, 4.5) # LOW fuel — machine just sitting
                load_cycles = np.random.randint(0, 3)
                alert_type = "EXCESSIVE_IDLE"
            elif anomaly_type == "UNSAFE_SPEED":
                prox_dist = np.random.uniform(1, 4)
                speed = np.random.uniform(12, 22)
                seatbelt = "FASTENED"                   # distinct from seatbelt violation
                alert_type = "UNSAFE_SPEED"
            elif anomaly_type == "UNFASTENED":
                seatbelt = "UNFASTENED"
                speed = np.random.uniform(5, 15)        # clearly moving
                idling_time = np.random.randint(1, 8)
                active_time = np.random.randint(40, 60)
                rpm = np.random.normal(1600, 100)
                alert_type = "SEATBELT_VIOLATION"
            elif anomaly_type == "COLD_START_ABUSE":
                rpm = np.random.normal(2200, 80)
                hyd_pressure = np.random.normal(285, 15)
                active_time = np.random.randint(1, 8)   # very short time = cold start
                idling_time = np.random.randint(0, 3)
                engine_hours = np.random.uniform(10, 100)
                alert_type = "COLD_START_ABUSE"
            elif anomaly_type == "FUEL_ANOMALY":
                fuel_used = np.random.uniform(12, 22)   # very high fuel, no work
                active_time = np.random.randint(0, 5)
                load_cycles = np.random.randint(0, 2)
                rpm = np.random.normal(900, 100)
                alert_type = "FUEL_ANOMALY"
            elif anomaly_type == "OVER_REV":
                rpm = np.random.normal(2150, 80)
                hyd_pressure = np.random.normal(200, 20)  # normal pressure — distinct from cold start
                active_time = np.random.randint(30, 60)
                idling_time = np.random.randint(1, 8)
                alert_type = "OVER_REV"

        # Baseline seatbelt rule (20% unfastened chance per session overall if not strictly anomalous)
        if not alert_triggered and np.random.random() < 0.2:
            seatbelt = "UNFASTENED"
            # In the rules, unfastened doesn't always trigger an alert unless moving, but we'll stick to logic

        # Location
        lat = 17.4501 + np.random.normal(0, 0.01)
        lon = 78.3821 + np.random.normal(0, 0.01)
        geofence = False
        if abs(lat - 17.4501) > 0.02:
            geofence = True
            
        # Machine maintenance
        engine_hours = machine_engine_hours[machine]
        last_service = machine_last_service[machine]
        maintenance_due = engine_hours - last_service > 500
        fault_codes = "NONE" if np.random.random() > 0.05 else "ERR_HYD_TEMP"
        
        fatigue = np.random.uniform(0.1, 0.9)
        shift_num = np.random.randint(1, 100)
        
        data.append([
            shift_start.isoformat(), machine, operator, shift_start.isoformat(), shift_end.isoformat(),
            engine_hours, rpm, hyd_pressure, tilt_angle, fuel_used, machine_fuel[machine],
            load_cycles, arm_cycles, idling_time, active_time, task, task_duration,
            weather, temp, wind, soil, seatbelt, alert_triggered, alert_type,
            prox_alerts, prox_dist, speed, lat, lon, geofence,
            maintenance_due, last_service, fault_codes, fatigue, shift_num, True
        ])
        
        # update state
        machine_engine_hours[machine] += task_duration / 60.0

    columns = [
        "Timestamp", "MachineID", "OperatorID", "ShiftStart", "ShiftEnd",
        "EngineHours", "RPM", "HydraulicPressure", "TiltAngle",
        "FuelUsed", "FuelLevel", "LoadCycles", "ArmCycles",
        "IdlingTime", "ActiveTime", "TaskType", "TaskDuration",
        "Weather", "Temperature", "WindSpeed", "SoilType",
        "SeatbeltStatus", "SafetyAlertTriggered", "AlertType",
        "ProximityAlerts", "ProximityDistance", "SpeedKPH",
        "GPSLat", "GPSLon", "GeofenceBreach",
        "MaintenanceDue", "LastServiceHours", "FaultCodes",
        "OperatorFatigueScore", "ShiftNumber", "Completed"
    ]
    
    df = pd.DataFrame(data, columns=columns)
    df.to_csv("operator_sessions.csv", index=False)
    print(f"Generated {len(df)} rows in operator_sessions.csv")
    print("\nAnomaly Distribution:")
    print(df['AlertType'].value_counts())

if __name__ == "__main__":
    generate_dataset()
