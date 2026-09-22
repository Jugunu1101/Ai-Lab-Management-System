import pytest
from fastapi.testclient import TestClient
import time
from unittest.mock import patch

from app.main import app
from app.core.config import settings
from app.main import rate_limit_store

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_rate_limits():
    rate_limit_store.clear()
    yield

def test_security_headers_present():
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "no-referrer"

def test_payload_too_large():
    # settings.MAX_REQUEST_BODY_BYTES = 1048576 (1MB)
    # The middleware checks Content-Length header
    headers = {"Content-Length": str(1048576 + 1)}
    response = client.post("/ai/generate-quiz", headers=headers, json={"some": "data"})
    assert response.status_code == 413
    assert response.json() == {"detail": "Payload Too Large"}
    assert response.headers.get("X-Content-Type-Options") == "nosniff"

def test_rate_limit_success_under_limit():
    settings.AI_RATE_LIMIT = 2
    settings.AI_RATE_WINDOW_SECONDS = 60
    
    payload = {
        "topics": ["arrays", "loops"],
        "language": "python",
        "difficulty": "medium",
        "questionCount": 2
    }
    
    # Request 1
    response = client.post("/ai/generate-quiz", json=payload)
    assert response.status_code == 200
    
    # Request 2
    response = client.post("/ai/generate-quiz", json=payload)
    assert response.status_code == 200

def test_rate_limit_exceeded():
    settings.AI_RATE_LIMIT = 2
    settings.AI_RATE_WINDOW_SECONDS = 60
    
    payload = {
        "topics": ["arrays", "loops"],
        "language": "python",
        "difficulty": "medium",
        "questionCount": 2
    }
    
    # Request 1
    client.post("/ai/generate-quiz", json=payload)
    # Request 2
    client.post("/ai/generate-quiz", json=payload)
    
    # Request 3 - should fail
    response = client.post("/ai/generate-quiz", json=payload)
    assert response.status_code == 429
    assert response.json() == {"detail": "Rate limit exceeded"}
    assert "Retry-After" in response.headers
    assert response.headers.get("X-Content-Type-Options") == "nosniff"

def test_health_not_rate_limited():
    settings.AI_RATE_LIMIT = 1
    settings.AI_RATE_WINDOW_SECONDS = 60
    
    # /health doesn't match /ai/*, so it shouldn't be rate limited
    client.get("/health")
    client.get("/health")
    response = client.get("/health")
    assert response.status_code == 200
