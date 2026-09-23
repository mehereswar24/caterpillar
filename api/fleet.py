"""
Fleet API — live machine positions, health summary, supervisor view.
Uses ExcavatorSimulator for demo; replace with real telemetry adapter in production.
"""
from __future__ import annotations

import sys
from pathlib import Path
from fastapi import APIRouter

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sim.excavator import ExcavatorSimulator, EXCAVATOR_SCENES

router = APIRouter()

# One simulator per machine for demo
_sims: dict[str, ExcavatorSimulator] = {
    "EXC001": ExcavatorSimulator(),
    "EXC002": ExcavatorSimulator(),
    "LDR001": ExcavatorSimulator(),
    "LDR002": ExcavatorSimulator(),
}
_sims["EXC001"].load_scene("normal_operation")
_sims["EXC002"].load_scene("excessive_idle")
_sims["LDR001"].load_scene("worker_proximity_breach")
_sims["LDR002"].load_scene("normal_operation")

# Static GPS offsets per machine (in real system these come from GPS hardware)
_GPS: dict[str, tuple[float, float]] = {
    "EXC001": (17.4501, 78.3821),
    "EXC002": (17.4515, 78.3835),
    "LDR001": (17.4490, 78.3810),
    "LDR002": (17.4525, 78.3800),
}

_TASKS: dict[str, str] = {
    "EXC001": "Trenching - Sector 4",
    "EXC002": "Grading - Sector 2",
    "LDR001": "Loading - Pit A",
    "LDR002": "Idle",
}


def _machine_status(machine_id: str) -> dict:
    sim = _sims.get(machine_id)
    if not sim:
        return {}
    t = sim.get_telemetry()
    lat, lon = _GPS.get(machine_id, (17.45, 78.38))

    idle_min = t.get("idling_time", 0)
    seatbelt = t.get("seatbelt", True)
    workers = t.get("workers_in_zone", 0)
    tilt = t.get("tilt_angle", 2.0)

    alerts = []
    if not seatbelt:
        alerts.append("SEATBELT_VIOLATION")
    if idle_min > 30:
        alerts.append("EXCESSIVE_IDLE")
    if workers > 0:
        alerts.append("PROXIMITY_BREACH")
    if tilt > 15:
        alerts.append("SLOPE_INSTABILITY")

    health = "critical" if "SLOPE_INSTABILITY" in alerts or "SEATBELT_VIOLATION" in alerts \
        else "warning" if alerts else "good"

    return {
        "machine_id": machine_id,
        "lat": lat,
        "lon": lon,
        "status": "idle" if idle_min > 30 else "active",
        "task": _TASKS.get(machine_id, "Unknown"),
        "rpm": t.get("rpm", 0),
        "fuel_level": t.get("fuel_level", 72),
        "health": health,
        "active_alerts": alerts,
        "telemetry": {
            "seatbelt": seatbelt,
            "workers_in_zone": workers,
            "idling_time": idle_min,
            "tilt_angle": tilt,
            "hydraulic_pressure": t.get("hydraulic_pressure", 220),
        },
    }


@router.get("/map")
def get_map(site_id: str = "site_1"):
    machines = [_machine_status(mid) for mid in _sims]
    return {
        "site_id": site_id,
        "machines": machines,
        "total": len(machines),
        "active": sum(1 for m in machines if m.get("status") == "active"),
        "alerts": sum(len(m.get("active_alerts", [])) for m in machines),
    }


@router.get("/machines")
def get_machines(site_id: str = "site_1"):
    return {mid: _machine_status(mid) for mid in _sims}


@router.post("/scene")
def set_scene(machine_id: str, scene_name: str):
    """Load a simulator scene for demo purposes."""
    sim = _sims.get(machine_id)
    if not sim:
        return {"error": f"Unknown machine {machine_id}"}
    try:
        sim.load_scene(scene_name)
        return {"machine_id": machine_id, "scene": scene_name, "status": "loaded",
                "telemetry": sim.get_telemetry()}
    except ValueError as e:
        return {"error": str(e), "available": list(EXCAVATOR_SCENES)}


@router.post("/fault")
def inject_fault(machine_id: str, key: str, value: str):
    """Inject a fault into a machine for demo."""
    sim = _sims.get(machine_id)
    if not sim:
        return {"error": f"Unknown machine {machine_id}"}
    # coerce value
    v: bool | float | int | str = value
    if value.lower() == "true":
        v = True
    elif value.lower() == "false":
        v = False
    else:
        try:
            v = float(value)
        except ValueError:
            pass
    sim.inject_fault(key, v)
    return {"machine_id": machine_id, "fault": key, "value": v, "injected": True}
