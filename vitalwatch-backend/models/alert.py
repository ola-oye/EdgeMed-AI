"""
models/alert.py
────────────────
Pydantic models for alerts and acknowledgements.
"""

from __future__ import annotations
from typing     import Optional
from pydantic   import BaseModel, Field


class AlertRecord(BaseModel):
    """An alert as stored in and returned from the database."""
    id:                  str
    patient_id:          str
    risk_assessment_id:  str
    reading_id:          str
    trigger_vital:       str
    trigger_value:       float
    trigger_description: str
    severity:            str    # 'warning' | 'critical'
    status:              str    # 'unacknowledged' | 'acknowledged' | 'escalated' | 'resolved'
    suppressed:          bool   = False
    suppressed_until:    Optional[str] = None
    triggered_at:        str
    created_at:          Optional[str] = None

    # Enriched fields — added when joining with patient data
    patient_name:        Optional[str] = None
    bed_number:          Optional[str] = None


class AlertCountResponse(BaseModel):
    """
    Response for GET /api/alerts/count
    Drives the bell badge and ward status bar color.
    """
    total:          int
    critical_count: int
    warning_count:  int
    ward_status:    str   # 'critical' | 'warning' | 'stable'


class AcknowledgeRequest(BaseModel):
    """Body for POST /api/alerts/{id}/acknowledge"""
    acknowledged_by: str
    action_taken:    Optional[str] = None


class EscalateRequest(BaseModel):
    """Body for POST /api/alerts/{id}/escalate"""
    escalated_by: str
    note:         Optional[str] = None


class ResolveRequest(BaseModel):
    """Body for POST /api/alerts/{id}/resolve"""
    resolved_by:  str
    action_taken: Optional[str] = None


class AlertActionResponse(BaseModel):
    """Generic response for alert action endpoints."""
    success:    bool = True
    alert_id:   str
    message:    Optional[str] = None
    timestamp:  Optional[str] = None
