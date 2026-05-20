"""
services/device_service.py
───────────────────────────
Device assignment business logic.
Manages the link between hardware devices and patients.
"""

from repositories import DeviceRepository
from models       import (
    DeviceAssignmentResponse,
    AssignDeviceRequest,
    UnassignDeviceRequest
)


class DeviceNotFoundError(Exception):
    pass


class PatientAlreadyMonitoredError(Exception):
    pass


class DeviceService:

    def __init__(self):
        self._devices = DeviceRepository()

    def assign(self, request: AssignDeviceRequest) -> DeviceAssignmentResponse:
        """
        Assigns a device to a patient.
        Automatically closes any previous assignment for this device.
        """
        # Ensure device record exists
        self._devices.get_or_create(request.device_id)

        self._devices.assign(
            device_id   = request.device_id,
            patient_id  = request.patient_id,
            assigned_by = request.assigned_by
        )

        return DeviceAssignmentResponse(
            device_id  = request.device_id,
            patient_id = request.patient_id,
            message    = f'Device {request.device_id} assigned to patient {request.patient_id}'
        )

    def unassign(self, request: UnassignDeviceRequest) -> DeviceAssignmentResponse:
        """Removes the active assignment for a device."""
        closed = self._devices.unassign(
            device_id     = request.device_id,
            unassigned_by = request.unassigned_by
        )

        if not closed:
            return DeviceAssignmentResponse(
                success   = False,
                device_id = request.device_id,
                message   = f'No active assignment found for device {request.device_id}'
            )

        return DeviceAssignmentResponse(
            device_id = request.device_id,
            message   = f'Device {request.device_id} unassigned'
        )

    def get_all_with_status(self) -> list[dict]:
        """Returns all known devices with their current assignment status."""
        return self._devices.get_all_assignments_with_details()

    def resolve_patient_for_device(self, device_id: str) -> str | None:
        """
        Returns the patient_id currently assigned to this device.
        Returns None if device is unassigned.
        Called by VitalsService on every incoming reading.
        """
        return self._devices.get_active_patient(device_id)
