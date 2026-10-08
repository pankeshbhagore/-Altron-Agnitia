"""
Detection layer.

Normalises findings from three defensive stages into a single schema so we can
compute *where* each attack was (or wasn't) caught — the core DevSecOps insight:

  stage = "pipeline"  -> shift-left: caught at build/CI time (Trivy, gitleaks, SAST)
  stage = "runtime"   -> caught live by Falco while the attack executed
  stage = "missed"    -> no defence fired; attack succeeded undetected

Real Trivy/gitleaks/Falco JSON can be dropped into /monitoring/evidence and parsed
here. When those files are absent (offline demo), curated sample findings are used
so the coverage matrix is always populated.
"""
from __future__ import annotations
import json
import os

EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "/tmp/evidence")


def _load(name):
    path = os.path.join(EVIDENCE_DIR, name)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def parse_trivy():
    """Dependency / image CVEs -> pipeline-stage detections."""
    raw = _load("trivy.json")
    findings = []
    if raw:
        for res in raw.get("Results", []):
            for v in res.get("Vulnerabilities", []) or []:
                findings.append(dict(
                    stage="pipeline", tool="Trivy", severity=v.get("Severity", "UNKNOWN"),
                    id=v.get("VulnerabilityID"), target="vulnerable_dependency",
                    detail=f"{v.get('PkgName')} {v.get('InstalledVersion')}"))
    else:  # offline sample
        findings = [dict(stage="pipeline", tool="Trivy", severity="HIGH",
                         id="CVE-2023-25577", target="vulnerable_dependency",
                         detail="Werkzeug 2.0.1 multipart DoS")]
    return findings


def parse_gitleaks():
    """Committed secrets -> pipeline-stage detections."""
    raw = _load("gitleaks.json")
    if raw:
        return [dict(stage="pipeline", tool="gitleaks", severity="HIGH",
                     id=f.get("RuleID"), target="leaked_credential",
                     detail=f.get("File")) for f in raw]
    return [dict(stage="pipeline", tool="gitleaks", severity="HIGH",
                 id="generic-api-key", target="leaked_credential",
                 detail="app/main.py:INTERNAL_API_KEY")]


def parse_falco():
    """Runtime behaviour -> runtime-stage detections."""
    raw = _load("falco.json")
    if raw:
        return [dict(stage="runtime", tool="Falco", severity=e.get("priority", "Warning"),
                     id=e.get("rule"), target=e.get("output_fields", {}).get("scenario", "unknown"),
                     detail=e.get("output")) for e in raw]
    # Offline sample: Falco catches the SQLi-driven suspicious DB read at runtime,
    # but does NOT catch the misconfiguration (that one is "missed" -> the gap).
    return [dict(stage="runtime", tool="Falco", severity="Warning",
                 id="Unexpected DB query shape", target="sql_injection",
                 detail="anomalous SELECT with tautology from app container")]


def all_detections():
    return parse_trivy() + parse_gitleaks() + parse_falco()
