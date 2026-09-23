"""
Incidents API — persistent SQLite storage, append-only.
No UPDATE or DELETE — every incident is immutable once written.
"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "incidents.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    c.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id  TEXT PRIMARY KEY,
            operator_id  TEXT NOT NULL,
            machine_id   TEXT NOT NULL,
            description  TEXT NOT NULL,
            alert_type   TEXT NOT NULL DEFAULT 'GENERAL',
            gps_lat      REAL,
            gps_lon      REAL,
            created_at   TEXT NOT NULL
        )
    """)
    c.commit()
    return c


class IncidentReq(BaseModel):
    operator_id: str
    machine_id: str
    description: str
    alert_type: str = "GENERAL"
    gps_lat: float | None = None
    gps_lon: float | None = None


@router.post("/log")
def log_incident(req: IncidentReq):
    inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
    ts = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            "INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?)",
            (inc_id, req.operator_id, req.machine_id, req.description,
             req.alert_type, req.gps_lat, req.gps_lon, ts),
        )
    return {"incident_id": inc_id, "status": "logged", "created_at": ts}


@router.get("/list")
def list_incidents(operator_id: str | None = None, machine_id: str | None = None, limit: int = 50):
    with _conn() as c:
        if operator_id and machine_id:
            rows = c.execute(
                "SELECT * FROM incidents WHERE operator_id=? AND machine_id=? ORDER BY created_at DESC LIMIT ?",
                (operator_id, machine_id, limit),
            ).fetchall()
        elif operator_id:
            rows = c.execute(
                "SELECT * FROM incidents WHERE operator_id=? ORDER BY created_at DESC LIMIT ?",
                (operator_id, limit),
            ).fetchall()
        elif machine_id:
            rows = c.execute(
                "SELECT * FROM incidents WHERE machine_id=? ORDER BY created_at DESC LIMIT ?",
                (machine_id, limit),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
    return {"incidents": [dict(r) for r in rows]}
