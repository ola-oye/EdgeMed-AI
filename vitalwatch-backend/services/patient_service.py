"""
services/patient_service.py
────────────────────────────
Patient management and ward overview queries.
"""

from repositories        import (
    PatientRepository, EnrollmentRepository,
    ReadingRepository, AssessmentRepository
)
from repositories.alert_repo import AlertRepository
from models                  import (
    PatientRegistration,
    EnrollmentRequest,
    PatientStatusResponse,
    MonitoringEnrollment
)
from repositories.base       import new_id


class PatientAlreadyExistsError(Exception):
    pass


class PatientNotFoundError(Exception):
    pass


class PatientService:

    def __init__(self):
        self._patients     = PatientRepository()
        self._enrollments  = EnrollmentRepository()
        self._readings     = ReadingRepository()
        self._assessments  = AssessmentRepository()
        self._alerts       = AlertRepository()

    # ── REGISTRATION ──────────────────────────────────────

    def register(self, request: PatientRegistration) -> dict:
        """
        Registers a new patient in the central registry.
        Raises PatientAlreadyExistsError if ID already taken.
        """
        if self._patients.exists(request.patient_id):
            raise PatientAlreadyExistsError(
                f'Patient {request.patient_id} is already registered'
            )
        self._patients.insert(
            patient_id = request.patient_id,
            full_name  = request.full_name,
            age        = request.age,
            gender     = request.gender
        )
        return self._patients.get_by_id(request.patient_id)

    def enroll(self, request: EnrollmentRequest) -> dict:
        """
        Enrolls a registered patient in monitoring.
        Patient must already exist in the central registry.
        """
        if not self._patients.exists(request.patient_id):
            raise PatientNotFoundError(
                f'Patient {request.patient_id} is not registered. '
                f'Register them first via POST /api/patients'
            )
        enrollment_id = self._enrollments.insert(
            patient_id        = request.patient_id,
            bed_number        = request.bed_number,
            ward_id           = request.ward_id,
            assigned_nurse_id = request.assigned_nurse_id,
            assigned_surgeon  = request.assigned_surgeon,
            surgery_type      = request.surgery_type,
            surgery_at        = request.surgery_at
        )
        return self._enrollments.get_by_patient_id(request.patient_id)

    # ── WARD OVERVIEW ─────────────────────────────────────

    def get_ward_overview(self) -> list[dict]:
        """
        Returns all active patients with their latest reading,
        assessment, and open alert severity.
        Used by the ward overview endpoint — polled or pushed via WS.
        """
        enrollments = self._enrollments.get_all_active_with_identity()
        result      = []

        for enrollment in enrollments:
            pid        = enrollment['patient_id']
            reading    = self._readings.get_latest(pid)
            assessment = self._assessments.get_latest(pid)
            alert_sev  = self._alerts.get_latest_open_severity(pid)

            result.append({
                'patient':             enrollment,
                'reading':             reading,
                'assessment':          assessment,
                'open_alert_severity': alert_sev
            })

        return result

    # ── PATIENT DETAIL ────────────────────────────────────

    def get_patient_status(self, patient_id: str) -> dict:
        """
        Full status for one patient.
        Used by the patient detail screen.
        """
        enrollment = self._enrollments.get_with_identity(patient_id)
        if not enrollment:
            raise PatientNotFoundError(f'Patient {patient_id} not found or not enrolled')

        return {
            'patient':             enrollment,
            'reading':             self._readings.get_latest(patient_id),
            'assessment':          self._assessments.get_latest(patient_id),
            'open_alert_severity': self._alerts.get_latest_open_severity(patient_id)
        }

    def get_reading_history(self, patient_id: str, minutes: int = 180) -> list[dict]:
        """Reading history for the trend charts."""
        return self._readings.get_history(patient_id, minutes)

    def get_or_create_for_device(self, patient_id: str) -> dict:
        """
        Returns patient enrollment, creating a placeholder if needed.
        Called when a simulator uses a patient_id directly.
        """
        if not self._patients.exists(patient_id):
            self._patients.insert(
                patient_id = patient_id,
                full_name  = f'Patient {patient_id[:8]}'
            )
        enrollment = self._enrollments.get_by_patient_id(patient_id)
        if not enrollment:
            self._enrollments.insert(
                patient_id = patient_id,
                bed_number = 'Unassigned'
            )
        return self._enrollments.get_by_patient_id(patient_id)
