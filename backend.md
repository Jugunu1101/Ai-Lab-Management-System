# Backend Development Specification

## 1. Overview & Architectural Role

The **Backend** is the central orchestrator of the platform, built with **Node.js + Express** (CommonJS), **MongoDB (Mongoose)**, and **Redis + BullMQ**.

### Architectural Boundaries
- **Owns Business Logic & State**: All persistent application data (Users, Classes, Assignments, Submissions, Quizzes, Progress, Weekly Reports, AI Analyses) resides in MongoDB managed strictly by the backend.
- **Isolates Code Execution**: Student code must **never** run directly in the Node.js process. Code execution is delegated to isolated Docker containers with no network access, memory/cpu constraints, and strict execution timeouts.
- **Orchestrates AI via Asynchronous Queues**: Heavy jobs (code execution, AI submission analysis, quiz generation, weekly class reporting) are processed asynchronously via BullMQ workers to keep HTTP endpoints responsive.
- **Enforces Security & RBAC**: Central JWT authentication with role authorization (`STUDENT`, `TEACHER`, `ADMIN`).

---

## 2. Implementation Status & Gap Analysis

### Implementation Progress Summary

| Component / Phase | Status | Details |
|---|---|---|
| **Phase 1: Redis + BullMQ Queue Engine** | **COMPLETED** | `bullmq` & `ioredis` installed; Redis connection manager, 4 queues (`code-execution`, `ai-analysis`, `quiz-generation`, `weekly-report`), 3 background workers, `submission.controller.js` async enqueuing, and `server.js` worker booting fully wired. |
| **Phase 2: Multi-Language Code Executor** | **COMPLETED** | `code-executor.service.js` supports JavaScript (`node:22-alpine`), Python (`python:3.11-alpine`), C++ (`gcc:alpine`), and Java (`eclipse-temurin:21-alpine`) with strict Docker isolation and timeout handling; `test-case.service.js` and `submission.service.js` updated. |
| **Phase 3: Missing Models** | **COMPLETED** | `AIAnalysis` (`ai_analyses` collection) and `WeeklyReport` (`weekly_reports` collection) Mongoose models created; `Submission` model updated with `PASSED`/`ERROR` enum, `analysisId`, and test count metrics. |
| **Phase 4: Student Portal Routes** | **COMPLETED** | Student module implemented (`src/modules/student/`) with `/api/student/dashboard`, `/progress`, `/topics`, and `/learning-path` (with AI service call + caching), registered in `app.js`. |
| **Phase 5: Daily Quiz Flow** | **COMPLETED** | `Quiz` model updated with `studentId`, `targetDate`, `topics`; `quiz.service.js` updated with `getTodayQuiz` targeting weak topics with AI generation and fallback; `GET /api/quiz/today` and `GET /api/quizzes/today` mounted. |
| **Phase 6: Weekly Reports Module** | **COMPLETED** | `reports.service.js` fixed (import bug resolved), `GET /api/reports/weekly/:classId` and `POST /api/reports/weekly/:classId/generate` implemented with BullMQ async job dispatching; `ai.service.js` client updated. |
| **Phase 7: Admin Module** | **COMPLETED** | Admin module created (`src/modules/admin/`) with dashboard metrics, paginated user management, user CRUD, and class overview; registered at `/api/admin/*` protected by `ADMIN` role. |
| **Phase 8: Topic Mastery Formula** | **COMPLETED** | `Progress` model updated with counters and rates; `progress.service.js` updated to 5-factor hybrid formula: `Topic Score = (0.35 * assignmentScore) + (0.25 * quizScore) + (0.20 * submissionSuccessRate) + (0.10 * errorFrequencyFactor) + (0.10 * practiceFrequencyFactor)`. |
| **Phase 9: Security & Hardening** | **COMPLETED** | `helmet`, `cors`, global rate limiting (`500 req/15min`), auth rate limiting (`30 req/15min`), body size limits (`2mb`), health check (`/health`), and 404 handlers configured in `app.js`; `.env.example` created. |

---

### Implemented Architecture Components
- **Express App & Security**: Express 5 app (`src/app.js`) hardened with `helmet`, `cors`, rate-limiting, and central `errorHandler`.
- **Database**: MongoDB Mongoose connection in `src/config/db.js` with comprehensive models: `User`, `Class`, `Assignment`, `Submission`, `Quiz`, `QuizAttempt`, `Progress`, `WeeklyReport`, and `AIAnalysis`.
- **Authentication & RBAC**: JWT authentication and role authorization (`STUDENT`, `TEACHER`, `ADMIN`).
- **Student Portal**: Aggregated dashboard, topic mastery breakdown, and AI learning path caching (`/api/student/*`).
- **Daily Quiz Flow**: Daily quiz retrieval and generation targeting weak topics (`/api/quiz/today`).
- **Admin Management**: System dashboard and user management CRUD (`/api/admin/*`).
- **Classroom & Assignments**: Complete classroom and assignment management with hidden test cases.
- **Multi-Language Isolated Code Runner**: Docker execution for JavaScript, Python, C++, and Java.
- **Asynchronous Queue Engine**: Redis connection manager, 4 BullMQ queues, and 3 background workers (`submission`, `ai`, `report`).
- **Topic Mastery Formula**: Hybrid 5-factor scoring model.

---

## 3. Modular Backend Architecture

Structure each module according to Section 4:
```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── redis.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   └── error.middleware.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── users/
│   │   │   ├── user.model.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.routes.js
│   │   │   └── user.service.js
│   │   ├── student/
│   │   │   ├── student.controller.js
│   │   │   ├── student.routes.js
│   │   │   └── student.service.js
│   │   ├── classes/
│   │   │   ├── class.model.js
│   │   │   ├── class.controller.js
│   │   │   ├── class.routes.js
│   │   │   ├── class.service.js
│   │   │   └── class.validation.js
│   │   ├── assignments/
│   │   │   ├── assignment.model.js
│   │   │   ├── assignment.controller.js
│   │   │   ├── assignment.routes.js
│   │   │   ├── assignment.service.js
│   │   │   └── assignment.validation.js
│   │   ├── submissions/
│   │   │   ├── submission.model.js
│   │   │   ├── submission.controller.js
│   │   │   ├── submission.routes.js
│   │   │   ├── submission.service.js
│   │   │   └── submission.validation.js
│   │   ├── quizzes/
│   │   │   ├── quiz.model.js
│   │   │   ├── quizAttempt.model.js
│   │   │   ├── quiz.controller.js
│   │   │   ├── quiz.routes.js
│   │   │   ├── quiz.service.js
│   │   │   └── quiz.validation.js
│   │   ├── progress/
│   │   │   ├── progress.model.js
│   │   │   ├── progress.controller.js
│   │   │   ├── progress.routes.js
│   │   │   └── progress.service.js
│   │   ├── analytics/
│   │   │   ├── analytics.controller.js
│   │   │   ├── analytics.routes.js
│   │   │   └── analytics.service.js
│   │   ├── reports/
│   │   │   ├── weeklyReport.model.js
│   │   │   ├── reports.controller.js
│   │   │   ├── reports.routes.js
│   │   │   └── reports.service.js
│   │   └── admin/
│   │       ├── admin.controller.js
│   │       ├── admin.routes.js
│   │       └── admin.service.js
│   ├── queues/
│   │   ├── queue.config.js
│   │   ├── submission.queue.js
│   │   ├── ai.queue.js
│   │   ├── report.queue.js
│   │   └── workers/
│   │       ├── submission.worker.js
│   │       ├── ai.worker.js
│   │       └── report.worker.js
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ai.service.js
│   │   │   └── aiAnalysis.model.js
│   │   └── code-executor/
│   │       ├── code-executor.service.js
│   │       ├── runners/
│   │       │   ├── javascript.runner.js
│   │       │   ├── python.runner.js
│   │       │   ├── cpp.runner.js
│   │       │   └── java.runner.js
│   │       └── test-case.service.js
│   ├── app.js
│   └── server.js
├── package.json
└── .env.example
```

---

## 4. Database Models Specification

### 4.1 Users Collection (`users`)
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["STUDENT", "TEACHER", "ADMIN"], default: "STUDENT" },
  collegeId: { type: String, required: true },
  department: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

### 4.2 Classes Collection (`classes`)
```javascript
{
  name: { type: String, required: true },
  teacherId: { type: ObjectId, ref: "User", required: true },
  students: [{ type: ObjectId, ref: "User" }],
  languages: [{ type: String }], // ["python", "cpp", "java", "javascript"]
  semester: { type: String },
  createdAt: { type: Date, default: Date.now }
}
```

### 4.3 Assignments Collection (`assignments`)
```javascript
{
  title: { type: String, required: true },
  description: { type: String, required: true },
  language: { type: String, required: true },
  difficulty: { type: String, enum: ["EASY", "MEDIUM", "HARD"], required: true },
  topics: [{ type: String }],
  testCases: [
    {
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
      isHidden: { type: Boolean, default: true }
    }
  ],
  deadline: { type: Date },
  maxAttempts: { type: Number, default: null },
  classId: { type: ObjectId, ref: "Class", required: true },
  createdBy: { type: ObjectId, ref: "User", required: true }
}
```

### 4.4 Submissions Collection (`submissions`)
```javascript
{
  studentId: { type: ObjectId, ref: "User", required: true },
  assignmentId: { type: ObjectId, ref: "Assignment", required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["PENDING", "RUNNING", "PASSED", "FAILED", "ERROR", "TIMEOUT"], 
    default: "PENDING" 
  },
  score: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  executionTime: { type: Number, default: 0 },
  analysisId: { type: ObjectId, ref: "AIAnalysis" },
  submittedAt: { type: Date, default: Date.now }
}
```

### 4.5 Weekly Reports Collection (`weekly_reports`)
```javascript
{
  classId: { type: ObjectId, ref: "Class", required: true },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  summary: { type: String, required: true },
  strongTopics: [{ type: String }],
  weakTopics: [{ type: String }],
  studentsNeedingAttention: [
    {
      studentId: { type: ObjectId, ref: "User" },
      name: String,
      reason: String
    }
  ],
  recommendations: [{ type: String }],
  model: { type: String },
  promptVersion: { type: String },
  generatedBy: { type: ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
}
```

### 4.6 AI Analyses Collection (`ai_analyses`)
```javascript
{
  studentId: { type: ObjectId, ref: "User" },
  classId: { type: ObjectId, ref: "Class" },
  type: { 
    type: String, 
    enum: ["CODE_ANALYSIS", "QUIZ_GENERATION", "LEARNING_PATH", "WEEKLY_REPORT"], 
    required: true 
  },
  inputReference: { type: String }, // e.g. submissionId or classId
  result: { type: Object, required: true },
  model: { type: String, required: true },
  promptVersion: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

---

## 5. Complete REST API Specifications

All endpoints return `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`.
Protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Registers a student (or verifies college ID) |
| **POST** | `/api/auth/login` | Public | Validates credentials, returns JWT & user object |
| **GET** | `/api/auth/me` | Authenticated | Returns current authenticated user profile |
| **GET** | `/api/student/dashboard` | `STUDENT` | Overall stats, weak topics, active assignments, today's quiz |
| **GET** | `/api/student/progress` | `STUDENT` | Language-wise and topic-wise mastery |
| **GET** | `/api/student/topics` | `STUDENT` | Detailed breakdown of all practiced topics |
| **GET** | `/api/student/learning-path` | `STUDENT` | Personalized AI-generated learning sequence |
| **GET** | `/api/classes` | Authenticated | Lists classes (teacher's created classes or student's enrolled classes) |
| **POST** | `/api/classes` | `TEACHER`, `ADMIN` | Creates a new class |
| **GET** | `/api/classes/:id` | Authenticated | Details of a class including students and languages |
| **PUT** | `/api/classes/:id` | `TEACHER`, `ADMIN` | Updates class info / enrolls students |
| **GET** | `/api/assignments` | Authenticated | Lists assignments for enrolled or taught classes |
| **POST** | `/api/assignments` | `TEACHER` | Creates an assignment with test cases & topics |
| **GET** | `/api/assignments/:id` | Authenticated | Detailed assignment info (hiding hidden test cases for students) |
| **PUT** | `/api/assignments/:id` | `TEACHER` | Updates an assignment |
| **DELETE** | `/api/assignments/:id` | `TEACHER` | Deletes an assignment |
| **POST** | `/api/submissions` | `STUDENT` | Submits code, enqueues execution & returns pending submission |
| **GET** | `/api/submissions/:id` | Authenticated | Returns submission status, test results, and AI feedback |
| **GET** | `/api/submissions/student/:id` | `STUDENT`, `TEACHER` | Returns student submission history |
| **GET** | `/api/quiz/today` | `STUDENT` | Returns or generates today's personalized AI quiz |
| **GET** | `/api/quiz/:id` | `STUDENT` | Retrieves a specific quiz without correct answers |
| **POST** | `/api/quiz/:id/submit` | `STUDENT` | Evaluates submitted answers, updates mastery scores |
| **GET** | `/api/analytics/student/:id` | `STUDENT`, `TEACHER` | Student performance trends & weak topics |
| **GET** | `/api/analytics/class/:id` | `TEACHER`, `ADMIN` | Aggregate class statistics, distribution & at-risk flags |
| **GET** | `/api/reports/weekly/:classId`| `TEACHER`, `ADMIN` | Fetches the latest or historical weekly AI reports |
| **POST** | `/api/reports/weekly/:classId/generate` | `TEACHER` | Triggers class metrics aggregation & calls AI service |
| **GET** | `/api/admin/dashboard` | `ADMIN` | System-wide statistics (users, classes, submissions) |
| **GET** | `/api/admin/users` | `ADMIN` | Paginated user management |
| **POST** | `/api/admin/users` | `ADMIN` | Creates users with any role (`TEACHER`, `ADMIN`, `STUDENT`) |

---

## 6. Multi-Language Isolated Code Runner

Extend `src/services/code-executor/code-executor.service.js` with runner strategies:

```javascript
const RUNNER_IMAGES = {
  javascript: {
    image: "node:22-alpine",
    filename: "solution.js",
    command: (file) => ["node", file]
  },
  python: {
    image: "python:3.11-alpine",
    filename: "solution.py",
    command: (file) => ["python", file]
  },
  cpp: {
    image: "gcc:alpine",
    filename: "solution.cpp",
    command: (file) => ["sh", "-c", `g++ -O2 ${file} -o /tmp/solution && /tmp/solution`]
  },
  java: {
    image: "eclipse-temurin:21-alpine",
    filename: "Solution.java",
    command: (file) => ["sh", "-c", `javac ${file} && java -cp /app Solution`]
  }
};
```

Container constraints:
- `--network none`
- `--memory 128m`
- `--cpus 0.5`
- `--pids-limit 64`
- Read-only code volume mount, execution timeout 5000ms.

---

## 7. Redis & BullMQ Worker Architecture (IMPLEMENTED)

### 7.1 Redis Connection Management (`src/config/redis.js`)
Two connection patterns are implemented via `ioredis`:
1. `getRedisConnection()`: Singleton connection for queue producers. Configured with `maxRetriesPerRequest: null` (mandatory for BullMQ) and `enableReadyCheck: false`.
2. `createRedisConnection()`: Dedicated factory creating isolated Redis connections for each BullMQ Worker to prevent blocking and connection contention.

### 7.2 Centralized Queue Registry (`src/queues/queue.config.js`)
All BullMQ queues are lazily initialized and share the primary Redis connection:
- `QUEUE_NAMES`:
  - `code-execution` (Job: `execute-submission`)
  - `ai-analysis` (Job: `analyze-submission`)
  - `quiz-generation` (Job: `generate-quiz`)
  - `weekly-report` (Job: `generate-weekly-report`)
- **Default Job Options**:
  - `attempts: 3` with exponential backoff (`delay: 2000ms`).
  - `removeOnComplete: 100` (retains last 100 successful jobs for inspection).
  - `removeOnFail: 500` (retains last 500 failed jobs for debugging).

### 7.3 Queue Dispatchers (Producers)
- **`src/queues/submission.queue.js`**:
  - `enqueueCodeExecution({ submissionId })`
- **`src/queues/ai.queue.js`**:
  - `enqueueAIAnalysis({ submissionId })`
  - `enqueueQuizGeneration({ studentId, weakTopics, count })`
- **`src/queues/report.queue.js`**:
  - `enqueueWeeklyReport({ classId, teacherId })`

### 7.4 Background Workers (`src/queues/workers/`)

#### 1. Submission Worker (`submission.worker.js`)
- **Concurrency**: 3 concurrent executions.
- **Rate Limiter**: Max 10 executions per 60,000ms.
- **Lifecycle**:
  1. Sets `Submission.status = "RUNNING"`.
  2. Runs `testCaseService.executeTestCases` against assignment test cases.
  3. Records `testCasesPassed`, `totalTestCases`, `score`, and output.
  4. Sets status to `PASSED`, `FAILED`, `TIMEOUT`, or `ERROR`.
  5. Automatically enqueues follow-up job to `ai-analysis` queue.

#### 2. AI Analysis Worker (`ai.worker.js`)
- **Concurrency**: 2 concurrent analysis jobs.
- **Lifecycle**:
  1. Calls Python AI service `POST /ai/analyze-submission`.
  2. Persists result in `AIAnalysis` collection.
  3. Updates `StudentTopicProgress` (increments submissions, mistakes, updates score).
  4. Links `analysisId` back into the `Submission` document.

#### 3. Weekly Report Worker (`report.worker.js`)
- **Concurrency**: 1 job at a time.
- **Lifecycle**:
  1. Aggregates class roster, assignments, submissions, quiz attempts, and topic masteries over the prior 7 days.
  2. Calls Python AI service `POST /ai/generate-weekly-report`.
  3. Persists report in both `WeeklyReport` and `AIAnalysis` collections.
  4. Provides heuristic fallback if Python AI service is temporarily unreachable.

---

## 8. Verification & Test Plan

1. **Authentication Tests**: Register student, log in, verify JWT payload with `userId` and `role`.
2. **Execution Test**: Submit JavaScript and Python solutions with matching and non-matching test cases.
3. **BullMQ Worker Verification**: Confirm background job picks up submission, updates status, and triggers AI analysis.
4. **AI Integration**: Ensure Node receives valid analysis and updates topic progress collection.
5. **Daily Quiz & Weekly Report**: Verify `GET /api/quiz/today` and `POST /api/reports/weekly/:classId/generate` end-to-end.
