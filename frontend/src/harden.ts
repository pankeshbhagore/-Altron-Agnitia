import type { Scenario, SimResult, Chain, Stage, AttackPath } from "./types";

// Mirror of backend harden.CONTROLS so the console simulates offline, identically.
const CONTROLS: Record<string, { scenario: string; stage: Stage }> = {
  sast_gate:     { scenario: "sql_injection",         stage: "pipeline" },
  patch_sqli:    { scenario: "sql_injection",         stage: "remediated" },
  gitleaks_gate: { scenario: "leaked_credential",     stage: "remediated" },
  trivy_gate:    { scenario: "vulnerable_dependency", stage: "remediated" },
  opa_policy:    { scenario: "misconfiguration",      stage: "pipeline" },
};
const LABELS: Record<string, string> = {
  sast_gate: "SAST gate (Bandit)", patch_sqli: "Patch SQLi (parameterised query)",
  gitleaks_gate: "Secret scan gate (gitleaks)", trivy_gate: "Dependency scan gate (Trivy)",
  opa_policy: "Config policy gate (OPA)",
};
const SEV_W: Record<string, number> = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 2 };
const STAGE_CREDIT: Record<string, number> = { pipeline: 1, runtime: 0.5, missed: 0, remediated: 1 };
const ASSET: Record<string, string> = {
  debug_access: "Internal /debug surface", env_disclosure: "Environment + config",
  api_key: "Service API key", service_pivot: "Downstream services",
  db_read: "User database", auth_bypass: "Admin account", rce_potential: "Code execution on host",
};

function grade(s: number) {
  return s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";
}

function compose(scenarios: Scenario[]): Chain {
  const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  const granted = new Set<string>();
  const order: string[] = [];
  const reachable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of scenarios) {
      if (reachable.has(s.id) || !s.success) continue;
      const req = new Set(s.requires ?? []);
      if ([...req].every((r) => granted.has(r))) {
        reachable.add(s.id); order.push(s.id);
        (s.grants ?? []).forEach((g) => granted.add(g));
        changed = true;
      }
    }
  }
  const edges: Chain["edges"] = [];
  for (const sid of order) {
    const req = byId[sid].requires ?? [];
    if (req.length === 0) edges.push({ from: "entry", to: sid, unlocks: byId[sid].grants ?? [] });
    else for (const need of req) {
      const provider = order.find((o) => (byId[o].grants ?? []).includes(need) && order.indexOf(o) < order.indexOf(sid));
      if (provider) edges.push({ from: provider, to: sid, unlocks: [need] });
    }
  }
  if (order.length) edges.push({ from: order[order.length - 1], to: "impact", unlocks: ["compromise"] });
  const blast = [...granted].sort().map((c) => ({ capability: c, asset: ASSET[c] ?? c }));
  const gated = scenarios.filter((s) => s.success && !reachable.has(s.id)).map((s) => s.id);
  return { order, edges, blast_radius: blast, reachable_count: reachable.size, gated,
    depth: order.length, summary: `${order.length}-step chain reaching ${blast.length} assets` };
}

function buildGraph(scenarios: Scenario[]): AttackPath {
  const lanes = ["Supply Chain", "Misconfiguration", "Initial Access",
    "Credential Access", "Lateral Movement", "Impact"];
  const nodes: AttackPath["nodes"] = [{ id: "entry", label: "Attacker", lane: "Supply Chain",
    mitre: "-", stage: "n/a", severity: "LOW", active: true }];
  const edges: AttackPath["edges"] = [];
  for (const s of scenarios) {
    nodes.push({ id: s.id, label: s.name, lane: s.step, mitre: s.mitre,
      stage: s.stage, severity: s.severity, active: s.success });
    edges.push({ from: "entry", to: s.id, active: s.success, stage: s.stage });
  }
  const ok = scenarios.filter((s) => s.success);
  if (ok.length) {
    nodes.push({ id: "impact", label: "Data / Admin compromise", lane: "Impact",
      mitre: "T1486", stage: "missed", severity: "CRITICAL", active: true });
    ok.forEach((s) => edges.push({ from: s.id, to: "impact", active: true, stage: s.stage }));
  }
  return { nodes, edges, lanes };
}

export function simulate(base: Scenario[], controls: Record<string, boolean>): SimResult {
  const rank: Record<string, number> = { remediated: 2, pipeline: 1 };
  const best: Record<string, Stage> = {};
  for (const [cid, on] of Object.entries(controls)) {
    if (!on || !CONTROLS[cid]) continue;
    const { scenario, stage } = CONTROLS[cid];
    if ((rank[stage] ?? 0) >= (rank[best[scenario] ?? ""] ?? 0)) best[scenario] = stage;
  }
  const scenarios: Scenario[] = base.map((s) => {
    const stage = best[s.id] ?? s.stage;
    const success = s.success && (stage === "runtime" || stage === "missed");
    return { ...s, stage, success };
  });
  // score
  const totalW = scenarios.reduce((a, s) => a + (SEV_W[s.severity] ?? 4), 0) || 1;
  const earned = scenarios.reduce((a, s) => a + (SEV_W[s.severity] ?? 4) * STAGE_CREDIT[s.stage], 0);
  const score = Math.round((earned / totalW) * 100);
  const posture = {
    score, grade: grade(score), rows: [],
    caught_pipeline: scenarios.filter((s) => s.stage === "pipeline").length,
    caught_runtime: scenarios.filter((s) => s.stage === "runtime").length,
    missed: scenarios.filter((s) => s.stage === "missed").length,
  };
  return {
    posture, coverage: { pipeline: posture.caught_pipeline, runtime: posture.caught_runtime,
      missed: posture.missed, total: scenarios.length },
    attack_path: buildGraph(scenarios), chain: compose(scenarios), scenarios,
    applied: Object.entries(controls).filter(([c, on]) => on && LABELS[c]).map(([c]) => LABELS[c]),
    score, grade: posture.grade,
  };
}
