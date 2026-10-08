export type Stage = "pipeline" | "runtime" | "missed" | "remediated" | "n/a";

export interface Detection {
  stage: string; tool: string; severity: string;
  id?: string; target: string; detail?: string;
}
export interface Scenario {
  id: string; name: string; mitre: string; step: string; severity: string;
  success: boolean; stage: Stage; natural_stage: Stage; evidence: string;
  detections: Detection[];
  requires?: string[]; grants?: string[]; owasp?: string; cwe?: string;
}
export interface BlastItem { capability: string; asset: string; }
export interface Chain {
  order: string[];
  edges: { from: string; to: string; unlocks: string[] }[];
  blast_radius: BlastItem[];
  reachable_count: number; gated: string[]; depth: number; summary: string;
}
export interface Control {
  id: string; label: string; scenario: string; stage: Stage; breaks_attack: boolean;
}
export interface SimResult {
  posture: Posture; coverage: Report["coverage"]; attack_path: AttackPath;
  chain: Chain; scenarios: Scenario[]; applied: string[]; score: number; grade: string;
}
export interface Posture {
  score: number; grade: string; rows: any[];
  caught_pipeline: number; caught_runtime: number; missed: number;
}
export interface ScoreDelta {
  before: number; after: number; improvement: number;
  grade_before: string; grade_after: string;
}
export interface GraphNode {
  id: string; label: string; lane: string; mitre: string;
  stage: Stage; severity: string; active: boolean;
}
export interface GraphEdge { from: string; to: string; active: boolean; stage: Stage; }
export interface AttackPath { nodes: GraphNode[]; edges: GraphEdge[]; lanes: string[]; }
export interface Remediation {
  id: string; name: string; severity: string;
  fix: string; effort: string; after_stage: Stage;
}
export interface Report {
  generated_at: string; twin: string;
  scenarios: Scenario[];
  score: ScoreDelta;
  posture_before: Posture;
  posture_after: Posture;
  attack_path: AttackPath;
  chain: Chain;
  remediation: Remediation[];
  coverage: { pipeline: number; runtime: number; missed: number; total: number };
}
export interface Advice {
  scenario: string; why: string; diff: string; gate: string;
  residual: string; effort: string; owner: string; enriched?: string;
}
export interface AttackEvent {
  seq: number; ts: number; scenario: string; phase: string;
  message: string; level: "info" | "ok" | "breach" | "score";
  report?: Report;
}
export type PostureMode = "before" | "after";
