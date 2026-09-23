"""
Role-based policy gate. Every action passes through here before execution.
Returns {"allowed": bool, "reason": str}.
"""
from __future__ import annotations

ROLE_RANK = {"OPERATOR": 1, "SUPERVISOR": 2, "SITE_MANAGER": 3}

# skill_id → minimum role required
SKILL_ROLES: dict[str, str] = {
    "task.estimate":          "OPERATOR",
    "safety.log_incident":    "OPERATOR",
    "machine.fault_check":    "OPERATOR",
    "anomaly.idle_check":     "OPERATOR",
    "operator.safety_score":  "OPERATOR",
    "machine.maintenance":    "OPERATOR",
    "environment.weather":    "OPERATOR",
    "operator.break":         "OPERATOR",
    "safety.seatbelt_check":  "OPERATOR",
    "comms.supervisor":       "OPERATOR",
    "machine.fuel_status":    "OPERATOR",
    "training.open":          "OPERATOR",
    "anomaly.report":         "OPERATOR",
    "operator.end_shift":     "OPERATOR",
    "safety.preshift":        "OPERATOR",
    # supervisor-only
    "fleet.reassign_task":    "SUPERVISOR",
    "machine.shutdown":       "SUPERVISOR",
    # site manager only
    "fleet.view_all":         "SITE_MANAGER",
}

# Safety alerts always fire regardless of role
ALWAYS_ALLOW = {
    "safety.seatbelt_check",
    "safety.log_incident",
    "safety.preshift",
}


def check(skill_id: str, role: str = "OPERATOR") -> dict:
    if skill_id in ALWAYS_ALLOW:
        return {"allowed": True, "reason": "safety — always permitted"}

    required = SKILL_ROLES.get(skill_id, "OPERATOR")
    if ROLE_RANK.get(role, 0) >= ROLE_RANK.get(required, 1):
        return {"allowed": True, "reason": "ok"}

    return {
        "allowed": False,
        "reason": f"{skill_id} requires {required} role; you are {role}",
    }
