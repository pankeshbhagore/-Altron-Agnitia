import { useEffect, useRef, useState } from "react";
import type { AttackEvent, Report } from "../types";
import { runAttack } from "../api";

const LEVEL_COLOR: Record<string, string> = {
  info: "var(--code-dim)", ok: "var(--green)", breach: "var(--red)", score: "var(--steel)",
};

export default function LiveTerminal({ onReport }: { onReport: (r: Report) => void }) {
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth" }); }, [events]);
  useEffect(() => () => stopRef.current?.(), []);

  const start = () => {
    setEvents([]); setRunning(true);
    stopRef.current = runAttack(
      (e) => setEvents((p) => [...p, e]),
      (r) => { setRunning(false); onReport(r); }
    );
  };
  const stop = () => { stopRef.current?.(); setRunning(false); };

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
      <p className="cap">
        LIVE ATTACK STREAM
        <button onClick={running ? stop : start}
          style={{ background: running ? "var(--tint-red)" : "var(--tint-steel)",
            border: `1px solid ${running ? "var(--red)" : "var(--steel)"}`,
            color: running ? "var(--red)" : "var(--steel)", borderRadius: 7,
            padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 12 }}>
          {running ? "■ stop" : "▶ run attack"}
        </button>
      </p>
      <div style={{ background: "var(--code-bg2)", border: "1px solid var(--line2)", borderRadius: 9,
        padding: 14, height: 360, overflowY: "auto", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.7 }}>
        {events.length === 0 && (
          <div style={{ color: "var(--code-dim)" }}>$ twin attack --all --isolated<br />armed — launch with the button above.</div>
        )}
        {events.map((e) => (
          <div key={e.seq} style={{ color: LEVEL_COLOR[e.level] ?? "var(--muted)" }}>
            <span style={{ color: "var(--code-dim)" }}>{String(e.seq).padStart(2, "0")} </span>
            {e.level === "breach" ? "⚠ " : e.level === "ok" ? "✓ " : e.level === "score" ? "▸ " : "· "}
            {e.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
