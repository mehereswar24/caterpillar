"""
Dialogue manager — multi-turn state, slot filling, confirmation flows,
barge-in handling, verbosity control, and session memory.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

@dataclass
class PendingCall:
    skill_id: str
    utterance: str
    slots: dict[str, Any] = field(default_factory=dict)
    awaiting_slot: str | None = None
    needs_confirmation: bool = False
    readback_complete: bool = False
    clarifications: int = 0


@dataclass
class Session:
    user_id: str
    machine_id: str = "EXC001"
    language: str = "en"
    pending: PendingCall | None = None
    history: list[dict[str, str]] = field(default_factory=list)
    last_skill: str | None = None
    last_active: float = field(default_factory=time.monotonic)

    def remember(self, heard: str, said: str, skill_id: str | None) -> None:
        self.history.append({"heard": heard, "said": said, "skill": skill_id or ""})
        if len(self.history) > 6:
            self.history = self.history[-6:]
        self.last_active = time.monotonic()

    def clear_pending(self) -> None:
        self.pending = None


# ---------------------------------------------------------------------------
# Skills that require confirmation before executing
# ---------------------------------------------------------------------------
CONFIRM_SKILLS = {
    "safety.log_incident",
    "operator.end_shift",
    "comms.supervisor",
}

# Skills that need an additional slot filled
SLOT_PROMPTS: dict[str, tuple[str, str]] = {
    # skill_id → (slot_name, question)
    "task.estimate": ("task_type", "What task type — dig, load, trench, grade, or compact?"),
}


# ---------------------------------------------------------------------------
# Verbosity: shorter responses when machine is active
# ---------------------------------------------------------------------------
def _verbosity(machine_load: float) -> str:
    if machine_load > 0.7:
        return "minimal"
    if machine_load > 0.3:
        return "brief"
    return "full"


# ---------------------------------------------------------------------------
# Manager
# ---------------------------------------------------------------------------

class DialogueManager:
    def __init__(self, session_ttl: float = 180.0) -> None:
        self._sessions: dict[str, Session] = {}
        self._ttl = session_ttl

    # -- session management ------------------------------------------------

    def get_or_create(self, user_id: str, machine_id: str = "EXC001") -> Session:
        self._prune()
        if user_id not in self._sessions:
            self._sessions[user_id] = Session(user_id=user_id, machine_id=machine_id)
        return self._sessions[user_id]

    def _prune(self) -> None:
        now = time.monotonic()
        dead = [k for k, s in self._sessions.items() if now - s.last_active > self._ttl]
        for k in dead:
            del self._sessions[k]

    # -- turn processing ---------------------------------------------------

    def process(
        self,
        user_id: str,
        text: str,
        routed_skill: str | None,
        *,
        machine_id: str = "EXC001",
        machine_load: float = 0.0,
    ) -> dict[str, Any]:
        """
        Returns:
          {
            "action": "dispatch" | "ask_slot" | "confirm" | "cancelled" | "not_understood",
            "skill_id": str | None,
            "slots": dict,
            "prompt": str,          # what to say to the operator
            "verbosity": str,
          }
        """
        session = self.get_or_create(user_id, machine_id)
        verb = _verbosity(machine_load)
        text_lower = text.lower().strip()

        # -- barge-in / cancel while pending --------------------------------
        if session.pending and _is_cancel(text_lower):
            session.clear_pending()
            return _act("cancelled", None, {}, "Cancelled.", verb)

        # -- confirmation reply ---------------------------------------------
        if session.pending and session.pending.needs_confirmation:
            if _is_affirmative(text_lower):
                if not session.pending.readback_complete:
                    session.pending.readback_complete = True
                    msg = f"Confirm: {_confirm_line(session.pending.skill_id)}. Say yes again to proceed."
                    return _act("confirm", session.pending.skill_id, session.pending.slots, msg, verb)
                call = session.pending
                session.clear_pending()
                session.remember(text, f"Executing {call.skill_id}", call.skill_id)
                return _act("dispatch", call.skill_id, call.slots, "", verb)
            session.clear_pending()
            return _act("cancelled", None, {}, "Cancelled.", verb)

        # -- slot reply -----------------------------------------------------
        if session.pending and session.pending.awaiting_slot:
            slot_name = session.pending.awaiting_slot
            session.pending.slots[slot_name] = text_lower
            session.pending.awaiting_slot = None
            session.pending.clarifications = 0
            # re-check if confirmation needed
            if session.pending.skill_id in CONFIRM_SKILLS:
                session.pending.needs_confirmation = True
                msg = f"Confirm: {_confirm_line(session.pending.skill_id)}. Say yes to proceed."
                return _act("confirm", session.pending.skill_id, session.pending.slots, msg, verb)
            call = session.pending
            session.clear_pending()
            session.remember(text, f"Dispatching {call.skill_id}", call.skill_id)
            return _act("dispatch", call.skill_id, call.slots, "", verb)

        # -- no skill routed ------------------------------------------------
        if not routed_skill or routed_skill == "no_match":
            session.remember(text, "not_understood", None)
            return _act("not_understood", None, {}, "I didn't catch that. Try again.", verb)

        # -- slot required? -------------------------------------------------
        if routed_skill in SLOT_PROMPTS:
            slot_name, question = SLOT_PROMPTS[routed_skill]
            session.pending = PendingCall(
                skill_id=routed_skill, utterance=text,
                awaiting_slot=slot_name,
            )
            return _act("ask_slot", routed_skill, {}, question, verb)

        # -- confirmation required? -----------------------------------------
        if routed_skill in CONFIRM_SKILLS:
            session.pending = PendingCall(
                skill_id=routed_skill, utterance=text,
                needs_confirmation=True,
            )
            msg = f"Confirm: {_confirm_line(routed_skill)}. Say yes to proceed."
            return _act("confirm", routed_skill, {}, msg, verb)

        # -- dispatch immediately -------------------------------------------
        session.last_skill = routed_skill
        session.remember(text, f"Dispatching {routed_skill}", routed_skill)
        return _act("dispatch", routed_skill, {}, "", verb)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _act(action: str, skill: str | None, slots: dict, prompt: str, verb: str) -> dict:
    return {"action": action, "skill_id": skill, "slots": slots,
            "prompt": prompt, "verbosity": verb}


def _is_cancel(text: str) -> bool:
    return any(w in text for w in ("cancel", "never mind", "stop", "abort", "no"))


def _is_affirmative(text: str) -> bool:
    return any(w in text for w in ("yes", "confirm", "proceed", "do it", "go ahead", "yep", "yeah"))


def _confirm_line(skill_id: str) -> str:
    lines = {
        "safety.log_incident": "log this incident",
        "operator.end_shift": "end your shift and trigger handover",
        "comms.supervisor": "call the supervisor",
    }
    return lines.get(skill_id, skill_id)
