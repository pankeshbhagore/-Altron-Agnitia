import type { Report, PostureMode } from "../types";

export default function CoverageMatrix({ report, mode }: { report: Report; mode: PostureMode }) {
  return (
    <div className="panel">
      <p className="cap">DETECTION COVERAGE</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {report.scenarios.map((s) => {
          const after = report.remediation.find((r) => r.id === s.id)?.after_stage ?? "pipeline";
          const active = mode === "before" ? s.stage : after;
          const cell = (label: string, stage: string) => {
            const hit = stage === "pipeline" || stage === "remediated"
              ? active === "pipeline" || active === "remediated"
              : active === stage;
            const bg = hit
              ? (stage === "pipeline" ? "#15803D" : stage === "runtime" ? "#B45309" : "#DC2626")
              : "var(--panel2)";
            return (
              <div key={label} style={{
                flex: 1, textAlign: "center", fontFamily: "var(--mono)", fontSize: 9,
                padding: "5px 2px", borderRadius: 5, border: "1px solid var(--line)",
                color: hit ? "var(--on-accent)" : "var(--dim)", fontWeight: hit ? 600 : 400,
                background: bg, borderColor: hit ? bg : "var(--line)", transition: ".25s",
              }}>{label}</div>
            );
          };
          return (
            <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "11px 12px", background: "var(--panel2)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 9, lineHeight: 1.3 }}>{s.name}</div>
              <div style={{ display: "flex", gap: 5 }}>
                {cell("PIPELINE", "pipeline")}{cell("RUNTIME", "runtime")}{cell("MISSED", "missed")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
