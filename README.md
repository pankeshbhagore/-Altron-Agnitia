# DevSecOps Digital Twin for Cyber Attack Simulation

> **CIPHER05 · Software Track** — a safe, instrumented replica of an application
> *and its CI/CD pipeline* where benign scripted attacks reveal how they spread and
> whether the pipeline and runtime defences catch them — quantified as a security
> score that moves from **F to A**.

A full-stack project: a **React + TypeScript** console, a **FastAPI** backend with a
live attack stream and an AI remediation advisor, a vulnerable **target app**,
**scenario-as-code**, CI/CD security gates, and **Prometheus + Grafana + Falco**
monitoring — all on an isolated, egress-blocked network.

## Why this wins — differentiators

1. **Attack-chain composition + blast radius** — weaknesses don't stand alone: the
   twin models how one exploit *grants* a capability that unlocks the next, computes
   the reachable asset "blast radius", and shows that **fixing one upstream control
   breaks a whole chain** (fixing the misconfig gates the credential theft).
2. **Interactive hardening sandbox** — toggle individual controls (Trivy, gitleaks,
   SAST, OPA, code patch) and watch the score, attack path, and blast radius
   **recompute live**. An interactive demo, not a canned one.
3. **Detection-coverage matrix** — for every weakness, *where* it was caught:
   pipeline (shift-left), runtime (Falco), or **missed** — exactly what the brief
   asks: *what the defences missed.*
4. **Security score, before → after** — one severity-weighted number that jumps
   **18 (F) → 100 (A)**.
5. **MITRE ATT&CK attack-path graph** — a live, animated kill-chain that flips from
   "live breach" to "contained".
6. **AI remediation advisor** — per weakness: a concrete code/config **diff**, the
   shift-left gate, and residual risk.
7. **Standards exports** — a MITRE ATT&CK **Navigator layer**, **Sigma** detection
   rules, and an **OPA/Rego** policy, plus **OWASP Top 10 / CWE** compliance mapping.

Plus: real-time **SSE attack streaming**, one-command **reset & replay**,
deterministic scenario-as-code, and *monitored* isolation (a Falco rule alerts on
any egress from the twin).

## Quickstart (Docker)

```bash
make up          # build + start the whole isolated stack
make demo        # prints the URLs below

#  Console   http://localhost:8080
#  API       http://localhost:8080/api/report
#  Grafana   http://localhost:3000
make reset       # reset & replay a clean run
```

## Run locally without Docker

```bash
# backend (API + attack stream + advisor)
cd backend && pip install -r requirements.txt
SCEN_DIR=../scenarios uvicorn app.main:app --reload --port 8000

# frontend (proxies /api to :8000) — in a second terminal
cd frontend && npm install && npm run dev   # http://localhost:5173
```

The frontend also runs fully offline: if the backend isn't reachable it falls back
to an embedded sample report, so the demo never breaks.

## The four scenarios

| # | Weakness | MITRE | Caught at (baseline → hardened) |
|---|---|---|---|
| 01 | SQL injection (auth bypass) | T1190 | runtime → pipeline |
| 02 | Leaked credential in source | T1552.001 | missed → remediated |
| 03 | Known-vulnerable dependency | T1195.001 | missed → remediated |
| 04 | Debug mode + exposed endpoint | T1078.001 | missed → pipeline |

## Deliverables → where they live

- **Twin + 3+ attack scenarios** → `docker-compose.yml`, `target-app/`, `scenarios/` (4)
- **Live attack, observe & fix demo** → Attack Lab view (SSE stream) + posture toggle
- **Security report** → `docs/SECURITY_REPORT.md` (auto-generated from `report.json`)
- **Architecture diagram + repo + short report** → `docs/ARCHITECTURE.md` (Mermaid), this repo

## Repository layout

```
target-app/        vulnerable sample app (the twin target: SQLi, secret, vuln dep, misconfig)
scenarios/         scenario-as-code (YAML): probe, MITRE, detection stage, remediation
backend/           FastAPI service
  app/core/          attacks · detectors · scoring · attack_path · orchestrator · advisor · report
  app/routers/       report · remediation · live attack SSE · metrics · simulate/chain/exports
  app/main.py        API, CORS, serves built frontend in-container
  tests/             scoring unit tests (proves F→A math)
frontend/          Vite + React + TypeScript console
  src/components/    ScoreGauge · AttackGraph · CoverageMatrix · ScenarioTable
                     LiveTerminal · RemediationPanel
  src/api.ts         API client with offline fallback + SSE replay
.github/workflows/ CI/CD with security gates (gitleaks, Trivy, Bandit, OPA, score gate)
monitoring/        prometheus, falco rules, grafana dashboard
docs/              architecture (Mermaid) + auto-generated security report
scripts/           reset & replay
```

## Testing

```bash
cd backend  && SCEN_DIR=../scenarios python -m pytest -q   # scoring engine + API
cd frontend && npm test                                     # UI interaction tests (vitest)
```

Backend: unit tests for the scoring engine (proves the F→A math) plus endpoint
checks. Frontend: 5 interaction tests that mount the real app and drive it — score
load, posture toggle (18→100), Attack Lab nav, live attack streaming, and the
remediation diff view. Both suites pass clean, with no deprecation warnings.

## Make targets

`make up · demo · attack · score · report · reset · scan · test · be · fe · down · clean`

## Tech

React · TypeScript · Vite · FastAPI · Docker Compose · GitHub Actions · Trivy ·
gitleaks · Bandit · OPA/conftest · Falco · Prometheus · Grafana · Python.

## Safety & scope

The intentionally-vulnerable code lives only in `target-app/`, for teaching, in the
tradition of OWASP Juice Shop / DVWA. Every attack probe uses textbook payloads
against the twin's own services on an isolated network, contacts no external system,
and persists nothing. **Do not expose the target app to the internet.**
