import json

from app.schemas.quiz import QuizRequest


PROMPT_VERSION = "quiz_v1"


def build_quiz_prompt(
    request: QuizRequest
) -> str:

    return f"""
You are an AI programming quiz generator.

Generate a multiple-choice quiz.

RULES:

1. Generate exactly {request.questionCount} questions.
2. Use only these topics:
   {json.dumps(request.topics)}
3. Programming language: {request.language}
4. Difficulty: {request.difficulty}
5. Each question must have exactly 4 options prefixed with "A) ", "B) ", "C) ", "D) ".
6. correctAnswer must be the letter of the correct option: "A", "B", "C", or "D".
7. Include the topic name and difficulty for each question.
8. Include a short explanation.
9. Return ONLY valid JSON.
10. Do not use markdown.

Return this exact structure:

{{
  "questions": [
    {{
      "question": "Question text",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4"
      ],
      "correctAnswer": "A",
      "explanation": "Short explanation",
      "topic": "topic name",
      "difficulty": "{request.difficulty}"
    }}
  ]
}}
"""