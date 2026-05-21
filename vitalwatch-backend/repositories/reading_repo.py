"""
repositories/reading_repo.py
─────────────────────────────
All SQL related to vital sign readings.
"""

from core.database     import get_monitoring_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc


class ReadingRepository:

    def insert(self, patient_id: str, device_id: str,
               heart_rate: float, spo2: float,
               respiration_rate: float, body_temperature: float,
               read_at: str) -> str:
        reading_id = new_id()
        conn = get_monitoring_conn()
        conn.execute("""
            INSERT INTO readings
                (id, patient_id, device_id,
                 heart_rate, spo2, respiration_rate, body_temperature,
                 read_at, received_at, is_simulated)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (reading_id, patient_id, device_id,
              heart_rate, spo2, respiration_rate, body_temperature,
              read_at, now_utc()))
        conn.commit()
        conn.close()
        return reading_id

    def get_latest(self, patient_id: str) -> dict | None:
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT * FROM readings
            WHERE patient_id = ?
            ORDER BY read_at DESC
            LIMIT 1
        """, (patient_id,)).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_recent_for_inference(self, patient_id: str, limit: int = 4) -> list[dict]:
        """
        Returns the last N readings oldest-first.
        Used to build rolling features for AI inference.
        """
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT * FROM readings
            WHERE patient_id = ?
            ORDER BY read_at DESC
            LIMIT ?
        """, (patient_id, limit)).fetchall()
        conn.close()
        return list(reversed(rows_to_list(rows)))

    def get_history(self, patient_id: str, minutes: int = 180) -> list[dict]:
        """
        Returns all readings within the last N minutes, oldest first.
        Used by the frontend trend charts.
        """
        conn = get_monitoring_conn()
        rows = conn.execute("""
            SELECT id, patient_id, device_id,
                   heart_rate, spo2, respiration_rate, body_temperature,
                   read_at
            FROM readings
            WHERE patient_id = ?
              AND read_at >= datetime('now', ? || ' minutes')
            ORDER BY read_at ASC
        """, (patient_id, f'-{minutes}')).fetchall()
        conn.close()
        return rows_to_list(rows)
