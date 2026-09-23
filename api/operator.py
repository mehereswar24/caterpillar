"""
Operator API — safety score, efficiency score, AI coaching debrief, wellness.
"""
from __future__ import annotations

import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")


def _llm_coaching(operator_id: str, idle_min: int, seatbelt_alerts: int,
                  proximity_alerts: int, safety_score: int) -> str:
    """Generate a personalised debrief via Qwen2.5:7b. Falls back to template."""
    prompt = (
        f"You are a safety coach for a CAT excavator operator. "
        f"Write a 2-sentence personalised post-shift debrief for operator {operator_id}. "
        f"Key data: safety score {safety_score}/100, idle time {idle_min} minutes, "
        f"{seatbelt_alerts} seatbelt alerts, {proximity_alerts} proximity alerts. "
        f"Be direct and constructive. Do not use markdown."
    )
    try:
        from openai import OpenAI
        client = OpenAI(base_url=OLLAMA_BASE, api_key="ollama", timeout=8, max_retries=0)
        resp = client.chat.completions.create(
            model="qwen2.5:7b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            extra_body={"reasoning_effort": "none"},
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        # Template fallback
        parts = [f"Your safety score today is {safety_score} out of 100."]
        if idle_min > 30:
            parts.append(f"Watch your idle time — {idle_min} minutes is above average and wastes fuel.")
        elif seatbelt_alerts:
            parts.append(f"You had {seatbelt_alerts} seatbelt alert(s) — always fasten before moving.")
        elif proximity_alerts:
            parts.append(f"Good awareness overall; {proximity_alerts} proximity alert(s) logged today.")
        else:
            parts.append("Excellent shift — no major safety alerts. Keep it up.")
        return " ".join(parts)


@router.get("/score")
def get_score(operator_id: str = "OP001"):
    # In production this would query the incidents DB + anomaly log.
    # For demo we compute a deterministic score from operator_id hash.
    seed = sum(ord(c) for c in operator_id)
    safety = 75 + (seed % 25)
    efficiency = 80 + (seed % 18)
    return {
        "operator_id": operator_id,
        "safety_score": safety,
        "efficiency_score": efficiency,
        "shift_hours": 7.5,
        "idle_minutes": 22,
        "seatbelt_alerts": 0,
        "proximity_alerts": 1,
    }


@router.get("/coaching")
def get_coaching(operator_id: str = "OP001", shift_id: str = "current"):
    seed = sum(ord(c) for c in operator_id)
    safety = 75 + (seed % 25)
    idle = 22 + (seed % 40)
    seatbelt = 0 if seed % 3 else 1
    proximity = seed % 3

    debrief = _llm_coaching(operator_id, idle, seatbelt, proximity, safety)

    return {
        "operator_id": operator_id,
        "shift_id": shift_id,
        "debrief": debrief,
        "metrics": {
            "safety_score": safety,
            "idle_minutes": idle,
            "seatbelt_alerts": seatbelt,
            "proximity_alerts": proximity,
        },
    }


@router.get("/wellness")
def get_wellness(operator_id: str = "OP001"):
    seed = sum(ord(c) for c in operator_id)
    fatigue = round(0.2 + (seed % 60) / 100, 2)
    hours_active = 7.5 - (seed % 3) * 0.5
    break_due = hours_active > 2.0

    return {
        "operator_id": operator_id,
        "fatigue_score": fatigue,
        "hours_active": hours_active,
        "break_recommended": break_due,
        "heat_stress_alert": False,
        "message": "Take a break and hydrate." if break_due else "You are within safe operating limits.",
    }
