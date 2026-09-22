import json

from app.schemas.report import PerformanceReportRequest, WeeklyReportRequest


PROMPT_VERSION = "report_v1"


def build_report_prompt(
    request: PerformanceReportRequest
) -> str:

    mastery_data = [
        {
            "topic": item.topic,
            "score": item.score
        }
        for item in request.mastery
    ]

    return f"""
You are an AI programming performance analyst.

Create a performance report for a programming student.

PROGRAMMING LANGUAGE:
{request.language}

TOPIC MASTERY:
{json.dumps(mastery_data)}

WEAK TOPICS:
{json.dumps(request.weakTopics)}

TEST RESULTS:
Passed: {request.passed}
Failed: {request.failed}

RULES:

1. Calculate a realistic overall score from 0 to 100.
2. Identify strong topics.
3. Identify weak topics.
4. Give practical recommendations.
5. Use simple and clear language.
6. Use only information provided.
7. Return ONLY valid JSON.
8. Do not use markdown.

Return exactly this structure:

{{
  "overallScore": 0,
  "strengths": [
    "Strong topic"
  ],
  "weaknesses": [
    "Weak topic"
  ],
  "summary": "Short performance summary",
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}}
"""


def build_weekly_report_prompt(
    request: WeeklyReportRequest
) -> str:
    """Build prompt for class-level weekly report generation."""

    topic_data = []
    if request.topicAverages:
        topic_data = [
            {"topic": t.topic, "averageScore": t.averageScore}
            for t in request.topicAverages
        ]

    at_risk = []
    # Accept both atRiskStudents and studentsNeedingAttention from the request
    risk_list = request.atRiskStudents or request.studentsNeedingAttention or []
    for s in risk_list:
        entry = {"name": s.name}
        if s.reason:
            entry["reason"] = s.reason
        if s.weakTopics:
            entry["weakTopics"] = s.weakTopics
        if s.averageScore is not None:
            entry["averageScore"] = s.averageScore
        at_risk.append(entry)

    strong = json.dumps(request.strongTopics or [])
    weak = json.dumps(request.weakTopics or [])

    return f"""
You are an AI programming education analyst generating a weekly class report for a teacher.

CLASS INFORMATION:
Class Name: {request.className}
Week: {request.weekStart or "N/A"} to {request.weekEnd or "N/A"}
Student Count: {request.studentCount or "N/A"}
Average Score: {request.averageScore or request.averageSubmissionScore or "N/A"}

TOPIC PERFORMANCE:
{json.dumps(topic_data)}

STRONG TOPICS: {strong}
WEAK TOPICS: {weak}

AT-RISK STUDENTS:
{json.dumps(at_risk)}

RULES:

1. Provide a concise class performance summary.
2. Identify strong and weak topics for the class.
3. For each at-risk student, explain why they need attention.
4. Give actionable teaching recommendations.
5. Use only the data provided.
6. Return ONLY valid JSON.
7. Do not use markdown.

Return this exact structure:

{{
  "summary": "Class performance summary",
  "strongTopics": ["topic1"],
  "weakTopics": ["topic2"],
  "studentsNeedingAttention": [
    {{
      "name": "Student Name",
      "reason": "Why they need attention"
    }}
  ],
  "recommendations": [
    "Teaching recommendation 1",
    "Teaching recommendation 2"
  ]
}}
"""