import os
"""
repositories/alert_repo.py
───────────────────────────
All SQL related to alerts and acknowledgements.
"""

from core.database     import get_monitoring_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc


class AlertRepository:

    # ── ALERTS ────────────────────────────────────────────

    def insert(self, patient_id: str, risk_assessment_id: str,
               reading_id: str, trigger_vital: str,
               trigger_value: float, trigger_description: str,
               severity: str, suppressed_until: str | None = None) -> str:
        alert_id = new_id()
        conn = get_monitoring_conn()
        conn.execute("""
            INSERT INTO alerts
                (id, patient_id, risk_assessment_id, reading_id,
                 trigger_vital, trigger_value, trigger_description,
                 severity, status, suppressed, suppressed_until, triggered_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (alert_id, patient_id, risk_assessment_id, reading_id,
              trigger_vital, trigger_value, trigger_description,
              severity, 'unacknowledged',
              int(suppressed_until is not None), suppressed_until,
              now_utc()))
        conn.commit()
        conn.close()
        return alert_id

    def get_by_id(self, alert_id: str) -> dict | None:
        conn = get_monitoring_conn()
        row  = conn.execute(
            "SELECT * FROM alerts WHERE id = ?", (alert_id,)
        ).fetchone()
        conn.close()
        return row_to_dict(row)

    def update_status(self, alert_id: str, status: str):
        conn = get_monitoring_conn()
        conn.execute(
            "UPDATE alerts SET status = ? WHERE id = ?",
            (status, alert_id)
        )
        conn.commit()
        conn.close()

    def get_open_for_patient(self, patient_id: str) -> list[dict]:
        """All unacknowledged or acknowledged (not resolved) alerts for a patient."""
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT * FROM alerts
            WHERE patient_id = ?
              AND status NOT IN ('resolved')
            ORDER BY triggered_at DESC
        """, (patient_id,)).fetchall()
        conn.close()
        return rows_to_list(rows)

    def get_latest_open_severity(self, patient_id: str) -> str | None:
        """
        Returns the most severe open alert level for a patient.
        Used to drive the status indicators on the ward overview.
        """
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT severity FROM alerts
            WHERE patient_id = ?
              AND status IN ('unacknowledged', 'acknowledged', 'escalated')
            ORDER BY CASE severity
                WHEN 'critical' THEN 0
                WHEN 'warning'  THEN 1
                ELSE 2
            END ASC
            LIMIT 1
        """, (patient_id,)).fetchone()
        conn.close()
        return row['severity'] if row else None

    def resolve_all_for_patient(self, patient_id: str):
        """Auto-resolve all open alerts when a patient returns to Stable."""
        conn = get_monitoring_conn()
        conn.execute("""
            UPDATE alerts
            SET status = 'resolved'
            WHERE patient_id = ?
              AND status IN ('unacknowledged', 'acknowledged', 'escalated')
        """, (patient_id,))
        conn.commit()
        conn.close()

    def get_latest_by_severity(self, patient_id: str, severity: str) -> dict | None:
        """Get the most recent alert of a given severity for a patient."""
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT * FROM alerts
            WHERE patient_id = ? AND severity = ?
            ORDER BY triggered_at DESC
            LIMIT 1
        """, (patient_id, severity)).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_all_enriched(self, status: str | None = None,
                         severity: str | None = None,
                         patient_id: str | None = None,
                         limit: int = 50) -> list[dict]:
        """
        Returns alerts enriched with patient name and bed number.
        Uses ATTACH to join across databases.
        """
        import sqlite3
        from config import DB_MONITORING, DB_USERS

        db_mon   = os.path.abspath(DB_MONITORING)
        db_users = os.path.abspath(DB_USERS)
        conn = sqlite3.connect(db_mon)
        conn.row_factory = sqlite3.Row
        conn.execute(f"ATTACH DATABASE '{db_users}' AS users_db")

        conditions = []
        params     = []

        if status:
            conditions.append("a.status = ?")
            params.append(status)
        if severity:
            conditions.append("a.severity = ?")
            params.append(severity)
        if patient_id:
            conditions.append("a.patient_id = ?")
            params.append(patient_id)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        rows = conn.execute(f"""
            SELECT
                a.*,
                p.full_name  AS patient_name,
                e.bed_number AS bed_number
            FROM alerts a
            LEFT JOIN users_db.patients p    ON p.id = a.patient_id
            LEFT JOIN monitoring_enrollments e
                   ON e.patient_id = a.patient_id
                  AND e.monitoring_status = 'active'
            {where}
            ORDER BY
                CASE a.status
                    WHEN 'unacknowledged' THEN 0
                    WHEN 'acknowledged'   THEN 1
                    WHEN 'escalated'      THEN 2
                    ELSE 3
                END ASC,
                a.triggered_at DESC
            LIMIT ?
        """, params).fetchall()

        conn.execute("DETACH DATABASE users_db")
        conn.close()
        return rows_to_list(rows)

    def get_count_and_ward_status(self) -> dict:
        """
        Returns unacknowledged count and overall ward status.
        Used by the bell badge and status bar.
        """
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT severity, COUNT(*) as count
            FROM alerts
            WHERE status = 'unacknowledged'
            GROUP BY severity
        """).fetchall()
        conn.close()

        counts = {r['severity']: r['count'] for r in rows}
        critical = counts.get('critical', 0)
        warning  = counts.get('warning',  0)
        total    = critical + warning

        ward_status = 'stable'
        if critical > 0:
            ward_status = 'critical'
        elif warning > 0:
            ward_status = 'warning'

        return {
            'total':          total,
            'critical_count': critical,
            'warning_count':  warning,
            'ward_status':    ward_status
        }

    # ── ACKNOWLEDGEMENTS ──────────────────────────────────

    def insert_acknowledgement(self, alert_id: str, acknowledged_by: str,
                                action_taken: str | None = None,
                                resolved: bool = False) -> str:
        ack_id = new_id()
        conn   = get_monitoring_conn()
        conn.execute("""
            INSERT INTO alert_acknowledgements
                (id, alert_id, acknowledged_by, action_taken,
                 resolved, resolved_at)
            VALUES (?,?,?,?,?,?)
        """, (ack_id, alert_id, acknowledged_by, action_taken,
              int(resolved),
              now_utc() if resolved else None))
        conn.commit()
        conn.close()
        return ack_id

    def get_history_for_patient(self, patient_id: str,
                                 limit: int = 20) -> list[dict]:
        """Alert history for the patient detail context drawer."""
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT
                a.id, a.patient_id, a.severity, a.status,
                a.trigger_description, a.triggered_at,
                ack.acknowledged_by, ack.action_taken, ack.acknowledged_at
            FROM alerts a
            LEFT JOIN alert_acknowledgements ack ON ack.alert_id = a.id
            WHERE a.patient_id = ?
            ORDER BY a.triggered_at DESC
            LIMIT ?
        """, (patient_id, limit)).fetchall()
        conn.close()
        return rows_to_list(rows)
