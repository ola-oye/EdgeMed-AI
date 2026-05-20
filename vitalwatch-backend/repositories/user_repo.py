"""
repositories/user_repo.py
──────────────────────────
All SQL related to staff users and login sessions.
"""

from core.database     import get_users_conn, row_to_dict, rows_to_list
from repositories.base import new_id, now_utc
from datetime          import datetime, timedelta
from config            import SESSION_MAX_AGE_HOURS


class UserRepository:

    def insert(self, user_id: str, email: str, name: str,
               role: str, password_hash: str) -> str:
        conn = get_users_conn()
        conn.execute("""
            INSERT INTO users (id, email, name, role, password_hash)
            VALUES (?,?,?,?,?)
        """, (user_id, email.lower().strip(), name, role, password_hash))
        conn.commit()
        conn.close()
        return user_id

    def get_by_email(self, email: str) -> dict | None:
        conn = get_users_conn()
        row  = conn.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1",
            (email.lower().strip(),)
        ).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_by_id(self, user_id: str) -> dict | None:
        conn = get_users_conn()
        row  = conn.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        ).fetchone()
        conn.close()
        return row_to_dict(row)

    def get_all(self) -> list[dict]:
        conn = get_users_conn()
        rows = conn.execute(
            "SELECT id, email, name, role, is_active, created_at FROM users ORDER BY name"
        ).fetchall()
        conn.close()
        return rows_to_list(rows)


class SessionRepository:

    def create(self, user_id: str, token: str) -> str:
        session_id = new_id()
        expires_at = (
            datetime.utcnow() + timedelta(hours=SESSION_MAX_AGE_HOURS)
        ).strftime('%Y-%m-%dT%H:%M:%S')

        conn = get_users_conn()
        conn.execute("""
            INSERT INTO sessions
                (id, user_id, token, expires_at, last_active_at)
            VALUES (?,?,?,?,?)
        """, (session_id, user_id, token, expires_at, now_utc()))
        conn.commit()
        conn.close()
        return session_id

    def get_by_token(self, token: str) -> dict | None:
        conn = get_users_conn()
        row  = conn.execute("""
            SELECT * FROM sessions
            WHERE token = ?
              AND is_revoked = 0
              AND expires_at > datetime('now')
        """, (token,)).fetchone()
        conn.close()
        return row_to_dict(row)

    def revoke(self, token: str):
        conn = get_users_conn()
        conn.execute(
            "UPDATE sessions SET is_revoked = 1 WHERE token = ?",
            (token,)
        )
        conn.commit()
        conn.close()

    def touch(self, token: str):
        """Update last_active_at to keep the session fresh."""
        conn = get_users_conn()
        conn.execute(
            "UPDATE sessions SET last_active_at = ? WHERE token = ?",
            (now_utc(), token)
        )
        conn.commit()
        conn.close()
