import { useEffect, useState } from "react";
import type { Report, Advice, PostureMode } from "./types";
import { fetchReport, fetchAdvice, resetRun } from "./api";
import { CONTROLS } from "./data/sampleReport";
import ScoreGauge from "./components/ScoreGauge";
import AttackGraph from "./components/AttackGraph";
import CoverageMatrix from "./components/CoverageMatrix";
import ScenarioTable from "./components/ScenarioTable";
import LiveTerminal from "./components/LiveTerminal";
import RemediationPanel from "./components/RemediationPanel";
import HardenView from "./components/HardenView";
import ExportsView from "./components/ExportsView";
import Simulation3D from "./components/Simulation3D";

type View = "overview" | "lab" | "sim3d" | "harden" | "remediation" | "exports";

function PostureToggle({ mode, set }: { mode: PostureMode; set: (m: PostureMode) => void }) {
  return (
    <div className="toggle">
      <button className={mode === "before" ? "on" : ""} onClick={() => set("before")}>Baseline</button>
      <button className={mode === "after" ? "on" : ""} onClick={() => set("after")}>After fixes</button>
    </div>
  );
}

export default function App() {
  const [report, setReport] = useState<Report | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [live, setLive] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [mode, setMode] = useState<PostureMode>("before");

  useEffect(() => {
    fetchReport().then(({ report, live }) => { setReport(report); setLive(live); });
    fetchAdvice().then(setAdvice);
  }, []);

  if (!report) return <div style={{ padding: 40, fontFamily: "var(--mono)", color: "var(--muted)" }}>Loading twin console…</div>;

  const posture = mode === "before" ? report.posture_before : report.posture_after;
  const nav: [View, string][] = [["overview", "Overview"], ["lab", "Attack Lab"], ["sim3d", "3D Simulation"], ["harden", "Harden"], ["remediation", "Remediation"], ["exports", "Exports"]];

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="glyph">T</div>
          <div><h1>Twin Console</h1><div className="sub">devsecops-digital-twin</div></div>
        </div>
        <div className="nav">
          {nav.map(([v, label]) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              <Dot v={v} /> {label}
            </button>
          ))}
        </div>
        <div className="foot">
          <div className={`liveDot ${live ? "" : "off"}`}><i />{live ? "backend live" : "offline sample"}</div>
          <div style={{ marginTop: 10 }}>isolated network<br />egress blocked</div>
          <div style={{ marginTop: 10 }}>report · {report.generated_at.slice(0, 19).replace("T", " ")}</div>
        </div>
      </aside>

      <main className="main">
        {view === "overview" && (
          <>
            <div className="pagehead">
              <div>
                <h2>Security posture</h2>
                <p>Four scripted attacks run against the twin. Toggle the posture to see the score, attack path, and coverage move from baseline to hardened.</p>
              </div>
              <PostureToggle mode={mode} set={setMode} />
            </div>
            <div className="grid cols-3">
              <ScoreGauge posture={posture} delta={report.score} mode={mode} />
              <AttackGraph path={report.attack_path} mode={mode} />
              <CoverageMatrix report={report} mode={mode} />
            </div>
            <div style={{ height: 16 }} />
            <ScenarioTable report={report} />
          </>
        )}

        {view === "lab" && (
          <>
            <div className="pagehead">
              <div>
                <h2>Attack lab</h2>
                <p>Launch the benign, scripted attacks live and watch the kill-chain execute phase by phase. The report updates when the run completes.</p>
              </div>
              <button onClick={async () => { await resetRun(); const { report, live } = await fetchReport(); setReport(report); setLive(live); setMode("before"); }}
                className="tag" style={{ padding: "8px 14px", cursor: "pointer", background: "var(--panel2)" }}>↺ reset &amp; replay</button>
            </div>
            <div className="grid cols-2">
              <LiveTerminal onReport={(r) => { setReport(r); setMode("before"); }} />
              <AttackGraph path={report.attack_path} mode={mode} />
            </div>
          </>
        )}

        {view === "remediation" && (
          <>
            <div className="pagehead">
              <div>
                <h2>Remediation advisor</h2>
                <p>Each weakness comes with a concrete fix: a code or config diff, the shift-left gate that would have caught it, and the residual risk after fixing.</p>
              </div>
            </div>
            <RemediationPanel advice={advice} />
          </>
        )}

        {view === "sim3d" && (
          <>
            <div className="pagehead">
              <div>
                <h2>3D attack simulation</h2>
                <p>Watch the attack travel the kill-chain in 3D, one step at a time. Drag to orbit, scroll to zoom. Switch to Hardened to see the shields hold and the chain contained.</p>
              </div>
            </div>
            <Simulation3D report={report} />
          </>
        )}

        {view === "harden" && (
          <>
            <div className="pagehead">
              <div>
                <h2>Harden &amp; simulate</h2>
                <p>Toggle individual security controls and watch the score, attack path, and blast radius recompute live. Fixing one weakness can break a whole attack chain.</p>
              </div>
            </div>
            <HardenView report={report} controls={CONTROLS} />
          </>
        )}

        {view === "exports" && (
          <>
            <div className="pagehead">
              <div>
                <h2>Exports</h2>
                <p>Findings in formats security teams already use: a MITRE ATT&amp;CK Navigator layer, Sigma detection rules, and an OPA config policy.</p>
              </div>
            </div>
            <ExportsView />
          </>
        )}
      </main>
    </div>
  );
}

function Dot({ v }: { v: View }) {
  const color = v === "overview" ? "var(--steel)" : v === "lab" ? "var(--red)" : v === "sim3d" ? "#7C3AED" : v === "harden" ? "var(--amber)" : v === "exports" ? "#7C3AED" : "var(--green)";
  return <i className="ic" style={{ background: color, borderRadius: 3, display: "inline-block" }} />;
}
