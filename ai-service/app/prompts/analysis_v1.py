import json

from app.schemas.analysis import AnalyzeSubmissionRequest


PROMPT_VERSION = "analysis_v1"


def build_analysis_prompt(
    request: AnalyzeSubmissionRequest
) -> str:

    assignment_topics = request.assignment.topics

    return f"""
You are an AI programming tutor analyzing a student's code submission.

Your task is to identify programming mistakes and provide useful learning feedback.

IMPORTANT RULES:

1. Analyze only the topics provided in ALLOWED_TOPICS.
2. Do not invent new topics.
3. Do not decide whether the code passed or failed.
4. Test results are the source of truth for correctness.
5. Give each allowed topic a mastery score from 0 to 100.
6. A score below 50 means the topic is weak.
7. Keep mistakes specific and educational.
8. Recommendations should be practical.
9. Return ONLY valid JSON.
10. Do not use markdown or code fences.

ALLOWED_TOPICS:
{json.dumps(assignment_topics)}

STUDENT SUBMISSION:

Language:
{request.assignment.language}

Code:
{request.submission.code}

TEST RESULTS:

Passed:
{request.testResults.passed}

Failed:
{request.testResults.failed}

Return this exact JSON structure:

{{
  "mastery": [
    {{
      "topic": "topic from ALLOWED_TOPICS",
      "score": 0
    }}
  ],
  "weakTopics": [],
  "mistakes": [],
  "recommendations": []
}}
"""