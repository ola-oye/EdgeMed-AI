"""
models/auth.py
───────────────
Pydantic models for authentication.
"""

from __future__ import annotations
from typing     import Optional
from pydantic   import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Body for POST /api/auth/login"""
    email:    str = Field(description="Staff email address")
    password: str = Field(min_length=1)


class UserRecord(BaseModel):
    """
    A staff user as returned from the API.
    Password hash is never included in responses.
    """
    id:       str
    email:    str
    name:     str
    role:     str    # 'nurse' | 'doctor' | 'radiologist' | 'oncologist' | 'admin'
    initials: Optional[str] = None

    @property
    def is_monitoring_role(self) -> bool:
        return self.role in ('nurse', 'doctor')

    @property
    def is_cancer_role(self) -> bool:
        return self.role in ('radiologist', 'oncologist')


class CreateUserRequest(BaseModel):
    """
    Request body for POST /api/users (admin only)
    Creates a new staff account.
    """
    email:    str
    name:     str  = Field(min_length=2, max_length=100)
    role:     str  = Field(pattern='^(nurse|doctor|radiologist|oncologist|admin)$')
    password: str  = Field(min_length=8, description="Plain text — hashed before storage")


class LoginResponse(BaseModel):
    """Response for successful login."""
    success: bool = True
    user:    UserRecord


class SessionRecord(BaseModel):
    """A session token record."""
    id:             str
    user_id:        str
    token:          str
    created_at:     str
    expires_at:     str
    last_active_at: Optional[str] = None
    is_revoked:     bool = False
