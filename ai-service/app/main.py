from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import (
    AIServiceError,
    AIResponseError
)
from app.api.router import api_router
from app.core.logging import logger, request_id_context
import uuid
import time
from collections import defaultdict

rate_limit_store = defaultdict(list)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Request Size Protection
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
            response = JSONResponse(
                status_code=413, 
                content={"detail": "Payload Too Large"}
            )
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "no-referrer"
            return response
            
    # 2. Rate Limiting for /ai/ endpoints
    path = request.url.path
    if path.startswith("/ai/"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        window_start = now - settings.AI_RATE_WINDOW_SECONDS
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip] if t > window_start
        ]
        
        if len(rate_limit_store[client_ip]) >= settings.AI_RATE_LIMIT:
            oldest = rate_limit_store[client_ip][0]
            retry_after = int((oldest + settings.AI_RATE_WINDOW_SECONDS) - now)
            if retry_after < 1:
                retry_after = 1
                
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"}
            )
            response.headers["Retry-After"] = str(retry_after)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "no-referrer"
            return response
            
        rate_limit_store[client_ip].append(now)

    response = await call_next(request)
    
    # 3. Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    
    return response


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request_id_context.set(request_id)
    
    start_time = time.time()
    logger.info("request_started", extra={"method": request.method, "path": request.url.path})
    
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("request_completed", extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms
        })
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.exception("request_failed_unhandled", extra={
            "method": request.method,
            "path": request.url.path,
            "status": 500,
            "duration_ms": duration_ms
        })
        raise exc


@app.exception_handler(AIServiceError)
async def ai_service_error_handler(
    request: Request,
    exc: AIServiceError
):
    logger.error("AI service error", extra={"error_detail": str(exc)})
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error": {
                "code": "AI_SERVICE_UNAVAILABLE",
                "message": "AI service is temporarily unavailable"
            }
        }
    )


@app.exception_handler(AIResponseError)
async def ai_response_error_handler(
    request: Request,
    exc: AIResponseError
):
    logger.error("AI response error", extra={"error_detail": str(exc)})
    return JSONResponse(
        status_code=502,
        content={
            "success": False,
            "error": {
                "code": "INVALID_AI_RESPONSE",
                "message": "AI returned an invalid response"
            }
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unexpected server error", extra={"error_detail": str(exc)})
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred"
            }
        }
    )


@app.get("/")
def root():
    return {
        "message": "AI Service is running"
    }


app.include_router(api_router)