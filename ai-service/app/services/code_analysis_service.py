from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseError
from app.prompts.analysis_v1 import build_analysis_prompt, PROMPT_VERSION
from app.schemas.analysis import (
    AnalyzeSubmissionRequest,
    CodeAnalysisResponse
)
from app.services.ai_client import AIClient


class CodeAnalysisService:

    def __init__(self):
        self.ai_client = AIClient()

    def analyze(
        self,
        request: AnalyzeSubmissionRequest
    ) -> CodeAnalysisResponse:

        prompt = build_analysis_prompt(request)

        parsed_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_ANALYSIS_MODEL
        )

        # Inject model and prompt version metadata
        parsed_response["model"] = settings.AI_ANALYSIS_MODEL
        parsed_response["promptVersion"] = PROMPT_VERSION

        try:
            validated_response = CodeAnalysisResponse(
                **parsed_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned an invalid response structure"
            ) from error

        self.validate_topics(
            validated_response,
            request.assignment.topics
        )

        return validated_response

    def validate_topics(
        self,
        response: CodeAnalysisResponse,
        allowed_topics: list[str]
    ) -> None:

        allowed = {
            topic.lower()
            for topic in allowed_topics
        }

        for mastery in response.mastery:
            if mastery.topic.lower() not in allowed:
                raise AIResponseError(
                    f"Unsupported topic: {mastery.topic}"
                )

        for topic in response.weakTopics:
            if topic.lower() not in allowed:
                raise AIResponseError(
                    f"Unsupported weak topic: {topic}"
                )