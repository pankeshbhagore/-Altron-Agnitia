import { useState } from "react";
import type { Advice } from "../types";

export default function RemediationPanel({ advice }: { advice: Advice[] }) {
  const [open, setOpen] = useState<string | null>(advice[0]?.scenario ?? null);
  return (
    <div className="grid" style={{ gap: 12 }}>
      {advice.map((a) => {
        const isOpen = open === a.scenario;
        return (
          <div key={a.scenario} className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <button onClick={() => setOpen(isOpen ? null : a.scenario)}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none",
                color: "var(--ink)", padding: "16px 18px", display: "flex",
                justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{a.scenario.replace(/_/g, " ")}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="tag">{a.effort} effort</span>
                <span className="tag">{a.owner}</span>
                <span className="mono" style={{ color: "var(--muted)" }}>{isOpen ? "–" : "+"}</span>
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--line)" }}>
                <Section label="Why it matters" body={a.why} />
                <div style={{ margin: "14px 0 6px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>SUGGESTED FIX (DIFF)</div>
                <pre style={{ background: "var(--code-bg)", border: "1px solid var(--line2)", borderRadius: 8,
                  padding: 14, overflowX: "auto", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                  {a.diff.split("\n").map((ln, i) => (
                    <div key={i} style={{ color: ln.startsWith("+") ? "var(--green)" : ln.startsWith("-") ? "var(--red)"
                      : ln.startsWith("@@") ? "var(--steel)" : "var(--code-dim)" }}>{ln || " "}</div>
                  ))}
                </pre>
                <Section label="Shift-left gate" body={a.gate} top />
                <Section label="Residual risk" body={a.residual} top />
                {a.enriched && <Section label="AppSec note (AI)" body={a.enriched} top />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ label, body, top }: { label: string; body: string; top?: boolean }) {
  return (
    <div style={{ marginTop: top ? 14 : 14 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}
