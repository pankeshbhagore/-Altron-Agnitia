"""
Sample application — the "production" service that the Digital Twin replicates.

This app is DELIBERATELY insecure by design, in the tradition of OWASP Juice Shop
and DVWA. It exists ONLY so the twin can demonstrate how attacks are caught (or
missed) by the DevSecOps pipeline and runtime monitoring. It binds to localhost
inside an isolated Docker network and must never be exposed to the internet.

Seeded weaknesses (each maps to a scenario in /scenarios):
  W1  SQL injection on /login            -> scenario 01
  W2  Hardcoded credential in source     -> scenario 02 (also flagged by gitleaks)
  W3  Known-vulnerable dependency        -> scenario 03 (flagged by Trivy)
  W4  Debug endpoint / misconfiguration  -> scenario 04
"""
import os
import sqlite3
from flask import Flask, request, jsonify

from db import get_db, init_db

app = Flask(__name__)

# --- W2: hardcoded credential (a DUMMY value; detected by gitleaks at build time) ---
# In a real breach this would be a live secret. Here it is inert and only serves
# to trip the secret scanner so we can show the pipeline gate working.
INTERNAL_API_KEY = "sk_live_DEADBEEF_this_is_a_fake_demo_key_0000"  # noqa

# --- W4: misconfiguration — debug flag driven by env, defaults ON in the twin ---
DEBUG_MODE = os.getenv("APP_DEBUG", "true").lower() == "true"


@app.route("/health")
def health():
    return jsonify(status="ok", debug=DEBUG_MODE)


@app.route("/login", methods=["POST"])
def login():
    """W1: classic string-concatenated SQL -> injectable."""
    data = request.get_json(force=True, silent=True) or {}
    user = data.get("username", "")
    pw = data.get("password", "")

    db = get_db()
    # VULNERABLE on purpose: user input is concatenated straight into the query.
    query = f"SELECT id, username, role FROM users WHERE username = '{user}' AND password = '{pw}'"
    try:
        row = db.execute(query).fetchone()
    except sqlite3.Error as e:
        return jsonify(ok=False, error=str(e)), 400

    if row:
        return jsonify(ok=True, user=dict(row))
    return jsonify(ok=False, error="invalid credentials"), 401


@app.route("/debug/config")
def debug_config():
    """W4: an internal endpoint that leaks config when debug is on."""
    if not DEBUG_MODE:
        return jsonify(error="not found"), 404
    # Leaks environment + the hardcoded key — exactly what an attacker pivots on.
    return jsonify(env=dict(os.environ), api_key=INTERNAL_API_KEY)


@app.route("/")
def index():
    return jsonify(service="twin-sample-app", version="1.0.0", endpoints=["/health", "/login", "/debug/config"])


if __name__ == "__main__":
    init_db()
    # Bound to 0.0.0.0 only inside the isolated compose network.
    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE)
