from app.core.config import settings
from app.core.logging import logger
from app.prompts.assignment_v1 import build_assignment_prompt
from app.schemas.assignment import AssignmentGenerationRequest, AssignmentGenerationResponse
from app.services.ai_client import AIClient

def generate_assignment(request_data: AssignmentGenerationRequest) -> AssignmentGenerationResponse:
    prompt = build_assignment_prompt(request_data.model_dump())
    
    client = AIClient()
    
    logger.info("generating_assignment", extra={"student_id": request_data.studentId})
    
    response_json = client.generate(
        prompt=prompt,
        model=settings.AI_ANALYSIS_MODEL
    )
    
    return AssignmentGenerationResponse(**response_json)
