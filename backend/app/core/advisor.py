"""
Remediation advisor.

For each detected weakness, produces an actionable remediation package:
  - a plain-English explanation of the risk,
  - a concrete code/config DIFF the team can apply,
  - the CI gate that would have caught it (shift-left),
  - residual risk after the fix.

This is rules-based and deterministic so it works fully offline. An optional LLM
hook (`llm_enrich`) can expand any item into richer prose if an API key is present,
but the demo never depends on it.
"""
from __future__ import annotations
import os

# Knowledge base keyed by scenario id. Each entry is a self-contained fix recipe.
_KB = {
    "sql_injection": dict(
        why="User input is concatenated directly into the SQL string, so a crafted "
            "username (`' OR '1'='1' --`) rewrites the query and bypasses authentication.",
        diff="""--- a/target-app/main.py
+++ b/target-app/main.py
@@ login()
-    query = f"SELECT id, username, role FROM users WHERE username = '{user}' AND password = '{pw}'"
-    row = db.execute(query).fetchone()
+    query = "SELECT id, username, role FROM users WHERE username = ? AND password = ?"
+    row = db.execute(query, (user, pw)).fetchone()""",
        gate="Add Bandit (SAST) to CI — it flags string-built SQL (B608) and fails the build.",
        residual="Low. Parameterised queries neutralise injection; keep SAST as a standing gate.",
        effort="low", owner="app team"),

    "leaked_credential": dict(
        why="A live-looking API key is committed in source. Anyone with repo access — or "
            "anyone who reaches the debug endpoint — can read and reuse it.",
        diff="""--- a/target-app/main.py
+++ b/target-app/main.py
@@
-INTERNAL_API_KEY = "sk_live_DEADBEEF_this_is_a_fake_demo_key_0000"
+import os
+INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]   # injected from secret manager""",
        gate="Add gitleaks as a BLOCKING CI gate; rotate the exposed key immediately.",
        residual="Low once rotated. Secret never touches git history going forward (add pre-commit hook).",
        effort="low", owner="platform team"),

    "vulnerable_dependency": dict(
        why="Werkzeug 2.0.1 ships known CVEs (e.g. CVE-2023-25577 multipart DoS). The "
            "vulnerable code is deployed in the image even if never 'attacked' directly.",
        diff="""--- a/target-app/requirements.txt
+++ b/target-app/requirements.txt
-Flask==2.0.1
-Werkzeug==2.0.1
+Flask==3.0.3
+Werkzeug==3.0.4""",
        gate="Trivy FS/image scan in CI with `exit-code: 1` on HIGH/CRITICAL; enable Dependabot.",
        residual="Low. Re-scan on every build; pin and review transitive deps.",
        effort="low", owner="app team"),

    "misconfiguration": dict(
        why="Debug mode is on and an internal `/debug/config` endpoint leaks the environment "
            "and the embedded key — a direct pivot for an attacker. Nothing catches this today.",
        diff="""--- a/docker-compose.yml
+++ b/docker-compose.yml
-      - APP_DEBUG=true
+      - APP_DEBUG=false
--- a/target-app/main.py
+++ b/target-app/main.py
@@
-@app.route("/debug/config")
-def debug_config(): ...        # remove entirely in production builds""",
        gate="Add an OPA/conftest policy to CI: fail if APP_DEBUG=true or debug routes exist "
             "in a prod manifest. This is the control that closes the 'missed' gap.",
        residual="Medium→Low. Policy-as-code prevents regressions; add runtime Falco rule as backstop.",
        effort="medium", owner="platform team"),
}


def known(scenario_id: str) -> bool:
    return scenario_id in _KB


def advise(scenario_id: str) -> dict | None:
    """Return a remediation recipe, or None if no recipe exists for this id."""
    kb = _KB.get(scenario_id)
    if not kb:
        return None
    out = dict(scenario=scenario_id, **kb)
    # Use centralized OpenAI GPT-4o engine for enrichment
    try:
        from . import llm_engine
        if llm_engine.is_available():
            out["enriched"] = llm_engine.enrich_remediation(scenario_id, kb)
    except Exception:
        pass  # graceful fallback — demo never breaks
    return out


def advise_all(scenario_ids: list[str]) -> list[dict]:
    return [a for a in (advise(sid) for sid in scenario_ids) if a is not None]

