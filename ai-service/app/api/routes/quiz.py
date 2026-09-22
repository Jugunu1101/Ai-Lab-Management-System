from fastapi import APIRouter

from app.schemas.quiz import (
    QuizRequest,
    QuizResponse
)
from app.services.quiz_service import QuizService


router = APIRouter(
    prefix="/ai",
    tags=["AI Quiz"]
)


quiz_service = QuizService()


@router.post(
    "/generate-quiz",
    response_model=QuizResponse
)
def generate_quiz(
    request: QuizRequest
):
    return quiz_service.generate(request)