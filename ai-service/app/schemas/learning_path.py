from pydantic import BaseModel, Field
from typing import List

from app.schemas.common import AIMetadata


class TopicMasteryInput(BaseModel):
    topic: str
    score: int = Field(ge=0, le=100)


class LearningPathRequest(BaseModel):
    studentId: str
    language: str
    mastery: List[TopicMasteryInput]
    weakTopics: List[str]


class LearningStep(BaseModel):
    step: int = Field(ge=1)
    topic: str
    priority: str
    estimatedTime: str
    objective: str
    suggestedActivity: str
    status: str


class LearningPathResponse(AIMetadata):
    title: str
    summary: str
    targetFocus: List[str]
    steps: List[LearningStep]