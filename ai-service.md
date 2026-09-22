# AI Service Development Specification

## 1. Overview & Architectural Role

The **AI Service** is a dedicated Python + FastAPI microservice responsible for intelligence, automated feedback, personalized pedagogy, and automated educational analytics.

### Architectural Rules
- **No Direct Database Writes**: The AI service must **never** read or write directly to MongoDB. It is purely stateless; persistent storage is owned exclusively by the Node.js backend.
- **No Code Execution**: The AI service does **not** execute student code. Code execution is handled by the isolated execution sandbox; the AI service only consumes the objective execution output (passed/failed counts, runtime logs, compiler/runtime errors).
- **No Arbitrary Taxonomy Inventions**: The AI service must only map weaknesses and competencies to predefined topics defined in the system taxonomy (`app/taxonomy/programming_topics.py`).
- **Structured JSON Responses**: All endpoints return strictly validated JSON conforming to Pydantic schemas. Responses must include `model` and `promptVersion`.

---

## 2. Current Implementation Audit

### Existing Components
- **Framework**: FastAPI application configured in `app/main.py` with CORS, rate limiting (`/ai/*`), security headers, request ID propagation, and JSON exception handlers.
- **LLM Client**: `app/services/ai_client.py` wraps the OpenAI API with retry logic (exponential backoff) and an offline mock mode (`AI_MOCK_MODE=True`).
- **Endpoints**:
  - `POST /ai/analyze-submission` -> `app/api/routes/analysis.py`
  - `POST /ai/generate-quiz` -> `app/api/routes/quiz.py`
  - `POST /ai/generate-learning-path` -> `app/api/routes/learning_path.py`
  - `POST /ai/generate-weekly-report` & `POST /ai/generate-report` -> `app/api/routes/reports.py`
  - `GET /health` -> `app/api/routes/health.py`

### Status: Fully Remediated & Compliant
All identified architectural requirements have been implemented and validated:
1. **Populated Taxonomy & Services**:
   - `app/taxonomy/programming_topics.py` implements the standard multi-language programming taxonomy (`common`, `python`, `javascript`, `cpp`, `java`) and helper functions `get_allowed_topics()` and `validate_topic()`.
   - `app/schemas/common.py` defines `AIMetadata` (`model`, `promptVersion`) and `APIErrorResponse`.
   - `app/services/weak_topic_service.py` provides deterministic, threshold-based weak topic identification (`detect_weak_topics`) validating against taxonomy.
2. **Weekly Report Contract & Dual Endpoints**:
   - Primary class analytics endpoint added at `POST /ai/generate-weekly-report` returning `WeeklyReportResponse`.
   - Legacy endpoint `POST /ai/generate-report` preserved for backward compatibility with existing Node.js callers.
3. **Traceability Metadata Enforced**:
   - All response schemas inherit from `AIMetadata` (`model` and `promptVersion` populated on every output per architecture Section 17).
4. **Quiz Contract Alignment**:
   - Standardized `correctAnswer` to letter format (`"A"`, `"B"`, `"C"`, `"D"`), with a defensive Pydantic validator to normalize legacy integer indexes (`0` -> `"A"`).
   - Each question includes `topic`, `difficulty`, `options` (4 items), and `explanation`.
5. **Configurable Models**:
   - Config loaded via Pydantic settings: `AI_ANALYSIS_MODEL`, `AI_QUIZ_MODEL`, `AI_REPORT_MODEL`, `AI_LEARNING_PATH_MODEL`, with resilient defaults.

---

## 3. Directory Structure

The `ai-service` directory adheres strictly to this structure:

```text
ai-service/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analysis.py
│   │   │   ├── health.py
│   │   │   ├── learning_path.py
│   │   │   ├── quiz.py
│   │   │   └── reports.py
│   │   └── router.py
│   ├── core/
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   └── logging.py
│   ├── prompts/
│   │   ├── analysis_v1.py
│   │   ├── learning_path_v1.py
│   │   ├── quiz_v1.py
│   │   └── report_v1.py
│   ├── schemas/
│   │   ├── analysis.py
│   │   ├── common.py
│   │   ├── learning_path.py
│   │   ├── quiz.py
│   │   └── report.py
│   ├── services/
│   │   ├── ai_client.py
│   │   ├── code_analysis_service.py
│   │   ├── learning_path_service.py
│   │   ├── quiz_service.py
│   │   ├── report_service.py
│   │   └── weak_topic_service.py
│   ├── taxonomy/
│   │   └── programming_topics.py
│   ├── tests/
│   │   ├── test_ai_client.py
│   │   ├── test_analysis.py
│   │   ├── test_health.py
│   │   ├── test_learning_path.py
│   │   ├── test_middleware.py
│   │   ├── test_quiz.py
│   │   ├── test_report.py
│   │   ├── test_security.py
│   │   └── test_taxonomy.py
│   └── main.py
├── .dockerignore
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── pytest.ini
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

---

## 4. Topic Taxonomy Specification (`app/taxonomy/programming_topics.py`)

Standard CS topics categorized by language:

```python
# app/taxonomy/programming_topics.py
from typing import Set, Dict, List

TAXONOMY: Dict[str, List[str]] = {
    "common": [
        "variables",
        "data-types",
        "operators",
        "conditionals",
        "loops",
        "functions",
        "arrays",
        "strings",
        "recursion",
        "sorting",
        "searching",
        "binary-search",
        "stacks-queues",
        "linked-lists",
        "trees",
        "graphs",
        "dynamic-programming",
        "bit-manipulation",
        "time-complexity",
    ],
    "python": [
        "list-comprehensions",
        "dictionaries",
        "tuples-sets",
        "file-io",
        "oop-classes",
        "lambda-functions",
    ],
    "javascript": [
        "objects",
        "es6-syntax",
        "callbacks-promises",
        "array-methods",
        "closures",
    ],
    "cpp": [
        "pointers-references",
        "stl-vectors",
        "stl-maps",
        "memory-management",
        "classes-inheritance",
    ],
    "java": [
        "oop-encapsulation",
        "oop-inheritance",
        "oop-polymorphism",
        "collections-framework",
        "exception-handling",
    ],
}

def get_allowed_topics(language: str) -> Set[str]:
    lang = language.lower()
    allowed = set(TAXONOMY["common"])
    if lang in TAXONOMY:
        allowed.update(TAXONOMY[lang])
    return allowed

def validate_topic(topic: str, language: str) -> bool:
    return topic.lower() in get_allowed_topics(language)
```

---

## 5. API Endpoints & Schemas Contract

### 5.1 Shared Metadata (`app/schemas/common.py`)

```python
from pydantic import BaseModel

class AIMetadata(BaseModel):
    model: str
    promptVersion: str

class APIErrorResponse(BaseModel):
    success: bool = False
    error: dict
```

---

### 5.2 Code Analysis: `POST /ai/analyze-submission`

#### Request Schema
```json
{
  "student": {
    "id": "student_123"
  },
  "assignment": {
    "id": "assign_456",
    "language": "python",
    "topics": ["arrays", "loops"]
  },
  "submission": {
    "code": "def find_max(arr):\n    m = 0\n    for i in range(len(arr)):\n        if arr[i] > m: m = arr[i]\n    return m"
  },
  "testResults": {
    "passed": 4,
    "failed": 2,
    "total": 6,
    "errors": ["Failed on negative numbers: expected -1, got 0"]
  }
}
```

#### Response Schema (`CodeAnalysisResponse`)
```json
{
  "mastery": [
    {
      "topic": "arrays",
      "score": 75
    },
    {
      "topic": "loops",
      "score": 45
    }
  ],
  "weakTopics": ["loops"],
  "mistakes": [
    "Initial maximum value assumed to be 0 instead of negative infinity or the first element, causing test failures with negative numbers."
  ],
  "recommendations": [
    "Review loop invariant and initializing accumulator variables for negative number ranges."
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "analysis_v1"
}
```

---

### 5.3 Daily Quiz Generator: `POST /ai/generate-quiz`

#### Request Schema (`QuizRequest`)
```json
{
  "student": {
    "id": "student_123"
  },
  "topics": ["recursion", "loops"],
  "language": "python",
  "difficulty": "medium",
  "questionCount": 3
}
```

#### Response Schema (`QuizResponse`)
```json
{
  "questions": [
    {
      "question": "What is the base case in a recursive function?",
      "options": [
        "A) The condition that halts recursion",
        "B) The first recursive call",
        "C) The highest number of stack frames allowed",
        "D) The variable holding the accumulator"
      ],
      "correctAnswer": "A",
      "explanation": "The base case defines when the recursion terminates to avoid infinite recursion.",
      "topic": "recursion",
      "difficulty": "medium"
    }
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "quiz_v1"
}
```

---

### 5.4 Learning Path Generator: `POST /ai/generate-learning-path`

#### Request Schema (`LearningPathRequest`)
```json
{
  "studentId": "student_123",
  "language": "python",
  "mastery": [
    { "topic": "loops", "score": 80 },
    { "topic": "recursion", "score": 35 },
    { "topic": "trees", "score": 25 }
  ],
  "weakTopics": ["recursion", "trees"]
}
```

#### Response Schema (`LearningPathResponse`)
```json
{
  "summary": "Focus on recursion fundamentals before advancing to tree structures.",
  "learningPath": [
    {
      "step": 1,
      "topic": "recursion",
      "objective": "Understand base cases and stack frames in single-branch recursion.",
      "activities": ["Implement factorial and countdown recursively", "Trace call stacks on paper"]
    },
    {
      "step": 2,
      "topic": "recursion",
      "objective": "Master multi-branch recursive problem solving.",
      "activities": ["Implement Fibonacci with memoization", "Tree traversal preview"]
    },
    {
      "step": 3,
      "topic": "trees",
      "objective": "Apply recursion to binary tree traversals.",
      "activities": ["Pre-order, in-order, and post-order depth calculations"]
    }
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "learning_path_v1"
}
```

---

### 5.5 Weekly Class Report: `POST /ai/generate-weekly-report`

#### Request Schema (`WeeklyReportRequest`)
```json
{
  "classId": "class_999",
  "className": "CS101 - Algorithms",
  "language": "python",
  "weekStart": "2026-09-07T00:00:00Z",
  "weekEnd": "2026-09-13T23:59:59Z",
  "studentCount": 42,
  "averageScore": 68.4,
  "completionRate": 85.0,
  "topicAverages": [
    { "topic": "loops", "averageScore": 82.0 },
    { "topic": "recursion", "averageScore": 44.5 },
    { "topic": "arrays", "averageScore": 76.0 }
  ],
  "atRiskStudents": [
    {
      "studentId": "student_123",
      "name": "Alex Smith",
      "weakTopics": ["recursion"],
      "averageScore": 42.0
    }
  ]
}
```

#### Response Schema (`WeeklyReportResponse`)
```json
{
  "summary": "Overall class progress is solid in iterative algorithms, but recursion remains a major bottleneck for 35% of the class.",
  "strongTopics": ["loops", "arrays"],
  "weakTopics": ["recursion"],
  "studentsNeedingAttention": [
    {
      "studentId": "student_123",
      "name": "Alex Smith",
      "reason": "Consistently failing recursion test cases and scoring under 50% on daily quizzes."
    }
  ],
  "recommendations": [
    "Dedicate the next lab session to visual call-stack debugging for recursion.",
    "Assign pair-programming exercises breaking down divide-and-conquer logic."
  ],
  "model": "gpt-4o",
  "promptVersion": "report_v1"
}
```

---

## 6. Prompt Engineering & Versioning System

Prompt version constants defined in each prompt module (`app/prompts/`):
- `analysis_v1.py` -> `PROMPT_VERSION = "analysis_v1"`
- `quiz_v1.py` -> `PROMPT_VERSION = "quiz_v1"`
- `learning_path_v1.py` -> `PROMPT_VERSION = "learning_path_v1"`
- `report_v1.py` -> `PROMPT_VERSION = "report_v1"`

System instructions enforce:
1. Pure JSON output.
2. OpenAI `response_format={"type": "json_object"}`.
3. Validate output against taxonomy: topics outside the allowed list are clamped/filtered.

---

## 7. Testing Requirements & Checklist

Ensure all tests pass using `pytest` (`.\venv\Scripts\python.exe -m pytest -v`):
- [x] `test_health.py`: Verifies `/health` returns status `healthy`.
- [x] `test_analysis.py`: Tests submissions in mock mode, validating `mastery`, `weakTopics`, `mistakes`, `recommendations`, `model`, and `promptVersion`.
- [x] `test_quiz.py`: Tests valid quiz generation with 4 options, letter `correctAnswer` in `{"A", "B", "C", "D"}`, `model`, and `promptVersion`.
- [x] `test_learning_path.py`: Tests path generation with sequencing, `summary`, `model`, and `promptVersion`.
- [x] `test_report.py`: Tests class-level weekly report generation (`POST /ai/generate-weekly-report`) and legacy single-student generation (`POST /ai/generate-report`).
- [x] `test_security.py`: Verifies payload limit (413), rate limiting (429), and headers (`X-Request-ID`, security headers).
- [x] `test_ai_client.py`: Verifies retry on network/timeout error and mock mode fallback.
- [x] `test_taxonomy.py`: Verifies common vs. language-specific taxonomy filtering and deterministic weak topic detection.
- [x] `test_middleware.py`: Verifies request ID propagation and logging middleware integrity.

**Result: 26 passed, 100% test pass rate.**
