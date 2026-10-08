import type { Report, Advice, AttackEvent } from "./types";
import { SAMPLE_REPORT, SAMPLE_ADVICE } from "./data/sampleReport";

const BASE = import.meta.env.VITE_API ?? "";

// Live if the backend answers; otherwise the embedded sample keeps the demo alive.
export async function fetchReport(): Promise<{ report: Report; live: boolean }> {
  try {
    const r = await fetch(`${BASE}/api/report`, { cache: "no-store" });
    if (r.ok) return { report: await r.json(), live: true };
  } catch { /* fall through */ }
  return { report: SAMPLE_REPORT, live: false };
}

export async function fetchAdvice(): Promise<Advice[]> {
  try {
    const r = await fetch(`${BASE}/api/remediation`, { cache: "no-store" });
    if (r.ok) return await r.json();
  } catch { /* fall through */ }
  return SAMPLE_ADVICE;
}

export async function resetRun(): Promise<void> {
  try { await fetch(`${BASE}/api/reset`, { method: "POST" }); } catch { /* no-op offline */ }
}

/**
 * Stream a live attack run. Uses the backend SSE endpoint when available; when
 * offline, replays the embedded scenarios with the same cadence so the Attack Lab
 * always demos. onEvent fires per event; onDone fires with the final report.
 */
export function runAttack(
  onEvent: (e: AttackEvent) => void,
  onDone: (r: Report) => void
): () => void {
  let cancelled = false;
  let es: EventSource | null = null;

  const tryLive = () => {
    try {
      es = new EventSource(`${BASE}/api/attack/stream`);
      let got = false;
      es.onmessage = (m) => {
        got = true;
        const e: AttackEvent = JSON.parse(m.data);
        onEvent(e);
        if (e.phase === "done" && e.report) { es?.close(); onDone(e.report); }
      };
      es.onerror = () => {
        es?.close();
        if (!got) simulate();           // never started -> replay offline
        else if (!cancelled) onDone(SAMPLE_REPORT); // dropped mid-run -> finalize
      };
    } catch { simulate(); }
  };

  const simulate = async () => {
    const phases = [
      ["recon", "probing target surface", 250],
      ["execute", "sending scripted payload", 400],
      ["observe", "capturing response + runtime signal", 300],
    ] as const;
    let seq = 0;
    const emit = (o: Partial<AttackEvent>) =>
      !cancelled && onEvent({ seq: ++seq, ts: Date.now() / 1000, scenario: "-",
        phase: "info", message: "", level: "info", ...o } as AttackEvent);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    emit({ phase: "start", message: "Twin armed · isolated network · egress blocked" });
    await sleep(300);
    for (const s of SAMPLE_REPORT.scenarios) {
      for (const [phase, msg, d] of phases) {
        emit({ scenario: s.id, phase, message: `[${s.id}] ${msg}` });
        await sleep(d);
        if (cancelled) return;
      }
      emit({ scenario: s.id, phase: "result",
        level: s.success ? "breach" : "ok",
        message: `[${s.id}] ${s.success ? "SUCCEEDED" : "blocked"} — ${s.evidence}` });
      await sleep(200);
    }
    emit({ phase: "done", level: "score",
      message: `Posture ${SAMPLE_REPORT.score.before} (${SAMPLE_REPORT.score.grade_before}) → ` +
               `${SAMPLE_REPORT.score.after} (${SAMPLE_REPORT.score.grade_after})`,
      report: SAMPLE_REPORT });
    onDone(SAMPLE_REPORT);
  };

  tryLive();
  return () => { cancelled = true; es?.close(); };
}
