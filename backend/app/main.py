"""
Twin Console backend — FastAPI.

Serves the posture API, live attack stream, and remediation advisor. In the
container build it also serves the compiled frontend so the whole console is one
origin. Run locally:  uvicorn app.main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import report, attack, metrics, advanced

app = FastAPI(title="Twin Console API", version="1.0.0",
              description="DevSecOps Digital Twin — posture, attack stream, remediation")

app.add_middleware(CORSMiddleware,
                   allow_origins=[o.strip() for o in settings.CORS.split(",")],
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(report.router)
app.include_router(attack.router)
app.include_router(metrics.router)
app.include_router(advanced.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "twin-console", "target": settings.TARGET}


# Serve the built frontend if present (container build copies it to ./static)
_STATIC = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_STATIC):
    app.mount("/assets", StaticFiles(directory=os.path.join(_STATIC, "assets")), name="assets")

    @app.get("/")
    def spa_root():
        return FileResponse(os.path.join(_STATIC, "index.html"))

    @app.get("/{path:path}")
    def spa_catch(path: str):
        full = os.path.join(_STATIC, path)
        return FileResponse(full if os.path.isfile(full) else os.path.join(_STATIC, "index.html"))
