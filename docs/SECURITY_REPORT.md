# Security Report — DevSecOps Digital Twin

**Generated:** 2026-10-07 16:45 UTC
**Twin:** `devsecops-digital-twin`  ·  **Environment:** isolated range (egress blocked)

## Executive summary

The twin replicated the target application and its CI/CD pipeline, then ran
4 scripted attack scenarios. In the **baseline** posture (runtime monitoring only,
no shift-left gates) the twin scored **18/100 (F)**. After applying the
remediations and enabling the pipeline security gates, the **hardened** posture
scored **100/100 (A)** — an improvement of **+82**.

| Posture | Score | Grade | Caught at pipeline | Caught at runtime | Missed |
|---|---|---|---|---|---|
| Baseline | 18 | F | 0 | 1 | 3 |
| Hardened | 100 | A | 2 | 0 | 0 |

## Attack chain & blast radius

The baseline weaknesses compose into a **4-step attack chain** reaching **7 assets**. Critically, several steps are only reachable because an earlier weakness grants the capability they need — so fixing one upstream control can break multiple paths.

| Reachable asset | via capability |
|---|---|
| Service API key | `api_key` |
| Admin account | `auth_bypass` |
| User database | `db_read` |
| Internal /debug surface | `debug_access` |
| Environment + config | `env_disclosure` |
| Code execution on host | `rce_potential` |
| Downstream services | `service_pivot` |

## Detection coverage — what the defences missed

| Weakness | Baseline | After fixes |
|---|---|---|
| SQL Injection (auth bypass) | `runtime` | `pipeline` |
| Leaked credential in source | `missed` | `remediated` |
| Known-vulnerable dependency | `missed` | `remediated` |
| Debug mode + exposed internal endpoint | `missed` | `pipeline` |


The key finding: **3 of 4** weaknesses slipped past the baseline defences
because they require *shift-left* controls (secret scanning, dependency scanning,
config policy) that run at build time, not runtime. Runtime monitoring alone caught
only the live SQL-injection behaviour.

## Scenarios

### SQL Injection (auth bypass)  
- **Severity:** CRITICAL  ·  **MITRE:** T1190 (Initial Access)  
- **Compliance:** A03:2021 Injection · CWE-89  
- **Attack succeeded:** True  ·  **Caught at:** runtime  
- **Evidence:** login returned ok=True user={'id': 1, 'role': 'user', 'username': 'alice'}  

### Leaked credential in source  
- **Severity:** HIGH  ·  **MITRE:** T1552.001 (Credential Access)  
- **Compliance:** A07:2021 Identification & Authentication Failures · CWE-798  
- **Attack succeeded:** True  ·  **Caught at:** missed  
- **Evidence:** recovered api_key prefix=sk_live_DE... from /debug/config  

### Known-vulnerable dependency  
- **Severity:** HIGH  ·  **MITRE:** T1195.001 (Supply Chain)  
- **Compliance:** A06:2021 Vulnerable & Outdated Components · CWE-1104  
- **Attack succeeded:** True  ·  **Caught at:** missed  
- **Evidence:** CVE-2023-25577 / CVE-2022-29361 present in image  

### Debug mode + exposed internal endpoint  
- **Severity:** MEDIUM  ·  **MITRE:** T1078.001 (Misconfiguration)  
- **Compliance:** A05:2021 Security Misconfiguration · CWE-489  
- **Attack succeeded:** True  ·  **Caught at:** missed  
- **Evidence:** /health reports debug=True  



## Remediation plan

| Weakness | Fix | Effort | After |
|---|---|---|---|
| SQL Injection (auth bypass) | Use parameterised queries (sqlite3 '?' placeholders); add a SAST gate (bandit/semgrep) to CI. | low | `pipeline` |
| Leaked credential in source | Remove the hardcoded key, load from a secret manager, rotate the key, add gitleaks as a blocking CI gate. | low | `remediated` |
| Known-vulnerable dependency | Upgrade Werkzeug/Flask to patched versions; fail the build on HIGH/CRITICAL CVEs with Trivy. | low | `remediated` |
| Debug mode + exposed internal endpoint | Set APP_DEBUG=false in prod, remove /debug/config, add a config-policy check (OPA/conftest) to CI. | medium | `pipeline` |


---
*All attacks were benign, scripted, and confined to the twin's own services on an
isolated network. The security score is a weighted posture indicator, not a
guarantee of security.*
