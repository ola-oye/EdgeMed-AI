"""
models/device.py
─────────────────
Pydantic models for monitoring devices and patient assignments.

A device is identified by its hardware ID (MAC address or serial number).
It does NOT carry a patient_id — that link is made through an assignment.
"""

from __future__ import annotations
from typing     import Optional
from pydantic   import BaseModel, Field


class DeviceRecord(BaseModel):
    """
    A monitoring device as stored in the devices table.
    Registered automatically on first reading or manually by admin.
    """
    id:            str   # hardware ID — MAC address or serial number
    device_type:   Optional[str] = None   # 'oximeter', 'thermometer', etc.
    serial_number: Optional[str] = None
    last_seen_at:  Optional[str] = None
    registered_at: Optional[str] = None

    # Enriched field — current assignment if active
    current_patient_id:   Optional[str] = None
    current_patient_name: Optional[str] = None
    current_bed_number:   Optional[str] = None


class DeviceAssignment(BaseModel):
    """
    A record of a device assigned to a patient.
    One active assignment per device at any time.
    """
    id:             str
    device_id:      str
    patient_id:     str
    assigned_by:    Optional[str] = None
    assigned_at:    str
    unassigned_at:  Optional[str] = None
    is_active:      bool = True


class AssignDeviceRequest(BaseModel):
    """
    Request body for POST /api/devices/assign
    Assigns a device to a patient. Closes any previous
    active assignment for this device automatically.
    """
    device_id:   str = Field(description="Hardware ID of the monitoring device")
    patient_id:  str = Field(description="Patient to assign this device to")
    assigned_by: str = Field(description="User ID of the nurse making the assignment")


class UnassignDeviceRequest(BaseModel):
    """
    Request body for POST /api/devices/unassign
    Closes the current active assignment for a device.
    Called when a patient is discharged or the device is moved.
    """
    device_id:    str
    unassigned_by: str


class DeviceAssignmentResponse(BaseModel):
    """Response for device assignment/unassignment actions."""
    success:    bool = True
    device_id:  str
    patient_id: Optional[str] = None
    message:    Optional[str] = None
