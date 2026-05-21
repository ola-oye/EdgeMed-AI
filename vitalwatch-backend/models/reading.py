"""
models/reading.py
──────────────────
Pydantic models for vital sign readings.

ReadingPayload  — what the MQTT device sends (device_id, not patient_id)
ReadingRecord   — what is stored in and returned from the database
"""

from __future__ import annotations
from math       import isfinite
from typing     import Optional
from pydantic   import BaseModel, Field, field_validator
from config     import VITAL_BOUNDS


class ReadingPayload(BaseModel):
    """
    Shape of the JSON published by the monitoring device via MQTT.
    Device identifies itself with device_id — NOT patient_id.
    The backend resolves which patient owns this device.

    All vital sign values are validated against physiologically
    possible bounds. Values outside these bounds are rejected
    as sensor errors before entering the pipeline.
    """
    device_id:        str
    heart_rate:       float = Field(
        gt=VITAL_BOUNDS['heart_rate']['min'],
        lt=VITAL_BOUNDS['heart_rate']['max'],
        description="Heart rate in beats per minute"
    )
    spo2:             float = Field(
        gt=VITAL_BOUNDS['spo2']['min'],
        lt=VITAL_BOUNDS['spo2']['max'],
        description="Blood oxygen saturation percentage"
    )
    respiration_rate: float = Field(
        gt=VITAL_BOUNDS['respiration_rate']['min'],
        lt=VITAL_BOUNDS['respiration_rate']['max'],
        description="Respiratory rate in breaths per minute"
    )
    body_temperature: float = Field(
        gt=VITAL_BOUNDS['body_temperature']['min'],
        lt=VITAL_BOUNDS['body_temperature']['max'],
        description="Body temperature in Fahrenheit"
    )
    read_at: Optional[str] = Field(
        default=None,
        description="ISO 8601 timestamp. Defaults to server time if omitted."
    )

    @field_validator('heart_rate', 'spo2', 'respiration_rate', 'body_temperature')
    @classmethod
    def must_be_finite(cls, v: float) -> float:
        if not isfinite(v):
            raise ValueError('vital sign value must be a finite number')
        return round(v, 1)

    model_config = {
        'json_schema_extra': {
            'example': {
                'device_id':        'OXI-3A:F2:C1',
                'heart_rate':       88.0,
                'spo2':             97.2,
                'respiration_rate': 16.0,
                'body_temperature': 98.6,
                'read_at':          '2024-11-15T14:32:00'
            }
        }
    }


class ReadingRecord(BaseModel):
    """
    A reading as stored in and returned from the database.
    """
    id:               str
    patient_id:       str
    device_id:        str
    heart_rate:       float
    spo2:             float
    respiration_rate: float
    body_temperature: float
    read_at:          str
    received_at:      Optional[str] = None
