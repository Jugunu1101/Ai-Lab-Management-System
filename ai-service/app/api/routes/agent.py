from fastapi import APIRouter
from app.schemas.agent import AgentDecisionRequest, AgentDecisionResponse
from app.services.agent_service import decide_agent_action

router = APIRouter(prefix="/ai/agent", tags=["agent"])

@router.post("/decide", response_model=AgentDecisionResponse)
def get_agent_decision(request: AgentDecisionRequest):
    return decide_agent_action(request)
