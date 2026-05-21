"""
services/vitals_service.py
───────────────────────────
The core pipeline service.
Processes every incoming device reading end to end.

Flow:
  ReadingPayload validated by Pydantic (at MQTT subscriber)
        ↓
  VitalsService.process_reading()
        ↓
  Resolve patient_id from device_id
        ↓
  Save reading to database
        ↓
  Run AI inference
        ↓
  Save assessment to database
        ↓
  Process alert logic
        ↓
  Return PipelineResult for WebSocket broadcast
"""

from repositories        import ReadingRepository, AssessmentRepository, DeviceRepository
from services.alert_service import AlertService
from core.inference      import inference_engine
from models              import ReadingPayload, RiskAssessmentResult
from repositories.base   import now_utc
from datetime            import datetime


class UnassignedDeviceError(Exception):
    """Raised when a device sends a reading but has no active patient assignment."""
    pass


class PipelineResult:
    """Returned by process_reading — used by WebSocket broadcast."""
    __slots__ = (
        'patient_id', 'reading_id', 'assessment_id',
        'risk_level', 'confidence_score', 'alert', 'device_id'
    )

    def __init__(self, patient_id, reading_id, assessment_id,
                 risk_level, confidence_score, alert, device_id):
        self.patient_id       = patient_id
        self.reading_id       = reading_id
        self.assessment_id    = assessment_id
        self.risk_level       = risk_level
        self.confidence_score = confidence_score
        self.alert            = alert
        self.device_id        = device_id

    def to_dict(self) -> dict:
        return {
            'type':             'patient_update',
            'patient_id':       self.patient_id,
            'reading_id':       self.reading_id,
            'assessment_id':    self.assessment_id,
            'risk_level':       self.risk_level,
            'confidence_score': self.confidence_score,
            'alert':            self.alert,
            'device_id':        self.device_id,
            'timestamp':        now_utc()
        }


class VitalsService:

    def __init__(self):
        self._readings    = ReadingRepository()
        self._assessments = AssessmentRepository()
        self._devices     = DeviceRepository()
        self._alerts      = AlertService()

    def process_reading(self, payload: ReadingPayload) -> PipelineResult:
        """
        Full pipeline for one incoming reading.
        All steps are sequential and transactional in intent —
        if inference fails, the reading is still saved.
        """

        # Step 1 — resolve patient from device
        patient_id = self._devices.get_active_patient(payload.device_id)

        if patient_id is None:
            # Auto-register unknown device so it appears in the device list
            self._devices.get_or_create(payload.device_id)
            raise UnassignedDeviceError(
                f'Device {payload.device_id} has no active patient assignment. '
                f'Assign it to a patient before readings will be processed.'
            )

        # Step 2 — resolve timestamp
        read_at = payload.read_at or now_utc()

        # Step 3 — fetch recent readings for inference context
        recent = self._readings.get_recent_for_inference(patient_id, limit=4)

        # Step 4 — save reading
        reading_id = self._readings.insert(
            patient_id       = patient_id,
            device_id        = payload.device_id,
            heart_rate       = payload.heart_rate,
            spo2             = payload.spo2,
            respiration_rate = payload.respiration_rate,
            body_temperature = payload.body_temperature,
            read_at          = read_at,
        )

        # Step 5 — run inference
        current_dict = {
            'heart_rate':       payload.heart_rate,
            'spo2':             payload.spo2,
            'respiration_rate': payload.respiration_rate,
            'body_temperature': payload.body_temperature
        }
        result: RiskAssessmentResult = inference_engine.predict(current_dict, recent)

        # Step 6 — save assessment
        assessment_id = self._assessments.insert(
            patient_id           = patient_id,
            reading_id           = reading_id,
            risk_level           = result.risk_level,
            confidence_score     = result.confidence_score,
            explanation_bullets  = [b.model_dump() for b in result.explanation_bullets],
            suggested_action     = result.suggested_action,
            contributing_factors = result.contributing_factors,
            data_confidence      = result.data_confidence,
            assessed_at          = result.assessed_at
        )

        # Step 7 — process alerts
        alert = self._alerts.process(
            patient_id    = patient_id,
            assessment_id = assessment_id,
            reading_id    = reading_id,
            result        = result
        )

        return PipelineResult(
            patient_id       = patient_id,
            reading_id       = reading_id,
            assessment_id    = assessment_id,
            risk_level       = result.risk_level,
            confidence_score = result.confidence_score,
            alert            = alert,
            device_id        = payload.device_id
        )
