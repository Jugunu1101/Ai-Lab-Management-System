from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_generate_quiz():
    payload = {
        "student": {
            "id": "student_123"
        },
        "topics": [
            "arrays",
            "loops"
        ],
        "language": "python",
        "difficulty": "medium",
        "questionCount": 2
    }

    response = client.post(
        "/ai/generate-quiz",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert len(data["questions"]) == 2
    assert "model" in data
    assert "promptVersion" in data
    assert data["promptVersion"] == "quiz_v1"

    for q in data["questions"]:
        assert len(q["options"]) == 4
        assert q["correctAnswer"] in ["A", "B", "C", "D"]
        assert "topic" in q
        assert "difficulty" in q
        assert "explanation" in q


def test_generate_quiz_variables_topic_specificity():
    payload = {
        "student": {"id": "student_variables"},
        "topics": ["variables"],
        "language": "cpp",
        "difficulty": "medium",
        "questionCount": 10
    }

    response = client.post(
        "/ai/generate-quiz",
        json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert len(data["questions"]) == 10

    for q in data["questions"]:
        assert len(q["options"]) == 4
        assert q["correctAnswer"] in ["A", "B", "C", "D"]
        text = f"{q['question']} {' '.join(q['options'])}"
        # Ensure no cross-topic array traversal time complexity questions bleed in
        assert "time complexity of traversing an array" not in text.lower()


def test_generate_quiz_all_topics():
    topics = ["variables", "loops", "arrays", "conditionals", "recursion", "logic", "syntax", "basics"]
    for t in topics:
        payload = {
            "topics": [t],
            "language": "cpp",
            "difficulty": "medium",
            "questionCount": 5
        }
        response = client.post("/ai/generate-quiz", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) == 5
