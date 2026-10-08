"""
Attack-chain composition + blast radius.

Independent findings understate real risk. Attackers *chain* weaknesses: one
exploit grants a capability that unlocks the next. This engine models each
scenario as (requires -> grants) and computes:

  - the reachable kill-chain (which steps an attacker can actually string
    together from an initial foothold), and
  - the blast radius (the full set of capabilities/assets reachable once the
    chain plays out) — the honest measure of "how far this spreads".

This is what a digital twin is *for*: showing propagation, not just a vuln list.
"""
from __future__ import annotations

# What each capability lets an attacker reach — used for the blast-radius readout.
ASSET_MAP = {
    "debug_access": "Internal /debug surface",
    "env_disclosure": "Environment + config",
    "api_key": "Service API key",
    "service_pivot": "Downstream services",
    "db_read": "User database",
    "auth_bypass": "Admin account",
    "rce_potential": "Code execution on host",
}


def compose(scenario_results: list[dict]) -> dict:
    """
    scenario_results: list with {id, name, success, stage, severity,
                                 requires: [...], grants: [...]}
    Returns the chained graph + reachable capabilities + blast radius.
    """
    by_id = {s["id"]: s for s in scenario_results}
    granted: set[str] = set()
    order: list[str] = []
    reachable: set[str] = set()

    # Greedy fixpoint: repeatedly admit any successful scenario whose
    # preconditions are already satisfied by capabilities granted so far.
    changed = True
    while changed:
        changed = False
        for s in scenario_results:
            if s["id"] in reachable or not s.get("success"):
                continue
            req = set(s.get("requires") or [])
            if req <= granted:                      # preconditions met
                reachable.add(s["id"]); order.append(s["id"])
                granted |= set(s.get("grants") or [])
                changed = True

    # Build chained edges: entry -> roots, then provider -> consumer links.
    edges = []
    for sid in order:
        req = set(by_id[sid].get("requires") or [])
        if not req:
            edges.append({"from": "entry", "to": sid, "unlocks": list(by_id[sid].get("grants") or [])})
        else:
            # link from whichever earlier step first supplied each requirement
            for need in req:
                provider = next((o for o in order
                                 if need in (by_id[o].get("grants") or []) and order.index(o) < order.index(sid)), None)
                if provider:
                    edges.append({"from": provider, "to": sid, "unlocks": [need]})
    # successful chain terminates at impact
    if order:
        edges.append({"from": order[-1], "to": "impact", "unlocks": ["compromise"]})

    blast = [{"capability": c, "asset": ASSET_MAP.get(c, c)} for c in sorted(granted)]
    # scenarios that would succeed in isolation but are gated behind an unmet
    # precondition (i.e. a control upstream also breaks this chain link)
    gated = [s["id"] for s in scenario_results
             if s.get("success") and s["id"] not in reachable]

    return dict(
        order=order,
        edges=edges,
        blast_radius=blast,
        reachable_count=len(reachable),
        gated=gated,
        depth=len(order),
        summary=f"{len(order)}-step chain reaching {len(blast)} assets",
    )
