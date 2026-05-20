"""
services/alert_service.py
──────────────────────────
Alert business logic.

Rules:
  1. Stable reading → auto-resolve all open alerts for patient
  2. Warning/Critical → fire alert unless suppression window active
  3. Worsening severity → fire immediately regardless of suppression
  4. Suppress for configurable window after firing to prevent flooding
"""

from datetime        import datetime, timedelta
from repositories    import AlertRepository
from models          import (
    RiskAssessmentResult,
    AcknowledgeRequest,
    EscalateRequest,
    ResolveRequest,
    AlertActionResponse
)
from config          import SUPPRESSION_MINUTES, SEVERITY_RANK
from repositories.base import now_utc


class AlertNotFoundError(Exception):
    pass


class AlertService:

    def __init__(self):
        self._alerts = AlertRepository()

    # ── MAIN ENTRY ────────────────────────────────────────

    def process(self, patient_id: str, assessment_id: str,
                reading_id: str, result: RiskAssessmentResult) -> dict | None:
        """
        Evaluates whether an alert should fire given the new assessment.
        Returns the fired alert dict, or None if suppressed or stable.
        """
        risk = result.risk_level

        # Rule 1 — patient returned to stable, resolve everything
        if risk == 'stable':
            self._alerts.resolve_all_for_patient(patient_id)
            return None

        # Rule 2 & 3 — check suppression
        existing    = self._alerts.get_latest_by_severity(patient_id, risk)
        prev_sev    = self._alerts.get_latest_open_severity(patient_id)
        is_worsening = (
            prev_sev is not None and
            SEVERITY_RANK.get(risk, 0) > SEVERITY_RANK.get(prev_sev, 0)
        )

        if existing and not is_worsening:
            suppressed_until = existing.get('suppressed_until')
            if suppressed_until:
                until_dt = datetime.strptime(suppressed_until, '%Y-%m-%dT%H:%M:%S')
                if datetime.utcnow() < until_dt:
                    return None  # within suppression window

        # Fire the alert
        suppress_minutes = SUPPRESSION_MINUTES.get(risk, 30)
        suppressed_until = (
            datetime.utcnow() + timedelta(minutes=suppress_minutes)
        ).strftime('%Y-%m-%dT%H:%M:%S')

        trigger_vital, trigger_value, description = self._build_trigger(result)

        alert_id = self._alerts.insert(
            patient_id          = patient_id,
            risk_assessment_id  = assessment_id,
            reading_id          = reading_id,
            trigger_vital       = trigger_vital,
            trigger_value       = trigger_value,
            trigger_description = description,
            severity            = risk,
            suppressed_until    = suppressed_until
        )

        return self._alerts.get_by_id(alert_id)

    # ── NURSE ACTIONS ─────────────────────────────────────

    def acknowledge(self, alert_id: str,
                    request: AcknowledgeRequest) -> AlertActionResponse:
        alert = self._get_or_raise(alert_id)
        self._alerts.update_status(alert_id, 'acknowledged')
        self._alerts.insert_acknowledgement(
            alert_id        = alert_id,
            acknowledged_by = request.acknowledged_by,
            action_taken    = request.action_taken
        )
        return AlertActionResponse(alert_id=alert_id, timestamp=now_utc())

    def escalate(self, alert_id: str,
                 request: EscalateRequest) -> AlertActionResponse:
        self._get_or_raise(alert_id)
        self._alerts.update_status(alert_id, 'escalated')
        self._alerts.insert_acknowledgement(
            alert_id        = alert_id,
            acknowledged_by = request.escalated_by,
            action_taken    = request.note
        )
        return AlertActionResponse(alert_id=alert_id, timestamp=now_utc())

    def resolve(self, alert_id: str,
                request: ResolveRequest) -> AlertActionResponse:
        self._get_or_raise(alert_id)
        self._alerts.update_status(alert_id, 'resolved')
        self._alerts.insert_acknowledgement(
            alert_id        = alert_id,
            acknowledged_by = request.resolved_by,
            action_taken    = request.action_taken,
            resolved        = True
        )
        return AlertActionResponse(alert_id=alert_id, timestamp=now_utc())

    # ── QUERIES ───────────────────────────────────────────

    def get_feed(self, status: str | None = None,
                 severity: str | None = None,
                 patient_id: str | None = None,
                 limit: int = 50) -> list[dict]:
        return self._alerts.get_all_enriched(status, severity, patient_id, limit)

    def get_count_and_ward_status(self) -> dict:
        return self._alerts.get_count_and_ward_status()

    def get_history_for_patient(self, patient_id: str,
                                 limit: int = 20) -> list[dict]:
        return self._alerts.get_history_for_patient(patient_id, limit)

    # ── HELPERS ───────────────────────────────────────────

    def _get_or_raise(self, alert_id: str) -> dict:
        alert = self._alerts.get_by_id(alert_id)
        if not alert:
            raise AlertNotFoundError(f'Alert {alert_id} not found')
        return alert

    @staticmethod
    def _build_trigger(result: RiskAssessmentResult) -> tuple[str, float, str]:
        """Extract the most significant trigger from the assessment result."""
        if result.contributing_factors:
            top = max(result.contributing_factors, key=result.contributing_factors.get)
        else:
            top = 'Vitals'

        if result.explanation_bullets:
            desc = result.explanation_bullets[0].text
        else:
            desc = f'Risk level elevated to {result.risk_level}'

        return top, 0.0, desc
