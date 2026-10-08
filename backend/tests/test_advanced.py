"""Tests for attack-chain, hardening simulation, and exports."""
from app.core import chain, harden, exports, orchestrator

def _base():
    r = orchestrator.run("/tmp/test_adv.json")
    return r["scenarios"]

def test_chain_composes_and_breaks():
    base = _base()
    full = chain.compose(base)
    assert full["depth"] == 4 and len(full["blast_radius"]) == 7
    # leaked_credential requires debug_access from misconfiguration
    assert "leaked_credential" in full["order"]

def test_opa_breaks_credential_chain():
    base = _base()
    out = harden.simulate(base, {"opa_policy": True})
    # fixing misconfig must gate the credential theft (chain link broken)
    assert "leaked_credential" in out["chain"]["gated"]
    assert out["chain"]["depth"] < 4

def test_all_controls_reach_100():
    base = _base()
    out = harden.simulate(base, {k: True for k in harden.CONTROLS})
    assert out["score"] == 100 and out["grade"] == "A"
    assert out["chain"]["depth"] == 0

def test_incremental_score_monotonic():
    base = _base()
    s0 = harden.simulate(base, {})["score"]
    s1 = harden.simulate(base, {"gitleaks_gate": True})["score"]
    s2 = harden.simulate(base, {"gitleaks_gate": True, "trivy_gate": True})["score"]
    assert s0 < s1 < s2

def test_exports_valid():
    r = orchestrator.run("/tmp/test_adv.json")
    nav = exports.navigator_layer(r)
    assert nav["domain"] == "enterprise-attack" and len(nav["techniques"]) == 4
    sigma = exports.sigma_rules(r)
    assert len(sigma) == 4 and all("title:" in s["rule"] for s in sigma)
    assert "package twin.config" in exports.opa_policy()
