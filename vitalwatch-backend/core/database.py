"""
core/database.py
─────────────────
Database connection management and schema creation only.

Responsibilities:
  - Provide a connection factory for each database
  - Create all tables on startup (CREATE TABLE IF NOT EXISTS)
  - Nothing else — no SQL queries, no business logic

Two databases:
  users.db      — patient identity, staff accounts, sessions
  monitoring.db — readings, assessments, alerts, devices, enrollments
"""

import sqlite3
from config import DB_MONITORING, DB_USERS


# ─────────────────────────────────────────────
# CONNECTION FACTORIES
# ─────────────────────────────────────────────

def get_monitoring_conn() -> sqlite3.Connection:
    """
    Returns a connection to the monitoring database.
    row_factory set so rows are returned as dicts.
    """
    conn = sqlite3.connect(DB_MONITORING)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_users_conn() -> sqlite3.Connection:
    """
    Returns a connection to the shared users database.
    row_factory set so rows are returned as dicts.
    """
    conn = sqlite3.connect(DB_USERS)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def row_to_dict(row) -> dict | None:
    """Converts a sqlite3.Row to a plain dict. Returns None if row is None."""
    return dict(row) if row else None


def rows_to_list(rows) -> list[dict]:
    """Converts a list of sqlite3.Row objects to a list of dicts."""
    return [dict(r) for r in rows]


# ─────────────────────────────────────────────
# SCHEMA — USERS DATABASE
# ─────────────────────────────────────────────

_USERS_SCHEMA = """

    -- Central patient registry
    -- Identity only — no ward or clinical information
    CREATE TABLE IF NOT EXISTS patients (
        id          TEXT PRIMARY KEY,
        full_name   TEXT NOT NULL,
        age         INTEGER,
        gender      TEXT CHECK(gender IN ('male', 'female', 'other')),
        created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Staff user accounts
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('nurse','doctor','radiologist','oncologist','admin')),
        password_hash TEXT NOT NULL,
        is_active     INTEGER DEFAULT 1,
        created_at    TEXT DEFAULT (datetime('now'))
    );

    -- Login sessions
    CREATE TABLE IF NOT EXISTS sessions (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token          TEXT UNIQUE NOT NULL,
        created_at     TEXT DEFAULT (datetime('now')),
        expires_at     TEXT NOT NULL,
        last_active_at TEXT,
        is_revoked     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
"""


# ─────────────────────────────────────────────
# SCHEMA — MONITORING DATABASE
# ─────────────────────────────────────────────

_MONITORING_SCHEMA = """

    -- Ward-specific enrollment for a patient
    -- Links a patient from users.db to a bed and care team
    CREATE TABLE IF NOT EXISTS monitoring_enrollments (
        id                 TEXT PRIMARY KEY,
        patient_id         TEXT NOT NULL,
        bed_number         TEXT NOT NULL,
        ward_id            TEXT,
        assigned_nurse_id  TEXT,
        assigned_surgeon   TEXT,
        surgery_type       TEXT,
        surgery_at         TEXT,
        monitoring_status  TEXT DEFAULT 'active'
                               CHECK(monitoring_status IN ('active','paused','discharged')),
        enrolled_at        TEXT DEFAULT (datetime('now')),
        discharged_at      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_enrollments_patient
        ON monitoring_enrollments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_status
        ON monitoring_enrollments(monitoring_status);

    -- Known monitoring devices
    -- Registered automatically on first reading
    CREATE TABLE IF NOT EXISTS devices (
        id            TEXT PRIMARY KEY,
        device_type   TEXT,
        serial_number TEXT,
        last_seen_at  TEXT,
        registered_at TEXT DEFAULT (datetime('now'))
    );

    -- Device to patient assignments
    -- Only one active assignment per device at any time
    CREATE TABLE IF NOT EXISTS device_assignments (
        id            TEXT PRIMARY KEY,
        device_id     TEXT NOT NULL REFERENCES devices(id),
        patient_id    TEXT NOT NULL,
        assigned_by   TEXT,
        assigned_at   TEXT NOT NULL,
        unassigned_at TEXT,
        is_active     INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_device
        ON device_assignments(device_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_assignments_patient
        ON device_assignments(patient_id, is_active);

    -- Vital sign readings from devices
    CREATE TABLE IF NOT EXISTS readings (
        id               TEXT PRIMARY KEY,
        patient_id       TEXT NOT NULL,
        device_id        TEXT NOT NULL,
        heart_rate       REAL NOT NULL,
        spo2             REAL NOT NULL,
        respiration_rate REAL NOT NULL,
        body_temperature REAL NOT NULL,
        read_at          TEXT NOT NULL,
        received_at      TEXT DEFAULT (datetime('now')),
        is_simulated     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_readings_patient
        ON readings(patient_id, read_at DESC);

    -- AI risk assessments
    -- One per reading, stores full inference output
    CREATE TABLE IF NOT EXISTS risk_assessments (
        id                   TEXT PRIMARY KEY,
        patient_id           TEXT NOT NULL,
        reading_id           TEXT NOT NULL REFERENCES readings(id),
        risk_level           TEXT NOT NULL
                                 CHECK(risk_level IN ('stable','warning','critical')),
        confidence_score     REAL,
        explanation_bullets  TEXT,  -- JSON array
        suggested_action     TEXT,
        contributing_factors TEXT,  -- JSON object
        data_confidence      TEXT,  -- 'full' | 'partial' | 'limited'
        assessed_at          TEXT NOT NULL,
        created_at           TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_assessments_patient
        ON risk_assessments(patient_id, assessed_at DESC);

    -- Alerts fired by the alert engine
    CREATE TABLE IF NOT EXISTS alerts (
        id                  TEXT PRIMARY KEY,
        patient_id          TEXT NOT NULL,
        risk_assessment_id  TEXT NOT NULL REFERENCES risk_assessments(id),
        reading_id          TEXT NOT NULL REFERENCES readings(id),
        trigger_vital       TEXT NOT NULL,
        trigger_value       REAL NOT NULL,
        trigger_description TEXT NOT NULL,
        severity            TEXT NOT NULL CHECK(severity IN ('warning','critical')),
        status              TEXT NOT NULL DEFAULT 'unacknowledged'
                                CHECK(status IN ('unacknowledged','acknowledged','escalated','resolved')),
        suppressed          INTEGER DEFAULT 0,
        suppressed_until    TEXT,
        triggered_at        TEXT NOT NULL,
        created_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_patient
        ON alerts(patient_id, triggered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_status
        ON alerts(status);

    -- Audit trail for every action taken on an alert
    CREATE TABLE IF NOT EXISTS alert_acknowledgements (
        id               TEXT PRIMARY KEY,
        alert_id         TEXT NOT NULL REFERENCES alerts(id),
        acknowledged_by  TEXT NOT NULL,
        acknowledged_at  TEXT DEFAULT (datetime('now')),
        action_taken     TEXT,
        resolved         INTEGER DEFAULT 0,
        resolved_at      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ack_alert
        ON alert_acknowledgements(alert_id);
"""


# ─────────────────────────────────────────────
# INITIALISER
# ─────────────────────────────────────────────

def init_db():
    """
    Creates all tables in both databases if they do not exist.
    Safe to call every time the server starts — uses IF NOT EXISTS.
    Called by main.py on startup and by mqtt_subscriber.py on start.
    """
    # Users database
    conn = get_users_conn()
    conn.executescript(_USERS_SCHEMA)
    conn.commit()
    conn.close()

    # Monitoring database
    conn = get_monitoring_conn()
    conn.executescript(_MONITORING_SCHEMA)
    conn.commit()
    conn.close()

    print(f"[db] Initialised — {DB_USERS}, {DB_MONITORING}")
