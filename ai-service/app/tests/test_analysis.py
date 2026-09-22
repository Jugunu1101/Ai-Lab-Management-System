from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_analyze_submission():

    payload = {
        "student": {
            "id": "123"
        },
        "assignment": {
            "id": "456",
            "language": "python",
            "topics": [
                "arrays",
                "loops"
            ]
        },
        "submission": {
            "code": (
                "numbers = [1, 2, 3]\n"
                "for i in range(len(numbers) + 1):\n"
                "    print(numbers[i])"
            )
        },
        "testResults": {
            "passed": 2,
            "failed": 8,
            "total": 10,
            "errors": ["IndexError: list index out of range"]
        }
    }

    response = client.post(
        "/ai/analyze-submission",
        json=payload
    )

    assert response.status_code == 200

    data = response.json()

    assert "mastery" in data
    assert "weakTopics" in data
    assert "mistakes" in data
    assert "recommendations" in data
    # Traceability metadata per architecture section 17
    assert "model" in data
    assert "promptVersion" in data
    assert data["promptVersion"] == "analysis_v1"
    assert len(data["mastery"]) > 0
