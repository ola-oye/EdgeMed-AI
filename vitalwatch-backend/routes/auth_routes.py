"""
routes/auth_routes.py
──────────────────────
Authentication HTTP endpoints.
Thin handlers — no business logic.
All logic delegated to AuthService.
"""

from fastapi    import APIRouter, HTTPException, Request, Response
from services   import AuthService, InvalidCredentialsError, SessionExpiredError
from models     import LoginRequest, LoginResponse, CreateUserRequest

router      = APIRouter(prefix='/api/auth', tags=['auth'])
_auth_svc   = AuthService()


def get_session_token(request: Request) -> str | None:
    return request.cookies.get('session_token')


def require_user(request: Request):
    """Dependency — returns current user or raises 401."""
    token = get_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        return _auth_svc.get_current_user(token)
    except SessionExpiredError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post('/login', response_model=LoginResponse)
def login(body: LoginRequest, response: Response):
    try:
        user, token = _auth_svc.login(body.email, body.password)
    except InvalidCredentialsError as e:
        raise HTTPException(status_code=401, detail=str(e))

    response.set_cookie(
        key='session_token', value=token,
        httponly=True, samesite='lax',
        max_age=60 * 60 * 12
    )
    return LoginResponse(user=user)


@router.get('/me')
def me(request: Request):
    return require_user(request)


@router.post('/logout')
def logout(request: Request, response: Response):
    token = get_session_token(request)
    if token:
        _auth_svc.logout(token)
    response.delete_cookie('session_token')
    return {'success': True}


@router.post('/users')
def create_user(body: CreateUserRequest, request: Request):
    """Admin only — creates a new staff account."""
    current = require_user(request)
    if current.role != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    user = _auth_svc.create_user(
        email          = body.email,
        name           = body.name,
        role           = body.role,
        plain_password = body.password
    )
    return user
