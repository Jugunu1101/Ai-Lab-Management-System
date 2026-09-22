from pydantic import BaseModel, Field
from typing import List, Optional

from app.schemas.common import AIMetadata


# ---------- Legacy single-student report (backward compat) ----------

class TopicPerformance(BaseModel):
    topic: str
    score: int = Field(ge=0, le=100)


class PerformanceReportRequest(BaseModel):
    studentId: str
    language: str
    mastery: List[TopicPerformance]
    weakTopics: List[str]
    passed: int = Field(ge=0)
    failed: int = Field(ge=0)


class PerformanceReportResponse(AIMetadata):
    overallScore: int = Field(ge=0, le=100)
    strengths: List[str]
    weaknesses: List[str]
    summary: str
    recommendations: List[str]


# ---------- Weekly class-level report (architecture section 15 / ai-service.md section 5.5) ----------

class TopicAverage(BaseModel):
    topic: str
    averageScore: float = Field(ge=0, le=100)


class AtRiskStudent(BaseModel):
    studentId: Optional[str] = None
    name: str
    weakTopics: Optional[List[str]] = None
    averageScore: Optional[float] = None
    reason: Optional[str] = None


class WeeklyReportRequest(BaseModel):
    classId: Optional[str] = None
    className: str
    language: Optional[str] = None
    weekStart: Optional[str] = None
    weekEnd: Optional[str] = None
    studentCount: Optional[int] = None
    averageScore: Optional[float] = None
    completionRate: Optional[float] = None
    averageSubmissionScore: Optional[float] = None
    averageQuizScore: Optional[float] = None
    assignmentCount: Optional[int] = None
    submissionCount: Optional[int] = None
    topicAverages: Optional[List[TopicAverage]] = None
    atRiskStudents: Optional[List[AtRiskStudent]] = None
    strongTopics: Optional[List[str]] = None
    weakTopics: Optional[List[str]] = None
    studentsNeedingAttention: Optional[List[AtRiskStudent]] = None


class StudentNeedingAttention(BaseModel):
    studentId: Optional[str] = None
    name: str
    reason: str


class WeeklyReportResponse(AIMetadata):
    summary: str
    strongTopics: List[str]
    weakTopics: List[str]
    studentsNeedingAttention: List[StudentNeedingAttention]
    recommendations: List[str]