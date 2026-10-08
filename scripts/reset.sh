#!/usr/bin/env bash
# Reset & replay: tear down state, reseed DB, re-run scenarios deterministically.
set -e
echo "[reset] reseeding sample DB..."
docker compose exec -T app python db.py 2>/dev/null || (cd app && python db.py)
echo "[reset] replaying scenarios..."
cd "$(dirname "$0")/../engine" && python orchestrator.py --out ../dashboard/report.json
echo "[reset] done — posture report regenerated."
