from pydantic import BaseModel, Field
from typing import List, Optional

from app.schemas.common import AIMetadata


# ---------- Request Schemas ----------

class Student(BaseModel):
    id: str


class Assignment(BaseModel):
    id: str
    language: str
    topics: List[str]


class Submission(BaseModel):
    code: str


class TestResults(BaseModel):
    passed: int = Field(ge=0)
    failed: int = Field(ge=0)
    total: Optional[int] = None
    errors: Optional[List[str]] = []


class AnalyzeSubmissionRequest(BaseModel):
    student: Student
    assignment: Assignment
    submission: Submission
    testResults: TestResults


# ---------- Response Schemas ----------

class TopicMastery(BaseModel):
    topic: str
    score: int = Field(ge=0, le=100)


class CodeAnalysisResponse(AIMetadata):
    mastery: List[TopicMastery]
    weakTopics: List[str]
    mistakes: List[str]
    recommendations: List[str]