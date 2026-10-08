import { useState } from "react";
import { EXPORTS } from "../data/sampleReport";

type Tab = "navigator" | "sigma" | "opa";

function download(name: string, text: string) {
  try {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  } catch { /* no-op where download unsupported */ }
}

export default function ExportsView() {
  const [tab, setTab] = useState<Tab>("navigator");
  const [copied, setCopied] = useState("");

  const navJson = JSON.stringify(EXPORTS.navigator_layer, null, 2);
  const sigma = EXPORTS.sigma_rules;
  const opa = EXPORTS.opa_policy;

  const content = tab === "navigator" ? navJson
    : tab === "opa" ? opa
    : sigma.map((s) => `# ${s.filename}\n${s.rule}`).join("\n\n");
  const filename = tab === "navigator" ? "twin-navigator-layer.json"
    : tab === "opa" ? "twin-config.rego" : "twin-sigma-rules.yml";

  const copy = () => {
    navigator.clipboard?.writeText(content).then(() => {
      setCopied(tab); setTimeout(() => setCopied(""), 1500);
    }).catch(() => {});
  };

  const tabs: [Tab, string, string][] = [
    ["navigator", "MITRE Navigator", "ATT&CK layer JSON — import at attack-navigator"],
    ["sigma", "Sigma rules", "detection-as-code, one rule per scenario"],
    ["opa", "OPA policy", "Rego config gate that closes the misconfig gap"],
  ];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {tabs.map(([t, label, hint]) => (
            <button key={t} onClick={() => setTab(t)} title={hint}
              style={{ background: tab === t ? "var(--tint-steel)" : "var(--panel2)",
                border: `1px solid ${tab === t ? "var(--line2)" : "var(--line)"}`,
                color: tab === t ? "var(--steel)" : "var(--muted)", borderRadius: 8,
                padding: "9px 14px", fontSize: 13 }}>{label}</button>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
          {tabs.find((t) => t[0] === tab)![2]}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={copy} className="tag" style={{ cursor: "pointer", padding: "7px 13px",
            background: "var(--tint-steel)", borderColor: "var(--tint-steel-bd)", color: "var(--steel)" }}>
            {copied === tab ? "copied ✓" : "copy"}
          </button>
          <button onClick={() => download(filename, content)} className="tag"
            style={{ cursor: "pointer", padding: "7px 13px", background: "var(--panel2)" }}>
            download {filename}
          </button>
        </div>
        <pre style={{ background: "var(--code-bg)", border: "1px solid var(--line2)", borderRadius: 9,
          padding: 16, overflowX: "auto", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.55,
          maxHeight: 520, overflowY: "auto", margin: 0, color: "var(--code-text)" }}>{content}</pre>
      </div>
    </div>
  );
}
