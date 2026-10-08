"""
Orchestrator — the control loop of the Digital Twin.

Flow:
  1. Load scenario-as-code (/scenarios/*.yaml)
  2. Run each benign probe against the twin (baseline posture)
  3. Correlate with detections (pipeline + runtime) to assign a detection stage
  4. Score the baseline posture, build the MITRE attack-path graph
  5. Apply each scenario's remediation -> hardened posture -> re-score
  6. Emit a single report.json consumed by the dashboard and the report generator

Run:  python orchestrator.py  [--out report.json]
"""
from __future__ import annotations
import argparse
import datetime as dt
import glob
import json
import os

from . import attacks
from . import detectors
from . import scoring
from . import attack_path
from . import chain

try:
    import yaml  # pyyaml
except ImportError:  # minimal fallback so it runs without pyyaml
    yaml = None

SCEN_DIR = os.getenv("SCEN_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "scenarios"))


def _load_scenarios():
    files = sorted(glob.glob(os.path.join(SCEN_DIR, "*.yaml")))
    out = []
    for f in files:
        with open(f) as fh:
            text = fh.read()
        out.append(yaml.safe_load(text) if yaml else _tiny_yaml(text))
    return out


def _coerce(v):
    """Turn a scalar string into list / unquoted string (fallback-parser only)."""
    v = v.split("#")[0].strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [x.strip() for x in inner.split(",")] if inner else []
    if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
        return v[1:-1]
    return v


def _tiny_yaml(text):
    """Dependency-free parser for our flat scenario schema (pyyaml fallback)."""
    d, cur = {}, None
    for line in text.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        k, _, v = line.strip().partition(":")
        if indent == 0:
            if v.strip().split("#")[0].strip() == "":
                cur = k; d[k] = {}
            else:
                d[k] = _coerce(v); cur = None
        else:
            d[cur][k] = _coerce(v)
    return d


def run(out_path: str):
    scenarios = _load_scenarios()
    dets = detectors.all_detections()
    det_by_target = {}
    for x in dets:
        det_by_target.setdefault(x["target"], []).append(x)

    baseline_weaknesses, scenario_results, remediation = [], [], []

    for sc in scenarios:
        probe = attacks.PROBES[sc["probe"]]
        result = probe()
        # natural = where it's caught when ALL defences are on (declared in scenario)
        natural = sc.get("detects_at", "missed")
        # baseline = team has runtime monitoring but NO shift-left gates yet, so
        # anything that needs a build/CI gate (pipeline) slips through = missed.
        baseline_stage = natural if natural == "runtime" else "missed"

        scenario_results.append(dict(
            id=sc["id"], name=sc["name"], mitre=sc["mitre"], step=sc["step"],
            severity=sc["severity"], success=result["success"],
            stage=baseline_stage, natural_stage=natural,
            evidence=result["evidence"],
            requires=sc.get("requires") or [], grants=sc.get("grants") or [],
            owasp=sc.get("owasp", ""), cwe=sc.get("cwe", ""),
            detections=det_by_target.get(sc["id"], [])))

        baseline_weaknesses.append(dict(
            name=sc["name"], severity=sc["severity"], stage=baseline_stage,
            attack_success=result["success"]))

        rem = sc.get("remediation", {})
        remediation.append(dict(
            id=sc["id"], name=sc["name"], severity=sc["severity"],
            fix=rem.get("fix", ""), effort=rem.get("effort", "medium"),
            after_stage=rem.get("after_stage", "pipeline")))

    # Hardened posture: apply remediations
    hardened_weaknesses = [dict(name=r["name"], severity=r["severity"],
                                stage=r["after_stage"], attack_success=False)
                           for r in remediation]

    before = scoring.score_posture(baseline_weaknesses)
    after = scoring.score_posture(hardened_weaknesses)
    graph = attack_path.build_graph(scenario_results)
    kill_chain = chain.compose(scenario_results)

    report = dict(
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat(),
        twin="devsecops-digital-twin",
        scenarios=scenario_results,
        score=scoring.delta(before, after),
        posture_before=before,
        posture_after=after,
        attack_path=graph,
        chain=kill_chain,
        remediation=remediation,
        coverage=dict(
            pipeline=before["caught_pipeline"],
            runtime=before["caught_runtime"],
            missed=before["missed"],
            total=len(scenario_results)),
    )

    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[twin] score {before['score']} ({before['grade']}) -> "
          f"{after['score']} ({after['grade']})  | report: {out_path}")
    print(f"[twin] coverage  pipeline={report['coverage']['pipeline']} "
          f"runtime={report['coverage']['runtime']} missed={report['coverage']['missed']}")
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="report.json")
    args = ap.parse_args()
    run(args.out)
