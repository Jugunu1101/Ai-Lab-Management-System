import pytest
from app.schemas.assignment import AssignmentGenerationRequest, AssignmentGenerationResponse
from app.services.assignment_service import generate_assignment

@pytest.mark.parametrize("topic,language,difficulty", [
    ("loops", "c", "EASY"),
    ("loops", "cpp", "MEDIUM"),
    ("loops", "java", "EASY"),
    ("loops", "python", "HARD"),
    ("arrays", "cpp", "EASY"),
    ("recursion", "python", "EASY"),
    ("searching", "java", "MEDIUM"),
])
def test_generate_assignment_all_required_matrix(topic, language, difficulty):
    req = AssignmentGenerationRequest(
        topic=topic,
        targetTopics=[topic],
        language=language,
        difficulty=difficulty,
        questionCount=1,
    )
    res = generate_assignment(req)

    assert isinstance(res, AssignmentGenerationResponse)
    assert res.title is not None and len(res.title) > 0
    assert res.language.lower() == language.lower()
    assert res.difficulty.upper() == difficulty.upper()
    assert topic.lower() in [t.lower() for t in res.topics]
    assert res.problemStatement is not None and len(res.problemStatement) > 0
    assert res.starterCode is not None and len(res.starterCode) > 0
    assert len(res.testCases) >= 2

    # Check test cases format
    for tc in res.testCases:
        assert tc.input is not None
        assert tc.expectedOutput is not None

def test_duplicate_problem_exclusion():
    # If a title is excluded, AI should handle cleanly
    req = AssignmentGenerationRequest(
        topic="loops",
        language="cpp",
        difficulty="EASY",
        excludedTitles=["Sum of Even Numbers"]
    )
    res = generate_assignment(req)
    assert isinstance(res, AssignmentGenerationResponse)
    assert res.title is not None
