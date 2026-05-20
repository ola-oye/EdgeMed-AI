import os
"""
repositories/device_repo.py
────────────────────────────
All SQL related to monitoring devices and patient assignments.
"""

from core.database     import get_monitoring_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc


class DeviceRepository:

    # ── DEVICES ───────────────────────────────────────────

    def get_or_create(self, device_id: str,
                      device_type: str | None = None) -> dict:
        """
        Returns the device record if it exists.
        Creates a minimal record if not — called automatically
        when the first reading from an unknown device arrives.
        """
        conn = get_monitoring_conn()
        row  = conn.execute(
            "SELECT * FROM devices WHERE id = ?", (device_id,)
        ).fetchone()

        if row:
            # Update last_seen_at
            conn.execute(
                "UPDATE devices SET last_seen_at = ? WHERE id = ?",
                (now_utc(), device_id)
            )
            conn.commit()
            conn.close()
            return row_to_dict(row)

        # First time we see this device — register it
        conn.execute("""
            INSERT INTO devices (id, device_type, last_seen_at)
            VALUES (?, ?, ?)
        """, (device_id, device_type, now_utc()))
        conn.commit()

        row = conn.execute(
            "SELECT * FROM devices WHERE id = ?", (device_id,)
        ).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_all(self) -> list[dict]:
        conn = get_monitoring_conn()
        rows = conn.execute(
            "SELECT * FROM devices ORDER BY registered_at DESC"
        ).fetchall()
        conn.close()
        return rows_to_list(rows)

    # ── ASSIGNMENTS ───────────────────────────────────────

    def get_active_patient(self, device_id: str) -> str | None:
        """
        Returns the patient_id currently assigned to this device.
        Returns None if the device is not assigned to any patient.
        This is called on every incoming reading.
        """
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT patient_id FROM device_assignments
            WHERE device_id = ? AND is_active = 1
            ORDER BY assigned_at DESC
            LIMIT 1
        """, (device_id,)).fetchone()
        conn.close()
        return row['patient_id'] if row else None

    def assign(self, device_id: str, patient_id: str,
               assigned_by: str | None = None) -> str:
        """
        Assigns a device to a patient.
        Closes any existing active assignment for this device first.
        """
        assignment_id = new_id()
        conn = get_monitoring_conn()

        # Close previous active assignment for this device if one exists
        conn.execute("""
            UPDATE device_assignments
            SET is_active = 0, unassigned_at = ?
            WHERE device_id = ? AND is_active = 1
        """, (now_utc(), device_id))

        # Create new assignment
        conn.execute("""
            INSERT INTO device_assignments
                (id, device_id, patient_id, assigned_by, assigned_at, is_active)
            VALUES (?,?,?,?,?,1)
        """, (assignment_id, device_id, patient_id, assigned_by, now_utc()))

        conn.commit()
        conn.close()
        return assignment_id

    def unassign(self, device_id: str,
                 unassigned_by: str | None = None) -> bool:
        """
        Closes the active assignment for a device.
        Returns True if an assignment was closed, False if none existed.
        """
        conn    = get_monitoring_conn()
        cursor  = conn.execute("""
            UPDATE device_assignments
            SET is_active = 0, unassigned_at = ?
            WHERE device_id = ? AND is_active = 1
        """, (now_utc(), device_id))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def get_assignment_for_device(self, device_id: str) -> dict | None:
        """Returns the current active assignment for a device."""
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT * FROM device_assignments
            WHERE device_id = ? AND is_active = 1
            ORDER BY assigned_at DESC LIMIT 1
        """, (device_id,)).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_all_assignments_with_details(self) -> list[dict]:
        """
        Returns all devices with their current assignment status,
        enriched with patient name and bed number.
        """
        import sqlite3
        from config import DB_MONITORING, DB_USERS

        db_mon   = os.path.abspath(DB_MONITORING)
        db_users = os.path.abspath(DB_USERS)
        conn = sqlite3.connect(db_mon)
        conn.row_factory = sqlite3.Row
        conn.execute(f"ATTACH DATABASE '{db_users}' AS users_db")

        rows = conn.execute("""
            SELECT
                d.id           AS device_id,
                d.device_type,
                d.last_seen_at,
                da.patient_id,
                da.assigned_by,
                da.assigned_at,
                p.full_name    AS patient_name,
                e.bed_number
            FROM devices d
            LEFT JOIN device_assignments da
                   ON da.device_id = d.id AND da.is_active = 1
            LEFT JOIN users_db.patients p
                   ON p.id = da.patient_id
            LEFT JOIN monitoring_enrollments e
                   ON e.patient_id = da.patient_id
                  AND e.monitoring_status = 'active'
            ORDER BY d.last_seen_at DESC
        """).fetchall()

        conn.execute("DETACH DATABASE users_db")
        conn.close()
        return rows_to_list(rows)
