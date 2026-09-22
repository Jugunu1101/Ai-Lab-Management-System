from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from app.schemas.common import AIMetadata


# ---------- Request ----------

class QuizStudentInfo(BaseModel):
    id: str


class QuizRequest(BaseModel):
    student: Optional[QuizStudentInfo] = None
    topics: List[str]
    language: str
    difficulty: str = "medium"
    questionCount: int = Field(default=5, ge=1, le=10)


# ---------- Response ----------

# Mapping from integer index to letter for backward compatibility
_INDEX_TO_LETTER = {0: "A", 1: "B", 2: "C", 3: "D"}


class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(min_length=4, max_length=4)
    correctAnswer: str
    explanation: str
    topic: Optional[str] = None
    difficulty: Optional[str] = "medium"

    @field_validator("correctAnswer", mode="before")
    @classmethod
    def normalize_correct_answer(cls, v):
        """Accept both integer (0-3) and letter ('A'-'D') formats, always store as letter."""
        if isinstance(v, int):
            if v in _INDEX_TO_LETTER:
                return _INDEX_TO_LETTER[v]
            raise ValueError(f"correctAnswer index must be 0-3, got {v}")
        if isinstance(v, str):
            # Accept "A", "B", "C", "D" or "A)", "B)", etc.
            letter = v.strip().upper().rstrip(")")
            if letter in ("A", "B", "C", "D"):
                return letter
            raise ValueError(f"correctAnswer must be A, B, C, or D, got '{v}'")
        raise ValueError(f"correctAnswer must be int or str, got {type(v)}")


class QuizResponse(AIMetadata):
    questions: List[QuizQuestion]