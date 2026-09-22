# app/schemas/common.py
from pydantic import BaseModel


class AIMetadata(BaseModel):
    """Base model that injects AI traceability metadata into every AI response."""
    model: str
    promptVersion: str


class APIErrorResponse(BaseModel):
    """Standard error response wrapper for all AI service errors."""
    success: bool = False
    error: dict
