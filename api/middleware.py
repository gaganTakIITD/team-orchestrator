"""
middleware.py — FastAPI middleware: rate limiting, audit logging, CORS, error handling.
"""

import time
from collections import defaultdict
from datetime import datetime

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.security import audit_log
from src.utils import get_logger

logger = get_logger("api.middleware")


# ─── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter: max requests per minute per endpoint."""

    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)  # endpoint → [timestamps]

    async def dispatch(self, request: Request, call_next):
        endpoint = f"{request.method}:{request.url.path}"
        now = time.time()

        # Clean old timestamps
        self.requests[endpoint] = [
            ts for ts in self.requests[endpoint]
            if now - ts < self.window
        ]

        if len(self.requests[endpoint]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again shortly."},
            )

        self.requests[endpoint].append(now)

        response = await call_next(request)
        return response


# ─── Audit Middleware ─────────────────────────────────────────────────────────

class AuditMiddleware(BaseHTTPMiddleware):
    """Log every API request to the audit trail."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()

        try:
            response = await call_next(request)
            latency = int((time.time() - start) * 1000)

            audit_log("api_request", {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "latency_ms": latency,
                "success": response.status_code < 400,
            })

            return response

        except Exception as e:
            latency = int((time.time() - start) * 1000)
            audit_log("api_request", {
                "method": request.method,
                "path": request.url.path,
                "success": False,
                "error": str(e),
                "latency_ms": latency,
            })
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )


# ─── Error Handler ────────────────────────────────────────────────────────────

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return structured JSON errors."""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled error: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An unexpected error occurred",
                    "error_type": type(e).__name__,
                },
            )
