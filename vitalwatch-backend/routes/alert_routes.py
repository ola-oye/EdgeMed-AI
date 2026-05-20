"""
routes/alert_routes.py
───────────────────────
Alert HTTP endpoints.
Thin handlers — all logic in AlertService.
"""

from fastapi    import APIRouter, HTTPException, Query, Request
from services   import AlertService, AlertNotFoundError
from models     import AcknowledgeRequest, EscalateRequest, ResolveRequest
from routes.auth_routes import require_user

router     = APIRouter(prefix='/api/alerts', tags=['alerts'])
_alert_svc = AlertService()


@router.get('/count')
def get_alert_count(request: Request):
    require_user(request)
    return _alert_svc.get_count_and_ward_status()


@router.get('')
def get_alerts(
    request:    Request,
    status:     str | None = Query(default=None),
    severity:   str | None = Query(default=None),
    patient_id: str | None = Query(default=None),
    limit:      int        = Query(default=50, le=200)
):
    require_user(request)
    alerts = _alert_svc.get_feed(status, severity, patient_id, limit)
    return {'alerts': alerts, 'count': len(alerts)}


@router.get('/patient/{patient_id}')
def get_patient_alert_history(
    patient_id: str,
    request:    Request,
    limit:      int = Query(default=20, le=100)
):
    require_user(request)
    return {'alerts': _alert_svc.get_history_for_patient(patient_id, limit)}


@router.post('/{alert_id}/acknowledge')
def acknowledge_alert(alert_id: str, body: AcknowledgeRequest, request: Request):
    require_user(request)
    try:
        return _alert_svc.acknowledge(alert_id, body)
    except AlertNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post('/{alert_id}/escalate')
def escalate_alert(alert_id: str, body: EscalateRequest, request: Request):
    require_user(request)
    try:
        return _alert_svc.escalate(alert_id, body)
    except AlertNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post('/{alert_id}/resolve')
def resolve_alert(alert_id: str, body: ResolveRequest, request: Request):
    require_user(request)
    try:
        return _alert_svc.resolve(alert_id, body)
    except AlertNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
