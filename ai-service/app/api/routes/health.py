from fastapi import APIRouter

from app.core.config import settings


router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "aiMode": "mock" if settings.AI_MOCK_MODE else "openai"
    }