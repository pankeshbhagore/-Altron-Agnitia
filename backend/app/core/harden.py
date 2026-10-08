"""
Interactive hardening simulator.

Powers the "what-if" sandbox: a judge toggles individual security controls and the
posture (score, coverage, chain, graph) recomputes live. Each control maps to the
weakness it neutralises and the stage that weakness moves to once the control is on.
This turns a canned before/after into an interactive demo nobody else will have.
"""
from __future__ import annotations
from . import scoring, attack_path, chain

# control id -> (scenario id, resulting stage, breaks attack?)
CONTROLS = {
    "sast_gate":     ("sql_injection",         "pipeline",   False),  # Bandit flags string SQL
    "patch_sqli":    ("sql_injection",         "remediated", True),   # parameterised query
    "gitleaks_gate": ("leaked_credential",     "remediated", True),   # secret removed + rotated
    "trivy_gate":    ("vulnerable_dependency", "remediated", True),   # dep upgraded
    "opa_policy":    ("misconfiguration",      "pipeline",   False),  # config policy blocks debug
}

CONTROL_LABELS = {
    "sast_gate": "SAST gate (Bandit)",
    "patch_sqli": "Patch SQLi (parameterised query)",
    "gitleaks_gate": "Secret scan gate (gitleaks)",
    "trivy_gate": "Dependency scan gate (Trivy)",
    "opa_policy": "Config policy gate (OPA)",
}


def simulate(base_scenarios: list[dict], controls: dict[str, bool]) -> dict:
    """
    base_scenarios: the baseline scenario_results from the orchestrator.
    controls: {control_id: enabled}. Returns a recomputed posture bundle.
    """
    # strongest control wins per scenario (remediated > pipeline)
    best_stage: dict[str, str] = {}
    for cid, on in controls.items():
        if not on or cid not in CONTROLS:
            continue
        sid, stage, _ = CONTROLS[cid]
        rank = {"remediated": 2, "pipeline": 1}
        if rank.get(stage, 0) >= rank.get(best_stage.get(sid, ""), 0):
            best_stage[sid] = stage

    scenarios, weaknesses = [], []
    for s in base_scenarios:
        sid = s["id"]
        stage = best_stage.get(sid, s["stage"])
        # A weakness only reaches production (and grants its capability to the
        # attack chain) if it ships: stages pipeline/remediated are caught at
        # build time, so the attack no longer succeeds and the chain link breaks.
        success = s["success"] and stage in ("runtime", "missed")
        ns = {**s, "stage": stage, "success": success}
        scenarios.append(ns)
        weaknesses.append(dict(name=s["name"], severity=s["severity"],
                               stage=stage, attack_success=success))

    posture = scoring.score_posture(weaknesses)
    graph = attack_path.build_graph(scenarios)
    kill_chain = chain.compose(scenarios)
    cov = dict(pipeline=posture["caught_pipeline"], runtime=posture["caught_runtime"],
               missed=posture["missed"], total=len(scenarios))
    applied = [CONTROL_LABELS[c] for c, on in controls.items() if on and c in CONTROLS]

    return dict(posture=posture, coverage=cov, attack_path=graph, chain=kill_chain,
                scenarios=scenarios, applied=applied,
                score=posture["score"], grade=posture["grade"])
