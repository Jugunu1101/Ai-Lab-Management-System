from pydantic import BaseModel, Field
from typing import List, Optional

class AgentDecisionRequest(BaseModel):
    studentId: str
    mastery: List[dict] = []
    recentMistakes: List[str] = []
    recentQuizResults: List[dict] = []
    recentAssignments: List[dict] = []

class AgentDecisionResponse(BaseModel):
    action: str = Field(..., description="Must be one of: GENERATE_QUIZ, ASSIGN_PRACTICE, RECOMMEND_LEARNING_PATH, RECOMMEND_TOPIC, REANALYZE_SUBMISSION, UPDATE_MASTERY, GENERATE_FEEDBACK, NO_ACTION")
    targetTopics: List[str] = []
    difficulty: str = "medium"
    questionCount: int = 3
    reason: str
    confidence: float
