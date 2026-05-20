"""
routes/patient_routes.py
─────────────────────────
Patient and ward overview HTTP endpoints.
Thin handlers — all logic in PatientService.
"""

from fastapi    import APIRouter, HTTPException, Query, Request
from services   import PatientService, PatientAlreadyExistsError, PatientNotFoundError
from models     import PatientRegistration, EnrollmentRequest
from routes.auth_routes import require_user

router      = APIRouter(prefix='/api', tags=['patients'])
_patient_svc = PatientService()


@router.post('/patients', status_code=201)
def register_patient(body: PatientRegistration, request: Request):
    require_user(request)
    try:
        return _patient_svc.register(body)
    except PatientAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post('/monitoring/enroll', status_code=201)
def enroll_patient(body: EnrollmentRequest, request: Request):
    require_user(request)
    try:
        return _patient_svc.enroll(body)
    except PatientNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get('/patients')
def get_ward_overview(request: Request):
    require_user(request)
    patients = _patient_svc.get_ward_overview()
    return {'patients': patients, 'count': len(patients)}


@router.get('/patients/{patient_id}/status')
def get_patient_status(patient_id: str, request: Request):
    require_user(request)
    try:
        return _patient_svc.get_patient_status(patient_id)
    except PatientNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get('/patients/{patient_id}/readings')
def get_reading_history(
    patient_id: str,
    request: Request,
    minutes: int = Query(default=180, le=1440)
):
    require_user(request)
    readings = _patient_svc.get_reading_history(patient_id, minutes)
    return {
        'patient_id':     patient_id,
        'readings':       readings,
        'count':          len(readings),
        'window_minutes': minutes
    }
