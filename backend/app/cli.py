"""Standalone CLI: python -m app.cli run|report|reset"""
import sys
from .core import orchestrator, report as report_gen
from .config import settings

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "run"
    if cmd == "run":
        orchestrator.run(settings.REPORT_PATH)
    elif cmd == "report":
        report_gen.main(settings.REPORT_PATH, "docs/SECURITY_REPORT.md")
    else:
        print("usage: python -m app.cli run|report")

if __name__ == "__main__":
    main()
