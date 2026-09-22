# AI Programming Lab — Backend API

The backend orchestrator for the **AI-Powered Programming Lab Management System**. It manages persistent application state (Users, Classes, Assignments, Submissions, Quizzes, Progress, Weekly Reports, AI Analyses), isolates student code execution in Docker containers, and processes heavy jobs asynchronously via **Redis + BullMQ**.

---

## 1. Features & Capabilities

- **Role-Based Access Control (RBAC)**: Central JWT authentication with role authorization (`STUDENT`, `TEACHER`, `ADMIN`).
- **Asynchronous Execution & Queue Engine**: Redis + BullMQ queues for code execution, AI submission analysis, quiz generation, and weekly class reports.
- **Multi-Language Isolated Code Runner**: Docker-isolated sandbox supporting **JavaScript**, **Python**, **C++**, and **Java** with zero network access, memory limits, and timeouts.
- **Student Portal (`/api/student/*`)**: Aggregated dashboard, language/topic mastery breakdown, practiced topics history, and 24-hour cached AI learning path recommendations.
- **Daily Adaptive Quiz (`/api/quiz/today`)**: Daily personalized quiz automatically targeting weak topics via the Python AI service (with built-in fallback).
- **Weekly Class Reports**: Automated weekly aggregation of class metrics, weak topics, and at-risk students with AI summary recommendations.
- **Admin Management Portal (`/api/admin/*`)**: System dashboard metrics, paginated user management with search and filters, and class overview.
- **5-Factor Topic Mastery Engine**: Mathematically calculates topic competency across assignment scores, quiz scores, submission success rates, error frequencies, and practice recency.
- **Production Hardening**: Protected with `helmet`, `cors`, global and auth-specific rate limiting, request body limits, and a `/health` endpoint.

---

## 2. Tech Stack

| Component | Technology |
|---|---|
| **Runtime & Framework** | Node.js (CommonJS) + Express 5 |
| **Database** | MongoDB with Mongoose |
| **Job Queue & Cache** | Redis + BullMQ |
| **Sandbox Execution** | Docker (`node:22-alpine`, `python:3.11-alpine`, `gcc:alpine`, `eclipse-temurin:21-alpine`) |
| **AI Integration** | REST client to Python FastAPI AI microservice |
| **Validation & Auth** | Joi, JWT (`jsonwebtoken`), bcrypt password hashing |
| **Security Middleware** | `helmet`, `cors`, `express-rate-limit` |

---

## 3. Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js                     # MongoDB Mongoose connection
│   │   ├── env.js                    # Environment variable helpers
│   │   └── redis.js                  # Redis connection factory (singleton & worker pools)
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT authenticate & role authorize guards
│   │   ├── error.middleware.js       # Central error formatting & status mapping
│   │   └── validate.middleware.js    # Joi schema validation middleware
│   ├── modules/
│   │   ├── auth/                     # Register, login, me endpoints
│   │   ├── users/                    # User Mongoose model
│   │   ├── student/                  # Student dashboard, progress, topics, learning path
│   │   ├── classes/                  # Class creation, enrollment, language configuration
│   │   ├── assignments/              # Assignment management with test cases (visible/hidden)
│   │   ├── submissions/              # Code submission ingestion, status tracking, execution
│   │   ├── quizzes/                  # Quiz creation, daily quiz (/today), attempt evaluation
│   │   ├── progress/                 # 5-factor hybrid topic mastery calculation & tracking
│   │   ├── analytics/                # Student & class performance aggregates
│   │   ├── reports/                  # Student, class, and weekly AI class reports
│   │   └── admin/                    # System dashboard, user management CRUD, class overview
│   ├── queues/
│   │   ├── queue.config.js           # 4 BullMQ queue registries & default retry options
│   │   ├── submission.queue.js       # Code execution queue helper
│   │   ├── ai.queue.js               # AI analysis & quiz generation queue helpers
│   │   ├── report.queue.js           # Weekly report queue helper
│   │   └── workers/
│   │       ├── submission.worker.js  # Runs test cases, records score, enqueues AI analysis
│   │       ├── ai.worker.js          # Calls Python AI service, updates mastery & AIAnalysis
│   │       └── report.worker.js      # Aggregates class data, calls AI weekly reporting
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ai.service.js         # Axios client for Python AI microservice
│   │   │   └── aiAnalysis.model.js   # Audit trail collection (ai_analyses)
│   │   └── code-executor/
│   │       ├── code-executor.service.js # Multi-language Docker executor
│   │       └── test-case.service.js     # Test case batch execution & output normalizer
│   ├── app.js                        # Express app configuration & middleware pipeline
│   └── server.js                     # DB connection, worker bootstrap & HTTP listener
├── .env.example
├── package.json
└── README.md
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **MongoDB**: Local instance (`mongodb://localhost:27017`) or MongoDB Atlas
- **Redis**: Local server or container (`redis://localhost:6379`)
- **Docker**: Installed and running on host (for isolated code execution)

### Installation

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your credentials:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/programming_lab
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=1d
   REDIS_URL=redis://localhost:6379
   AI_SERVICE_URL=http://localhost:8000
   CORS_ORIGIN=*
   ```

4. Start the server:
   ```bash
   # Development mode with hot-reload
   npm run dev

   # Production mode
   npm start
   ```

The API will listen on `http://localhost:3000`. When started, it automatically initiates DB connection and spins up BullMQ workers.

---

## 5. Multi-Language Code Execution Sandbox

Student code runs inside ephemeral Docker containers with strict security constraints:

| Language | Docker Image | Filename | Execution Command |
|---|---|---|---|
| **JavaScript** | `node:22-alpine` | `main.js` | `node /app/main.js` |
| **Python** | `python:3.11-alpine` | `solution.py` | `python /app/solution.py` |
| **C++** | `gcc:alpine` | `solution.cpp` | `g++ -O2 /app/solution.cpp -o /tmp/solution && /tmp/solution` |
| **Java** | `eclipse-temurin:21-alpine` | `Solution.java` | `javac /app/Solution.java -d /tmp && java -cp /tmp Solution` |

### Container Security Profile
- `--network none` (no outbound/inbound network connectivity)
- `--memory 128m` (strict memory cap)
- `--cpus 0.5` (CPU quota)
- `--pids-limit 64` (prevents fork-bombs)
- `--read-only` (read-only root container filesystem)
- `--tmpfs /tmp:rw,nosuid,size=64m` (isolated temporary write space)
- `timeoutMs: 5000` (5-second execution ceiling per test case)

---

## 6. Asynchronous Queue Architecture (BullMQ)

Heavy operations are decoupled from HTTP request loops:

```text
Student Submits Code
        │
        ▼
POST /api/submissions (HTTP 201 Pending)
        │
        ├── Enqueue Job: execute-submission (BullMQ)
        │
        ▼
[Submission Worker] (Concurrency: 3)
   ├── Executes test cases in isolated Docker containers
   ├── Updates status to PASSED / FAILED / TIMEOUT / ERROR
   └── Enqueues Job: analyze-submission (BullMQ)
        │
        ▼
[AI Analysis Worker] (Concurrency: 2)
   ├── Calls Python AI microservice (POST /ai/analyze-submission)
   ├── Stores audit in AIAnalysis collection
   ├── Updates student topic mastery (5-factor formula)
   └── Links analysisId to Submission
```

---

## 7. Topic Mastery Scoring Formula

Competency per topic is computed deterministically using the hybrid 5-factor formula:

$$\text{Topic Score} = (0.35 \times A) + (0.25 \times Q) + (0.20 \times S) + (0.10 \times E) + (0.10 \times P)$$

- **$A$ (Assignment Score)**: Weighted average assignment score for the topic (0–100).
- **$Q$ (Quiz Score)**: Average quiz score for the topic (0–100).
- **$S$ (Submission Success Rate)**: $\frac{\text{Successful Submissions}}{\text{Total Submissions}} \times 100$.
- **$E$ (Error Frequency Factor)**: Inverse error rate based on mistakes per attempt: $\max(0, 100 - (\text{errorRate} \times 20))$.
- **$P$ (Practice Frequency Factor)**: Recency scoring (100 if practiced within 3 days, 75 if $\le 7$ days, 50 if $\le 14$ days, 30 otherwise).

---

## 8. API Reference

All protected endpoints require `Authorization: Bearer <JWT>`.

### Authentication — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a student account |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve profile of the logged-in user |

### Student Portal — `/api/student`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/student/dashboard` | `STUDENT`, `ADMIN` | Overview metrics, weak/strong topics, today's quiz status |
| `GET` | `/api/student/progress` | `STUDENT`, `ADMIN` | Language-wise and topic-wise mastery summary |
| `GET` | `/api/student/topics` | `STUDENT`, `ADMIN` | Detailed breakdown of all practiced topics |
| `GET` | `/api/student/learning-path` | `STUDENT`, `ADMIN` | AI-generated learning sequence (cached for 24h) |

### Daily Quiz & Quizzes — `/api/quizzes` (or `/api/quiz`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/quiz/today` | `STUDENT`, `ADMIN` | Retrieve or generate today's adaptive AI quiz |
| `GET` | `/api/quizzes` | Authenticated | List all available quizzes |
| `GET` | `/api/quizzes/:quizId` | Authenticated | Get quiz details (without correct answers) |
| `POST` | `/api/quizzes/:quizId/submit`| `STUDENT`, `ADMIN` | Submit answers, evaluate score, update mastery |
| `GET` | `/api/quizzes/:quizId/attempts`| Authenticated | View student attempts for a quiz |
| `POST` | `/api/quizzes` | `TEACHER`, `ADMIN` | Create a teacher-curated quiz |

### Classes — `/api/classes`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/classes` | Authenticated | List owned (teacher) or enrolled (student) classes |
| `POST` | `/api/classes` | `TEACHER`, `ADMIN` | Create a new classroom |
| `GET` | `/api/classes/:id` | Authenticated | Get class details including roster and languages |
| `PUT` | `/api/classes/:id` | `TEACHER`, `ADMIN` | Update class metadata |
| `POST` | `/api/classes/:id/students` | `TEACHER`, `ADMIN` | Enroll a student into the class |

### Assignments — `/api/assignments`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/assignments` | Authenticated | List accessible assignments |
| `POST` | `/api/assignments` | `TEACHER`, `ADMIN` | Create an assignment with visible/hidden test cases |
| `GET` | `/api/assignments/:id` | Authenticated | Get assignment details (hides hidden tests from students) |
| `PUT` | `/api/assignments/:id` | `TEACHER`, `ADMIN` | Update assignment details |
| `DELETE` | `/api/assignments/:id` | `TEACHER`, `ADMIN` | Delete an assignment |

### Submissions — `/api/submissions`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/submissions` | `STUDENT` | Submit code; enqueues execution & returns 201 Pending |
| `GET` | `/api/submissions` | `STUDENT` | List current user's submission history |
| `GET` | `/api/submissions/:id` | Authenticated | Get submission details, execution logs, and AI feedback |
| `GET` | `/api/submissions/assignment/:id` | `TEACHER` | View submissions for a teacher's assignment |
| `GET` | `/api/submissions/:id/details` | `TEACHER` | Detailed inspection for teacher |

### Weekly Reports — `/api/reports`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports/student` | `STUDENT`, `ADMIN` | Student personal report |
| `GET` | `/api/reports/class/:classId` | `TEACHER`, `ADMIN` | Class aggregate performance report |
| `GET` | `/api/reports/weekly/:classId` | `TEACHER`, `ADMIN` | Fetch historical weekly AI reports |
| `POST` | `/api/reports/weekly/:classId/generate` | `TEACHER`, `ADMIN` | Enqueue weekly report generation in BullMQ |

### Admin Module — `/api/admin`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | `ADMIN` | System metrics (total users, classes, pass rate) |
| `GET` | `/api/admin/users` | `ADMIN` | Paginated user management with search & filters |
| `POST` | `/api/admin/users` | `ADMIN` | Create users with any role (`STUDENT`, `TEACHER`, `ADMIN`) |
| `GET` | `/api/admin/users/:id` | `ADMIN` | Inspect user details |
| `PUT` | `/api/admin/users/:id` | `ADMIN` | Update user metadata or role |
| `DELETE` | `/api/admin/users/:id` | `ADMIN` | Delete a user account |
| `GET` | `/api/admin/classes` | `ADMIN` | System-wide class roster & enrollment overview |

### Health Check — `/health`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service uptime and status heartbeat |

---

## 9. Standard API Responses

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed description of what went wrong"
  }
}
```
