from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generate_learning_path():

    payload = {
        "studentId": "123",
        "language": "python",
        "mastery": [
            {
                "topic": "arrays",
                "score": 80
            },
            {
                "topic": "loops",
                "score": 40
            }
        ],
        "weakTopics": [
            "loops"
        ]
    }

    response = client.post(
        "/ai/generate-learning-path",
        json=payload
    )

    assert response.status_code == 200

    data = response.json()

    assert "steps" in data
    assert len(data["steps"]) > 0
    assert "summary" in data
    assert "model" in data
    assert "promptVersion" in data
    assert data["promptVersion"] == "learning_path_v1"
