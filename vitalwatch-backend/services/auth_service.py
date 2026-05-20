"""
services/auth_service.py
─────────────────────────
Authentication business logic.
Handles login, logout, session validation, and user creation.
"""

from repositories import UserRepository, SessionRepository
from models       import LoginResponse, UserRecord
from core         import security
from repositories.base import new_id


class InvalidCredentialsError(Exception):
    pass


class SessionExpiredError(Exception):
    pass


class AuthService:

    def __init__(self):
        self._users    = UserRepository()
        self._sessions = SessionRepository()

    # ── PUBLIC API ────────────────────────────────────────

    def login(self, email: str, password: str) -> tuple[UserRecord, str]:
        """
        Validates credentials. Returns (UserRecord, session_token) on success.
        Raises InvalidCredentialsError on failure.
        """
        user = self._users.get_by_email(email)

        if not user or not security.verify_password(password, user['password_hash']):
            raise InvalidCredentialsError('Invalid email or password')

        token = security.generate_session_token()
        self._sessions.create(user['id'], token)

        return self._to_user_record(user), token

    def get_current_user(self, token: str) -> UserRecord:
        """
        Returns the user for a valid session token.
        Raises SessionExpiredError if token is invalid or expired.
        """
        session = self._sessions.get_by_token(token)
        if not session:
            raise SessionExpiredError('Session not found or expired')

        user = self._users.get_by_id(session['user_id'])
        if not user:
            raise SessionExpiredError('User account not found')

        self._sessions.touch(token)
        return self._to_user_record(user)

    def logout(self, token: str):
        """Revokes the session token."""
        self._sessions.revoke(token)

    def create_user(self, email: str, name: str,
                    role: str, plain_password: str) -> UserRecord:
        """
        Creates a new staff account. Admin only.
        Password is hashed before storage — plain text never stored.
        """
        user_id       = new_id()
        password_hash = security.hash_password(plain_password)
        initials      = ''.join(w[0].upper() for w in name.split()[:2])

        self._users.insert(user_id, email, name, role, password_hash)
        return UserRecord(
            id       = user_id,
            email    = email,
            name     = name,
            role     = role,
            initials = initials
        )

    # ── HELPERS ───────────────────────────────────────────

    @staticmethod
    def _to_user_record(user: dict) -> UserRecord:
        initials = ''.join(w[0].upper() for w in user['name'].split()[:2])
        return UserRecord(
            id       = user['id'],
            email    = user['email'],
            name     = user['name'],
            role     = user['role'],
            initials = initials
        )
