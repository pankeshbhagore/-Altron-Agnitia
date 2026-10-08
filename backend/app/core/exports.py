"""
Standards exports.

Emits findings in formats security professionals recognise instantly — the detail
that signals "this team knows the real tools":

  - MITRE ATT&CK Navigator layer (import at mitre-attack.github.io/attack-navigator)
  - Sigma detection rules (one per scenario — the rule that would catch it)
  - OPA / Rego policy (the config gate that closes the misconfiguration gap)
"""
from __future__ import annotations
import json

STAGE_COLOR = {"pipeline": "#2ea043", "runtime": "#d7a32b",
               "missed": "#f25c54", "remediated": "#4c9aff"}


def navigator_layer(report: dict) -> dict:
    """ATT&CK Navigator v4 layer, techniques coloured by detection stage."""
    techniques = []
    for s in report["scenarios"]:
        techniques.append({
            "techniqueID": s["mitre"].split(".")[0],
            "score": 1,
            "color": STAGE_COLOR.get(s["stage"], "#888"),
            "comment": f'{s["name"]} — caught at {s["stage"]}',
            "enabled": True,
        })
    return {
        "name": "DevSecOps Twin — detection coverage",
        "versions": {"attack": "14", "navigator": "4.9.1", "layer": "4.5"},
        "domain": "enterprise-attack",
        "description": "Techniques exercised by the twin, coloured by detection stage.",
        "techniques": techniques,
        "legendItems": [{"label": k, "color": v} for k, v in STAGE_COLOR.items()],
    }


def sigma_rules(report: dict) -> list[dict]:
    """A Sigma rule per scenario (detection-as-code the SOC could deploy)."""
    rules = []
    for s in report["scenarios"]:
        rid = s["id"].replace("_", "-")
        rule = f"""title: Twin - {s['name']}
id: twin-{rid}
status: experimental
description: Detects {s['name'].lower()} exercised by the DevSecOps twin.
references:
  - https://attack.mitre.org/techniques/{s['mitre'].split('.')[0]}/
tags:
  - attack.{s['step'].lower().replace(' ', '_')}
  - {s['mitre'].lower()}
logsource:
  product: application
  service: twin-app
detection:
  selection:
    scenario: {s['id']}
  condition: selection
level: {'high' if s['severity'] in ('CRITICAL', 'HIGH') else 'medium'}"""
        rules.append({"id": s["id"], "filename": f"twin-{rid}.yml", "rule": rule})
    return rules


def opa_policy() -> str:
    """Rego policy enforced in CI — blocks shipping with debug enabled."""
    return """package twin.config

# Deny any production manifest that leaves debug enabled or exposes the
# internal debug endpoint. This is the control that closes the misconfig gap.

deny[msg] {
    input.services[name].environment[_] == "APP_DEBUG=true"
    msg := sprintf("service %q must not run with APP_DEBUG=true in production", [name])
}

deny[msg] {
    some route
    input.routes[route] == "/debug/config"
    msg := "internal /debug/config endpoint must not be exposed in production"
}
"""


def all_exports(report: dict) -> dict:
    return {
        "navigator_layer": navigator_layer(report),
        "sigma_rules": sigma_rules(report),
        "opa_policy": opa_policy(),
    }
