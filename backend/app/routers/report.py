"""Report + scenarios + remediation endpoints."""
import json
import os
from fastapi import APIRouter, HTTPException

from ..config import settings
from ..core import orchestrator, advisor

router = APIRouter()


def _ensure_report():
    if not os.path.exists(settings.REPORT_PATH):
        orchestrator.run(settings.REPORT_PATH)
    with open(settings.REPORT_PATH) as f:
        return json.load(f)


@router.get("/api/report")
def get_report():
    """Latest posture report (runs scenarios once if none exists)."""
    return _ensure_report()


@router.post("/api/run")
def run_report():
    """Force a fresh run of all scenarios."""
    return orchestrator.run(settings.REPORT_PATH)


@router.post("/api/reset")
def reset():
    """Reset & replay: clear state so the next run is clean."""
    if os.path.exists(settings.REPORT_PATH):
        os.remove(settings.REPORT_PATH)
    return {"status": "reset", "detail": "report cleared; next /api/run replays fresh"}


@router.get("/api/scenarios")
def scenarios():
    r = _ensure_report()
    return r["scenarios"]


@router.get("/api/remediation")
def remediation():
    """Full remediation advice (diffs, gates, residual risk) for every scenario."""
    r = _ensure_report()
    ids = [s["id"] for s in r["scenarios"]]
    return advisor.advise_all(ids)


@router.get("/api/remediation/{scenario_id}")
def remediation_one(scenario_id: str):
    adv = advisor.advise(scenario_id)
    if adv is None:
        raise HTTPException(404, f"no remediation recipe for '{scenario_id}'")
    return adv
