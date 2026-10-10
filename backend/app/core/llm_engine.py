"""
OpenAI GPT-4o integration engine for the DevSecOps Digital Twin.

Provides AI-powered capabilities across the three core phases:
  1. ATTACK  — analyse scenario results, suggest novel attack vectors
  2. DETECT  — triage runtime alerts, classify true/false positives
  3. FIX     — generate detailed, contextual remediation guidance
  4. CHAT    — interactive security Q&A about the twin's findings

Fully optional: every caller has a deterministic fallback so the demo
never depends on network access or API availability.
"""
from __future__ import annotations
import json
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── OpenAI config ────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID  = os.getenv("OPENAI_ORG_ID", "")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o")


def is_available() -> bool:
    """True when an OpenAI key is configured."""
    return bool(OPENAI_API_KEY)


def _call_openai(system: str, user: str, max_tokens: int = 800) -> Optional[str]:
    """Low-level OpenAI chat completion. Returns None on any failure."""
    if not is_available():
        return None
    try:
        import urllib.request
        body = json.dumps({
            "model": OPENAI_MODEL,
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        }).encode()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        }
        if OPENAI_ORG_ID:
            headers["OpenAI-Organization"] = OPENAI_ORG_ID
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=body, headers=headers,
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        return data["choices"][0]["message"]["content"]
    except Exception as exc:
        logger.warning("OpenAI call failed: %s", exc)
        return None


# ═══════════════════════════════════════════════════════════════════
# 1. ATTACK ANALYSIS
# ═══════════════════════════════════════════════════════════════════

def analyse_attack(scenario: dict) -> dict:
    """AI-powered deep analysis of a single attack scenario result."""
    system = (
        "You are a senior penetration tester and red team lead. "
        "Analyse the following attack probe result from a DevSecOps Digital Twin. "
        "Provide: 1) A risk assessment (Critical/High/Medium/Low) with reasoning, "
        "2) Real-world impact if this were a production system, "
        "3) Two additional attack vectors an attacker could chain from this weakness, "
        "4) The MITRE ATT&CK kill-chain stage and recommended detection points. "
        "Be concise, technical, and actionable. Use markdown formatting."
    )
    user = json.dumps(scenario, indent=2)
    result = _call_openai(system, user)
    return {
        "scenario_id": scenario.get("id", "unknown"),
        "ai_analysis": result or _fallback_attack(scenario),
        "model": OPENAI_MODEL if result else "rules-based",
        "powered_by": "GPT-4o" if result else "offline",
    }


def analyse_all_attacks(scenarios: list[dict]) -> list[dict]:
    """Analyse all scenarios with AI."""
    return [analyse_attack(s) for s in scenarios]


def suggest_attack_vectors(scenario: dict) -> dict:
    """Suggest novel attack vectors based on the current scenario."""
    system = (
        "You are an elite offensive security researcher. Given the vulnerability below, "
        "suggest 3 creative, obfuscated attack payloads that could bypass common WAFs "
        "and detection tools. For each payload: describe the technique, the payload itself, "
        "and why it might evade detection. This is for a controlled, air-gapped lab only. "
        "Format as numbered list with markdown code blocks for payloads."
    )
    user = f"Vulnerability: {scenario.get('name', '')}\nType: {scenario.get('id', '')}\nMITRE: {scenario.get('mitre', '')}\nEvidence: {scenario.get('evidence', '')}"
    result = _call_openai(system, user)
    return {
        "scenario_id": scenario.get("id", "unknown"),
        "suggested_vectors": result or "AI unavailable — use static payloads from scenarios/*.yaml",
        "model": OPENAI_MODEL if result else "offline",
    }


def _fallback_attack(scenario: dict) -> str:
    sid = scenario.get("id", "")
    fallbacks = {
        "sql_injection": "**Risk: Critical** — Auth bypass via SQL injection allows full database access. An attacker could escalate to RCE via `INTO OUTFILE` or pivot to other services using leaked credentials from the users table.",
        "leaked_credential": "**Risk: High** — Hardcoded API key in source grants persistent access. Attackers can use this for lateral movement to downstream services without triggering auth alerts.",
        "vulnerable_dependency": "**Risk: High** — Werkzeug 2.0.1 (CVE-2023-25577) enables DoS and potential request smuggling. An attacker could chain this with the debug endpoint to achieve RCE.",
        "misconfiguration": "**Risk: Medium** — Debug mode exposes environment variables, stack traces, and the interactive debugger. Combined with a leaked credential, this gives full admin control.",
    }
    return fallbacks.get(sid, "Rules-based analysis: review the scenario YAML for attack details.")


# ═══════════════════════════════════════════════════════════════════
# 2. DETECTION TRIAGE
# ═══════════════════════════════════════════════════════════════════

def triage_detection(detection: dict, scenario_context: dict | None = None) -> dict:
    """AI-powered triage of a runtime detection / alert."""
    system = (
        "You are a Tier-2 SOC analyst specialising in container security. "
        "Analyse the following security alert from a DevSecOps Digital Twin. "
        "Determine: 1) Classification (True Positive / False Positive / Suspicious), "
        "2) Severity and urgency, 3) Recommended immediate response actions, "
        "4) What additional context/logs to collect. Be concise and structured."
    )
    context = {"alert": detection}
    if scenario_context:
        context["scenario"] = scenario_context
    user = json.dumps(context, indent=2)
    result = _call_openai(system, user, max_tokens=500)
    return {
        "detection_id": detection.get("id", "unknown"),
        "tool": detection.get("tool", "unknown"),
        "ai_triage": result or _fallback_triage(detection),
        "model": OPENAI_MODEL if result else "rules-based",
    }


def triage_all_detections(detections: list[dict], scenarios: list[dict] | None = None) -> list[dict]:
    """Triage all detections."""
    sc_map = {s["id"]: s for s in (scenarios or [])}
    return [triage_detection(d, sc_map.get(d.get("target"))) for d in detections]


def _fallback_triage(det: dict) -> str:
    tool = det.get("tool", "")
    fallbacks = {
        "Trivy": "**True Positive** — Known CVE detected in container image. Upgrade the affected package immediately and rescan.",
        "gitleaks": "**True Positive** — Hardcoded secret found in source code. Rotate the credential and add a pre-commit hook to prevent recurrence.",
        "Falco": "**Suspicious** — Anomalous process execution detected at runtime. Investigate the container's process tree and correlate with recent deployments.",
    }
    return fallbacks.get(tool, "Review alert details manually; no AI enrichment available offline.")


# ═══════════════════════════════════════════════════════════════════
# 3. REMEDIATION ENRICHMENT
# ═══════════════════════════════════════════════════════════════════

def enrich_remediation(scenario_id: str, kb_entry: dict) -> str:
    """Generate rich, contextual remediation guidance via GPT-4o."""
    system = (
        "You are a principal application security engineer. "
        "Given the vulnerability and its rules-based fix below, provide an enriched "
        "remediation note: 1) Why this fix works at a technical level, "
        "2) Common mistakes teams make when applying it, "
        "3) How to validate the fix is effective, "
        "4) One long-term architectural improvement. "
        "Keep it under 200 words, technical, and actionable."
    )
    user = f"Vulnerability: {scenario_id}\nRisk: {kb_entry.get('why', '')}\nProposed fix: {kb_entry.get('gate', '')}\nDiff: {kb_entry.get('diff', '')}"
    result = _call_openai(system, user, max_tokens=400)
    return result or "AI enrichment unavailable; the rules-based recipe above is authoritative."


# ═══════════════════════════════════════════════════════════════════
# 4. SECURITY CHAT (Interactive Q&A)
# ═══════════════════════════════════════════════════════════════════

def security_chat(question: str, report_summary: dict | None = None) -> dict:
    """Interactive security Q&A powered by GPT-4o."""
    system = (
        "You are an AI security advisor for a DevSecOps Digital Twin platform. "
        "The twin is a safe, isolated replica of an application and its CI/CD pipeline "
        "where benign scripted attacks reveal security gaps. "
        "Answer the user's security question based on the twin's findings. "
        "Be concise, technical, and reference specific MITRE ATT&CK techniques, "
        "OWASP Top 10, or CWE IDs where relevant. Use markdown formatting."
    )
    user_msg = question
    if report_summary:
        user_msg = f"Twin findings summary:\n{json.dumps(report_summary, indent=2)}\n\nQuestion: {question}"
    result = _call_openai(system, user_msg, max_tokens=600)
    return {
        "question": question,
        "answer": result or "AI is currently unavailable. Please check your OPENAI_API_KEY configuration.",
        "model": OPENAI_MODEL if result else "offline",
        "powered_by": "GPT-4o" if result else "offline",
    }


# ═══════════════════════════════════════════════════════════════════
# 5. EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════

def generate_executive_summary(report: dict) -> dict:
    """Generate an AI-powered executive summary of the full security report."""
    system = (
        "You are a CISO-level security advisor. Generate a concise executive summary "
        "of the DevSecOps Digital Twin security assessment. Include: "
        "1) Overall risk posture (1 sentence), "
        "2) Top 3 critical findings, "
        "3) Recommended priority actions (numbered list), "
        "4) Business impact statement. "
        "Write for a C-suite audience. Use markdown. Keep under 300 words."
    )
    summary_data = {
        "score_before": report.get("score", {}).get("before"),
        "score_after": report.get("score", {}).get("after"),
        "grade_before": report.get("score", {}).get("grade_before"),
        "grade_after": report.get("score", {}).get("grade_after"),
        "scenarios": [{"id": s["id"], "name": s["name"], "severity": s["severity"],
                       "success": s["success"], "stage": s["stage"]}
                      for s in report.get("scenarios", [])],
        "coverage": report.get("coverage"),
        "chain_depth": report.get("chain", {}).get("depth"),
    }
    result = _call_openai(system, json.dumps(summary_data, indent=2), max_tokens=500)
    return {
        "summary": result or _fallback_summary(report),
        "model": OPENAI_MODEL if result else "rules-based",
        "powered_by": "GPT-4o" if result else "offline",
    }


def _fallback_summary(report: dict) -> str:
    s = report.get("score", {})
    cov = report.get("coverage", {})
    return (
        f"**Executive Summary**\n\n"
        f"The Digital Twin assessment revealed a baseline security score of "
        f"**{s.get('before', 'N/A')}/100 ({s.get('grade_before', 'N/A')})**, "
        f"improving to **{s.get('after', 'N/A')}/100 ({s.get('grade_after', 'N/A')})** "
        f"after applying recommended remediations.\n\n"
        f"**Key Findings:** {cov.get('missed', 0)} of {cov.get('total', 0)} attacks "
        f"bypassed baseline defenses. Priority: enable shift-left CI/CD security gates "
        f"(Trivy, gitleaks, Bandit, OPA) to catch vulnerabilities before deployment."
    )
