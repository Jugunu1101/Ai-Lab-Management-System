from fastapi import APIRouter

from app.schemas.learning_path import (
    LearningPathRequest,
    LearningPathResponse
)
from app.services.learning_path_service import (
    LearningPathService
)


router = APIRouter(
    prefix="/ai",
    tags=["AI Learning Path"]
)


learning_path_service = LearningPathService()


@router.post(
    "/generate-learning-path",
    response_model=LearningPathResponse
)
def generate_learning_path(
    request: LearningPathRequest
):
    return learning_path_service.generate(request)