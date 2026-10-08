"""API response schemas."""
from pydantic import BaseModel
from typing import Any

class Detection(BaseModel):
    stage: str; tool: str; severity: str; id: str | None = None
    target: str; detail: str | None = None

class Scenario(BaseModel):
    id: str; name: str; mitre: str; step: str; severity: str
    success: bool; stage: str; natural_stage: str; evidence: str
    detections: list[Detection] = []

class ScoreDelta(BaseModel):
    before: int; after: int; improvement: int
    grade_before: str; grade_after: str

class Posture(BaseModel):
    score: int; grade: str; rows: list[dict]
    caught_pipeline: int; caught_runtime: int; missed: int

class Coverage(BaseModel):
    pipeline: int; runtime: int; missed: int; total: int

class Report(BaseModel):
    generated_at: str; twin: str
    scenarios: list[Scenario]
    score: ScoreDelta
    posture_before: Posture
    posture_after: Posture
    attack_path: dict[str, Any]
    remediation: list[dict]
    coverage: Coverage

class AttackEvent(BaseModel):
    seq: int; ts: float; scenario: str; phase: str
    message: str; level: str = "info"
