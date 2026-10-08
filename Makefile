.PHONY: up down demo attack score report reset scan test fe be clean logs
up:            ## build + start the full isolated twin
	docker compose up -d --build
demo: up       ## start everything, print URLs
	@echo "Console  http://localhost:8080"
	@echo "API      http://localhost:8080/api/report"
	@echo "Grafana  http://localhost:3000"
attack:        ## trigger a fresh scenario run via the API
	curl -s -X POST http://localhost:8080/api/run >/dev/null && echo "attack run complete"
score:         ## print current posture
	@curl -s http://localhost:8080/api/report | python3 -c "import json,sys;r=json.load(sys.stdin);print('score',r['score']['before'],'->',r['score']['after'])"
report:        ## regenerate the markdown security report
	cd backend && SCEN_DIR=../scenarios python -m app.cli run && python app/core/report.py --in /tmp/report.json --out ../docs/SECURITY_REPORT.md
reset:         ## reset & replay
	curl -s -X POST http://localhost:8080/api/reset >/dev/null && echo "reset done"
scan:          ## run shift-left scanners locally (needs trivy + gitleaks)
	-trivy fs --severity HIGH,CRITICAL --format json -o monitoring/evidence/trivy.json target-app || true
	-gitleaks detect --report-format json --report-path monitoring/evidence/gitleaks.json || true
test:          ## backend unit tests
	cd backend && SCEN_DIR=../scenarios python -m pytest tests/ -q
verify:        ## run BOTH test suites (backend + frontend)
	cd backend && SCEN_DIR=../scenarios python -m pytest tests/ -q
	cd frontend && npm test
be:            ## run backend locally
	cd backend && SCEN_DIR=../scenarios uvicorn app.main:app --reload --port 8000
fe:            ## run frontend dev server (proxies /api to :8000)
	cd frontend && npm run dev
down:
	docker compose down
clean: down
	docker compose down -v
