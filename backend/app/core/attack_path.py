"""
Attack-path graph builder.

Turns the per-scenario results into a directed kill-chain graph the dashboard can
animate: nodes are stages an attacker moves through, edges are the transitions a
given scenario enabled. Each node carries its MITRE ATT&CK tactic/technique and the
detection stage that (dis)covered it, so the graph doubles as a coverage map.
"""
from __future__ import annotations

# Canonical kill-chain lanes (left -> right in the UI)
LANES = ["Supply Chain", "Misconfiguration", "Initial Access",
         "Credential Access", "Lateral Movement", "Impact"]


def build_graph(scenario_results: list[dict]) -> dict:
    """
    scenario_results: list of
      {id, name, mitre, step, success, stage, severity}
    Returns {nodes, edges, lanes}.
    """
    nodes, edges, seen = [], [], set()

    def add_node(node_id, label, lane, mitre, stage, severity, active):
        if node_id in seen:
            return
        seen.add(node_id)
        nodes.append(dict(id=node_id, label=label, lane=lane, mitre=mitre,
                          stage=stage, severity=severity, active=active))

    # Anchor: entry node
    add_node("entry", "Attacker", "Supply Chain", "-", "n/a", "LOW", True)

    for s in scenario_results:
        nid = s["id"]
        add_node(nid, s["name"], s.get("step", "Initial Access"), s.get("mitre", "-"),
                 s.get("stage", "missed"), s.get("severity", "MEDIUM"), s.get("success", False))
        edges.append(dict(**{"from": "entry", "to": nid},
                          active=s.get("success", False), stage=s.get("stage", "missed")))

    # Chain the successful steps into a lateral-movement -> impact path
    successful = [s for s in scenario_results if s.get("success")]
    if successful:
        add_node("impact", "Data / Admin compromise", "Impact", "T1486", "missed",
                 "CRITICAL", True)
        for s in successful:
            edges.append(dict(**{"from": s["id"], "to": "impact"},
                              active=True, stage=s.get("stage", "missed")))

    return dict(nodes=nodes, edges=edges, lanes=LANES)
