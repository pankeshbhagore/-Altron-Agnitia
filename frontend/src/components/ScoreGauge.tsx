import { useEffect, useRef, useState } from "react";
import type { Posture, ScoreDelta } from "../types";

const CIRC = 2 * Math.PI * 52; // r=52

function gradeColor(g: string) {
  return g === "A" || g === "B" ? "var(--green)"
    : g === "C" || g === "D" ? "var(--amber)" : "var(--red)";
}

export default function ScoreGauge({ posture, delta, mode }:
  { posture: Posture; delta: ScoreDelta; mode: "before" | "after" }) {
  const [shown, setShown] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const target = posture.score, start = performance.now(), dur = 850;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setShown(Math.round(ease(p) * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setShown(target);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [posture.score]);

  const color = gradeColor(posture.grade);
  const offset = CIRC - (CIRC * shown) / 100;

  return (
    <div className="panel">
      <p className="cap">SECURITY SCORE <span className="mono">{mode === "before" ? "baseline" : "hardened"}</span></p>
      <div style={{ position: "relative", width: "100%", maxWidth: 230, aspectRatio: "1", margin: "0 auto" }}>
        <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="10" />
          <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
            style={{ transition: "stroke .3s" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 60, fontWeight: 700, lineHeight: 1, letterSpacing: "-.03em" }}>{shown}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            GRADE <b style={{ color }}>{posture.grade}</b>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        {[["Caught at pipeline", posture.caught_pipeline, "var(--green)"],
          ["Caught at runtime", posture.caught_runtime, "var(--amber)"],
          ["Missed entirely", posture.missed, "var(--red)"],
          ["Improvement", `+${delta.improvement}`, "var(--green)"]].map(([k, v, c], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between",
            fontFamily: "var(--mono)", fontSize: 13, padding: "7px 0",
            borderTop: "1px dashed var(--line)" }}>
            <span style={{ color: "var(--muted)" }}>{k}</span>
            <b style={{ color: c as string }}>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
