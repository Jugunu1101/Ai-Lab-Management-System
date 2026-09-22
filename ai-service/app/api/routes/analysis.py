from fastapi import APIRouter

from app.schemas.analysis import (
    AnalyzeSubmissionRequest,
    CodeAnalysisResponse
)

from app.services.code_analysis_service import (
    CodeAnalysisService
)


router = APIRouter(
    prefix="/ai",
    tags=["AI Analysis"]
)


analysis_service = CodeAnalysisService()


@router.post(
    "/analyze-submission",
    response_model=CodeAnalysisResponse
)
def analyze_submission(
    request: AnalyzeSubmissionRequest
):
    result = analysis_service.analyze(request)

    return result