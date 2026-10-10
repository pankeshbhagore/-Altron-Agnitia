"""AI-powered endpoints — attack analysis, detection triage, remediation, chat."""
import json
import os
from fastapi import APIRouter, Body, HTTPException

from ..core import llm_engine, orchestrator
from ..config import settings

router = APIRouter(prefix="/api/ai", tags=["AI"])


def _report():
    if not os.path.exists(settings.REPORT_PATH):
        orchestrator.run(settings.REPORT_PATH)
    with open(settings.REPORT_PATH) as f:
        return json.load(f)


@router.get("/status")
def ai_status():
    """Check if AI (GPT-4o) is available."""
    return {
        "available": llm_engine.is_available(),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
        "provider": "OpenAI",
    }


@router.get("/analyse")
def analyse_all():
    """AI analysis of all attack scenarios."""
    report = _report()
    return llm_engine.analyse_all_attacks(report["scenarios"])


@router.get("/analyse/{scenario_id}")
def analyse_one(scenario_id: str):
    """AI analysis of a single scenario."""
    report = _report()
    sc = next((s for s in report["scenarios"] if s["id"] == scenario_id), None)
    if not sc:
        raise HTTPException(404, f"Scenario '{scenario_id}' not found")
    return llm_engine.analyse_attack(sc)


@router.get("/vectors/{scenario_id}")
def suggest_vectors(scenario_id: str):
    """Suggest novel attack vectors for a scenario."""
    report = _report()
    sc = next((s for s in report["scenarios"] if s["id"] == scenario_id), None)
    if not sc:
        raise HTTPException(404, f"Scenario '{scenario_id}' not found")
    return llm_engine.suggest_attack_vectors(sc)


@router.get("/triage")
def triage_all():
    """AI triage of all detections."""
    report = _report()
    from ..core import detectors
    dets = detectors.all_detections()
    return llm_engine.triage_all_detections(dets, report["scenarios"])


@router.get("/summary")
def executive_summary():
    """AI-generated executive summary."""
    report = _report()
    return llm_engine.generate_executive_summary(report)


@router.post("/chat")
def chat(body: dict = Body(...)):
    """Interactive security Q&A."""
    question = body.get("question", "")
    if not question:
        raise HTTPException(400, "question is required")
    report = _report()
    summary = {
        "score": report.get("score"),
        "coverage": report.get("coverage"),
        "scenarios": [{"id": s["id"], "name": s["name"], "severity": s["severity"],
                       "success": s["success"], "stage": s["stage"]}
                      for s in report.get("scenarios", [])],
    }
    return llm_engine.security_chat(question, summary)
