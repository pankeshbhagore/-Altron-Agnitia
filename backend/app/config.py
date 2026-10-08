"""Backend settings (env-overridable)."""
import os

class Settings:
    SCEN_DIR = os.getenv("SCEN_DIR")  # falls back to orchestrator default
    REPORT_PATH = os.getenv("REPORT_PATH", "/tmp/report.json")
    EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "/tmp/evidence")
    TARGET = os.getenv("TWIN_TARGET", "http://localhost:5000")
    CORS = os.getenv("CORS_ORIGINS", "*")

settings = Settings()
