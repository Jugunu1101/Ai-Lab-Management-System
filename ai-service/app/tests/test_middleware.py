from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_request_id_generated_when_missing():
    response = client.get("/health")
    assert response.status_code == 200
    
    request_id = response.headers.get("x-request-id")
    assert request_id is not None
    # Verify it looks like a UUID (length check is a simple proxy)
    assert len(request_id) == 36

def test_request_id_preserved_when_provided():
    test_id = "test-request-123"
    response = client.get("/health", headers={"X-Request-ID": test_id})
    assert response.status_code == 200
    
    request_id = response.headers.get("x-request-id")
    assert request_id == test_id

def test_logging_does_not_break_existing_endpoints():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Service is running"}
    assert "x-request-id" in response.headers
