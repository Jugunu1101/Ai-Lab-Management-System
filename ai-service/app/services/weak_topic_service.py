# app/services/weak_topic_service.py
from typing import List, Dict

from app.taxonomy.programming_topics import get_allowed_topics


# A topic is considered "weak" if mastery score is below this threshold
WEAK_TOPIC_THRESHOLD = 50


def detect_weak_topics(
    mastery: List[Dict[str, object]],
    language: str
) -> List[str]:
    """
    Deterministically identify weak topics from mastery data.

    Uses a simple threshold-based approach: any topic with a score
    below WEAK_TOPIC_THRESHOLD is considered weak.

    Only topics that exist in the predefined taxonomy for the given
    language are included in the result.

    Args:
        mastery: List of dicts with 'topic' (str) and 'score' (int) keys.
        language: Programming language to validate topics against.

    Returns:
        List of weak topic names, sorted by score ascending (weakest first).
    """
    allowed = get_allowed_topics(language)
    weak = []

    for item in mastery:
        topic = item.get("topic", "").lower()
        score = item.get("score", 0)

        if topic in allowed and score < WEAK_TOPIC_THRESHOLD:
            weak.append((topic, score))

    # Sort by score ascending so the weakest topics come first
    weak.sort(key=lambda x: x[1])

    return [topic for topic, _ in weak]


def filter_valid_topics(
    topics: List[str],
    language: str
) -> List[str]:
    """
    Filter a list of topic names, keeping only those present in the
    predefined taxonomy for the given language.
    """
    allowed = get_allowed_topics(language)
    return [t for t in topics if t.lower() in allowed]
