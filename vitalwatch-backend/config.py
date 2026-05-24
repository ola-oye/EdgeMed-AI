"""
config.py
─────────
Single source of truth for all configuration constants.
Import this file wherever a constant is needed.
Never hardcode values in any other file.

To change an environment (development → production):
change this file only.
"""

import os
from ML_models import rf_model_path, scaler_path, feature_cols_path

# ─────────────────────────────────────────────
# MQTT
# ─────────────────────────────────────────────
MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_TOPIC       = 'vitals/#'       # subscribes to vitals/{device_id}
MQTT_CLIENT_ID   = 'vitalwatch-edge-server'
MQTT_KEEPALIVE   = 60               # seconds

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
DB_MONITORING = os.getenv('DB_MONITORING', 'monitoring.db')
DB_USERS      = os.getenv('DB_USERS',      'users.db')

# ─────────────────────────────────────────────
# AI MODEL
# ─────────────────────────────────────────────
MODEL_PATH         = os.getenv('MODEL_PATH',         rf_model_path)
SCALER_PATH        = os.getenv('SCALER_PATH',        scaler_path)
FEATURE_COLS_PATH  = os.getenv('FEATURE_COLS_PATH',  feature_cols_path)
RISK_LABELS = {0: 'stable', 1: 'warning', 2: 'critical'}


# ─────────────────────────────────────────────
# ALERT SUPPRESSION
# How long (minutes) to wait before repeating
# the same alert severity for the same patient
# ─────────────────────────────────────────────
SUPPRESSION_MINUTES = {
    'warning':  30,
    'critical': 15
}

# Risk level severity rank — higher = more severe
SEVERITY_RANK = {
    'stable':   0,
    'warning':  1,
    'critical': 2
}

# ─────────────────────────────────────────────
# WEBSOCKET
# ─────────────────────────────────────────────
WS_HEARTBEAT_SECONDS = 25    # ping interval to keep connection alive
WS_MAX_CONNECTIONS   = 50    # maximum simultaneous browser connections

# ─────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────
SESSION_MAX_AGE_HOURS = 12
BCRYPT_ROUNDS         = 12   # cost factor for password hashing

# ─────────────────────────────────────────────
# VITAL SIGN NORMAL RANGES
# Used by inference feature engineering and
# by the frontend to display target ranges.
# (body_temperature in Fahrenheit)
# ─────────────────────────────────────────────
VITAL_NORMAL_RANGES = {
    'heart_rate':       {'low': 60,   'high': 100,  'unit': 'bpm',  'label': 'Heart Rate'},
    'spo2':             {'low': 95,   'high': 100,  'unit': '%',    'label': 'SpO₂'},
    'respiration_rate': {'low': 12,   'high': 20,   'unit': 'brpm', 'label': 'Respiration Rate'},
    'body_temperature': {'low': 97.5, 'high': 100.4,'unit': '°F',   'label': 'Body Temperature'},
}

# Physiologically possible bounds used for input validation
# Readings outside these are rejected as sensor errors
VITAL_BOUNDS = {
    'heart_rate':       {'min': 20,  'max': 300},
    'spo2':             {'min': 50,  'max': 100},
    'respiration_rate': {'min': 1,   'max': 60},
    'body_temperature': {'min': 90,  'max': 110},
}

# ─────────────────────────────────────────────
# SERVER
# ─────────────────────────────────────────────
SERVER_HOST = os.getenv('SERVER_HOST', '0.0.0.0')
SERVER_PORT = int(os.getenv('SERVER_PORT', 8000))

# Allowed CORS origins
# In production replace with the actual frontend URL
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
