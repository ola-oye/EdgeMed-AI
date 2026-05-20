"""
repositories/base.py
─────────────────────
Shared utilities used by all repository classes.
"""

import json
import uuid
from datetime import datetime


def new_id() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


def now_utc() -> str:
    """Current UTC time as ISO 8601 string."""
    return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S')


def to_json(obj) -> str:
    """Serialise a Python object to a JSON string for storage."""
    return json.dumps(obj)


def from_json(s: str, fallback=None):
    """Deserialise a JSON string from storage. Returns fallback on error."""
    if not s:
        return fallback
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return fallback
