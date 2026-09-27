# 🎓 AI-Powered Programming Lab Management Platform

A full-stack college programming-lab management system that uses AI to analyze student code, generate personalized quizzes, detect weak topics, recommend learning paths, and produce weekly class reports for teachers.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [1. Clone & Configure Environment](#1-clone--configure-environment)
  - [2. Option A — Docker Compose (Recommended)](#2-option-a--docker-compose-recommended)
  - [2. Option B — Manual (Local Development)](#2-option-b--manual-local-development)
  - [3. Seed the Database](#3-seed-the-database)
  - [4. Offline & Local Development Guide (No Internet)](#offline--local-development-guide-no-internet)
- [Default Credentials](#default-credentials)
- [Features & How to Use Them](#features--how-to-use-them)
  - [Authentication & Authorization](#1-authentication--authorization)
  - [Student Features](#2-student-features)
  - [Teacher Features](#3-teacher-features)
  - [Admin Features](#4-admin-features)
  - [AI-Powered Features](#5-ai-powered-features)
  - [Code Execution Engine](#6-code-execution-engine)
  - [Background Job Queue System](#7-background-job-queue-system)
- [API Endpoints Reference](#api-endpoints-reference)
- [Environment Variables Reference](#environment-variables-reference)
- [Architecture Overview](#architecture-overview)
- [Troubleshooting](#troubleshooting)

---

## Overview

The platform supports three user roles:

| Role        | Purpose                                                                                             |
|-------------|-----------------------------------------------------------------------------------------------------|
| **Student** | Receive assignments, submit code via Monaco Editor, take AI-generated daily quizzes, track progress, view weak topics, get personalized learning paths |
| **Teacher** | Create assignments with test cases, review submissions, monitor individual/class progress, generate weekly AI reports                                  |
| **Admin**   | Manage users, teachers, students, classes, and view system-level analytics                                                                            |

AI services analyze submissions, identify weak topics, generate quizzes, recommend learning paths, and produce weekly class reports — all through a dedicated Python/FastAPI microservice calling the OpenAI API.

---

## Technology Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 19 + JavaScript (Vite 8)      |
| UI Library     | Ant Design 6                        |
| Code Editor    | Monaco Editor (`@monaco-editor/react`) |
| Charts         | Recharts                            |
| Backend        | Node.js + Express 5                 |
| AI Service     | Python + FastAPI                    |
| Database       | MongoDB 7 (Mongoose ODM)            |
| Queue / Cache  | Redis 7 + BullMQ                    |
| AI Provider    | OpenAI API (GPT-4o / GPT-4o-mini)   |
| Auth           | JWT + bcryptjs                      |
| Code Execution | Docker containers (sandboxed)       |
| Deployment     | Docker Compose                      |

---

## Prerequisites

Before running the project, make sure you have the following installed:

### Required (for any setup method)

| Tool                 | Minimum Version | Purpose                                             | Install Link                                       |
|----------------------|-----------------|------------------------------------------------------|-----------------------------------------------------|
| **Docker Desktop**   | 24.x+           | Runs MongoDB, Redis, code execution sandboxes, and full-stack deployment | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Docker Compose**   | v2              | Orchestrates multi-container setup                   | Bundled with Docker Desktop                          |

### Required (for local/manual development only)

| Tool         | Minimum Version | Purpose                        | Install Link                                       |
|--------------|-----------------|--------------------------------|-----------------------------------------------------|
| **Node.js**  | 18.x+           | Backend & Frontend runtime     | [nodejs.org](https://nodejs.org/)                    |
| **npm**      | 9.x+            | Package manager                | Comes with Node.js                                   |
| **Python**   | 3.10+           | AI service runtime             | [python.org](https://www.python.org/downloads/)      |
| **pip**      | 22+             | Python package manager         | Comes with Python                                    |
| **MongoDB**  | 7.0+            | Database (if not using Docker) | [mongodb.com](https://www.mongodb.com/try/download/) |
| **Redis**    | 7.x+            | Queue broker (if not using Docker) | [redis.io](https://redis.io/download/)              |

### Optional

| Tool                  | Purpose                                              |
|-----------------------|------------------------------------------------------|
| **OpenAI API Key**    | Required for real AI features (code analysis, quizzes, reports). Without it, the AI service runs in **mock mode** returning placeholder responses. |
| **Git**               | Version control                                      |

---

## Project Structure

```
project_/
│
├── .env.example                  # Root environment template (all services)
├── .env.production.example       # Production environment template
├── docker-compose.yml            # Development Docker Compose (all 5 services)
├── docker-compose.prod.yml       # Production Docker Compose with SSL/auth
├── deploy.sh                     # Automated deployment script
├── DEPLOYMENT.md                 # Production deployment guide
├── programming_lab_ai_architecture.md  # Full architecture specification
│
├── frontend/                     # React SPA (Vite)
│   ├── Dockerfile                # Frontend Docker build
│   ├── nginx.conf                # Nginx config for serving SPA + API proxy
│   ├── nginx.ssl.conf            # Nginx config with SSL/HTTPS
│   ├── vite.config.js            # Vite dev server config with /api proxy
│   ├── index.html                # HTML entry point
│   ├── package.json              # Frontend dependencies & scripts
│   └── src/
│       ├── main.jsx              # React app entry point
│       ├── App.jsx               # Root component
│       ├── App.css               # Global app styles
│       ├── index.css             # Base CSS & design tokens
│       │
│       ├── routes/
│       │   └── AppRoutes.jsx     # All route definitions with role guards
│       │
│       ├── layouts/
│       │   ├── AppLayout.jsx     # Authenticated layout (sidebar + navbar)
│       │   └── AuthLayout.jsx    # Public layout (login/register)
│       │
│       ├── context/
│       │   ├── AuthContext.jsx   # JWT auth state management
│       │   └── ThemeContext.jsx  # Dark/light theme toggle
│       │
│       ├── hooks/
│       │   ├── useAuth.js        # Auth context hook
│       │   ├── useAssignments.js # Assignment data fetching hook
│       │   └── useQuiz.js        # Quiz data fetching hook
│       │
│       ├── services/             # API client layer (axios)
│       │   ├── api.js            # Axios instance with interceptors
│       │   ├── auth.service.js
│       │   ├── assignment.service.js
│       │   ├── submission.service.js
│       │   ├── class.service.js
│       │   ├── progress.service.js
│       │   ├── quiz.service.js
│       │   ├── report.service.js
│       │   └── admin.service.js
│       │
│       ├── components/
│       │   ├── shared/           # Reusable UI components
│       │   │   ├── Navbar.jsx          # Top navigation bar
│       │   │   ├── Sidebar.jsx         # Role-based sidebar menu
│       │   │   ├── ProtectedRoute.jsx  # Auth guard (redirects to login)
│       │   │   ├── RoleRoute.jsx       # Role-based access control guard
│       │   │   ├── CodeEditor.jsx      # Monaco Editor wrapper
│       │   │   ├── StatCard.jsx        # Dashboard statistics card
│       │   │   ├── ChartCard.jsx       # Chart container component
│       │   │   ├── LoadingSpinner.jsx  # Loading state component
│       │   │   ├── ErrorState.jsx      # Error display component
│       │   │   └── EmptyState.jsx      # Empty data display
│       │   │
│       │   ├── student/          # Student-specific components
│       │   │   ├── DailyQuizWidget.jsx        # Dashboard quiz card
│       │   │   ├── WeakTopicsBanner.jsx        # Weak topics alert
│       │   │   ├── RecommendedStepsCard.jsx    # Learning recommendations
│       │   │   └── SubmissionResultModal.jsx   # Code submission results
│       │   │
│       │   ├── teacher/          # Teacher-specific components
│       │   │   ├── CreateAssignmentModal.jsx   # Assignment creation form
│       │   │   ├── CreateClassModal.jsx        # Class creation form
│       │   │   └── AtRiskStudentsTable.jsx     # At-risk student list
│       │   │
│       │   └── admin/            # Admin-specific components
│       │       ├── CreateUserModal.jsx         # User creation form
│       │       └── SystemHealthBadge.jsx       # System status indicator
│       │
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx
│       │   │   └── RegisterPage.jsx
│       │   │
│       │   ├── student/
│       │   │   ├── StudentDashboard.jsx    # Overview with stats & widgets
│       │   │   ├── AssignmentList.jsx      # Browse available assignments
│       │   │   ├── AssignmentDetails.jsx   # Code editor + submit + results
│       │   │   ├── SubmissionHistory.jsx   # Past submissions list
│       │   │   ├── ProgressDashboard.jsx   # Topic mastery charts
│       │   │   ├── TodayQuizPage.jsx       # Daily AI quiz interface
│       │   │   └── LearningPathPage.jsx    # Personalized learning path
│       │   │
│       │   ├── teacher/
│       │   │   ├── TeacherDashboard.jsx       # Class overview & stats
│       │   │   ├── ClassListPage.jsx          # Manage classes
│       │   │   ├── ClassDetailsPage.jsx       # Single class view
│       │   │   ├── AssignmentManagement.jsx   # Create & manage assignments
│       │   │   ├── SubmissionReviewPage.jsx   # Review student submissions
│       │   │   ├── StudentProgressView.jsx    # Individual student progress
│       │   │   ├── ClassAnalyticsPage.jsx     # Class-wide analytics
│       │   │   └── WeeklyReportPage.jsx       # AI-generated weekly reports
│       │   │
│       │   └── admin/
│       │       ├── AdminDashboard.jsx        # System-wide dashboard
│       │       ├── UserManagementPage.jsx    # CRUD users
│       │       └── ClassManagementPage.jsx   # Manage all classes
│       │
│       └── utils/
│           ├── constants.js      # Roles, statuses, topic lists
│           └── formatters.js     # Date/number formatting helpers
│
├── backend/                      # Node.js + Express API Server
│   ├── Dockerfile                # Backend Docker build
│   ├── package.json              # Dependencies & scripts
│   ├── .env.example              # Backend environment template
│   └── src/
│       ├── server.js             # Entry point: DB connect, start workers, listen
│       ├── app.js                # Express app: middleware, routes, error handling
│       │
│       ├── config/
│       │   ├── db.js             # MongoDB/Mongoose connection
│       │   ├── env.js            # Environment variable loader
│       │   └── redis.js          # Redis/IORedis connection + availability check
│       │
│       ├── middleware/
│       │   ├── auth.middleware.js      # JWT verify + authenticate + authorize
│       │   ├── validate.middleware.js  # Joi schema validation
│       │   └── error.middleware.js     # Global error handler
│       │
│       ├── modules/              # Feature modules (controller/service/model/routes/validation)
│       │   ├── auth/             # Login, register, JWT issuance
│       │   │   ├── auth.controller.js
│       │   │   ├── auth.service.js
│       │   │   ├── auth.routes.js
│       │   │   └── auth.validation.js
│       │   │
│       │   ├── users/            # User model (shared across modules)
│       │   │   └── user.model.js
│       │   │
│       │   ├── student/          # Student dashboard aggregation
│       │   │   ├── student.controller.js
│       │   │   ├── student.service.js
│       │   │   └── student.routes.js
│       │   │
│       │   ├── admin/            # Admin user/class/system management
│       │   │   ├── admin.controller.js
│       │   │   ├── admin.service.js
│       │   │   └── admin.routes.js
│       │   │
│       │   ├── classes/          # Class CRUD + student enrollment
│       │   │   ├── class.controller.js
│       │   │   ├── class.service.js
│       │   │   ├── class.model.js
│       │   │   ├── class.routes.js
│       │   │   └── class.validation.js
│       │   │
│       │   ├── assignments/      # Assignment CRUD + test cases
│       │   │   ├── assignment.controller.js
│       │   │   ├── assignment.service.js
│       │   │   ├── assignment.model.js
│       │   │   ├── assignment.routes.js
│       │   │   └── assignment.validation.js
│       │   │
│       │   ├── submissions/      # Code submission + execution + test case evaluation
│       │   │   ├── submission.controller.js
│       │   │   ├── submission.service.js
│       │   │   ├── submission.model.js
│       │   │   ├── submission.routes.js
│       │   │   └── submission.validation.js
│       │   │
│       │   ├── quizzes/          # AI quiz generation + attempt tracking
│       │   │   ├── quiz.controller.js
│       │   │   ├── quiz.service.js
│       │   │   ├── quiz.model.js
│       │   │   ├── quizAttempt.model.js
│       │   │   ├── quiz.routes.js
│       │   │   └── quiz.validation.js
│       │   │
│       │   ├── progress/         # Student topic mastery tracking
│       │   │   ├── progress.controller.js
│       │   │   ├── progress.service.js
│       │   │   ├── progress.model.js
│       │   │   └── progress.routes.js
│       │   │
│       │   ├── analytics/        # Class & student analytics aggregation
│       │   │   ├── analytics.controller.js
│       │   │   ├── analytics.service.js
│       │   │   └── analytics.routes.js
│       │   │
│       │   └── reports/          # Weekly AI-generated class reports
│       │       ├── reports.controller.js
│       │       ├── reports.service.js
│       │       ├── weeklyReport.model.js
│       │       └── reports.routes.js
│       │
│       ├── services/
│       │   ├── ai/               # AI service HTTP client (calls Python service)
│       │   │   ├── ai.service.js       # Axios client for /ai/* endpoints
│       │   │   └── aiAnalysis.model.js  # AI analysis result storage model
│       │   │
│       │   └── code-executor/    # Sandboxed code execution via Docker
│       │       └── code-executor.service.js  # Docker container runner
│       │
│       ├── queues/               # BullMQ job queues (Redis-backed)
│       │   ├── queue.config.js        # Queue connection & initialization
│       │   ├── submission.queue.js    # Submission execution queue
│       │   ├── ai.queue.js            # AI analysis & quiz generation queue
│       │   ├── report.queue.js        # Weekly report generation queue
│       │   └── workers/
│       │       ├── submission.worker.js   # Processes code execution jobs
│       │       ├── ai.worker.js           # Processes AI analysis jobs
│       │       └── report.worker.js       # Processes report generation jobs
│       │
│       ├── scripts/
│       │   └── seed.js           # Database seeder (demo users, class, assignment)
│       │
│       └── utils/                # Shared utilities (currently empty)
│
└── ai-service/                   # Python FastAPI AI Microservice
    ├── Dockerfile                # AI service Docker build
    ├── docker-compose.yml        # Standalone AI service compose
    ├── requirements.txt          # Python dependencies
    ├── requirements-dev.txt      # Development dependencies (pytest)
    ├── pytest.ini                # Test configuration
    ├── .env.example              # AI service environment template
    └── app/
        ├── main.py               # FastAPI app: middleware, error handling, router
        │
        ├── core/
        │   ├── config.py         # Pydantic settings (env vars)
        │   ├── exceptions.py     # Custom exception classes
        │   └── logging.py        # Structured JSON logging
        │
        ├── api/
        │   ├── router.py         # Root API router
        │   └── routes/
        │       ├── health.py           # Health check endpoint
        │       ├── analysis.py         # POST /ai/analyze — code analysis
        │       ├── quiz.py             # POST /ai/quiz — quiz generation
        │       ├── learning_path.py    # POST /ai/learning-path
        │       └── reports.py          # POST /ai/report — weekly reports
        │
        ├── services/
        │   ├── ai_client.py            # OpenAI API wrapper (real + mock mode)
        │   ├── code_analysis_service.py
        │   ├── quiz_service.py
        │   ├── learning_path_service.py
        │   ├── weak_topic_service.py
        │   └── report_service.py
        │
        ├── prompts/              # Versioned prompt templates
        │   ├── analysis_v1.py
        │   ├── quiz_v1.py
        │   ├── learning_path_v1.py
        │   └── report_v1.py
        │
        ├── schemas/              # Pydantic request/response models
        │   ├── common.py
        │   ├── analysis.py
        │   ├── quiz.py
        │   ├── learning_path.py
        │   └── report.py
        │
        ├── taxonomy/
        │   └── programming_topics.py  # Predefined topic graph
        │
        └── tests/                # Pytest test suite
```

---

## Getting Started

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone <repository-url>
cd project_

# Copy the root environment template
cp .env.example .env
```

Edit `.env` and set your values:

```env
# Required for real AI features (skip if using mock mode)
OPENAI_API_KEY=sk-your-key-here

# Set to false to use real OpenAI API; true for mock responses
AI_MOCK_MODE=true

# Generate a secure secret: openssl rand -hex 32
JWT_SECRET=your_secure_random_secret
```

### 2. Option A — Docker Compose (Recommended)

This starts all 5 services (MongoDB, Redis, AI Service, Backend, Frontend) in one command:

```bash
docker compose up --build
```

| Service      | URL                           |
|-------------|-------------------------------|
| Frontend    | http://localhost:80 or http://localhost:5173 |
| Backend API | http://localhost:3000          |
| AI Service  | http://localhost:8000          |
| MongoDB     | localhost:27017                |
| Redis       | localhost:6379                 |

To stop all services:

```bash
docker compose down
```

To stop and remove all data volumes:

```bash
docker compose down -v
```

### 2. Option B — Manual (Local Development)

If you prefer running each service individually for development:

#### Start MongoDB & Redis

Make sure MongoDB and Redis are running locally (or via Docker individually):

```bash
# Using Docker for just the databases
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Start the AI Service (Python)

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and set OPENAI_API_KEY if needed

# Start the service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Start the Backend (Node.js)

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env — ensure MONGODB_URI, REDIS_URL, AI_SERVICE_URL are correct

# Start in development mode (with hot reload)
npm run dev
```

#### Start the Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to backend automatically)
npm run dev
```

The frontend dev server runs at **http://localhost:5173** and automatically proxies `/api` requests to the backend at `http://localhost:3000`.

### 3. Seed the Database

After all services are running, seed the database with demo data:

```bash
cd backend
npm run seed
```

This creates:
- 1 Admin user
- 1 Teacher user
- 1 Student user
- 1 Sample class ("CS101: Data Structures & Algorithms")
- 1 Sample assignment ("Find Double of Number") with test cases
- 1 Sample assignment ("Nested Number Triangle Pattern" in C++)
- 1 Sample assignment ("Reverse a String" in Python)

### 4. Offline & Local Development Guide (No Internet)

For full step-by-step documentation on running without internet, see **[OFFLINE_DEVELOPMENT.md](OFFLINE_DEVELOPMENT.md)**.

- **Local MongoDB**: `MONGODB_URI=mongodb://localhost:27017/ai-lab` (in `.env` and `backend/.env`)
- **Remote MongoDB Atlas**: Uncomment `MONGODB_URI=mongodb+srv://...` in `.env` and `backend/.env`
- **Mock AI Mode**: Set `AI_MOCK_MODE=true` in `.env` and `ai-service/.env` (no OpenAI API key needed)
- **Local Code Execution**: Uses Docker engines (`gcc:latest`, `node:22-alpine`, `python:3.11-alpine`)
- **Error Handling**: Database and network errors return clean user-friendly messages rather than raw hostnames or stack traces.

---


## Default Credentials

After seeding, use these credentials to log in:

| Role    | Email             | Password      |
|---------|-------------------|---------------|
| Admin   | admin@lab.edu     | Password@123  |
| Teacher | teacher@lab.edu   | Password@123  |
| Student | student@lab.edu   | Password@123  |

---

## Features & How to Use Them

### 1. Authentication & Authorization

**How it works:** JWT-based authentication with role-based access control (RBAC).

| Feature          | Description                                                                                |
|------------------|--------------------------------------------------------------------------------------------|
| Register         | Create a new account at `/register` — select role (Student/Teacher)                        |
| Login            | Authenticate at `/login` — receive JWT stored in localStorage                              |
| Protected Routes | All dashboard routes require a valid JWT token                                             |
| Role Guards      | Each role (STUDENT, TEACHER, ADMIN) can only access their own section                      |
| Auto-redirect    | Unauthenticated users are redirected to `/login`                                           |

**Requirements:** MongoDB must be running. No additional services needed.

---

### 2. Student Features

| Feature                | Route                        | Description                                             | Requirements                          |
|------------------------|------------------------------|---------------------------------------------------------|---------------------------------------|
| **Dashboard**          | `/student/dashboard`         | Overview with stats, recent activity, weak topics, quiz widget, recommended steps | Backend + MongoDB                     |
| **Assignments**        | `/student/assignments`       | Browse all assignments for enrolled classes             | Backend + MongoDB                     |
| **Code Editor & Submit** | `/student/assignments/:id` | Write code in Monaco Editor, select language, submit for execution | Backend + MongoDB + **Docker** + Redis |
| **Submission History** | `/student/submissions`       | View all past submissions with status and scores        | Backend + MongoDB                     |
| **Progress Dashboard** | `/student/progress`          | Topic mastery charts (per language) with scores 0–100   | Backend + MongoDB                     |
| **Daily Quiz**         | `/student/quiz`              | Take an AI-generated quiz based on weak topics          | Backend + MongoDB + Redis + **AI Service** + **OpenAI API Key** (or mock mode) |
| **Learning Path**      | `/student/learning-path`     | Personalized step-by-step learning recommendations      | Backend + MongoDB + **AI Service** + **OpenAI API Key** (or mock mode) |

**Code Submission Flow:**
1. Student opens an assignment and writes code in the Monaco Editor
2. Selects a programming language (JavaScript, Python, C++, Java)
3. Clicks "Submit" — code is sent to the backend
4. Backend queues a submission job via BullMQ (Redis)
5. The submission worker spins up an isolated Docker container, executes the code, and runs test cases
6. Results (pass/fail, stdout, stderr, execution time) are saved
7. If AI is enabled, an AI analysis job is also queued to analyze code quality and update topic mastery

> **⚠️ Docker is required** for code execution. The backend spawns Docker containers to run student code safely. Without Docker, submissions will fail.

---

### 3. Teacher Features

| Feature                  | Route                          | Description                                                | Requirements                          |
|--------------------------|--------------------------------|------------------------------------------------------------|---------------------------------------|
| **Dashboard**            | `/teacher/dashboard`           | Class overview, student stats, at-risk students            | Backend + MongoDB                     |
| **Manage Classes**       | `/teacher/classes`             | Create classes, set languages & semester, enroll students  | Backend + MongoDB                     |
| **Class Details**        | `/teacher/classes/:id`         | View enrolled students, class assignments                  | Backend + MongoDB                     |
| **Manage Assignments**   | `/teacher/assignments`         | Create assignments with descriptions, test cases, deadlines, topics, difficulty | Backend + MongoDB                     |
| **Review Submissions**   | `/teacher/submissions/:id`     | Read student code, view execution results, AI analysis     | Backend + MongoDB                     |
| **Student Progress**     | `/teacher/students/:id`        | Deep-dive into individual student topic mastery            | Backend + MongoDB                     |
| **Class Analytics**      | `/teacher/analytics`           | Aggregate class performance charts, topic heatmaps         | Backend + MongoDB                     |
| **Weekly Reports**       | `/teacher/reports`             | AI-generated weekly class reports with recommendations     | Backend + MongoDB + Redis + **AI Service** + **OpenAI API Key** (or mock mode) |

**Creating an Assignment:**
1. Navigate to `/teacher/assignments`
2. Click "Create Assignment"
3. Fill in title, description, language, difficulty, topics
4. Add test cases (input → expected output; mark some as hidden)
5. Set a deadline and assign to a class
6. Students in that class will see the assignment

---

### 4. Admin Features

| Feature              | Route               | Description                                        | Requirements      |
|----------------------|---------------------|----------------------------------------------------|-------------------|
| **Dashboard**        | `/admin/dashboard`   | System-wide statistics (total users, classes, etc.) | Backend + MongoDB |
| **User Management**  | `/admin/users`       | Create, view, and manage all users (any role)      | Backend + MongoDB |
| **Class Management** | `/admin/classes`     | View and manage all classes in the system           | Backend + MongoDB |

---

### 5. AI-Powered Features

All AI features are powered by the Python FastAPI microservice which calls the OpenAI API.

| AI Feature               | Trigger                                          | What It Does                                                                           | AI Endpoint              |
|--------------------------|--------------------------------------------------|----------------------------------------------------------------------------------------|--------------------------|
| **Code Analysis**        | Automatically after each submission              | Analyzes code for quality, identifies topic mastery scores, mistakes, and recommendations | `POST /ai/analyze`       |
| **Daily Quiz Generation** | When student requests a quiz                    | Generates personalized MCQ quiz targeting weak topics                                   | `POST /ai/quiz`          |
| **Learning Path**        | When student views their learning path           | Creates a step-by-step learning plan based on strong/weak topics                        | `POST /ai/learning-path` |
| **Weak Topic Detection** | Computed from submission + quiz + assignment data | Hybrid approach: objective scores (0–100) + AI explanation                               | Internal computation     |
| **Weekly Class Report**  | Teacher requests or scheduled                    | Produces class summary, strong/weak topics, at-risk students, teaching recommendations  | `POST /ai/report`        |

**Requirements for AI Features to Work:**

| Requirement               | Details                                                                                           |
|---------------------------|---------------------------------------------------------------------------------------------------|
| AI Service running         | The Python FastAPI service must be running at the URL specified by `AI_SERVICE_URL`               |
| OpenAI API Key             | Set `OPENAI_API_KEY` in your `.env` file. Get one from [platform.openai.com](https://platform.openai.com/) |
| Mock Mode (fallback)       | Set `AI_MOCK_MODE=true` to use placeholder responses without an API key (for development/testing) |
| Redis running              | Required for BullMQ job queues that process AI analysis jobs asynchronously                        |

**Topic Mastery Scoring:**

The system uses a hybrid approach — not purely AI-driven:

```
Mastery Score (0–100) = assignment performance + quiz performance
                        + submission success rate + error frequency
                        + practice frequency

Classification:
  0–49   → Weak
  50–69  → Needs Improvement
  70–100 → Good
```

AI then provides explanations and recommendations on top of these objective scores.

---

### 6. Code Execution Engine

The code execution service runs student code in **isolated Docker containers** with strict security constraints:

| Constraint       | Value              |
|------------------|--------------------|
| Network          | Disabled (`--network none`) |
| Memory limit     | 128 MB             |
| CPU limit        | 0.5 cores          |
| PID limit        | 64 processes       |
| Filesystem       | Read-only (+ 64MB tmpfs for `/tmp`) |
| Timeout          | 5 seconds (configurable) |

**Supported Languages:**

| Language   | Docker Image             | File          |
|------------|--------------------------|---------------|
| JavaScript | `node:22-alpine`         | `main.js`     |
| Python     | `python:3.11-alpine`     | `solution.py` |
| C++        | `gcc:alpine`             | `solution.cpp` |
| Java       | `eclipse-temurin:21-alpine` | `Solution.java` |

**Requirements:**
- **Docker must be running** on the host machine
- The backend container (or process) must have access to the Docker socket (`/var/run/docker.sock`)
- The language Docker images must be pulled (they are pulled automatically on first use):
  ```bash
  docker pull node:22-alpine
  docker pull python:3.11-alpine
  docker pull gcc:alpine
  docker pull eclipse-temurin:21-alpine
  ```

---

### 7. Background Job Queue System

The platform uses **BullMQ** with **Redis** for asynchronous job processing:

| Queue              | Worker File              | Purpose                                                    |
|--------------------|--------------------------|------------------------------------------------------------|
| `submission`       | `submission.worker.js`    | Execute student code in Docker + run test cases            |
| `aiAnalysis`       | `ai.worker.js`            | Send submissions to AI service for analysis + update topic progress |
| `quizGeneration`   | (part of `ai.worker.js`)  | Generate AI quizzes                                        |
| `weeklyReport`     | `report.worker.js`        | Generate AI weekly class reports                           |

**Fallback behavior:** If Redis is unavailable, the backend logs a warning and falls back to synchronous execution mode for submissions. AI features that depend on the queue will not work without Redis.

**Requirements:** Redis must be running at the URL specified by `REDIS_URL`.

---

## API Endpoints Reference

All API endpoints are prefixed with `/api`.

### Authentication
| Method | Endpoint              | Description        | Auth Required |
|--------|-----------------------|--------------------|---------------|
| POST   | `/api/auth/register`  | Create new account | No            |
| POST   | `/api/auth/login`     | Login & get JWT    | No            |

### Student
| Method | Endpoint                      | Description                    | Role    |
|--------|-------------------------------|--------------------------------|---------|
| GET    | `/api/student/dashboard`      | Student dashboard data         | STUDENT |

### Assignments
| Method | Endpoint                       | Description                         | Role            |
|--------|--------------------------------|-------------------------------------|-----------------|
| GET    | `/api/assignments`             | List assignments (filtered by role) | STUDENT/TEACHER |
| GET    | `/api/assignments/:id`         | Get assignment details              | STUDENT/TEACHER |
| POST   | `/api/assignments`             | Create assignment                   | TEACHER         |
| PUT    | `/api/assignments/:id`         | Update assignment                   | TEACHER         |
| DELETE | `/api/assignments/:id`         | Delete assignment                   | TEACHER         |

### Submissions
| Method | Endpoint                       | Description                    | Role            |
|--------|--------------------------------|--------------------------------|-----------------|
| POST   | `/api/submissions`             | Submit code for execution      | STUDENT         |
| GET    | `/api/submissions`             | Get submission history         | STUDENT/TEACHER |
| GET    | `/api/submissions/:id`         | Get submission details         | STUDENT/TEACHER |

### Classes
| Method | Endpoint                       | Description                    | Role            |
|--------|--------------------------------|--------------------------------|-----------------|
| GET    | `/api/classes`                 | List classes (enrolled for student, taught for teacher) | STUDENT/TEACHER |
| POST   | `/api/classes`                 | Create class                   | TEACHER         |
| GET    | `/api/classes/:id`             | Get class details              | STUDENT/TEACHER |
| PUT    | `/api/classes/:id`             | Update class                   | TEACHER         |
| POST   | `/api/classes/:id/students`    | Enroll student into class      | TEACHER         |

### Colleges & Institutional Multi-Tenancy
| Method | Endpoint                       | Description                    | Role            |
|--------|--------------------------------|--------------------------------|-----------------|
| GET    | `/api/colleges/public`         | List active colleges & domains | Public          |
| GET    | `/api/colleges/:id`            | Get college details            | All Roles       |
| POST   | `/api/colleges`                | Register college               | ADMIN           |
| PUT    | `/api/colleges/:id/domains`    | Update authorized email domains| ADMIN           |

### Progress
| Method | Endpoint                       | Description                    | Role    |
|--------|--------------------------------|--------------------------------|---------|
| GET    | `/api/progress`                | Get student topic progress     | STUDENT |

### Quizzes
| Method | Endpoint                       | Description                    | Role    |
|--------|--------------------------------|--------------------------------|---------|
| GET    | `/api/quizzes/today`           | Get today's quiz               | STUDENT |
| POST   | `/api/quizzes/generate`        | Generate a new quiz            | STUDENT |
| POST   | `/api/quizzes/:id/submit`      | Submit quiz answers            | STUDENT |

### Analytics
| Method | Endpoint                       | Description                    | Role    |
|--------|--------------------------------|--------------------------------|---------|
| GET    | `/api/analytics/class/:id`     | Get class analytics            | TEACHER |
| GET    | `/api/analytics/student/:id`   | Get student analytics          | TEACHER |

### Reports
| Method | Endpoint                       | Description                    | Role    |
|--------|--------------------------------|--------------------------------|---------|
| POST   | `/api/reports/weekly`          | Generate weekly report         | TEACHER |
| GET    | `/api/reports`                 | Get past reports               | TEACHER |

### Admin & Access Control
| Method | Endpoint                       | Description                    | Role  |
|--------|--------------------------------|--------------------------------|-------|
| GET    | `/api/admin/dashboard`         | College-scoped metrics         | ADMIN |
| GET    | `/api/admin/users`             | List all college users         | ADMIN |
| POST   | `/api/admin/users`             | Provision a user directly      | ADMIN |
| DELETE | `/api/admin/users/:id`         | Delete a user                  | ADMIN |
| GET    | `/api/admin/teachers/pending`  | List teachers awaiting approval| ADMIN |
| POST   | `/api/admin/teachers/:id/approve` | Approve teacher account     | ADMIN |
| POST   | `/api/admin/teachers/:id/reject`  | Reject teacher account      | ADMIN |
| GET    | `/api/admin/college`           | Get current college profile    | ADMIN |
| PUT    | `/api/admin/college/domains`   | Update whitelisted email domains| ADMIN |

### Health Check
| Method | Endpoint    | Description      | Auth Required |
|--------|-------------|------------------|---------------|
| GET    | `/health`   | Backend health   | No            |

---

## Environment Variables Reference

### Root `.env` (used by Docker Compose)

| Variable                | Default                                    | Description                                      |
|-------------------------|--------------------------------------------|--------------------------------------------------|
| `PORT`                  | `3000`                                     | Backend server port                              |
| `MONGODB_URI`           | `mongodb://mongodb:27017/programming_lab`  | MongoDB connection string                        |
| `MONGODB_DB_NAME`       | `ai-lab`                                   | MongoDB database name                            |
| `JWT_SECRET`            | —                                          | **Required.** Secret key for signing JWTs        |
| `JWT_EXPIRES_IN`        | `1d`                                       | JWT expiration time                              |
| `REDIS_URL`             | `redis://redis:6379`                       | Redis connection string                          |
| `AI_SERVICE_URL`        | `http://ai-service:8000`                   | URL of the Python AI service                     |
| `CORS_ORIGIN`           | `*`                                        | Allowed CORS origins                             |
| `OPENAI_API_KEY`        | —                                          | OpenAI API key for AI features                   |
| `AI_MOCK_MODE`          | `true`                                     | `true` = mock AI responses, `false` = real API   |
| `AI_ANALYSIS_MODEL`     | `gpt-4o-mini`                              | Model for code analysis                          |
| `AI_QUIZ_MODEL`         | `gpt-4o-mini`                              | Model for quiz generation                        |
| `AI_REPORT_MODEL`       | `gpt-4o`                                   | Model for weekly reports                         |
| `AI_LEARNING_PATH_MODEL`| `gpt-4o-mini`                              | Model for learning path generation               |
| `VITE_API_URL`          | `/api`                                     | Frontend API base path                           |

---

## Architecture Overview

```
┌──────────────┐
│   Browser    │
│  (React SPA) │
└──────┬───────┘
       │ REST API (/api/*)
       v
┌──────────────┐    ┌─────────────────┐
│   Nginx      │───>│  Node.js/Express │
│  (Frontend)  │    │    Backend       │
└──────────────┘    └───────┬─────────┘
                            │
              ┌─────────────┼─────────────────┐
              │             │                 │
              v             v                 v
        ┌──────────┐  ┌──────────┐  ┌─────────────────┐
        │ MongoDB  │  │  Redis   │  │  Python/FastAPI  │
        │ (Data)   │  │ (Queue)  │  │  (AI Service)    │
        └──────────┘  └──────────┘  └────────┬────────┘
                                             │
                                             v
                                     ┌──────────────┐
                                     │  OpenAI API  │
                                     └──────────────┘

        Code Execution:
        Node.js Backend ──> Docker Container (sandboxed)
```

**Data Flow:**
1. **React** sends REST API requests to the **Node.js backend**
2. **Backend** handles business logic, reads/writes to **MongoDB**
3. **Async jobs** (submissions, AI analysis, reports) are queued via **BullMQ → Redis**
4. **Workers** process jobs: execute code in **Docker containers**, call the **AI service**
5. **AI Service** (Python) calls the **OpenAI API** and returns structured JSON responses
6. **Backend** stores AI results in MongoDB and serves them to the frontend

---

## Troubleshooting

### "Submissions fail with Docker error"
- **Cause:** Docker is not running or the backend cannot access the Docker socket.
- **Fix:** Ensure Docker Desktop is running. If using Docker Compose, the `docker.sock` volume mount is already configured. If running locally, ensure your user has Docker permissions.

### "AI features return mock/placeholder data"
- **Cause:** `AI_MOCK_MODE=true` or `OPENAI_API_KEY` is not set.
- **Fix:** Set `AI_MOCK_MODE=false` and provide a valid `OPENAI_API_KEY` in your `.env` file.

### "BullMQ workers did not start"
- **Cause:** Redis is not reachable.
- **Fix:** Start Redis (`docker run -d -p 6379:6379 redis:7-alpine`) or ensure the `REDIS_URL` in `.env` points to a running Redis instance. The backend logs a warning at startup if Redis is unavailable.

### "Cannot connect to MongoDB"
- **Cause:** MongoDB is not running or `MONGODB_URI` is incorrect.
- **Fix:** Start MongoDB (`docker run -d -p 27017:27017 mongo:7.0`) or check your `MONGODB_URI` in `.env`.

### "Frontend shows blank page / API errors"
- **Cause (local dev):** The Vite dev server proxy isn't reaching the backend.
- **Fix:** Ensure the backend is running on port 3000. The proxy is configured in `vite.config.js` to forward `/api` requests to `http://localhost:3000`.

### "Quiz/Learning Path page shows loading forever"
- **Cause:** The AI service is not running, or Redis is down (quiz generation is queued).
- **Fix:** Start the AI service and Redis. Check backend logs for queue errors.

### "Docker images not found during code execution"
- **Cause:** The execution Docker images haven't been pulled yet.
- **Fix:** Pre-pull them:
  ```bash
  docker pull node:22-alpine
  docker pull python:3.11-alpine
  docker pull gcc:alpine
  docker pull eclipse-temurin:21-alpine
  ```

---

## License

This project is for educational purposes.
