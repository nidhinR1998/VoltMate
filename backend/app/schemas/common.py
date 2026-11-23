"""
VoltMate Enterprise REST API Standards & Envelope Definitions
Follows JSend / OpenAPI Enterprise Specification:
{
    "success": true,
    "status_code": 200,
    "message": "Operation completed successfully.",
    "data": { ... },
    "errors": null,
    "meta": {
        "request_id": "req_...",
        "timestamp": "2026-11-14T09:00:00Z",
        "path": "/api/v1/...",
        "method": "GET",
        "version": "2.0.0",
        "process_time_ms": 14.5
    }
}
"""

from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Optional, List, Any, Dict
from datetime import datetime, timezone

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Detailed error object for specific fields or validation rules."""
    field: Optional[str] = Field(None, description="Request parameter or field path causing the error")
    message: str = Field(..., description="Human-readable explanation of the error")
    error_code: str = Field(default="VALIDATION_ERROR", description="Domain error code for client localization")
    input_value: Optional[Any] = Field(None, description="The invalid value supplied (omitted for sensitive fields)")


class APIResponseMeta(BaseModel):
    """Metadata attached to every API response for tracing and observability."""
    request_id: str = Field(..., description="Unique correlation identifier for log auditing")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of response generation"
    )
    path: Optional[str] = Field(None, description="API path requested")
    method: Optional[str] = Field(None, description="HTTP method requested")
    version: str = Field(default="2.0.0", description="VoltMate API specification version")
    process_time_ms: Optional[float] = Field(None, description="Server processing latency in milliseconds")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized top-level REST API Envelope."""
    success: bool = Field(..., description="True if the request succeeded; False if an error occurred")
    status_code: int = Field(default=200, description="HTTP status code")
    code: Optional[str] = Field(default=None, description="Standardized machine error code")
    message: str = Field(default="Success", description="Summary status message")
    detail: Optional[str] = Field(default=None, description="FastAPI-compatible detail summary")
    data: Optional[T] = Field(default=None, description="Primary payload data")
    errors: Optional[List[ErrorDetail]] = Field(default=None, description="List of granular errors if request failed")
    details: Optional[List[ErrorDetail]] = Field(default=None, description="Standardized error details alias")
    requestId: Optional[str] = Field(default=None, description="Unique request correlation ID")
    meta: Optional[APIResponseMeta] = Field(default=None, description="Request tracking metadata")

    @classmethod
    def ok(cls, data: T, message: str = "Success", status_code: int = 200, meta: Optional[APIResponseMeta] = None):
        return cls(
            success=True,
            status_code=status_code,
            code="OK",
            message=message,
            data=data,
            errors=None,
            details=None,
            requestId=meta.request_id if meta else None,
            meta=meta
        )

    @classmethod
    def created(cls, data: T, message: str = "Resource created successfully", meta: Optional[APIResponseMeta] = None):
        return cls(
            success=True,
            status_code=201,
            code="CREATED",
            message=message,
            data=data,
            errors=None,
            details=None,
            requestId=meta.request_id if meta else None,
            meta=meta
        )

    @classmethod
    def fail(
        cls,
        message: str,
        status_code: int = 400,
        errors: Optional[List[ErrorDetail]] = None,
        meta: Optional[APIResponseMeta] = None
    ):
        err_list = errors or []
        first_code = err_list[0].error_code if err_list else f"ERR_HTTP_{status_code}"
        return cls(
            success=False,
            status_code=status_code,
            code=first_code,
            message=message,
            detail=message,
            data=None,
            errors=err_list,
            details=err_list,
            requestId=meta.request_id if meta else None,
            meta=meta
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized Envelope for Paginated Resource Collections."""
    items: List[T] = Field(default_factory=list, description="List of items for current page")
    total_count: int = Field(..., description="Total matching records across all pages")
    page: int = Field(default=1, ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    total_pages: int = Field(..., description="Total number of pages available")
    has_next: bool = Field(..., description="True if next page exists")
    has_prev: bool = Field(..., description="True if previous page exists")

    @classmethod
    def create(cls, items: List[T], total_count: int, page: int = 1, page_size: int = 20):
        total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count > 0 else 1
        return cls(
            items=items,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )

