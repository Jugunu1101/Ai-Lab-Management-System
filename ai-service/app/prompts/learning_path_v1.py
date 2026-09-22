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
5. Use only topics provided in the student data.
6. Return ONLY valid JSON.
7. Do not use markdown.

Return this structure:

{{
  "learningPath": [
    {{
      "step": 1,
      "topic": "topic name",
      "objective": "What the student should learn",
      "activities": [
        "Activity 1",
        "Activity 2"
      ]
    }}
  ],
  "summary": "Short personalized learning summary"
}}
"""