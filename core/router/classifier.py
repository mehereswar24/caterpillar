"""
Naive Bayes intent classifier — T1 tier of the voice router.
Trains on hard-coded utterance examples per skill. Persists model to disk.
Falls back gracefully if model file is absent.
"""
from __future__ import annotations

import os
import pickle
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Training corpus — ~20 utterance variations per skill
# ---------------------------------------------------------------------------
TRAINING_DATA: list[tuple[str, str]] = [
    # task.estimate
    ("how long will this trench take", "task.estimate"),
    ("estimate the duration for loading", "task.estimate"),
    ("how much time for digging", "task.estimate"),
    ("what is the task duration", "task.estimate"),
    ("time needed for this job", "task.estimate"),
    ("predict task time", "task.estimate"),
    ("how long to finish grading", "task.estimate"),
    ("duration of compacting", "task.estimate"),
    # safety.log_incident
    ("log an incident worker too close", "safety.log_incident"),
    ("record a safety event", "safety.log_incident"),
    ("report proximity hazard", "safety.log_incident"),
    ("mark this as an incident", "safety.log_incident"),
    ("there was a near miss", "safety.log_incident"),
    # machine.fault_check
    ("what is wrong with the machine", "machine.fault_check"),
    ("fault code showing on display", "machine.fault_check"),
    ("machine is running hot", "machine.fault_check"),
    ("check diagnostics", "machine.fault_check"),
    ("hydraulic warning light", "machine.fault_check"),
    ("temperature too high", "machine.fault_check"),
    # anomaly.idle_check
    ("am i idling too much", "anomaly.idle_check"),
    ("how much have i been idling", "anomaly.idle_check"),
    ("wasting fuel today", "anomaly.idle_check"),
    ("is my idle time too high", "anomaly.idle_check"),
    # operator.safety_score
    ("what is my safety score", "operator.safety_score"),
    ("how am i doing today", "operator.safety_score"),
    ("show my performance", "operator.safety_score"),
    ("safety rating for today", "operator.safety_score"),
    # machine.maintenance
    ("when is next service", "machine.maintenance"),
    ("hydraulic filter due soon", "machine.maintenance"),
    ("maintenance schedule", "machine.maintenance"),
    ("oil change needed", "machine.maintenance"),
    ("next service hours", "machine.maintenance"),
    # environment.weather
    ("what is the weather like", "environment.weather"),
    ("will it rain today", "environment.weather"),
    ("current temperature outside", "environment.weather"),
    ("weather forecast for today", "environment.weather"),
    # operator.break
    ("i need a break", "operator.break"),
    ("feeling tired need rest", "operator.break"),
    ("log my break time", "operator.break"),
    ("fatigued need to stop", "operator.break"),
    # safety.seatbelt_check
    ("is my seatbelt on", "safety.seatbelt_check"),
    ("seatbelt status", "safety.seatbelt_check"),
    ("check belt", "safety.seatbelt_check"),
    # comms.supervisor
    ("call the supervisor", "comms.supervisor"),
    ("contact site manager", "comms.supervisor"),
    ("reach my supervisor", "comms.supervisor"),
    # machine.fuel_status
    ("how much fuel do i have", "machine.fuel_status"),
    ("fuel level check", "machine.fuel_status"),
    ("remaining fuel", "machine.fuel_status"),
    # training.open
    ("open training modules", "training.open"),
    ("start a training course", "training.open"),
    ("show me my lessons", "training.open"),
    # anomaly.report
    ("anything unusual happening", "anomaly.report"),
    ("show anomaly report", "anomaly.report"),
    ("unusual machine behaviour", "anomaly.report"),
    # operator.end_shift
    ("my shift is over", "operator.end_shift"),
    ("end of shift", "operator.end_shift"),
    ("finish shift handover", "operator.end_shift"),
    # safety.preshift
    ("start pre shift check", "safety.preshift"),
    ("begin inspection walkround", "safety.preshift"),
    ("pre shift inspection", "safety.preshift"),
]

MODEL_PATH = Path(__file__).parent / "t1_classifier.pkl"


def _tokenise(text: str) -> list[str]:
    return re.findall(r"[a-z]+", text.lower())


def _featurise(tokens: list[str]) -> dict[str, int]:
    feats: dict[str, int] = {}
    for tok in tokens:
        feats[tok] = feats.get(tok, 0) + 1
    # bigrams
    for a, b in zip(tokens, tokens[1:]):
        key = f"{a}_{b}"
        feats[key] = feats.get(key, 0) + 1
    return feats


class _NaiveBayes:
    """Multinomial Naive Bayes with Laplace smoothing."""

    def __init__(self) -> None:
        self.classes: list[str] = []
        self.log_prior: dict[str, float] = {}
        self.log_likelihood: dict[str, dict[str, float]] = {}
        self.vocab: set[str] = set()

    def train(self, examples: list[tuple[str, str]]) -> None:
        import math
        from collections import Counter, defaultdict

        class_counts: Counter = Counter(label for _, label in examples)
        self.classes = list(class_counts)
        n_total = len(examples)

        self.log_prior = {c: math.log(class_counts[c] / n_total) for c in self.classes}

        # word counts per class
        word_counts: dict[str, Counter] = defaultdict(Counter)
        for text, label in examples:
            feats = _featurise(_tokenise(text))
            word_counts[label].update(feats)
            self.vocab.update(feats)

        v = len(self.vocab)
        self.log_likelihood = {}
        for c in self.classes:
            total = sum(word_counts[c].values()) + v  # Laplace
            self.log_likelihood[c] = {
                w: math.log((word_counts[c].get(w, 0) + 1) / total)
                for w in self.vocab
            }
            # unseen word log prob
            self.log_likelihood[c]["__unk__"] = math.log(1 / total)

    def predict(self, text: str) -> tuple[str, float]:
        import math
        feats = _featurise(_tokenise(text))
        scores: dict[str, float] = {}
        for c in self.classes:
            s = self.log_prior[c]
            for w, cnt in feats.items():
                ll = self.log_likelihood[c].get(w, self.log_likelihood[c]["__unk__"])
                s += cnt * ll
            scores[c] = s

        best = max(scores, key=lambda c: scores[c])
        # Softmax-like confidence
        total = sum(math.exp(v - scores[best]) for v in scores.values())
        confidence = 1.0 / total
        return best, confidence


class IntentClassifier:
    def __init__(self) -> None:
        self._model: _NaiveBayes | None = None
        self._load_or_train()

    def _load_or_train(self) -> None:
        if MODEL_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                self._model = pickle.load(f)
        else:
            self._train()

    def _train(self) -> None:
        nb = _NaiveBayes()
        nb.train(TRAINING_DATA)
        self._model = nb
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(nb, f)

    def predict(self, transcript: str) -> tuple[str, float]:
        if self._model is None:
            return "unknown", 0.0
        return self._model.predict(transcript)
