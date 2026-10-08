"""Generate the human-readable security report (Deliverable #3) from report.json.
Run: python report.py --in report.json --out ../docs/SECURITY_REPORT.md"""
from __future__ import annotations
import argparse, json, datetime as dt

T = """# Security Report — DevSecOps Digital Twin

**Generated:** {ts}
**Twin:** `{twin}`  ·  **Environment:** isolated range (egress blocked)

## Executive summary

The twin replicated the target application and its CI/CD pipeline, then ran
{n} scripted attack scenarios. In the **baseline** posture (runtime monitoring only,
no shift-left gates) the twin scored **{before}/100 ({gb})**. After applying the
remediations and enabling the pipeline security gates, the **hardened** posture
scored **{after}/100 ({ga})** — an improvement of **+{imp}**.

| Posture | Score | Grade | Caught at pipeline | Caught at runtime | Missed |
|---|---|---|---|---|---|
| Baseline | {before} | {gb} | {bp} | {br} | {bm} |
| Hardened | {after} | {ga} | {ap} | {ar} | {am} |

## Attack chain & blast radius

{chain_summary}

{blast_table}

## Detection coverage — what the defences missed

{coverage_table}

The key finding: **{missed} of {n}** weaknesses slipped past the baseline defences
because they require *shift-left* controls (secret scanning, dependency scanning,
config policy) that run at build time, not runtime. Runtime monitoring alone caught
only the live SQL-injection behaviour.

## Scenarios

{scenario_blocks}

## Remediation plan

{remediation_table}

---
*All attacks were benign, scripted, and confined to the twin's own services on an
isolated network. The security score is a weighted posture indicator, not a
guarantee of security.*
"""


def main(inp, outp):
    r = json.load(open(inp))
    s, b, a = r["score"], r["posture_before"], r["posture_after"]
    n = len(r["scenarios"])

    cov = "| Weakness | Baseline | After fixes |\n|---|---|---|\n"
    for sc in r["scenarios"]:
        rem = next(x for x in r["remediation"] if x["id"] == sc["id"])
        cov += f"| {sc['name']} | `{sc['stage']}` | `{rem['after_stage']}` |\n"

    blocks = ""
    for sc in r["scenarios"]:
        blocks += (f"### {sc['name']}  \n"
                   f"- **Severity:** {sc['severity']}  ·  **MITRE:** {sc['mitre']} ({sc['step']})  \n"
                   f"- **Compliance:** {sc.get('owasp','-')} · {sc.get('cwe','-')}  \n"
                   f"- **Attack succeeded:** {sc['success']}  ·  **Caught at:** {sc['stage']}  \n"
                   f"- **Evidence:** {sc['evidence']}  \n\n")

    rem = "| Weakness | Fix | Effort | After |\n|---|---|---|---|\n"
    for x in r["remediation"]:
        rem += f"| {x['name']} | {x['fix']} | {x['effort']} | `{x['after_stage']}` |\n"

    ch = r.get("chain", {})
    chain_summary = (f"The baseline weaknesses compose into a **{ch.get('depth',0)}-step attack chain** "
                     f"reaching **{len(ch.get('blast_radius',[]))} assets**. "
                     "Critically, several steps are only reachable because an earlier weakness grants "
                     "the capability they need — so fixing one upstream control can break multiple paths.")
    blast_table = "| Reachable asset | via capability |\n|---|---|\n" + "\n".join(
        f"| {b['asset']} | `{b['capability']}` |" for b in ch.get("blast_radius", []))

    md = T.format(
        chain_summary=chain_summary, blast_table=blast_table,
        ts=dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), twin=r["twin"], n=n,
        before=s["before"], after=s["after"], gb=s["grade_before"], ga=s["grade_after"],
        imp=s["improvement"], bp=b["caught_pipeline"], br=b["caught_runtime"], bm=b["missed"],
        ap=a["caught_pipeline"], ar=a["caught_runtime"], am=a["missed"],
        missed=r["coverage"]["missed"], coverage_table=cov,
        scenario_blocks=blocks, remediation_table=rem)
    open(outp, "w").write(md)
    print("wrote", outp)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="report.json")
    ap.add_argument("--out", dest="outp", default="../docs/SECURITY_REPORT.md")
    main(ap.parse_args().inp, ap.parse_args().outp)
