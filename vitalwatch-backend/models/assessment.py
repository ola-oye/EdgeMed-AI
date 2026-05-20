"""
models/assessment.py
─────────────────────
Pydantic models for AI risk assessments.
"""

from __future__ import annotations
from typing     import Optional
from pydantic   import BaseModel


class ExplanationBullet(BaseModel):
    """One plain-English explanation bullet from the AI."""
    text:     str
    severity: str   # 'high' | 'moderate' | 'low'


class RiskAssessmentResult(BaseModel):
    """
    The output of one AI inference run.
    Produced by the inference engine, stored in risk_assessments table.
    """
    risk_level:           str                    # 'stable' | 'warning' | 'critical'
    confidence_score:     float
    explanation_bullets:  list[ExplanationBullet]
    suggested_action:     Optional[str]
    contributing_factors: dict[str, float]       # { 'Heart Rate': 34.2, ... }
    data_confidence:      str                    # 'full' | 'partial' | 'limited'
    assessed_at:          str


class RiskAssessmentRecord(BaseModel):
    """
    A risk assessment as stored in and returned from the database.
    """
    id:                   str
    patient_id:           str
    reading_id:           str
    risk_level:           str
    confidence_score:     float
    explanation_bullets:  list
    suggested_action:     Optional[str]
    contributing_factors: dict
    data_confidence:      Optional[str] = None
    assessed_at:          str
    created_at:           Optional[str] = None
