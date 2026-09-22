from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseError
from app.prompts.quiz_v1 import build_quiz_prompt, PROMPT_VERSION
from app.schemas.quiz import (
    QuizRequest,
    QuizResponse
)
from app.services.ai_client import AIClient


class QuizService:

    def __init__(self):
        self.ai_client = AIClient()

    def generate(
        self,
        request: QuizRequest
    ) -> QuizResponse:

        prompt = build_quiz_prompt(request)

        ai_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_QUIZ_MODEL
        )

        # Inject model and prompt version metadata
        ai_response["model"] = settings.AI_QUIZ_MODEL
        ai_response["promptVersion"] = PROMPT_VERSION

        try:
            return QuizResponse(
                **ai_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned invalid quiz structure"
            ) from error