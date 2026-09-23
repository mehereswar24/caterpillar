import time
import requests
import json

BASE_URL = "http://localhost:8000"

def run_demo():
    print("=== CAT Smart Operator Demo ===")
    
    print("\n1. Voice: Estimating Task")
    res = requests.post(f"{BASE_URL}/voice/respond", json={
        "transcript": "how long will this trench take?",
        "operator_id": "OP001",
        "machine_id": "EXC001"
    })
    print(res.json())
    time.sleep(2)
    
    print("\n2. Anomaly: Scoring Telemetry (Normal)")
    res = requests.post(f"{BASE_URL}/anomaly/score", json={
        "RPM": 1400, "HydraulicPressure": 220, "TiltAngle": 2.1,
        "FuelUsed": 5.0, "LoadCycles": 10, "IdlingTime": 5, "ActiveTime": 45,
        "SpeedKPH": 4.2, "EngineHours": 1500, "hour_of_day": 10, "is_night": 0,
        "weather_encoded": 0, "soil_encoded": 0, "seatbelt_encoded": 0
    })
    print(res.json())
    time.sleep(2)
    
    print("\n3. Anomaly: Scoring Telemetry (Excessive Idle)")
    res = requests.post(f"{BASE_URL}/anomaly/score", json={
        "RPM": 800, "HydraulicPressure": 180, "TiltAngle": 0.5,
        "FuelUsed": 4.2, "LoadCycles": 0, "IdlingTime": 58, "ActiveTime": 0,
        "SpeedKPH": 0, "EngineHours": 1500, "hour_of_day": 11, "is_night": 0,
        "weather_encoded": 0, "soil_encoded": 0, "seatbelt_encoded": 0
    })
    print(res.json())

if __name__ == "__main__":
    try:
        run_demo()
    except requests.exceptions.ConnectionError:
        print("Error: Make sure the FastAPI server is running on port 8000 (uvicorn api.main:app)")
