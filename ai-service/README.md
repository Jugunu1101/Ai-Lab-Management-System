# Programming Lab AI Service

A high-performance, stateless Python + FastAPI microservice powering pedagogical intelligence, automated submission feedback, personalized learning paths, interactive quizzes, and weekly analytics for the Programming Lab platform.

---

## 1. Architectural Principles

The AI service adheres to strict architectural boundaries defined in the system specification:

1. **Stateless / Zero Database Writes**: The AI service never connects directly to MongoDB or any datastore. All persistent state is managed exclusively by the Node.js backend.
2. **Zero Code Execution**: The AI service never compiles or runs student code. Code execution is handled by the isolated execution sandbox; the AI service only consumes objective test runner metrics (passed/failed counts, runtime logs, compiler/assertion errors).
3. **Strict Topic Taxonomy**: Topics and weaknesses are strictly constrained to predefined language taxonomies (`app/taxonomy/programming_topics.py`). The service will not invent arbitrary taxonomy terms.
4. **Deterministic Hybrid Logic**: Pure numerical evaluation (e.g. mastery score thresholds) is handled deterministically via helper routines (`app/services/weak_topic_service.py`), reserving LLM calls for semantic evaluation, code explanation, and pedagogical synthesis.
5. **Traceability Metadata**: Every AI response includes `model` and `promptVersion` (`AIMetadata`) for auditing, experimentation, and telemetry.

---

## 2. API Specifications & Contracts

### 2.1 Health Check: `GET /health`
Verifies service availability.
- **Response**:
```json
{
  "status": "healthy"
}
```

---

### 2.2 Code Analysis: `POST /ai/analyze-submission`
Analyzes a student submission based on test execution outputs and code structure.

- **Request**:
```json
{
  "student": { "id": "student_123" },
  "assignment": {
    "id": "assign_456",
    "language": "python",
    "topics": ["arrays", "loops"]
  },
  "submission": {
    "code": "def find_max(arr):\n    m = 0\n    for i in range(len(arr)):\n        if arr[i] > m: m = arr[i]\n    return m"
  },
  "testResults": {
    "passed": 2,
    "failed": 8,
    "total": 10,
    "errors": ["Failed on negative arrays: expected -1, got 0"]
  }
}
```

- **Response**:
```json
{
  "mastery": [
    { "topic": "arrays", "score": 70 },
    { "topic": "loops", "score": 40 }
  ],
  "weakTopics": ["loops"],
  "mistakes": [
    "Initial maximum accumulator assumed 0 instead of negative infinity or arr[0]."
  ],
  "recommendations": [
    "Initialize max trackers using the first collection element or float('-inf')."
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "analysis_v1"
}
```

---

### 2.3 Quiz Generator: `POST /ai/generate-quiz`
Generates multiple-choice questions targeting specific topics and difficulty. Standardized on letter-based answers (`"A"`, `"B"`, `"C"`, `"D"`).

- **Request**:
```json
{
  "student": { "id": "student_123" },
  "topics": ["recursion", "loops"],
  "language": "python",
  "difficulty": "medium",
  "questionCount": 2
}
```

- **Response**:
```json
{
  "questions": [
    {
      "question": "What is the primary purpose of a base case in a recursive function?",
      "options": [
        "A) To terminate recursive calls and avoid infinite recursion",
        "B) To allocate heap memory for the call stack",
        "C) To optimize iteration speed using tail calls",
        "D) To define the initial parameters of the function"
      ],
      "correctAnswer": "A",
      "explanation": "The base case provides an exit condition so recursion unwinds properly.",
      "topic": "recursion",
      "difficulty": "medium"
    }
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "quiz_v1"
}
```

---

### 2.4 Learning Path: `POST /ai/generate-learning-path`
Constructs structured remedial learning roadmaps based on topic mastery scores.

- **Request**:
```json
{
  "studentId": "student_123",
  "language": "python",
  "mastery": [
    { "topic": "loops", "score": 80 },
    { "topic": "recursion", "score": 35 }
  ],
  "weakTopics": ["recursion"]
}
```

- **Response**:
```json
{
  "summary": "Focus on recursion fundamentals before advancing to complex algorithmic structures.",
  "learningPath": [
    {
      "step": 1,
      "topic": "recursion",
      "objective": "Understand base cases and stack frames in single-branch recursion.",
      "activities": [
        "Implement factorial and countdown recursively",
        "Trace call stacks on paper"
      ]
    }
  ],
  "model": "gpt-4o-mini",
  "promptVersion": "learning_path_v1"
}
```

---

### 2.5 Weekly Class Analytics: `POST /ai/generate-weekly-report`
Primary endpoint for aggregated classroom weekly summaries, pinpointing at-risk students and pedagogical interventions.

- **Request**:
```json
{
  "classId": "class_999",
  "className": "CS101 - Intro to Algorithms",
  "language": "python",
  "weekStart": "2026-09-07T00:00:00Z",
  "weekEnd": "2026-09-13T23:59:59Z",
  "studentCount": 35,
  "averageScore": 68.5,
  "completionRate": 82.0,
  "topicAverages": [
    { "topic": "loops", "averageScore": 82.0 },
    { "topic": "recursion", "averageScore": 44.5 }
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

- **Response**:
```json
{
  "summary": "The class demonstrates strong mastery in iterative logic, but recursion is a critical bottleneck.",
  "strongTopics": ["loops"],
  "weakTopics": ["recursion"],
  "studentsNeedingAttention": [
    {
      "studentId": "student_123",
      "name": "Alex Smith",
      "reason": "Struggles with recursion call-stack tracing and base-case termination."
    }
  ],
  "recommendations": [
    "Dedicate the next lab session to visualizing call stacks.",
    "Assign guided pair-programming exercises on recursion."
  ],
  "model": "gpt-4o",
  "promptVersion": "report_v1"
}
```

> **Backward Compatibility:** `POST /ai/generate-report` is preserved to support both legacy single-student report payloads and class report payloads transparently.

---

## 3. Configuration & Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | string | `""` | OpenAI secret API key (required when `AI_MOCK_MODE=false`). |
| `AI_MOCK_MODE` | boolean | `false` | When `true`, returns deterministic, realistic mock JSON without external LLM calls. |
| `AI_ANALYSIS_MODEL` | string | `gpt-4o-mini` | LLM model used for code analysis. |
| `AI_QUIZ_MODEL` | string | `gpt-4o-mini` | LLM model used for quiz generation. |
| `AI_REPORT_MODEL` | string | `gpt-4o` | LLM model used for weekly and performance reports. |
| `AI_LEARNING_PATH_MODEL` | string | `gpt-4o-mini` | LLM model used for learning path generation. |
| `AI_REQUEST_TIMEOUT` | integer | `60` | OpenAI HTTP client timeout in seconds. |
| `AI_MAX_RETRIES` | integer | `3` | Maximum retry attempts for transient provider failures (exponential backoff). |
| `AI_RATE_LIMIT` | integer | `30` | Maximum `/ai/*` requests per IP per time window. |
| `AI_RATE_WINDOW_SECONDS` | integer | `60` | Sliding rate limit window duration in seconds. |
| `MAX_REQUEST_BODY_BYTES` | integer | `1048576` | Maximum allowed request body size (1 MB limit returns HTTP 413). |

---

## 4. Local Development & Testing

### 4.1 Setup
```powershell
# Navigate to directory
cd ai-service

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install runtime and test dependencies
pip install -r requirements-dev.txt
```

### 4.2 Running the Service
```powershell
# Development server with hot reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4.3 Running the Test Suite
The automated test suite runs offline in `AI_MOCK_MODE=true` without external API dependencies:
```powershell
pytest -v
```
All 26 test suites cover:
- Health verification (`test_health.py`)
- Code submission analysis contract & metadata (`test_analysis.py`)
- Quiz questions, letter answer choices, and difficulty contracts (`test_quiz.py`)
- Learning path roadmap generation (`test_learning_path.py`)
- Class-level and legacy report generation (`test_report.py`)
- Topic taxonomy and deterministic threshold detection (`test_taxonomy.py`)
- Security middleware: payload caps (413), rate limiting (429), security headers (`test_security.py`)
- LLM client backoff, retry exhaustion, and mock fallback (`test_ai_client.py`)
- Request ID propagation and JSON logging (`test_middleware.py`)

---

## 5. Docker & Compose Deployment

### 5.1 Standalone Docker Build
```bash
docker build -t programming-lab-ai .
docker run --rm -p 8000:8000 --env-file .env programming-lab-ai
```

### 5.2 Docker Compose Integration
In multi-container setups alongside the Node.js backend:
```yaml
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      - AI_MOCK_MODE=true
      - AI_ANALYSIS_MODEL=gpt-4o-mini
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
```

In the Node.js backend `.env`:
```bash
AI_SERVICE_URL=http://ai-service:8000
```
