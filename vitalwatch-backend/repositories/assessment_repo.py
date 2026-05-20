"""
repositories/assessment_repo.py
─────────────────────────────────
All SQL related to AI risk assessments.
"""

from core.database     import get_monitoring_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc, to_json, from_json


class AssessmentRepository:

    def insert(self, patient_id: str, reading_id: str,
               risk_level: str, confidence_score: float,
               explanation_bullets: list, suggested_action: str | None,
               contributing_factors: dict, data_confidence: str,
               assessed_at: str) -> str:
        assessment_id = new_id()
        conn = get_monitoring_conn()
        conn.execute("""
            INSERT INTO risk_assessments
                (id, patient_id, reading_id,
                 risk_level, confidence_score,
                 explanation_bullets, suggested_action,
                 contributing_factors, data_confidence, assessed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (assessment_id, patient_id, reading_id,
              risk_level, confidence_score,
              to_json(explanation_bullets), suggested_action,
              to_json(contributing_factors), data_confidence, assessed_at))
        conn.commit()
        conn.close()
        return assessment_id

    def get_latest(self, patient_id: str) -> dict | None:
        conn = get_monitoring_conn()
        row  = conn.execute("""
            SELECT * FROM risk_assessments
            WHERE patient_id = ?
            ORDER BY assessed_at DESC
            LIMIT 1
        """, (patient_id,)).fetchone()
        conn.close()
        return self._deserialise(row_to_dict(row))

    def _deserialise(self, record: dict | None) -> dict | None:
        """Parse JSON fields back into Python objects."""
        if not record:
            return None
        record['explanation_bullets']  = from_json(record.get('explanation_bullets'),  [])
        record['contributing_factors'] = from_json(record.get('contributing_factors'), {})
        return record
