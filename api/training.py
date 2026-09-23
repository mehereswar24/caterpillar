"""
Training API — module catalogue with SQLite progress tracking.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "training.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

MODULES = [
    {"id": "m1", "title": "Proximity Safety", "type": "simulation",
     "description": "Learn to identify and respond to worker proximity breaches."},
    {"id": "m2", "title": "Night Operations", "type": "video",
     "description": "Safe procedures for operating in low-visibility conditions."},
    {"id": "m3", "title": "Seatbelt Compliance", "type": "quiz",
     "description": "Rules and importance of seatbelt use on site."},
    {"id": "m4", "title": "Slope & Tilt Safety", "type": "simulation",
     "description": "Recognising unsafe tilt angles and safe parking on slopes."},
    {"id": "m5", "title": "Fuel Efficiency", "type": "video",
     "description": "Reducing idle time and improving fuel economy."},
    {"id": "m6", "title": "Pre-Shift Inspection", "type": "checklist",
     "description": "Step-by-step machine inspection before every shift."},
]


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    c.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            operator_id TEXT NOT NULL,
            module_id   TEXT NOT NULL,
            score       INTEGER DEFAULT 0,
            completed   INTEGER DEFAULT 0,
            completed_at TEXT,
            PRIMARY KEY (operator_id, module_id)
        )
    """)
    c.commit()
    return c


class ModuleCompleteReq(BaseModel):
    operator_id: str
    module_id: str
    score: int = 100


@router.get("/modules")
def get_modules(operator_id: str = "OP001"):
    with _conn() as c:
        rows = c.execute(
            "SELECT module_id, score, completed, completed_at FROM progress WHERE operator_id=?",
            (operator_id,)
        ).fetchall()
    progress = {r["module_id"]: dict(r) for r in rows}

    modules_out = []
    for m in MODULES:
        p = progress.get(m["id"], {})
        modules_out.append({
            **m,
            "completed": bool(p.get("completed", 0)),
            "score": p.get("score", 0),
            "completed_at": p.get("completed_at"),
        })

    completed_count = sum(1 for m in modules_out if m["completed"])
    return {
        "operator_id": operator_id,
        "modules": modules_out,
        "progress": f"{completed_count}/{len(MODULES)} completed",
    }


@router.post("/complete")
def complete_module(req: ModuleCompleteReq):
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            """INSERT INTO progress (operator_id, module_id, score, completed, completed_at)
               VALUES (?,?,?,1,?)
               ON CONFLICT(operator_id, module_id)
               DO UPDATE SET score=excluded.score, completed=1, completed_at=excluded.completed_at""",
            (req.operator_id, req.module_id, req.score, ts),
        )
    return {"status": "success", "module_id": req.module_id,
            "score": req.score, "completed_at": ts}
