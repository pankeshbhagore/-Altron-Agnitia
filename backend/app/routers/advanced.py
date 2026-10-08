"""Advanced endpoints: interactive hardening, attack chain, standards exports."""
import json
import os
from fastapi import APIRouter, Body
from fastapi.responses import PlainTextResponse, JSONResponse

from ..config import settings
from ..core import orchestrator, harden, exports

router = APIRouter()


def _report():
    if not os.path.exists(settings.REPORT_PATH):
        orchestrator.run(settings.REPORT_PATH)
    with open(settings.REPORT_PATH) as f:
        return json.load(f)


@router.get("/api/chain")
def get_chain():
    """The composed attack chain + blast radius."""
    return _report()["chain"]


@router.get("/api/controls")
def list_controls():
    """Available hardening controls for the interactive sandbox."""
    return [{"id": cid, "label": harden.CONTROL_LABELS[cid],
             "scenario": spec[0], "stage": spec[1], "breaks_attack": spec[2]}
            for cid, spec in harden.CONTROLS.items()]


@router.post("/api/simulate")
def simulate(controls: dict = Body(default={})):
    """Recompute posture with a set of controls toggled on/off."""
    base = _report()["scenarios"]
    return harden.simulate(base, controls or {})


@router.get("/api/export/navigator")
def export_navigator():
    return JSONResponse(exports.navigator_layer(_report()))


@router.get("/api/export/sigma")
def export_sigma():
    return exports.sigma_rules(_report())


@router.get("/api/export/sigma/{scenario_id}", response_class=PlainTextResponse)
def export_sigma_one(scenario_id: str):
    for r in exports.sigma_rules(_report()):
        if r["id"] == scenario_id:
            return r["rule"]
    return PlainTextResponse("not found", status_code=404)


@router.get("/api/export/opa", response_class=PlainTextResponse)
def export_opa():
    return exports.opa_policy()
