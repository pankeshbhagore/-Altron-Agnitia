import type { Report } from "../types";

export default function ScenarioTable({ report }: { report: Report }) {
  return (
    <div className="panel">
      <p className="cap">SCENARIOS &amp; EVIDENCE</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{["Weakness", "Severity", "MITRE", "Baseline", "After fixes"].map((h) => (
            <th key={h} style={{ textAlign: "left", fontFamily: "var(--mono)", fontSize: 11,
              color: "var(--muted)", fontWeight: 500, padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {report.scenarios.map((s) => {
            const after = report.remediation.find((r) => r.id === s.id)?.after_stage ?? "pipeline";
            return (
              <tr key={s.id}>
                <td style={{ padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "top" }}>
                  {s.name}
                  <div className="mono" style={{ marginTop: 4, opacity: .7, fontSize: 11, color: "var(--muted)" }}>{s.evidence}</div>
                  {(s.owasp || s.cwe) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {s.owasp && <span className="tag" style={{ borderColor: "var(--tint-steel-bd)" }}>{s.owasp}</span>}
                      {s.cwe && <span className="tag" style={{ borderColor: "var(--tint-steel-bd)" }}>{s.cwe}</span>}
                    </div>
                  )}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "top" }}><span className={`sev ${s.severity}`}>{s.severity}</span></td>
                <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "top", color: "var(--muted)" }}>{s.mitre}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "top" }}><span className={`tag ${s.stage}`}>{s.stage}</span></td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "top" }}><span className={`tag ${after}`}>{after}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
