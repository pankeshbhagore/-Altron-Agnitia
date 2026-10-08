import type { Report, Advice, Control } from '../types';

export const SAMPLE_REPORT: Report = {
  "generated_at": "2026-10-07T16:45:36.012919+00:00",
  "twin": "devsecops-digital-twin",
  "scenarios": [
    {
      "id": "sql_injection",
      "name": "SQL Injection (auth bypass)",
      "mitre": "T1190",
      "step": "Initial Access",
      "severity": "CRITICAL",
      "success": true,
      "stage": "runtime",
      "natural_stage": "runtime",
      "evidence": "login returned ok=True user={'id': 1, 'role': 'user', 'username': 'alice'}",
      "requires": [],
      "grants": [
        "db_read",
        "auth_bypass"
      ],
      "owasp": "A03:2021 Injection",
      "cwe": "CWE-89",
      "detections": [
        {
          "stage": "runtime",
          "tool": "Falco",
          "severity": "Warning",
          "id": "Unexpected DB query shape",
          "target": "sql_injection",
          "detail": "anomalous SELECT with tautology from app container"
        }
      ]
    },
    {
      "id": "leaked_credential",
      "name": "Leaked credential in source",
      "mitre": "T1552.001",
      "step": "Credential Access",
      "severity": "HIGH",
      "success": true,
      "stage": "missed",
      "natural_stage": "pipeline",
      "evidence": "recovered api_key prefix=sk_live_DE... from /debug/config",
      "requires": [
        "debug_access"
      ],
      "grants": [
        "api_key",
        "service_pivot"
      ],
      "owasp": "A07:2021 Identification & Authentication Failures",
      "cwe": "CWE-798",
      "detections": [
        {
          "stage": "pipeline",
          "tool": "gitleaks",
          "severity": "HIGH",
          "id": "generic-api-key",
          "target": "leaked_credential",
          "detail": "app/main.py:INTERNAL_API_KEY"
        }
      ]
    },
    {
      "id": "vulnerable_dependency",
      "name": "Known-vulnerable dependency",
      "mitre": "T1195.001",
      "step": "Supply Chain",
      "severity": "HIGH",
      "success": true,
      "stage": "missed",
      "natural_stage": "pipeline",
      "evidence": "CVE-2023-25577 / CVE-2022-29361 present in image",
      "requires": [],
      "grants": [
        "rce_potential"
      ],
      "owasp": "A06:2021 Vulnerable & Outdated Components",
      "cwe": "CWE-1104",
      "detections": [
        {
          "stage": "pipeline",
          "tool": "Trivy",
          "severity": "HIGH",
          "id": "CVE-2023-25577",
          "target": "vulnerable_dependency",
          "detail": "Werkzeug 2.0.1 multipart DoS"
        }
      ]
    },
    {
      "id": "misconfiguration",
      "name": "Debug mode + exposed internal endpoint",
      "mitre": "T1078.001",
      "step": "Misconfiguration",
      "severity": "MEDIUM",
      "success": true,
      "stage": "missed",
      "natural_stage": "missed",
      "evidence": "/health reports debug=True",
      "requires": [],
      "grants": [
        "debug_access",
        "env_disclosure"
      ],
      "owasp": "A05:2021 Security Misconfiguration",
      "cwe": "CWE-489",
      "detections": []
    }
  ],
  "score": {
    "before": 18,
    "after": 100,
    "improvement": 82,
    "grade_before": "F",
    "grade_after": "A"
  },
  "posture_before": {
    "score": 18,
    "grade": "F",
    "rows": [
      {
        "name": "SQL Injection (auth bypass)",
        "severity": "CRITICAL",
        "stage": "runtime",
        "weight": 10,
        "credit_pct": 50,
        "attack_success": true
      },
      {
        "name": "Leaked credential in source",
        "severity": "HIGH",
        "stage": "missed",
        "weight": 7,
        "credit_pct": 0,
        "attack_success": true
      },
      {
        "name": "Known-vulnerable dependency",
        "severity": "HIGH",
        "stage": "missed",
        "weight": 7,
        "credit_pct": 0,
        "attack_success": true
      },
      {
        "name": "Debug mode + exposed internal endpoint",
        "severity": "MEDIUM",
        "stage": "missed",
        "weight": 4,
        "credit_pct": 0,
        "attack_success": true
      }
    ],
    "caught_pipeline": 0,
    "caught_runtime": 1,
    "missed": 3
  },
  "posture_after": {
    "score": 100,
    "grade": "A",
    "rows": [
      {
        "name": "SQL Injection (auth bypass)",
        "severity": "CRITICAL",
        "stage": "pipeline",
        "weight": 10,
        "credit_pct": 100,
        "attack_success": false
      },
      {
        "name": "Leaked credential in source",
        "severity": "HIGH",
        "stage": "remediated",
        "weight": 7,
        "credit_pct": 100,
        "attack_success": false
      },
      {
        "name": "Known-vulnerable dependency",
        "severity": "HIGH",
        "stage": "remediated",
        "weight": 7,
        "credit_pct": 100,
        "attack_success": false
      },
      {
        "name": "Debug mode + exposed internal endpoint",
        "severity": "MEDIUM",
        "stage": "pipeline",
        "weight": 4,
        "credit_pct": 100,
        "attack_success": false
      }
    ],
    "caught_pipeline": 2,
    "caught_runtime": 0,
    "missed": 0
  },
  "attack_path": {
    "nodes": [
      {
        "id": "entry",
        "label": "Attacker",
        "lane": "Supply Chain",
        "mitre": "-",
        "stage": "n/a",
        "severity": "LOW",
        "active": true
      },
      {
        "id": "sql_injection",
        "label": "SQL Injection (auth bypass)",
        "lane": "Initial Access",
        "mitre": "T1190",
        "stage": "runtime",
        "severity": "CRITICAL",
        "active": true
      },
      {
        "id": "leaked_credential",
        "label": "Leaked credential in source",
        "lane": "Credential Access",
        "mitre": "T1552.001",
        "stage": "missed",
        "severity": "HIGH",
        "active": true
      },
      {
        "id": "vulnerable_dependency",
        "label": "Known-vulnerable dependency",
        "lane": "Supply Chain",
        "mitre": "T1195.001",
        "stage": "missed",
        "severity": "HIGH",
        "active": true
      },
      {
        "id": "misconfiguration",
        "label": "Debug mode + exposed internal endpoint",
        "lane": "Misconfiguration",
        "mitre": "T1078.001",
        "stage": "missed",
        "severity": "MEDIUM",
        "active": true
      },
      {
        "id": "impact",
        "label": "Data / Admin compromise",
        "lane": "Impact",
        "mitre": "T1486",
        "stage": "missed",
        "severity": "CRITICAL",
        "active": true
      }
    ],
    "edges": [
      {
        "from": "entry",
        "to": "sql_injection",
        "active": true,
        "stage": "runtime"
      },
      {
        "from": "entry",
        "to": "leaked_credential",
        "active": true,
        "stage": "missed"
      },
      {
        "from": "entry",
        "to": "vulnerable_dependency",
        "active": true,
        "stage": "missed"
      },
      {
        "from": "entry",
        "to": "misconfiguration",
        "active": true,
        "stage": "missed"
      },
      {
        "from": "sql_injection",
        "to": "impact",
        "active": true,
        "stage": "runtime"
      },
      {
        "from": "leaked_credential",
        "to": "impact",
        "active": true,
        "stage": "missed"
      },
      {
        "from": "vulnerable_dependency",
        "to": "impact",
        "active": true,
        "stage": "missed"
      },
      {
        "from": "misconfiguration",
        "to": "impact",
        "active": true,
        "stage": "missed"
      }
    ],
    "lanes": [
      "Supply Chain",
      "Misconfiguration",
      "Initial Access",
      "Credential Access",
      "Lateral Movement",
      "Impact"
    ]
  },
  "chain": {
    "order": [
      "sql_injection",
      "vulnerable_dependency",
      "misconfiguration",
      "leaked_credential"
    ],
    "edges": [
      {
        "from": "entry",
        "to": "sql_injection",
        "unlocks": [
          "db_read",
          "auth_bypass"
        ]
      },
      {
        "from": "entry",
        "to": "vulnerable_dependency",
        "unlocks": [
          "rce_potential"
        ]
      },
      {
        "from": "entry",
        "to": "misconfiguration",
        "unlocks": [
          "debug_access",
          "env_disclosure"
        ]
      },
      {
        "from": "misconfiguration",
        "to": "leaked_credential",
        "unlocks": [
          "debug_access"
        ]
      },
      {
        "from": "leaked_credential",
        "to": "impact",
        "unlocks": [
          "compromise"
        ]
      }
    ],
    "blast_radius": [
      {
        "capability": "api_key",
        "asset": "Service API key"
      },
      {
        "capability": "auth_bypass",
        "asset": "Admin account"
      },
      {
        "capability": "db_read",
        "asset": "User database"
      },
      {
        "capability": "debug_access",
        "asset": "Internal /debug surface"
      },
      {
        "capability": "env_disclosure",
        "asset": "Environment + config"
      },
      {
        "capability": "rce_potential",
        "asset": "Code execution on host"
      },
      {
        "capability": "service_pivot",
        "asset": "Downstream services"
      }
    ],
    "reachable_count": 4,
    "gated": [],
    "depth": 4,
    "summary": "4-step chain reaching 7 assets"
  },
  "remediation": [
    {
      "id": "sql_injection",
      "name": "SQL Injection (auth bypass)",
      "severity": "CRITICAL",
      "fix": "Use parameterised queries (sqlite3 '?' placeholders); add a SAST gate (bandit/semgrep) to CI.",
      "effort": "low",
      "after_stage": "pipeline"
    },
    {
      "id": "leaked_credential",
      "name": "Leaked credential in source",
      "severity": "HIGH",
      "fix": "Remove the hardcoded key, load from a secret manager, rotate the key, add gitleaks as a blocking CI gate.",
      "effort": "low",
      "after_stage": "remediated"
    },
    {
      "id": "vulnerable_dependency",
      "name": "Known-vulnerable dependency",
      "severity": "HIGH",
      "fix": "Upgrade Werkzeug/Flask to patched versions; fail the build on HIGH/CRITICAL CVEs with Trivy.",
      "effort": "low",
      "after_stage": "remediated"
    },
    {
      "id": "misconfiguration",
      "name": "Debug mode + exposed internal endpoint",
      "severity": "MEDIUM",
      "fix": "Set APP_DEBUG=false in prod, remove /debug/config, add a config-policy check (OPA/conftest) to CI.",
      "effort": "medium",
      "after_stage": "pipeline"
    }
  ],
  "coverage": {
    "pipeline": 0,
    "runtime": 1,
    "missed": 3,
    "total": 4
  }
};

export const SAMPLE_ADVICE: Advice[] = [
  {
    "scenario": "sql_injection",
    "why": "User input is concatenated directly into the SQL string, so a crafted username (`' OR '1'='1' --`) rewrites the query and bypasses authentication.",
    "diff": "--- a/target-app/main.py\n+++ b/target-app/main.py\n@@ login()\n-    query = f\"SELECT id, username, role FROM users WHERE username = '{user}' AND password = '{pw}'\"\n-    row = db.execute(query).fetchone()\n+    query = \"SELECT id, username, role FROM users WHERE username = ? AND password = ?\"\n+    row = db.execute(query, (user, pw)).fetchone()",
    "gate": "Add Bandit (SAST) to CI \u2014 it flags string-built SQL (B608) and fails the build.",
    "residual": "Low. Parameterised queries neutralise injection; keep SAST as a standing gate.",
    "effort": "low",
    "owner": "app team"
  },
  {
    "scenario": "leaked_credential",
    "why": "A live-looking API key is committed in source. Anyone with repo access \u2014 or anyone who reaches the debug endpoint \u2014 can read and reuse it.",
    "diff": "--- a/target-app/main.py\n+++ b/target-app/main.py\n@@\n-INTERNAL_API_KEY = \"sk_live_DEADBEEF_this_is_a_fake_demo_key_0000\"\n+import os\n+INTERNAL_API_KEY = os.environ[\"INTERNAL_API_KEY\"]   # injected from secret manager",
    "gate": "Add gitleaks as a BLOCKING CI gate; rotate the exposed key immediately.",
    "residual": "Low once rotated. Secret never touches git history going forward (add pre-commit hook).",
    "effort": "low",
    "owner": "platform team"
  },
  {
    "scenario": "vulnerable_dependency",
    "why": "Werkzeug 2.0.1 ships known CVEs (e.g. CVE-2023-25577 multipart DoS). The vulnerable code is deployed in the image even if never 'attacked' directly.",
    "diff": "--- a/target-app/requirements.txt\n+++ b/target-app/requirements.txt\n-Flask==2.0.1\n-Werkzeug==2.0.1\n+Flask==3.0.3\n+Werkzeug==3.0.4",
    "gate": "Trivy FS/image scan in CI with `exit-code: 1` on HIGH/CRITICAL; enable Dependabot.",
    "residual": "Low. Re-scan on every build; pin and review transitive deps.",
    "effort": "low",
    "owner": "app team"
  },
  {
    "scenario": "misconfiguration",
    "why": "Debug mode is on and an internal `/debug/config` endpoint leaks the environment and the embedded key \u2014 a direct pivot for an attacker. Nothing catches this today.",
    "diff": "--- a/docker-compose.yml\n+++ b/docker-compose.yml\n-      - APP_DEBUG=true\n+      - APP_DEBUG=false\n--- a/target-app/main.py\n+++ b/target-app/main.py\n@@\n-@app.route(\"/debug/config\")\n-def debug_config(): ...        # remove entirely in production builds",
    "gate": "Add an OPA/conftest policy to CI: fail if APP_DEBUG=true or debug routes exist in a prod manifest. This is the control that closes the 'missed' gap.",
    "residual": "Medium\u2192Low. Policy-as-code prevents regressions; add runtime Falco rule as backstop.",
    "effort": "medium",
    "owner": "platform team"
  }
];

export const CONTROLS: Control[] = [
  {
    "id": "sast_gate",
    "label": "SAST gate (Bandit)",
    "scenario": "sql_injection",
    "stage": "pipeline",
    "breaks_attack": false
  },
  {
    "id": "patch_sqli",
    "label": "Patch SQLi (parameterised query)",
    "scenario": "sql_injection",
    "stage": "remediated",
    "breaks_attack": true
  },
  {
    "id": "gitleaks_gate",
    "label": "Secret scan gate (gitleaks)",
    "scenario": "leaked_credential",
    "stage": "remediated",
    "breaks_attack": true
  },
  {
    "id": "trivy_gate",
    "label": "Dependency scan gate (Trivy)",
    "scenario": "vulnerable_dependency",
    "stage": "remediated",
    "breaks_attack": true
  },
  {
    "id": "opa_policy",
    "label": "Config policy gate (OPA)",
    "scenario": "misconfiguration",
    "stage": "pipeline",
    "breaks_attack": false
  }
];

export const EXPORTS = {
  "navigator_layer": {
    "name": "DevSecOps Twin \u2014 detection coverage",
    "versions": {
      "attack": "14",
      "navigator": "4.9.1",
      "layer": "4.5"
    },
    "domain": "enterprise-attack",
    "description": "Techniques exercised by the twin, coloured by detection stage.",
    "techniques": [
      {
        "techniqueID": "T1190",
        "score": 1,
        "color": "#d7a32b",
        "comment": "SQL Injection (auth bypass) \u2014 caught at runtime",
        "enabled": true
      },
      {
        "techniqueID": "T1552",
        "score": 1,
        "color": "#f25c54",
        "comment": "Leaked credential in source \u2014 caught at missed",
        "enabled": true
      },
      {
        "techniqueID": "T1195",
        "score": 1,
        "color": "#f25c54",
        "comment": "Known-vulnerable dependency \u2014 caught at missed",
        "enabled": true
      },
      {
        "techniqueID": "T1078",
        "score": 1,
        "color": "#f25c54",
        "comment": "Debug mode + exposed internal endpoint \u2014 caught at missed",
        "enabled": true
      }
    ],
    "legendItems": [
      {
        "label": "pipeline",
        "color": "#2ea043"
      },
      {
        "label": "runtime",
        "color": "#d7a32b"
      },
      {
        "label": "missed",
        "color": "#f25c54"
      },
      {
        "label": "remediated",
        "color": "#4c9aff"
      }
    ]
  },
  "sigma_rules": [
    {
      "id": "sql_injection",
      "filename": "twin-sql-injection.yml",
      "rule": "title: Twin - SQL Injection (auth bypass)\nid: twin-sql-injection\nstatus: experimental\ndescription: Detects sql injection (auth bypass) exercised by the DevSecOps twin.\nreferences:\n  - https://attack.mitre.org/techniques/T1190/\ntags:\n  - attack.initial_access\n  - t1190\nlogsource:\n  product: application\n  service: twin-app\ndetection:\n  selection:\n    scenario: sql_injection\n  condition: selection\nlevel: high"
    },
    {
      "id": "leaked_credential",
      "filename": "twin-leaked-credential.yml",
      "rule": "title: Twin - Leaked credential in source\nid: twin-leaked-credential\nstatus: experimental\ndescription: Detects leaked credential in source exercised by the DevSecOps twin.\nreferences:\n  - https://attack.mitre.org/techniques/T1552/\ntags:\n  - attack.credential_access\n  - t1552.001\nlogsource:\n  product: application\n  service: twin-app\ndetection:\n  selection:\n    scenario: leaked_credential\n  condition: selection\nlevel: high"
    },
    {
      "id": "vulnerable_dependency",
      "filename": "twin-vulnerable-dependency.yml",
      "rule": "title: Twin - Known-vulnerable dependency\nid: twin-vulnerable-dependency\nstatus: experimental\ndescription: Detects known-vulnerable dependency exercised by the DevSecOps twin.\nreferences:\n  - https://attack.mitre.org/techniques/T1195/\ntags:\n  - attack.supply_chain\n  - t1195.001\nlogsource:\n  product: application\n  service: twin-app\ndetection:\n  selection:\n    scenario: vulnerable_dependency\n  condition: selection\nlevel: high"
    },
    {
      "id": "misconfiguration",
      "filename": "twin-misconfiguration.yml",
      "rule": "title: Twin - Debug mode + exposed internal endpoint\nid: twin-misconfiguration\nstatus: experimental\ndescription: Detects debug mode + exposed internal endpoint exercised by the DevSecOps twin.\nreferences:\n  - https://attack.mitre.org/techniques/T1078/\ntags:\n  - attack.misconfiguration\n  - t1078.001\nlogsource:\n  product: application\n  service: twin-app\ndetection:\n  selection:\n    scenario: misconfiguration\n  condition: selection\nlevel: medium"
    }
  ],
  "opa_policy": "package twin.config\n\n# Deny any production manifest that leaves debug enabled or exposes the\n# internal debug endpoint. This is the control that closes the misconfig gap.\n\ndeny[msg] {\n    input.services[name].environment[_] == \"APP_DEBUG=true\"\n    msg := sprintf(\"service %q must not run with APP_DEBUG=true in production\", [name])\n}\n\ndeny[msg] {\n    some route\n    input.routes[route] == \"/debug/config\"\n    msg := \"internal /debug/config endpoint must not be exposed in production\"\n}\n"
};
