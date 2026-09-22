from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generate_weekly_report():
    payload = {
        "classId": "class_999",
        "className": "CS101 - Algorithms",
        "language": "python",
        "weekStart": "2026-09-07T00:00:00Z",
        "weekEnd": "2026-09-13T23:59:59Z",
        "studentCount": 42,
        "averageScore": 68.4,
        "completionRate": 85.0,
        "topicAverages": [
            {"topic": "loops", "averageScore": 82.0},
            {"topic": "recursion", "averageScore": 44.5},
            {"topic": "arrays", "averageScore": 76.0}
        ],
        "atRiskStudents": [
            {
                "studentId": "student_123",
                "name": "Alex Smith",
                "weakTopics": ["recursion"],
                "averageScore": 42.0
            }
        ]
    }

    response = client.post(
        "/ai/generate-weekly-report",
        json=payload
    )

    assert response.status_code == 200

    data = response.json()

    assert "summary" in data
    assert "strongTopics" in data
    assert "weakTopics" in data
    assert "studentsNeedingAttention" in data
    assert "recommendations" in data
    assert "model" in data
    assert "promptVersion" in data
    assert data["promptVersion"] == "report_v1"
    assert isinstance(data["recommendations"], list)
    assert len(data["recommendations"]) > 0


def test_generate_report_legacy():
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
        ],
        "passed": 7,
        "failed": 3
    }

    response = client.post(
        "/ai/generate-report",
        json=payload
    )

    assert response.status_code == 200

    data = response.json()

    assert "overallScore" in data
    assert "strengths" in data
    assert "weaknesses" in data
    assert "summary" in data
    assert "recommendations" in data
    assert "model" in data
    assert "promptVersion" in data
