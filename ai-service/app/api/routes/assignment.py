from fastapi import APIRouter
from app.schemas.assignment import AssignmentGenerationRequest, AssignmentGenerationResponse
from app.services.assignment_service import generate_assignment

router = APIRouter(prefix="/ai", tags=["assignment"])

@router.post("/generate-assignment", response_model=AssignmentGenerationResponse)
def get_generated_assignment(request: AssignmentGenerationRequest):
    return generate_assignment(request)
