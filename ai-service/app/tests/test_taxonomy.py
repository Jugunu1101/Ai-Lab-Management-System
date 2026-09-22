from app.taxonomy.programming_topics import get_allowed_topics, validate_topic, TAXONOMY
from app.services.weak_topic_service import detect_weak_topics, WEAK_TOPIC_THRESHOLD


def test_taxonomy_common_topics():
    common_topics = set(TAXONOMY["common"])
    assert "loops" in common_topics
    assert "arrays" in common_topics
    assert "recursion" in common_topics

    # All languages inherit common topics
    python_topics = get_allowed_topics("python")
    for topic in common_topics:
        assert topic in python_topics

    js_topics = get_allowed_topics("javascript")
    for topic in common_topics:
        assert topic in js_topics


def test_taxonomy_language_specific():
    # Python-specific
    assert validate_topic("list-comprehensions", "python") is True
    assert validate_topic("list-comprehensions", "cpp") is False

    # C++-specific
    assert validate_topic("pointers-references", "cpp") is True
    assert validate_topic("pointers-references", "python") is False

    # Javascript-specific
    assert validate_topic("closures", "javascript") is True

    # Invalid topic
    assert validate_topic("non-existent-topic-xyz", "python") is False


def test_weak_topic_detection():
    mastery_data = [
        {"topic": "loops", "score": 40},
        {"topic": "arrays", "score": 85},
        {"topic": "recursion", "score": 30},
        {"topic": "strings", "score": 50},  # At threshold, not strictly below
        {"topic": "invalid-invented-topic", "score": 10},  # Should be rejected if not in taxonomy
    ]

    weak = detect_weak_topics(mastery_data, language="python")

    # Should detect loops (40) and recursion (30)
    assert "loops" in weak
    assert "recursion" in weak
    # Arrays (85) and strings (50) should not be weak
    assert "arrays" not in weak
    assert "strings" not in weak
    # Invalid topic should not be included
    assert "invalid-invented-topic" not in weak
