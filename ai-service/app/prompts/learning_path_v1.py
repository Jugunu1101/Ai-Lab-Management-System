import json

from app.schemas.learning_path import LearningPathRequest


PROMPT_VERSION = "learning_path_v1"


def build_learning_path_prompt(
    request: LearningPathRequest
) -> str:

    mastery_data = [
        {
            "topic": item.topic,
            "score": item.score
        }
        for item in request.mastery
    ]

    return f"""
You are an AI programming tutor.

Create a personalized learning path for a student.

PROGRAMMING LANGUAGE:
{request.language}

TOPIC MASTERY:
{json.dumps(mastery_data)}

WEAK TOPICS:
{json.dumps(request.weakTopics)}

RULES:

1. Prioritize weak topics first.
2. Create a logical learning order.
3. Give practical activities for each topic.
4. Keep objectives clear and simple.
5. If student data is provided, use those topics. If student data is empty, generate a foundational beginner learning path (e.g., variables, basic I/O, loops).
6. Return ONLY valid JSON.
7. Do not use markdown.

Return this structure:

{{
  "title": "Engaging Title for the Learning Path",
  "summary": "Short personalized learning summary",
  "targetFocus": ["Topic 1", "Topic 2", "Topic 3"],
  "steps": [
    {{
      "step": 1,
      "topic": "topic name",
      "priority": "HIGH or MEDIUM or LOW",
      "estimatedTime": "30m",
      "objective": "What the student should learn",
      "suggestedActivity": "A single actionable activity description",
      "status": "IN_PROGRESS"
    }}
  ]
}}
"""