from app.core.config import settings
from app.core.logging import logger
from app.prompts.agent_v1 import build_agent_prompt
from app.schemas.agent import AgentDecisionRequest, AgentDecisionResponse
from app.services.ai_client import AIClient

def decide_agent_action(request_data: AgentDecisionRequest) -> AgentDecisionResponse:
    prompt = build_agent_prompt(request_data.model_dump())
    
    client = AIClient()
    
    logger.info("requesting_agent_decision", extra={"student_id": request_data.studentId})
    
    response_json = client.generate(
        prompt=prompt,
        model=settings.AI_ANALYSIS_MODEL
    )
    
    return AgentDecisionResponse(**response_json)
