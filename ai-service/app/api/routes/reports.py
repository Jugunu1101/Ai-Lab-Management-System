from fastapi import APIRouter

from app.schemas.report import (
    PerformanceReportRequest,
    PerformanceReportResponse,
    WeeklyReportRequest,
    WeeklyReportResponse
)
from app.services.report_service import ReportService


router = APIRouter(
    prefix="/ai",
    tags=["AI Reports"]
)


report_service = ReportService()


@router.post(
    "/generate-weekly-report",
    response_model=WeeklyReportResponse
)
def generate_weekly_report(
    request: WeeklyReportRequest
):
    """Generate a class-level weekly performance report with AI analysis."""
    return report_service.generate_weekly(request)


@router.post(
    "/generate-report",
    response_model=PerformanceReportResponse
)
def generate_report(
    request: PerformanceReportRequest
):
    """Generate a single-student performance report (legacy endpoint)."""
    return report_service.generate(request)