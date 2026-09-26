from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class TestCaseSchema(BaseModel):
    input: str
    expectedOutput: str
    isHidden: bool = False

class ExampleSchema(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None

class AssignmentQuestionSchema(BaseModel):
    title: str
    problemStatement: str
    topic: str
    language: str
    difficulty: str
    constraints: List[str] = []
    inputFormat: Optional[str] = None
    outputFormat: Optional[str] = None
    examples: List[Dict[str, Any]] = []
    expectedOutput: Optional[str] = None
    testCases: List[TestCaseSchema] = []
    starterCode: Optional[str] = None
    hints: List[str] = []
    explanation: Optional[str] = None

class AssignmentGenerationRequest(BaseModel):
    studentId: Optional[str] = None
    topic: Optional[str] = None
    targetTopics: Optional[List[str]] = None
    language: Optional[str] = "cpp"
    difficulty: Optional[str] = "MEDIUM"
    questionCount: Optional[int] = 1
    reason: Optional[str] = None
    excludedTitles: Optional[List[str]] = None

class AssignmentGenerationResponse(BaseModel):
    title: str
    description: str
    language: str = "cpp"
    difficulty: str = "MEDIUM"
    topics: List[str] = ["loops"]
    problemStatement: str
    constraints: List[str] = []
    inputFormat: Optional[str] = None
    outputFormat: Optional[str] = None
    examples: List[Dict[str, Any]] = []
    expectedConcepts: List[str] = []
    testCases: List[TestCaseSchema] = []
    starterCode: Optional[str] = None
    hints: List[str] = []
    explanation: Optional[str] = None
    questions: Optional[List[AssignmentQuestionSchema]] = None
