"""
Verify HS256 API JWTs minted by the Next.js `/api/auth/token` route.

Required environment variables (must match the frontend Auth.js setup):
  AUTH_SECRET   — shared signing secret (min 16 characters)
  AUTH_ISSUER   — optional, default: rag-app
  AUTH_AUDIENCE — optional, default: rag-api
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

logger = logging.getLogger(__name__)

WWW_AUTHENTICATE = {"WWW-Authenticate": "Bearer"}

# Do not auto-raise 403 when header missing; we emit 401 with a consistent body.
security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthSettings:
    secret: str
    algorithm: str
    issuer: str
    audience: str


_settings: Optional[AuthSettings] = None


def load_auth_settings() -> AuthSettings:
    """Load and cache auth settings; fails fast if AUTH_SECRET is missing or weak."""
    global _settings
    if _settings is not None:
        return _settings

    secret = os.environ.get("AUTH_SECRET", "").strip()
    if not secret:
        raise RuntimeError(
            "AUTH_SECRET environment variable is required for JWT verification. "
            "Set the same value as the Next.js AUTH_SECRET."
        )
    if len(secret) < 16:
        raise RuntimeError("AUTH_SECRET must be at least 16 characters.")

    _settings = AuthSettings(
        secret=secret,
        algorithm=os.environ.get("AUTH_JWT_ALGORITHM", "HS256").strip() or "HS256",
        issuer=os.environ.get("AUTH_ISSUER", "rag-app").strip() or "rag-app",
        audience=os.environ.get("AUTH_AUDIENCE", "rag-api").strip() or "rag-api",
    )
    return _settings


def _unauthorized(detail: str = "Invalid authentication credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers=WWW_AUTHENTICATE,
    )


def _extract_user_id(payload: Dict[str, Any]) -> str:
    """Derive tenant user id from verified claims (never from unsigned client input)."""
    for key in ("id", "userId", "user_id", "sub"):
        value = payload.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    raise _unauthorized("Token missing user identity claim")


def verify_access_token(token: str) -> str:
    """
    Validate JWT signature, expiration, issuer, and audience.
    Returns verified user_id for multi-tenant isolation.
    """
    settings = load_auth_settings()
    if not token or not token.strip():
        raise _unauthorized("Authentication required")

    try:
        payload = jwt.decode(
            token.strip(),
            settings.secret,
            algorithms=[settings.algorithm],
            audience=settings.audience,
            issuer=settings.issuer,
            options={
                "require": ["exp", "sub"],
                "verify_aud": True,
                "verify_iss": True,
            },
        )
    except ExpiredSignatureError as exc:
        logger.info("JWT rejected: expired")
        raise _unauthorized("Token expired") from exc
    except InvalidTokenError as exc:
        logger.warning("JWT rejected: invalid (%s)", exc)
        raise _unauthorized() from exc

    return _extract_user_id(payload)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """FastAPI dependency: require Bearer JWT and return verified user_id."""
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Authentication required")
    return verify_access_token(credentials.credentials)
