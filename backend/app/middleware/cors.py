"""
Dynamic CORS Middleware for NesVentory.

When CORS_ORIGINS is not configured (the default for self-hosted deployments),
this middleware reflects the requesting Origin back in Access-Control-Allow-Origin.
This is safe for a self-hosted app because:
  - Auth cookies use SameSite=strict, preventing cross-site cookie theft
  - The app is a single-origin deployment; legitimate browsers send the same host they loaded from

When CORS_ORIGINS IS configured, only explicitly listed origins are allowed.
"""
import logging
from typing import Callable, Sequence

from starlette.datastructures import Headers
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, PlainTextResponse
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
CORS_ALLOW_HEADERS = "Authorization, Content-Type, X-API-Key, X-Request-ID"
CORS_MAX_AGE = "600"


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    CORS middleware that works out-of-the-box for self-hosted deployments.

    Mode 1 - Reflect (no CORS_ORIGINS configured):
        Echoes the requesting Origin back, so any origin is allowed.
        Safe because HttpOnly SameSite=strict cookies prevent CSRF.

    Mode 2 - Allowlist (CORS_ORIGINS is set):
        Only explicitly listed origins are permitted. All others get no
        Access-Control-Allow-Origin header and the browser blocks them.
    """

    def __init__(self, app: ASGIApp, allowed_origins: Sequence[str] = ()) -> None:
        super().__init__(app)
        self.allowed_origins = list(allowed_origins)
        self.use_allowlist = bool(self.allowed_origins)

    def _is_origin_allowed(self, origin: str) -> bool:
        if not self.use_allowlist:
            return True  # reflect mode: allow everything
        return origin in self.allowed_origins

    def _build_cors_headers(self, origin: str) -> dict:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
            "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
            "Vary": "Origin",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")

        # No Origin header means same-origin or non-browser request; no CORS needed
        if not origin:
            return await call_next(request)

        # Handle preflight
        if request.method == "OPTIONS" and "access-control-request-method" in request.headers:
            if self._is_origin_allowed(origin):
                headers = self._build_cors_headers(origin)
                headers["Access-Control-Max-Age"] = CORS_MAX_AGE
                return PlainTextResponse("OK", status_code=200, headers=headers)
            else:
                logger.warning(f"CORS preflight blocked for origin: {origin}")
                return PlainTextResponse(
                    "Disallowed CORS origin", status_code=400
                )

        # Handle actual request
        response = await call_next(request)

        if self._is_origin_allowed(origin):
            cors_headers = self._build_cors_headers(origin)
            for key, value in cors_headers.items():
                response.headers[key] = value
        else:
            logger.warning(f"CORS request blocked for origin: {origin}")

        return response
