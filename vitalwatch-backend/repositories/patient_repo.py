import os
"""
repositories/patient_repo.py
─────────────────────────────
All SQL related to patients and monitoring enrollments.

PatientRepository   — users.db patients table
EnrollmentRepository— monitoring.db monitoring_enrollments table
"""

from core.database  import get_users_conn, get_monitoring_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc


class PatientRepository:
    """
    Manages the central patient registry in users.db.
    Identity only — no ward or clinical data.
    """

    def insert(self, patient_id: str, full_name: str,
               age: int | None = None, gender: str | None = None) -> str:
        conn = get_users_conn()
        conn.execute(
            "INSERT INTO patients (id, full_name, age, gender) VALUES (?,?,?,?)",
            (patient_id, full_name.strip(), age, gender)
        )
        conn.commit()
        conn.close()
        return patient_id

    def get_by_id(self, patient_id: str) -> dict | None:
        conn   = get_users_conn()
        row    = conn.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()
        conn.close()
        return row_to_dict(row)

    def exists(self, patient_id: str) -> bool:
        return self.get_by_id(patient_id) is not None

    def get_all(self) -> list[dict]:
        conn = get_users_conn()
        rows = conn.execute("SELECT * FROM patients ORDER BY full_name").fetchall()
        conn.close()
        return rows_to_list(rows)


class EnrollmentRepository:
    """
    Manages monitoring enrollments in monitoring.db.
    Handles ward-specific information per patient.
    """

    def insert(self, patient_id: str, bed_number: str,
               ward_id: str | None = None,
               assigned_nurse_id: str | None = None,
               assigned_surgeon:  str | None = None,
               surgery_type:      str | None = None,
               surgery_at:        str | None = None) -> str:
        enrollment_id = new_id()
        conn = get_monitoring_conn()
        conn.execute("""
            INSERT INTO monitoring_enrollments
                (id, patient_id, bed_number, ward_id,
                 assigned_nurse_id, assigned_surgeon,
                 surgery_type, surgery_at)
            VALUES (?,?,?,?,?,?,?,?)
        """, (enrollment_id, patient_id, bed_number, ward_id,
              assigned_nurse_id, assigned_surgeon,
              surgery_type, surgery_at))
        conn.commit()
        conn.close()
        return enrollment_id

    def get_by_patient_id(self, patient_id: str) -> dict | None:
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT * FROM monitoring_enrollments
            WHERE patient_id = ? AND monitoring_status = 'active'
            ORDER BY enrolled_at DESC LIMIT 1
        """, (patient_id,)).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_all_active(self) -> list[dict]:
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT * FROM monitoring_enrollments
            WHERE monitoring_status = 'active'
            ORDER BY bed_number ASC
        """).fetchall()
        conn.close()
        return rows_to_list(rows)

    def update_status(self, patient_id: str, status: str):
        conn = get_monitoring_conn()
        conn.execute("""
            UPDATE monitoring_enrollments
            SET monitoring_status = ?,
                discharged_at = CASE WHEN ? = 'discharged' THEN datetime('now') ELSE discharged_at END
            WHERE patient_id = ? AND monitoring_status = 'active'
        """, (status, status, patient_id))
        conn.commit()
        conn.close()

    def get_with_identity(self, patient_id: str) -> dict | None:
        """
        Returns enrollment merged with patient identity.
        Uses absolute paths for ATTACH so the query works regardless
        of the working directory uvicorn is started from.
        """
        import sqlite3, os
        from config import DB_MONITORING, DB_USERS

        # Resolve to absolute paths
        db_mon   = os.path.abspath(DB_MONITORING)
        db_users = os.path.abspath(DB_USERS)

        conn = sqlite3.connect(db_mon)
        conn.row_factory = sqlite3.Row
        conn.execute(f"ATTACH DATABASE '{db_users}' AS users_db")

        row = conn.execute("""
            SELECT
                e.*,
                p.full_name,
                p.age,
                p.gender
            FROM monitoring_enrollments e
            LEFT JOIN users_db.patients p ON p.id = e.patient_id
            WHERE e.patient_id = ?
              AND e.monitoring_status = 'active'
            ORDER BY e.enrolled_at DESC
            LIMIT 1
        """, (patient_id,)).fetchone()

        conn.execute("DETACH DATABASE users_db")
        conn.close()
        return row_to_dict(row)

    def get_all_active_with_identity(self) -> list[dict]:
        """
        Returns all active enrollments merged with patient identity.
        Used by the ward overview endpoint.
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
                e.*,
                p.full_name,
                p.age,
                p.gender
            FROM monitoring_enrollments e
            LEFT JOIN users_db.patients p ON p.id = e.patient_id
            WHERE e.monitoring_status = 'active'
            ORDER BY e.bed_number ASC
        """).fetchall()

        conn.execute("DETACH DATABASE users_db")
        conn.close()
        return rows_to_list(rows)
