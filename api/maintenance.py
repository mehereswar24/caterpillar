"""
Maintenance API — real LightGBM model inference for hours + component prediction.
"""
from __future__ import annotations

import os
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

_model_hours = None
_model_comp = None
_le_comp = None


def _load():
    global _model_hours, _model_comp, _le_comp
    import lightgbm as lgb, joblib
    h = MODEL_DIR / "maintenance_hours_predictor.txt"
    c = MODEL_DIR / "maintenance_component_predictor.txt"
    le = MODEL_DIR / "le_component.pkl"
    if h.exists() and _model_hours is None:
        _model_hours = lgb.Booster(model_file=str(h))
    if c.exists() and _model_comp is None:
        _model_comp = lgb.Booster(model_file=str(c))
    if le.exists() and _le_comp is None:
        _le_comp = joblib.load(str(le))


class MaintRequest(BaseModel):
    engine_hours: float = 3000
    last_service_hours: float = 2550
    hydraulic_pressure: float = 210
    rpm: float = 1500
    fuel_used: float = 4.0
    load_cycles: int = 12
    arm_cycles: int = 36


@router.get("/status")
def get_status(machine_id: str = "EXC001"):
    _load()
    # Default values representative of mid-life machine
    req = MaintRequest()
    return _predict(machine_id, req)


@router.post("/predict")
def predict_maintenance(machine_id: str, req: MaintRequest):
    _load()
    return _predict(machine_id, req)


def _predict(machine_id: str, req: MaintRequest) -> dict:
    features = [[
        req.engine_hours, req.last_service_hours, req.hydraulic_pressure,
        req.rpm, req.fuel_used, req.load_cycles, req.arm_cycles,
    ]]

    hours = 38.0
    component = "hydraulic_filter"

    if _model_hours:
        hours = max(0.0, round(float(_model_hours.predict(features)[0]), 1))

    if _model_comp and _le_comp:
        probs = _model_comp.predict(features)[0]
        idx = int(np.argmax(probs))
        component = _le_comp.inverse_transform([idx])[0]

    urgency = "critical" if hours < 20 else "warning" if hours < 50 else "ok"

    return {
        "machine_id": machine_id,
        "hours_until_service": hours,
        "component_at_risk": component,
        "urgency": urgency,
        "recommendation": f"{component.replace('_', ' ').title()} service due in ~{hours:.0f} hours.",
    }
