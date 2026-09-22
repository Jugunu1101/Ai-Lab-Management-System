import json
import time

import httpx
from google import genai
from google.genai import errors

from app.core.config import settings
from app.core.exceptions import AIServiceError
from app.core.logging import logger, request_id_context


class AIClient:
    """Small, synchronous wrapper around the Google AI Studio Gemini API."""

    _RETRYABLE_STATUS_CODES = frozenset({408, 429, 500, 502, 503, 504})
    _JSON_RESPONSE_FORMAT = {
        "type": "text",
        "mime_type": "application/json",
        # Endpoint-specific Pydantic validation remains the source of truth for
        # the response shape. This schema asks Gemini to return a JSON object.
        "schema": {"type": "object"},
    }

    @property
    def mock_mode(self):
        return settings.AI_MOCK_MODE

    @mock_mode.setter
    def mock_mode(self, value):
        pass

    def __init__(self):
        # Google documents GOOGLE_API_KEY as taking precedence when both are
        # present, so mirror the native SDK's environment-variable behavior.
        api_key = settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY
        if not settings.AI_MOCK_MODE and not api_key:
            raise AIServiceError(
                "Gemini API key is missing. Set GEMINI_API_KEY (or GOOGLE_API_KEY), "
                "or enable AI_MOCK_MODE."
            )

        self.provider = "gemini"
        self.client = None
        if not settings.AI_MOCK_MODE:
            self.client = genai.Client(api_key=api_key)

    def generate(
        self,
        prompt: str,
        model: str,
    ) -> dict:
        if settings.AI_MOCK_MODE:
            return self._generate_mock_response(prompt)

        if self.client is None:
            raise AIServiceError("Gemini client is not initialized")

        attempts = 0
        max_attempts = max(1, settings.AI_MAX_RETRIES)
        req_id = request_id_context.get()

        while attempts < max_attempts:
            attempts += 1
            try:
                response = self.client.interactions.create(
                    model=model,
                    input=(
                        "You are a programming education AI. Always return a single "
                        "valid JSON object with no Markdown or extra prose.\n\n"
                        f"{prompt}"
                    ),
                    response_format=self._JSON_RESPONSE_FORMAT,
                    timeout=settings.AI_REQUEST_TIMEOUT,
                )
                content = self._clean_json_content(response.output_text)

                if attempts > 1:
                    logger.info(
                        "gemini_request_retry_success",
                        extra={
                            "model": model,
                            "attempt": attempts,
                            "request_id": req_id,
                        },
                    )

                return json.loads(content)

            except json.JSONDecodeError as error:
                raise AIServiceError("AI returned invalid JSON") from error

            except (errors.APIError, httpx.TimeoutException, httpx.NetworkError) as error:
                if not self._is_retryable_error(error):
                    logger.error(
                        "gemini_request_fatal_error",
                        extra={
                            "model": model,
                            "error_type": type(error).__name__,
                            "request_id": req_id,
                        },
                    )
                    raise AIServiceError("AI generation failed") from error

                logger.warning(
                    "gemini_request_failed",
                    extra={
                        "model": model,
                        "attempt": attempts,
                        "error_type": type(error).__name__,
                        "request_id": req_id,
                    },
                )

                if attempts >= max_attempts:
                    logger.error(
                        "gemini_request_exhausted",
                        extra={
                            "model": model,
                            "max_attempts": max_attempts,
                            "request_id": req_id,
                        },
                    )
                    raise AIServiceError("AI generation failed after retries") from error

                time.sleep(2**attempts)

        raise AIServiceError("AI generation failed after retries")

    @classmethod
    def _is_retryable_error(cls, error: Exception) -> bool:
        if isinstance(error, errors.APIError):
            return getattr(error, "code", None) in cls._RETRYABLE_STATUS_CODES

        return isinstance(error, (httpx.TimeoutException, httpx.NetworkError))

    @staticmethod
    def _clean_json_content(content: str | None) -> str:
        content = (content or "").strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def _generate_mock_response(
        self,
        prompt: str,
    ) -> dict:
        if "multiple-choice quiz" in prompt:
            import re

            match = re.search(r"Generate exactly (\d+) questions\.", prompt)
            count = int(match.group(1)) if match else 2

            base_questions = [
                {
                    "question": "Which Python loop is commonly used to iterate over a list?",
                    "options": [
                        "A) for",
                        "B) switch",
                        "C) goto",
                        "D) case",
                    ],
                    "correctAnswer": "A",
                    "explanation": "A for loop is commonly used to iterate through Python lists.",
                    "topic": "loops",
                    "difficulty": "medium",
                },
                {
                    "question": "What does range(3) produce?",
                    "options": [
                        "A) 0, 1, 2",
                        "B) 1, 2, 3",
                        "C) 0, 1, 2, 3",
                        "D) 1, 2",
                    ],
                    "correctAnswer": "A",
                    "explanation": "range(3) starts at 0 and stops before 3.",
                    "topic": "loops",
                    "difficulty": "medium",
                },
            ]

            questions = []
            for i in range(count):
                question = base_questions[i % len(base_questions)].copy()
                if i >= len(base_questions):
                    question["question"] = f"{question['question']} (Mock #{i + 1})"
                questions.append(question)

            return {"questions": questions}

        if "personalized learning path" in prompt:
            return {
                "learningPath": [
                    {
                        "step": 1,
                        "topic": "loops",
                        "objective": "Understand how loops repeat operations.",
                        "activities": [
                            "Practice for loops",
                            "Solve simple iteration problems",
                        ],
                    },
                    {
                        "step": 2,
                        "topic": "arrays",
                        "objective": "Learn how to work with collections of values.",
                        "activities": [
                            "Practice list indexing",
                            "Solve array traversal problems",
                        ],
                    },
                ],
                "summary": "Focus on weak topics first and build confidence through practice.",
            }

        if "weekly class report" in prompt:
            return {
                "summary": "Overall class progress is solid in iterative algorithms, but recursion remains a major bottleneck for 35% of the class.",
                "strongTopics": ["loops", "arrays"],
                "weakTopics": ["recursion"],
                "studentsNeedingAttention": [
                    {
                        "name": "Alex Smith",
                        "reason": "Consistently failing recursion test cases and scoring under 50% on daily quizzes.",
                    }
                ],
                "recommendations": [
                    "Dedicate the next lab session to visual call-stack debugging for recursion.",
                    "Assign pair-programming exercises breaking down divide-and-conquer logic.",
                ],
            }

        if "performance report" in prompt:
            return {
                "overallScore": 65,
                "strengths": ["Arrays"],
                "weaknesses": ["Loops"],
                "summary": "The student understands arrays but needs more practice with loops.",
                "recommendations": [
                    "Practice loop-based problems daily",
                    "Review list iteration examples",
                ],
            }

        return {
            "mastery": [{"topic": "arrays", "score": 75}, {"topic": "loops", "score": 40}],
            "weakTopics": ["loops"],
            "mistakes": [
                "Possible index out of range error",
                "Loop boundary is incorrect",
            ],
            "recommendations": [
                "Practice loop boundaries",
                "Check list indexes before accessing elements",
            ],
        }
