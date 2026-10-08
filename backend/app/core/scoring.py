"""
DevSecOps Security Score engine.

Produces a single 0-100 posture score (plus a letter grade) from how each weakness
was handled. The intuition judges grasp instantly: a credit-score-style number that
jumps after the team fixes the issues.

Credit model per weakness (defence-in-depth, shift-left rewarded most):
  blocked at pipeline (build/CI gate)        -> 100% credit   (best: never shipped)
  shipped but caught at runtime (Falco)      ->  50% credit   (detected, but it ran)
  shipped and undetected (missed)            ->   0% credit   (the dangerous gap)
  not reachable / remediated                 -> 100% credit

Each weakness is weighted by severity so a CRITICAL gap hurts more than a LOW one.
"""
from __future__ import annotations

SEVERITY_WEIGHT = {"CRITICAL": 10, "HIGH": 7, "MEDIUM": 4, "LOW": 2}
STAGE_CREDIT = {"pipeline": 1.0, "runtime": 0.5, "missed": 0.0, "remediated": 1.0}


def grade(score: float) -> str:
    return ("A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70
            else "D" if score >= 60 else "F")


def score_posture(weaknesses: list[dict]) -> dict:
    """
    weaknesses: list of
      {name, severity, stage, attack_success}
    stage in {pipeline, runtime, missed, remediated}
    """
    total_w = sum(SEVERITY_WEIGHT.get(w["severity"], 4) for w in weaknesses) or 1
    earned = 0.0
    rows = []
    for w in weaknesses:
        wt = SEVERITY_WEIGHT.get(w["severity"], 4)
        credit = STAGE_CREDIT.get(w["stage"], 0.0)
        pts = wt * credit
        earned += pts
        rows.append(dict(name=w["name"], severity=w["severity"], stage=w["stage"],
                         weight=wt, credit_pct=round(credit * 100),
                         attack_success=w["attack_success"]))
    score = round(earned / total_w * 100)
    return dict(score=score, grade=grade(score), rows=rows,
                caught_pipeline=sum(1 for w in weaknesses if w["stage"] == "pipeline"),
                caught_runtime=sum(1 for w in weaknesses if w["stage"] == "runtime"),
                missed=sum(1 for w in weaknesses if w["stage"] == "missed"))


def delta(before: dict, after: dict) -> dict:
    return dict(before=before["score"], after=after["score"],
                improvement=after["score"] - before["score"],
                grade_before=before["grade"], grade_after=after["grade"])
