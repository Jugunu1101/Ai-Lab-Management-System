from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseError
from app.prompts.learning_path_v1 import (
    build_learning_path_prompt,
    PROMPT_VERSION
)
from app.schemas.learning_path import (
    LearningPathRequest,
    LearningPathResponse
)
from app.services.ai_client import AIClient


class LearningPathService:

    def __init__(self):
        self.ai_client = AIClient()

    def generate(
        self,
        request: LearningPathRequest
    ) -> LearningPathResponse:

        prompt = build_learning_path_prompt(request)

        ai_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_LEARNING_PATH_MODEL
        )

        # Inject model and prompt version metadata
        ai_response["model"] = settings.AI_LEARNING_PATH_MODEL
        ai_response["promptVersion"] = PROMPT_VERSION

        try:
            return LearningPathResponse(
                **ai_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned invalid learning path structure"
            ) from error