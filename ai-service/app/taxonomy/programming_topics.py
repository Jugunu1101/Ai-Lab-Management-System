# app/taxonomy/programming_topics.py
from typing import Set, Dict, List


TAXONOMY: Dict[str, List[str]] = {
    "common": [
        "variables",
        "data-types",
        "operators",
        "conditionals",
        "loops",
        "functions",
        "arrays",
        "strings",
        "recursion",
        "sorting",
        "searching",
        "binary-search",
        "stacks-queues",
        "linked-lists",
        "trees",
        "graphs",
        "dynamic-programming",
        "bit-manipulation",
        "time-complexity",
    ],
    "python": [
        "list-comprehensions",
        "dictionaries",
        "tuples-sets",
        "file-io",
        "oop-classes",
        "lambda-functions",
    ],
    "javascript": [
        "objects",
        "es6-syntax",
        "callbacks-promises",
        "array-methods",
        "closures",
    ],
    "cpp": [
        "pointers-references",
        "stl-vectors",
        "stl-maps",
        "memory-management",
        "classes-inheritance",
    ],
    "java": [
        "oop-encapsulation",
        "oop-inheritance",
        "oop-polymorphism",
        "collections-framework",
        "exception-handling",
    ],
}


def get_allowed_topics(language: str) -> Set[str]:
    """Return the set of allowed topics for a given language (common + language-specific)."""
    lang = language.lower()
    allowed = set(TAXONOMY["common"])
    if lang in TAXONOMY:
        allowed.update(TAXONOMY[lang])
    return allowed


def validate_topic(topic: str, language: str) -> bool:
    """Check whether a topic is valid for the given language."""
    return topic.lower() in get_allowed_topics(language)
