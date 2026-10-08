"""
Live attack streaming.

Streams the attack run as Server-Sent Events so the frontend can play back the
kill-chain in real time — the "live attack, observe and fix" deliverable done
properly, not just a static report. Each benign probe emits recon -> execute ->
detect phases with timing, exactly as the console terminal renders them.
"""
import asyncio
import json
import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core import attacks, orchestrator
from ..config import settings

router = APIRouter()

_PHASES = [
    ("recon", "probing target surface", 0.25),
    ("execute", "sending scripted payload", 0.4),
    ("observe", "capturing response + runtime signal", 0.3),
]


async def _event_stream():
    seq = 0

    def sse(obj):
        return f"data: {json.dumps(obj)}\n\n"

    yield sse(dict(seq=(seq := seq + 1), ts=time.time(), scenario="-",
                   phase="start", level="info",
                   message="Twin armed · isolated network · egress blocked"))
    await asyncio.sleep(0.3)

    results = []
    for name, probe in attacks.PROBES.items():
        for phase, msg, delay in _PHASES:
            yield sse(dict(seq=(seq := seq + 1), ts=time.time(), scenario=name,
                           phase=phase, level="info", message=f"[{name}] {msg}"))
            await asyncio.sleep(delay)
        res = probe()
        results.append((name, res))
        lvl = "breach" if res["success"] else "ok"
        yield sse(dict(seq=(seq := seq + 1), ts=time.time(), scenario=name,
                       phase="result", level=lvl,
                       message=f"[{name}] {'SUCCEEDED' if res['success'] else 'blocked'} — {res['evidence']}"))
        await asyncio.sleep(0.2)

    # finalise full report and emit it as the terminal event
    report = orchestrator.run(settings.REPORT_PATH)
    yield sse(dict(seq=(seq := seq + 1), ts=time.time(), scenario="-", phase="done",
                   level="score",
                   message=f"Posture {report['score']['before']} ({report['score']['grade_before']}) "
                           f"→ {report['score']['after']} ({report['score']['grade_after']})",
                   report=report))


@router.get("/api/attack/stream")
async def attack_stream():
    return StreamingResponse(_event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})
