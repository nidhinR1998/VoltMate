"""
VoltMate Enterprise Request Tracking & Global Exception Interceptors
Guarantees that every request (successful or failed, even 422/500) conforms
strictly to the VoltMate REST API JSON standard format.
"""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, List
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.schemas.common import ApiResponse, ErrorDetail, APIResponseMeta

logger = logging.getLogger("voltmate.api.middleware")


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Assigns every incoming HTTP request a distinct X-Request-ID,
    measures millisecond execution latency, and injects performance headers.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        req_id = request.headers.get("X-Request-ID") or f"vm_req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
        request.state.start_time = start_time

        try:
            response = await call_next(request)
        except Exception as exc:
            # Let the unhandled exception handler catch it, but compute process time
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"Unhandled exception on [{request.method}] {request.url.path} (ID: {req_id}, Latency: {duration}ms): {exc}", exc_info=True)
            raise exc

        duration = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time-Ms"] = str(duration)
        return response


def _build_meta(request: Request) -> APIResponseMeta:
    req_id = getattr(request.state, "request_id", f"vm_req_{uuid.uuid4().hex[:12]}")
    start = getattr(request.state, "start_time", None)
    duration = round((time.perf_counter() - start) * 1000, 2) if start else 0.0
    return APIResponseMeta(
        request_id=req_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        path=request.url.path,
        method=request.method,
        version="2.0.0",
        process_time_ms=duration
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Converts FastAPI/Pydantic validation errors (status 422) into standard VoltMate JSON response.
    """
    meta = _build_meta(request)
    errors: List[ErrorDetail] = []

    for err in exc.errors():
        loc = err.get("loc", [])
        # Extract field name from location path (e.g. ('body', 'energy_rate') -> 'energy_rate')
        field_name = ".".join(str(x) for x in loc if x not in ("body", "query", "path"))
        if not field_name and loc:
            field_name = str(loc[-1])

        msg = err.get("msg", "Invalid input value")
        # Strip out noisy pydantic prefixes if present
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "", 1)

        err_type = str(err.get("type", "VALIDATION_ERROR")).upper().replace(".", "_")
        
        # Don't echo sensitive fields back in input_value
        input_val = err.get("input")
        if any(sens in field_name.lower() for sens in ("password", "secret", "token", "key")):
            input_val = "[REDACTED]"

        errors.append(ErrorDetail(
            field=field_name or "request_body",
            message=msg,
            error_code=f"ERR_{err_type}",
            input_value=input_val
        ))

    field_count = len(errors)
    summary_msg = f"Request validation failed on {field_count} parameter{'s' if field_count != 1 else ''}."
    
    resp_obj = ApiResponse.fail(
        message=summary_msg,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        errors=errors,
        meta=meta
    )

    logger.warning(f"Validation failure on [{request.method}] {request.url.path} (ID: {meta.request_id}): {summary_msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=resp_obj.model_dump()
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Standardizes HTTP error responses (400, 401, 403, 404, 409, etc.).
    """
    meta = _build_meta(request)
    detail = exc.detail
    message = detail if isinstance(detail, str) else "HTTP Request Error"

    resp_obj = ApiResponse.fail(
        message=message,
        status_code=exc.status_code,
        errors=[ErrorDetail(
            field=None,
            message=message,
            error_code=f"ERR_HTTP_{exc.status_code}",
            input_value=None
        )],
        meta=meta
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=resp_obj.model_dump()
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches unhandled server exceptions, logs full trace, and returns safe 500 JSON without leaking system internals.
    """
    meta = _build_meta(request)
    logger.critical(f"CRITICAL 500 INTERNAL ERROR [ReqID: {meta.request_id}] on {request.method} {request.url.path}: {exc}", exc_info=True)

    resp_obj = ApiResponse.fail(
        message="An unexpected internal server error occurred. Our engineering telemetry has been notified.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        errors=[ErrorDetail(
            field=None,
            message="Internal Server Error",
            error_code="ERR_INTERNAL_500",
            input_value=None
        )],
        meta=meta
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=resp_obj.model_dump()
    )

