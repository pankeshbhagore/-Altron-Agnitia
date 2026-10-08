"""
Prometheus metrics endpoint.

Exposes the twin's posture as real metrics so Prometheus has a live target to
scrape and the Grafana dashboard shows real data (not dead panels). Metric names
match monitoring/grafana-dashboard.json.
"""
import json
import os
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from ..config import settings
from ..core import orchestrator

router = APIRouter()


def _report():
    if not os.path.exists(settings.REPORT_PATH):
        orchestrator.run(settings.REPORT_PATH)
    with open(settings.REPORT_PATH) as f:
        return json.load(f)


@router.get("/metrics", response_class=PlainTextResponse)
def metrics():
    r = _report()
    cov = r["coverage"]
    lines = [
        "# HELP twin_security_score Current security posture score (0-100).",
        "# TYPE twin_security_score gauge",
        f'twin_security_score{{posture="baseline"}} {r["posture_before"]["score"]}',
        f'twin_security_score{{posture="hardened"}} {r["posture_after"]["score"]}',
        "# HELP twin_detections_total Weaknesses by detection stage (baseline).",
        "# TYPE twin_detections_total gauge",
        f'twin_detections_total{{stage="pipeline"}} {cov["pipeline"]}',
        f'twin_detections_total{{stage="runtime"}} {cov["runtime"]}',
        f'twin_detections_total{{stage="missed"}} {cov["missed"]}',
        "# HELP twin_scenario_success Whether each scripted attack succeeded at runtime.",
        "# TYPE twin_scenario_success gauge",
    ]
    for s in r["scenarios"]:
        lines.append(f'twin_scenario_success{{scenario="{s["id"]}",severity="{s["severity"]}"}} {int(s["success"])}')
    return "\n".join(lines) + "\n"
