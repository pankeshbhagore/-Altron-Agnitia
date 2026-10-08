"""Unit tests for the scoring engine — proves F->A math is correct."""
from app.core import scoring

def test_grade_boundaries():
    assert scoring.grade(95) == "A"
    assert scoring.grade(18) == "F"

def test_baseline_vs_hardened():
    baseline = [
        dict(name="sqli", severity="CRITICAL", stage="runtime", attack_success=True),
        dict(name="cred", severity="HIGH", stage="missed", attack_success=True),
        dict(name="dep", severity="HIGH", stage="missed", attack_success=True),
        dict(name="cfg", severity="MEDIUM", stage="missed", attack_success=True),
    ]
    hardened = [dict(**{**w, "stage": "remediated", "attack_success": False}) for w in baseline]
    before = scoring.score_posture(baseline)
    after = scoring.score_posture(hardened)
    assert before["score"] == 18 and before["grade"] == "F"
    assert after["score"] == 100 and after["grade"] == "A"
    assert scoring.delta(before, after)["improvement"] == 82

def test_missed_counts():
    b = scoring.score_posture([
        dict(name="a", severity="HIGH", stage="missed", attack_success=True)])
    assert b["missed"] == 1 and b["score"] == 0
