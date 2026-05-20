"""
models/patient.py
──────────────────
Pydantic models for patients.

Two distinct concepts:
  PatientIdentity     — who the person is (stored in users.db)
  MonitoringEnrollment— ward-specific info (stored in monitoring.db)
  PatientRegistration — request body for registering a new patient
  EnrollmentRequest   — request body for enrolling in monitoring
"""

from __future__ import annotations
from typing     import Optional
from pydantic   import BaseModel, Field, field_validator


class PatientRegistration(BaseModel):
    """
    Request body for POST /api/patients
    Registers a person in the central patient registry (users.db).
    Only patient_id and full_name are required.
    """
    patient_id: str = Field(description="Unique patient identifier")
    full_name:  str = Field(min_length=2, max_length=100)
    age:        Optional[int]  = Field(default=None, ge=0, le=130)
    gender:     Optional[str]  = Field(default=None, pattern='^(male|female|other)$')

    @field_validator('full_name')
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('full_name cannot be blank')
        return v.strip()


class PatientIdentity(BaseModel):
    """
    A patient as stored in users.db patients table.
    Identity only — no ward or clinical information.
    """
    id:         str
    full_name:  str
    age:        Optional[int] = None
    gender:     Optional[str] = None
    created_at: Optional[str] = None


class EnrollmentRequest(BaseModel):
    """
    Request body for POST /api/monitoring/enroll
    Enrolls a registered patient in post-surgery monitoring.
    """
    patient_id:        str
    bed_number:        str = Field(min_length=1, max_length=20)
    ward_id:           Optional[str] = None
    assigned_nurse_id: Optional[str] = None
    assigned_surgeon:  Optional[str] = None
    surgery_type:      Optional[str] = None
    surgery_at:        Optional[str] = None


class MonitoringEnrollment(BaseModel):
    """
    A patient's monitoring enrollment as stored in monitoring.db.
    Combines identity (from users.db) with ward info.
    """
    patient_id:        str
    full_name:         Optional[str] = None
    age:               Optional[int] = None
    gender:            Optional[str] = None
    bed_number:        str
    ward_id:           Optional[str] = None
    assigned_nurse_id: Optional[str] = None
    assigned_surgeon:  Optional[str] = None
    surgery_type:      Optional[str] = None
    surgery_at:        Optional[str] = None
    monitoring_status: str = 'active'
    enrolled_at:       Optional[str] = None


class PatientStatusResponse(BaseModel):
    """
    Full patient status returned by GET /api/patients/{id}/status
    Combines enrollment, latest reading, latest assessment,
    and open alert severity into one response object.
    """
    patient:             MonitoringEnrollment
    reading:             Optional[dict] = None
    assessment:          Optional[dict] = None
    open_alert_severity: Optional[str]  = None
    message:             Optional[str]  = None
