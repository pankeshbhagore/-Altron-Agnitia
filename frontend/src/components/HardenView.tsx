import { useMemo, useState } from "react";
import type { Report, Control } from "../types";
import { simulate } from "../harden";
import ScoreGauge from "./ScoreGauge";
import AttackGraph from "./AttackGraph";

export default function HardenView({ report, controls }: { report: Report; controls: Control[] }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const baseline = useMemo(() => simulate(report.scenarios, {}), [report]);
  const sim = useMemo(() => simulate(report.scenarios, on), [report, on]);
  const toggle = (id: string) => setOn((p) => ({ ...p, [id]: !p[id] }));

  const delta = { before: baseline.score, after: sim.score,
    improvement: sim.score - baseline.score, grade_before: baseline.grade, grade_after: sim.grade };
  const nameById = Object.fromEntries(report.scenarios.map((s) => [s.id, s.name]));
  const anyOn = Object.values(on).some(Boolean);

  return (
    <div className="grid cols-3">
      {/* controls */}
      <div className="panel">
        <p className="cap">SECURITY CONTROLS <span className="mono">{sim.applied.length} on</span></p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {controls.map((c) => (
            <button key={c.id} onClick={() => toggle(c.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, background: on[c.id] ? "var(--tint-green)" : "var(--panel2)",
                border: `1px solid ${on[c.id] ? "var(--tint-green-bd)" : "var(--line)"}`, borderRadius: 9,
                padding: "11px 13px", textAlign: "left", transition: ".15s", color: "var(--ink)" }}>
              <span>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  {nameById[c.scenario]} → {c.stage}
                </div>
              </span>
              <Switch on={!!on[c.id]} />
            </button>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
          Toggle controls to watch the posture, attack path, and blast radius recompute live.
        </div>
      </div>

      {/* live gauge */}
      <ScoreGauge posture={sim.posture} delta={delta} mode={anyOn ? "after" : "before"} />

      {/* blast radius */}
      <div className="panel">
        <p className="cap">BLAST RADIUS <span className="mono">{sim.chain.depth}-step chain</span></p>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Assets an attacker can still reach by chaining the open weaknesses:
        </div>
        {sim.chain.blast_radius.length === 0 ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: "var(--green)",
            fontFamily: "var(--mono)", fontSize: 13 }}>✓ chain fully contained</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {sim.chain.blast_radius.map((b) => (
              <span key={b.capability} className="mono"
                style={{ fontSize: 11, padding: "5px 9px", borderRadius: 6,
                  background: "var(--tint-red)", border: "1px solid var(--tint-red-bd)", color: "var(--red)" }}>
                {b.asset}
              </span>
            ))}
          </div>
        )}
        {sim.chain.gated.length > 0 && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: "var(--tint-green)",
            border: "1px solid var(--tint-green-bd)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--green)", marginBottom: 6 }}>CHAIN BROKEN</div>
            <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5 }}>
              A fix upstream cut the path to:{" "}
              {sim.chain.gated.map((g) => nameById[g] ?? g).join(", ")}.
            </div>
          </div>
        )}
      </div>

      {/* graph spans full width below */}
      <div style={{ gridColumn: "1 / -1" }}>
        <AttackGraph path={sim.attack_path} mode={anyOn ? "after" : "before"} />
      </div>
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span style={{ width: 36, height: 20, borderRadius: 999, flexShrink: 0,
      background: on ? "var(--green)" : "var(--line2)", position: "relative", transition: ".15s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: "50%", background: "#fff", transition: ".15s" }} />
    </span>
  );
}
