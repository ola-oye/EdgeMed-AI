"""
core/security.py
─────────────────
Password hashing and session token generation.
Called only by AuthService — nothing else touches this.
"""

import secrets
import bcrypt
from config import BCRYPT_ROUNDS


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(BCRYPT_ROUNDS)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def generate_id() -> str:
    return secrets.token_hex(16)
