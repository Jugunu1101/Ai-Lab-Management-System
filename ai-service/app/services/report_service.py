from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseError
from app.prompts.report_v1 import (
    build_report_prompt,
    build_weekly_report_prompt,
    PROMPT_VERSION
)
from app.schemas.report import (
    PerformanceReportRequest,
    PerformanceReportResponse,
    WeeklyReportRequest,
    WeeklyReportResponse
)
from app.services.ai_client import AIClient


class ReportService:

    def __init__(self):
        self.ai_client = AIClient()

    def generate(
        self,
        request: PerformanceReportRequest
    ) -> PerformanceReportResponse:

        prompt = build_report_prompt(request)

        ai_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_REPORT_MODEL
        )

        # Inject model and prompt version metadata
        ai_response["model"] = settings.AI_REPORT_MODEL
        ai_response["promptVersion"] = PROMPT_VERSION

        try:
            return PerformanceReportResponse(
                **ai_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned invalid report structure"
            ) from error

    def generate_weekly(
        self,
        request: WeeklyReportRequest
    ) -> WeeklyReportResponse:

        prompt = build_weekly_report_prompt(request)

        ai_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_REPORT_MODEL
        )

        # Inject model and prompt version metadata
        ai_response["model"] = settings.AI_REPORT_MODEL
        ai_response["promptVersion"] = PROMPT_VERSION

        try:
            return WeeklyReportResponse(
                **ai_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned invalid weekly report structure"
            ) from error