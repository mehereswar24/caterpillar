"""
Anomaly API — LightGBM inference + LLM explanation.
"""
from __future__ import annotations

import os
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")

_model = None
_le_target = None


def _load():
    global _model, _le_target
    import lightgbm as lgb, joblib
    mp = MODEL_DIR / "anomaly_detector.txt"
    lp = MODEL_DIR / "le_target.pkl"
    if mp.exists() and _model is None:
        _model = lgb.Booster(model_file=str(mp))
    if lp.exists() and _le_target is None:
        _le_target = joblib.load(str(lp))


class TelemetryRow(BaseModel):
    RPM: float = 1500
    HydraulicPressure: float = 210
    TiltAngle: float = 2.0
    FuelUsed: float = 3.5
    LoadCycles: int = 10
    IdlingTime: int = 15
    ActiveTime: int = 45
    SpeedKPH: float = 4.0
    EngineHours: float = 2000
    hour_of_day: int = 10
    is_night: int = 0
    weather_encoded: int = 1
    soil_encoded: int = 0
    seatbelt_encoded: int = 0  # 0=FASTENED


def _llm_explain(label: str, data: TelemetryRow) -> str:
    templates = {
        "EXCESSIVE_IDLE": (
            f"You idled for {data.IdlingTime} minutes this session — "
            f"this wastes approximately {data.IdlingTime * 0.055:.1f} litres of fuel "
            f"and increases engine wear unnecessarily."
        ),
        "OVER_REV": (
            f"Engine RPM reached {data.RPM:.0f} — sustained over-revving "
            "damages engine internals and voids warranty conditions."
        ),
        "UNSAFE_SPEED": (
            f"Speed of {data.SpeedKPH:.1f} kph detected while workers were nearby. "
            "Maximum safe speed in proximity zones is 10 kph."
        ),
        "SEATBELT_VIOLATION": (
            f"Seatbelt unfastened at {data.SpeedKPH:.1f} kph. "
            "Always fasten before engaging drive."
        ),
        "COLD_START_ABUSE": (
            f"High hydraulic load ({data.HydraulicPressure:.0f} bar) applied within 2 minutes of cold start. "
            "Allow the engine to warm up to 60°C before full load."
        ),
        "FUEL_ANOMALY": (
            f"Fuel consumption of {data.FuelUsed:.1f} litres recorded with no matching task or engine hours. "
            "This may indicate unauthorised use or a sensor fault."
        ),
        "NORMAL": "Operating conditions are within safe and efficient parameters.",
    }
    base = templates.get(label, f"Anomaly type {label} detected in current telemetry.")

    # Try LLM for richer explanation (optional)
    try:
        from openai import OpenAI
        client = OpenAI(base_url=OLLAMA_BASE, api_key="ollama", timeout=6, max_retries=0)
        prompt = (
            f"A CAT excavator sensor flagged anomaly: {label}. "
            f"Telemetry: RPM={data.RPM:.0f}, Idle={data.IdlingTime}min, "
            f"Speed={data.SpeedKPH:.1f}kph, HydPressure={data.HydraulicPressure:.0f}bar. "
            "Explain in one plain sentence what this means and how to fix it."
        )
        resp = client.chat.completions.create(
            model="qwen2.5:7b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=80,
            extra_body={"reasoning_effort": "none"},
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return base


@router.post("/score")
async def score_anomaly(data: TelemetryRow):
    _load()

    idle_ratio = data.IdlingTime / (data.IdlingTime + data.ActiveTime + 1)
    rpm_x_pressure = data.RPM * data.HydraulicPressure
    fuel_per_active_min = data.FuelUsed / (data.ActiveTime + 1)
    speed_x_unfastened = data.SpeedKPH * data.seatbelt_encoded

    features = [[
        data.RPM, data.HydraulicPressure, data.TiltAngle, data.FuelUsed,
        data.LoadCycles, data.IdlingTime, data.ActiveTime, data.SpeedKPH,
        data.EngineHours, data.hour_of_day, data.is_night,
        data.weather_encoded, data.soil_encoded, data.seatbelt_encoded,
        idle_ratio, rpm_x_pressure, fuel_per_active_min, speed_x_unfastened,
    ]]

    if _model:
        preds = _model.predict(features)
        class_idx = int(np.argmax(preds[0]))
        confidence = float(preds[0][class_idx])
        label = _le_target.inverse_transform([class_idx])[0] if _le_target else str(class_idx)
    else:
        # Rule-based fallback
        label = "NORMAL"
        confidence = 0.95
        if data.IdlingTime > 30:
            label, confidence = "EXCESSIVE_IDLE", 0.91
        elif data.RPM > 2000:
            label, confidence = "OVER_REV", 0.88
        elif data.SpeedKPH > 10:
            label, confidence = "UNSAFE_SPEED", 0.85
        elif data.seatbelt_encoded == 1 and data.SpeedKPH > 2:
            label, confidence = "SEATBELT_VIOLATION", 0.93

    explanation = _llm_explain(label, data)

    return {"label": label, "confidence": round(confidence, 4), "explanation": explanation}


@router.get("/history")
def get_history(operator_id: str = "OP001", days: int = 7):
    # Deterministic demo data keyed on operator
    seed = sum(ord(c) for c in operator_id)
    trend = [(seed * (i + 1)) % 3 for i in range(days)]
    labels = ["NORMAL", "EXCESSIVE_IDLE", "OVER_REV", "SEATBELT_VIOLATION",
              "UNSAFE_SPEED", "COLD_START_ABUSE", "FUEL_ANOMALY"]
    events = [{"day": i + 1, "count": trend[i], "label": labels[trend[i]]}
              for i in range(days)]
    return {"operator_id": operator_id, "days": days, "trend": trend, "events": events}


@router.get("/report")
def get_report(machine_id: str = "EXC001"):
    return {
        "machine_id": machine_id,
        "summary": "Weekly anomaly report generated.",
        "pdf_url": f"/reports/{machine_id}_weekly.pdf",
        "total_anomalies": 5,
        "breakdown": {
            "EXCESSIVE_IDLE": 2,
            "SEATBELT_VIOLATION": 1,
            "OVER_REV": 1,
            "FUEL_ANOMALY": 1,
        },
    }
