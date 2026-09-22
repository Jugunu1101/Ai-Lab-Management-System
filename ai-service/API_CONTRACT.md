# AI Service API Contract

> **Runtime:** Python + FastAPI  
> **Base URL:** `http://localhost:8000` (default)  
> **AI Provider:** OpenAI (or mock mode via `AI_MOCK_MODE=true`)  
> **All AI endpoints are prefixed with `/ai`**  
> **Rate Limit:** Configurable per-IP on `/ai/*` routes (`AI_RATE_LIMIT` req / `AI_RATE_WINDOW_SECONDS` window)  
> **Max Request Body:** Configurable via `MAX_REQUEST_BODY_BYTES`

---

## Table of Contents

- [Root](#root)
- [Health Check](#health-check)
- [Code Analysis](#code-analysis)
- [Quiz Generation](#quiz-generation)
- [Learning Path Generation](#learning-path-generation)
- [Weekly Report Generation](#weekly-report-generation)
- [Performance Report Generation (Legacy)](#performance-report-generation-legacy)
- [Common Schemas](#common-schemas)
- [Error Handling](#error-handling)
- [Middleware & Security](#middleware--security)

---

## Root

| Field    | Value |
| -------- | ----- |
| Method   | `GET` |
| Path     | `/`   |
| Auth     | None  |

**Response (200):**

```json
{
  "message": "AI Service is running"
}
```

---

## Health Check

| Field    | Value      |
| -------- | ---------- |
| Method   | `GET`      |
| Path     | `/health`  |
| Auth     | None       |
| Tag      | —          |

**Response (200):**

```json
{
  "status": "healthy",
  "service": "Programming Lab AI Service",
  "environment": "development | production",
  "aiMode": "mock | openai"
}
```

---

## Code Analysis

> Tag: `AI Analysis`  
> Source: `app/api/routes/analysis.py`

### POST `/ai/analyze-submission`

Analyzes a student's code submission against test results and returns topic mastery scores, detected mistakes, weak topics, and recommendations.

| Field         | Value                     |
| ------------- | ------------------------- |
| Method        | `POST`                    |
| Path          | `/ai/analyze-submission`  |
| Auth          | None (internal service)   |
| Rate Limited  | Yes (per-IP on `/ai/*`)   |
| Response Model| `CodeAnalysisResponse`    |

**Request Body** (`AnalyzeSubmissionRequest`):

```json
{
  "student": {
    "id": "string"                       // required — student identifier
  },
  "assignment": {
    "id": "string",                      // required — assignment identifier
    "language": "string",                // required — programming language
    "topics": ["string"]                 // required — topics covered
  },
  "submission": {
    "code": "string"                     // required — submitted source code
  },
  "testResults": {
    "passed": 4,                         // required — number of tests passed (>= 0)
    "failed": 1,                         // required — number of tests failed (>= 0)
    "total": 5,                          // optional — total test cases
    "errors": ["Timeout on test 3"]      // optional — error messages, default: []
  }
}
```

**Response (200)** (`CodeAnalysisResponse`):

```json
{
  "model": "gpt-4o-mini",
  "promptVersion": "1.0",
  "mastery": [
    {
      "topic": "loops",
      "score": 85                        // 0-100
    },
    {
      "topic": "arrays",
      "score": 60
    }
  ],
  "weakTopics": ["arrays", "recursion"],
  "mistakes": [
    "Off-by-one error in the for loop",
    "Unhandled edge case for empty array"
  ],
  "recommendations": [
    "Practice array manipulation problems",
    "Review loop boundary conditions"
  ]
}
```

**Called by:** Backend `POST /api/submissions` pipeline (after code execution)

---

## Quiz Generation

> Tag: `AI Quiz`  
> Source: `app/api/routes/quiz.py`

### POST `/ai/generate-quiz`

Generates a personalized quiz with multiple-choice questions based on specified topics, language, and difficulty.

| Field         | Value                    |
| ------------- | ------------------------ |
| Method        | `POST`                   |
| Path          | `/ai/generate-quiz`     |
| Auth          | None (internal service)  |
| Rate Limited  | Yes (per-IP on `/ai/*`)  |
| Response Model| `QuizResponse`           |

**Request Body** (`QuizRequest`):

```json
{
  "student": {                           // optional — student context
    "id": "string"
  },
  "topics": ["loops", "arrays"],         // required — topics to generate questions on
  "language": "python",                  // required — programming language
  "difficulty": "medium",               // optional — "easy" | "medium" | "hard", default: "medium"
  "questionCount": 5                     // optional — 1-10, default: 5
}
```

**Response (200)** (`QuizResponse`):

```json
{
  "model": "gpt-4o-mini",
  "promptVersion": "1.0",
  "questions": [
    {
      "question": "What is the output of: for i in range(3): print(i)?",
      "options": [
        "0 1 2",
        "1 2 3",
        "0 1 2 3",
        "1 2"
      ],
      "correctAnswer": "A",             // always normalized to "A" | "B" | "C" | "D"
      "explanation": "range(3) generates 0, 1, 2",
      "topic": "loops",                 // optional
      "difficulty": "easy"              // optional, default: "medium"
    }
  ]
}
```

**`correctAnswer` normalization:**
- Accepts integer `0-3` → converted to `A-D`
- Accepts string `"A"`, `"B)"`, `"c"` → normalized to uppercase letter
- Always stored as `"A"` | `"B"` | `"C"` | `"D"`

**Called by:** Backend `GET /api/quiz/today` (when no quiz exists for today)

---

## Learning Path Generation

> Tag: `AI Learning Path`  
> Source: `app/api/routes/learning_path.py`

### POST `/ai/generate-learning-path`

Generates a personalized learning path with step-by-step topics, objectives, and activities based on the student's current mastery levels and weak areas.

| Field         | Value                           |
| ------------- | ------------------------------- |
| Method        | `POST`                          |
| Path          | `/ai/generate-learning-path`    |
| Auth          | None (internal service)         |
| Rate Limited  | Yes (per-IP on `/ai/*`)         |
| Response Model| `LearningPathResponse`          |

**Request Body** (`LearningPathRequest`):

```json
{
  "studentId": "string",                 // required
  "language": "python",                  // required — programming language
  "mastery": [
    {
      "topic": "loops",
      "score": 85                        // 0-100
    },
    {
      "topic": "recursion",
      "score": 30
    }
  ],
  "weakTopics": ["recursion", "trees"]   // required — topics needing improvement
}
```

**Response (200)** (`LearningPathResponse`):

```json
{
  "model": "gpt-4o-mini",
  "promptVersion": "1.0",
  "learningPath": [
    {
      "step": 1,                         // >= 1
      "topic": "recursion",
      "objective": "Understand base cases and recursive calls",
      "activities": [
        "Solve factorial using recursion",
        "Implement Fibonacci sequence",
        "Practice tree traversal"
      ]
    },
    {
      "step": 2,
      "topic": "trees",
      "objective": "Learn binary tree operations",
      "activities": [
        "Implement BST insert/search",
        "Practice tree traversal (in-order, pre-order)"
      ]
    }
  ],
  "summary": "Focus on recursion fundamentals first, then apply to tree data structures."
}
```

**Called by:** Backend `GET /api/student/learning-path`

---

## Weekly Report Generation

> Tag: `AI Reports`  
> Source: `app/api/routes/reports.py`

### POST `/ai/generate-weekly-report`

Generates a class-level weekly performance report with AI-powered analysis, identifying strong/weak topics, at-risk students, and actionable recommendations.

| Field         | Value                            |
| ------------- | -------------------------------- |
| Method        | `POST`                           |
| Path          | `/ai/generate-weekly-report`     |
| Auth          | None (internal service)          |
| Rate Limited  | Yes (per-IP on `/ai/*`)          |
| Response Model| `WeeklyReportResponse`           |

**Request Body** (`WeeklyReportRequest`):

```json
{
  "classId": "string",                          // optional — Class ObjectId
  "className": "string",                        // required
  "language": "string",                         // optional
  "weekStart": "2026-09-15",                    // optional — ISO date string
  "weekEnd": "2026-09-21",                      // optional — ISO date string
  "studentCount": 30,                           // optional
  "averageScore": 72.5,                         // optional — 0-100
  "completionRate": 85.0,                       // optional — 0-100
  "averageSubmissionScore": 68.5,               // optional — 0-100
  "averageQuizScore": 76.0,                     // optional — 0-100
  "assignmentCount": 5,                         // optional
  "submissionCount": 120,                       // optional
  "topicAverages": [                            // optional
    { "topic": "loops", "averageScore": 82.5 },
    { "topic": "recursion", "averageScore": 45.0 }
  ],
  "atRiskStudents": [                           // optional
    {
      "studentId": "string",                    // optional
      "name": "John Doe",                       // required
      "weakTopics": ["recursion"],              // optional
      "averageScore": 35.0,                     // optional
      "reason": "Consistently low scores"       // optional
    }
  ],
  "strongTopics": ["loops", "variables"],       // optional
  "weakTopics": ["recursion", "trees"],         // optional
  "studentsNeedingAttention": [                 // optional — alias for atRiskStudents
    {
      "studentId": "string",
      "name": "Jane Smith",
      "weakTopics": ["pointers"],
      "averageScore": 40.0,
      "reason": "Missing submissions"
    }
  ]
}
```

**Response (200)** (`WeeklyReportResponse`):

```json
{
  "model": "gpt-4o-mini",
  "promptVersion": "1.0",
  "summary": "The class showed strong performance in loops and variables but struggled with recursion and trees. Overall completion rate is good at 85%.",
  "strongTopics": ["loops", "variables"],
  "weakTopics": ["recursion", "trees"],
  "studentsNeedingAttention": [
    {
      "studentId": "string",             // optional
      "name": "John Doe",
      "reason": "Consistently scoring below 40% on recursion topics"
    }
  ],
  "recommendations": [
    "Schedule extra practice sessions on recursion",
    "Provide worked examples for tree traversal",
    "Consider peer tutoring for at-risk students"
  ]
}
```

**Called by:** Backend `POST /api/reports/weekly/:classId/generate`

---

## Performance Report Generation (Legacy)

> Tag: `AI Reports`  
> Source: `app/api/routes/reports.py`

### POST `/ai/generate-report`

Generates a single-student performance report with overall score, strengths, weaknesses, and recommendations. This is the legacy endpoint for individual reports.

| Field         | Value                        |
| ------------- | ---------------------------- |
| Method        | `POST`                       |
| Path          | `/ai/generate-report`        |
| Auth          | None (internal service)      |
| Rate Limited  | Yes (per-IP on `/ai/*`)      |
| Response Model| `PerformanceReportResponse`  |

**Request Body** (`PerformanceReportRequest`):

```json
{
  "studentId": "string",                 // required
  "language": "python",                  // required
  "mastery": [
    {
      "topic": "loops",
      "score": 85                        // 0-100
    },
    {
      "topic": "recursion",
      "score": 30
    }
  ],
  "weakTopics": ["recursion", "trees"],  // required
  "passed": 18,                          // required — total tests passed (>= 0)
  "failed": 7                            // required — total tests failed (>= 0)
}
```

**Response (200)** (`PerformanceReportResponse`):

```json
{
  "model": "gpt-4o-mini",
  "promptVersion": "1.0",
  "overallScore": 65,                    // 0-100
  "strengths": [
    "Good understanding of loops",
    "Consistent code style"
  ],
  "weaknesses": [
    "Struggles with recursive thinking",
    "Incomplete handling of edge cases"
  ],
  "summary": "The student shows moderate proficiency in Python. Strong in iterative patterns but needs significant improvement in recursion and data structures.",
  "recommendations": [
    "Focus on recursion with simple problems first",
    "Practice writing base cases before recursive calls",
    "Review tree data structure fundamentals"
  ]
}
```

**Called by:** Backend `GET /api/reports/student`

---

## Common Schemas

### AIMetadata (Base Response)

Every AI response inherits these traceability fields:

```json
{
  "model": "string",              // AI model used (e.g. "gpt-4o-mini", "gemini-1.5-flash")
  "promptVersion": "string"       // Version of the prompt template used (e.g. "1.0")
}
```

### APIErrorResponse

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

---

## Error Handling

### Exception Handlers

| Exception          | HTTP Status | Error Code               | Description                              |
| ------------------ | ----------- | ------------------------ | ---------------------------------------- |
| `AIServiceError`   | 503         | `AI_SERVICE_UNAVAILABLE` | AI provider (OpenAI) is unreachable      |
| `AIResponseError`  | 502         | `INVALID_AI_RESPONSE`    | AI returned unparseable/invalid response |
| `Exception`        | 500         | `INTERNAL_SERVER_ERROR`  | Unhandled exception                      |

### Error Response Examples

**503 — AI Service Unavailable:**

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_UNAVAILABLE",
    "message": "AI service is temporarily unavailable"
  }
}
```

**502 — Invalid AI Response:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_AI_RESPONSE",
    "message": "AI returned an invalid response"
  }
}
```

**500 — Internal Server Error:**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**413 — Payload Too Large:**

```json
{
  "detail": "Payload Too Large"
}
```

**429 — Rate Limit Exceeded:**

```json
{
  "detail": "Rate limit exceeded"
}
```

> Includes `Retry-After` header (seconds).

**422 — Validation Error (FastAPI):**

```json
{
  "detail": [
    {
      "loc": ["body", "student", "id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Middleware & Security

### Request Logging Middleware

Every request is logged with:
- `X-Request-ID` header (auto-generated UUID if not provided)
- Method, path, status code, duration in ms

The `X-Request-ID` is echoed back in the response headers.

### Security & Rate Limit Middleware

Applied to all requests, in order:

1. **Request Size Check** — POST/PUT/PATCH requests exceeding `MAX_REQUEST_BODY_BYTES` are rejected with `413`.

2. **Rate Limiting** — `/ai/*` endpoints are rate-limited per client IP:
   - Window: `AI_RATE_WINDOW_SECONDS` (configurable)
   - Max requests: `AI_RATE_LIMIT` (configurable)
   - Returns `429` with `Retry-After` header when exceeded.

3. **Security Headers** — Added to every response:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: no-referrer`

### CORS

Allowed origins:
- `http://localhost:3000`
- `http://localhost:5173`

All methods, headers, and credentials are allowed.

---

## Service Integration Map

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │ ──────► │   Backend    │ ──────► │  AI Service  │
│  (Vite/React)│  HTTP   │ (Express.js) │  HTTP   │  (FastAPI)   │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                        │
                              │  POST /ai/analyze-submission
                              │  POST /ai/generate-quiz
                              │  POST /ai/generate-learning-path
                              │  POST /ai/generate-report
                              │  POST /ai/generate-weekly-report
                              │                        │
                              ▼                        ▼
                        ┌──────────┐            ┌──────────┐
                        │ MongoDB  │            │  OpenAI  │
                        └──────────┘            └──────────┘
```

> **Note:** The AI Service is an **internal service** — it is called only by the Backend, never directly by the Frontend. There is no authentication between Backend → AI Service (trusted internal network).
