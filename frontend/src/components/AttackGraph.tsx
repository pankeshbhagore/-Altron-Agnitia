import type { AttackPath, PostureMode, Stage } from "../types";

const LANE_X: Record<string, number> = {
  "Supply Chain": 90, "Misconfiguration": 280, "Initial Access": 470,
  "Credential Access": 660, "Lateral Movement": 850, "Impact": 1040,
};
const C: Record<Stage, string> = {
  pipeline: "var(--green)", runtime: "var(--amber)", missed: "var(--red)",
  remediated: "var(--steel)", "n/a": "var(--dim)",
};
// soft tint fills per stage
const CT: Record<Stage, string> = {
  pipeline: "var(--tint-green)", runtime: "var(--tint-amber)", missed: "var(--tint-red)",
  remediated: "var(--tint-steel)", "n/a": "var(--panel2)",
};

export default function AttackGraph({ path, mode }: { path: AttackPath; mode: PostureMode }) {
  const hardened = mode === "after";
  const used: Record<string, number> = {};
  const pos: Record<string, { x: number; y: number; n: AttackPath["nodes"][0] }> = {};
  for (const n of path.nodes) {
    const lane = n.lane in LANE_X ? n.lane : "Initial Access";
    const x = LANE_X[lane];
    const c = used[lane] ?? 0; used[lane] = c + 1;
    pos[n.id] = { x, y: 80 + c * 100, n };
  }

  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <p className="cap">ATTACK PATH · MITRE ATT&CK <span className="mono">{hardened ? "contained" : "live breach"}</span></p>
      <svg viewBox="-10 0 1140 400" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", display: "block" }}>
        {path.lanes.map((l) => (
          <text key={l} x={LANE_X[l] ?? 300} y={24} textAnchor="middle"
            style={{ fill: "var(--dim)", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
            {l.toUpperCase()}
          </text>
        ))}
        {path.edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          const active = e.active && !hardened;
          const col = hardened ? "var(--steel)" : C[e.stage] ?? "var(--dim)";
          const mx = (a.x + b.x) / 2;
          return (
            <path key={i} d={`M${a.x + 75},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x - 75},${b.y}`}
              fill="none" stroke={col} strokeWidth={2.5} opacity={active ? 0.9 : 0.3}
              strokeDasharray={active ? "8 8" : undefined}
              style={active ? { animation: "dash 1.1s linear infinite" } : undefined} />
          );
        })}
        {Object.values(pos).map(({ x, y, n }) => {
          const col = hardened ? "var(--steel)" : n.id === "entry" ? "var(--steel)" : C[n.stage] ?? "var(--dim)";
          const breached = n.active && !hardened && n.id !== "entry";
          const fill = hardened ? "var(--tint-steel)"
            : breached ? (CT[n.stage] ?? "var(--panel2)") : "var(--panel)";
          return (
            <g key={n.id}>
              <rect x={x - 75} y={y - 30} width={150} height={60} rx={12}
                fill={fill} stroke={hardened ? "var(--steel)" : col} strokeWidth={1.5} />
              <foreignObject x={x - 73} y={y - 28} width={146} height={56}>
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.2 }}>
                  <span style={{ color: "var(--ink)", fontSize: 12, fontWeight: 600 }}>{n.label}</span>
                  <span style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 10, marginTop: 4 }}>{n.mitre}</span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
        {[["compromised / missed", "var(--red)"], ["caught at runtime", "var(--amber)"],
          ["blocked at pipeline", "var(--green)"], ["remediated", "var(--steel)"]].map(([t, c]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: c as string }} />{t}
          </span>
        ))}
      </div>
      <style>{`@keyframes dash { to { stroke-dashoffset: -24; } }`}</style>
    </div>
  );
}
