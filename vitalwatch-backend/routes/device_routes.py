"""
routes/device_routes.py
────────────────────────
Device management HTTP endpoints.
Thin handlers — all logic in DeviceService.
"""

from fastapi    import APIRouter, Request
from services   import DeviceService
from models     import AssignDeviceRequest, UnassignDeviceRequest
from routes.auth_routes import require_user

router     = APIRouter(prefix='/api/devices', tags=['devices'])
_device_svc = DeviceService()


@router.get('')
def get_devices(request: Request):
    """Returns all known devices with current assignment status."""
    require_user(request)
    return {'devices': _device_svc.get_all_with_status()}


@router.post('/assign')
def assign_device(body: AssignDeviceRequest, request: Request):
    require_user(request)
    return _device_svc.assign(body)


@router.post('/unassign')
def unassign_device(body: UnassignDeviceRequest, request: Request):
    require_user(request)
    return _device_svc.unassign(body)
