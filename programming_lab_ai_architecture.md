# AI-Powered Programming Lab Management System

## Project Overview

A college programming-lab management platform with three roles:

- **Student** — receives assignments, submits code, takes daily AI-generated quizzes, tracks progress, sees weak topics, and receives personalized learning recommendations.
- **Teacher** — creates assignments, reviews submissions, monitors individual/class progress, identifies weak topics, and generates weekly AI reports.
- **Admin** — manages users, teachers, students, classes, and system-level information.
- **AI Services** — analyze submissions, identify weak topics, generate quizzes, recommend learning paths, and generate weekly class reports.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + javascript |
| UI | Ant Design |
| Backend | Node.js + Express + javascript |
| AI Service | Python + FastAPI |
| Database | MongoDB |
| Queue | Redis + BullMQ |
| AI Provider | OpenAI API |
| Code Editor | Monaco Editor |
| Charts | Recharts |
| Authentication | JWT + bcrypt/argon2 |
| API Format | REST + JSON |
| Deployment | Docker |
| Version Control | Git |

---

# 1. Architecture Principles

The system must be modular and isolated.

### Core rule

> React owns presentation. Node.js owns business logic and persistent application data. Python owns AI logic. Code execution is isolated from the application servers.

Do not allow:

```text
React -> MongoDB
React -> Python AI directly
Python -> arbitrary application writes
Node -> execute student code directly
```

Prefer:

```text
React
  |
  | REST API
  v
Node.js Backend
  | \
  |  \----> Redis/BullMQ
  |
  +-------> MongoDB
  |
  +-------> Python AI Service
  |
  +-------> Code Execution Service
```

---

# 2. Repository Structure

Use a monorepo for the 10-day MVP.

```text
programming-lab-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── student/
│   │   │   ├── teacher/
│   │   │   └── admin/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── routes/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── classes/
│   │   │   ├── assignments/
│   │   │   ├── submissions/
│   │   │   ├── quizzes/
│   │   │   ├── progress/
│   │   │   ├── analytics/
│   │   │   └── reports/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── services/
│   │   ├── config/
│   │   ├── utils/
│   │   └── app.ts
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
│
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── database-schema.md
│   └── ai-contract.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 3. Three Main Development Groups

## Group A — Frontend

### Responsibility

- User interface
- Navigation
- Forms
- Dashboards
- Charts
- Code editor
- Quiz interface
- API integration
- Loading/error/empty states

### Components

#### Shared

```text
Navbar
Sidebar
ProtectedRoute
RoleRoute
Loading
ErrorState
EmptyState
Modal
DataTable
ChartCard
StatCard
Notification
CodeEditor
```

#### Student

```text
StudentDashboard
AssignmentList
AssignmentDetails
CodeEditor
SubmissionHistory
SubmissionResult
Quiz
QuizResult
ProgressDashboard
LanguageProgress
TopicProgress
WeakTopics
LearningPath
AIRecommendations
```

#### Teacher

```text
TeacherDashboard
ClassList
StudentList
CreateClass
CreateAssignment
AssignmentDetails
SubmissionReview
StudentProgress
ClassAnalytics
WeeklyReport
```

#### Admin

```text
AdminDashboard
UserManagement
TeacherManagement
StudentManagement
ClassManagement
SystemAnalytics
```

---

# 4. Backend Architecture

Use a modular backend.

Each module should contain:

```text
controller
service
model
routes
validation
types
```

Business logic must stay in services rather than controllers.

Example:

```text
assignments/
├── assignment.controller.ts
├── assignment.service.ts
├── assignment.model.ts
├── assignment.routes.ts
├── assignment.validation.ts
└── assignment.types.ts
```

---

# 5. Authentication and Authorization

Roles:

```text
STUDENT
TEACHER
ADMIN
```

Use JWT.

JWT payload:

```json
{
  "userId": "USER_ID",
  "role": "STUDENT"
}
```

Middleware:

```text
authenticate()
authorize("STUDENT")
authorize("TEACHER")
authorize("ADMIN")
```

Do not create separate authentication systems for each role.

---

# 6. Database Design

## Users

```text
users
├── _id
├── name
├── email
├── passwordHash
├── role
├── collegeId
├── department
├── createdAt
└── updatedAt
```

## Classes

```text
classes
├── _id
├── name
├── teacherId
├── students[]
├── languages[]
├── semester
└── createdAt
```

## Assignments

```text
assignments
├── _id
├── title
├── description
├── language
├── difficulty
├── topics[]
├── testCases[]
├── deadline
├── classId
├── createdBy
└── createdAt
```

## Submissions

```text
submissions
├── _id
├── studentId
├── assignmentId
├── code
├── language
├── status
├── score
├── testCasesPassed
├── executionTime
├── analysisId
└── submittedAt
```

Possible statuses:

```text
PENDING
RUNNING
PASSED
FAILED
ERROR
```

## Topic Progress

This is the core analytics collection.

```text
student_topic_progress
├── _id
├── studentId
├── language
├── topic
├── assignmentScore
├── quizScore
├── submissionSuccess
├── masteryScore
├── attempts
├── mistakes
├── lastPracticedAt
└── updatedAt
```

## Quizzes

```text
quizzes
├── _id
├── studentId
├── topics[]
├── questions[]
├── difficulty
├── generatedBy
├── date
└── createdAt
```

Each question:

```text
question
options[]
correctAnswer
explanation
topic
difficulty
```

## Weekly Reports

```text
weekly_reports
├── _id
├── classId
├── weekStart
├── weekEnd
├── summary
├── strongTopics[]
├── weakTopics[]
├── studentsNeedingAttention[]
├── recommendations[]
├── generatedBy
└── createdAt
```

## AI Analyses

```text
ai_analyses
├── _id
├── studentId
├── type
├── inputReference
├── result
├── model
├── promptVersion
└── createdAt
```

Types:

```text
CODE_ANALYSIS
QUIZ_GENERATION
LEARNING_PATH
WEEKLY_REPORT
```

---

# 7. Topic Mastery System

Do not make the LLM solely responsible for deciding whether a student is weak.

Calculate objective scores first.

Example:

```text
Topic Score =
    assignment performance
    + quiz performance
    + submission success
    + error frequency
    + practice frequency
```

Normalize to 0–100.

Classification:

```text
0–49   = Weak
50–69  = Needs Improvement
70–100 = Good
```

AI then explains the result and creates recommendations.

Example:

```text
Python
├── Arrays       82%
├── Loops        71%
├── Recursion    44%  <- Weak
└── Trees        39%  <- Weak
```

---

# 8. Topic Taxonomy

Create a predefined topic graph.

Example:

```text
Programming
├── Variables
├── Conditions
├── Loops
├── Functions
├── Arrays
│   └── Searching
│       └── Binary Search
├── Recursion
│   └── Trees
│       └── Graphs
└── Dynamic Programming
```

The AI should select from predefined topics rather than inventing arbitrary topic names.

This provides consistent analytics across students.

---

# 9. AI Service Architecture

Python service:

```text
ai-service/
└── app/
    ├── api/
    │   ├── analysis.py
    │   ├── quiz.py
    │   ├── learning_path.py
    │   └── reports.py
    │
    ├── agents/
    │   ├── analyzer_agent.py
    │   ├── quiz_agent.py
    │   ├── learning_agent.py
    │   └── report_agent.py
    │
    ├── prompts/
    │   ├── analysis.py
    │   ├── quiz.py
    │   ├── learning_path.py
    │   └── report.py
    │
    ├── schemas/
    ├── services/
    └── main.py
```

Do not build a complex multi-agent architecture for the MVP.

Each AI capability should be independently callable.

---

# 10. AI Component: Code Analyzer

## Input

```json
{
  "student": {
    "id": "123"
  },
  "assignment": {
    "id": "456",
    "language": "python",
    "topics": ["arrays", "loops"]
  },
  "submission": {
    "code": "..."
  },
  "testResults": {
    "passed": 6,
    "failed": 4
  }
}
```

## Output

```json
{
  "mastery": [
    {
      "topic": "arrays",
      "score": 72
    },
    {
      "topic": "loops",
      "score": 48
    }
  ],
  "weakTopics": ["loops"],
  "mistakes": [
    "Incorrect loop boundary"
  ],
  "recommendations": [
    "Practice array traversal"
  ]
}
```

Use structured JSON output.

AI must not directly modify MongoDB.

---

# 11. Code Execution Architecture

Never execute arbitrary student code directly inside Node.js or Python.

Use an isolated code execution service such as Judge0 or a dedicated container sandbox.

Flow:

```text
Student
  |
  v
React
  |
  v
Node.js
  |
  v
Queue
  |
  v
Code Execution Service
  |
  +--> compile
  +--> run
  +--> test cases
  +--> runtime
  +--> memory
  |
  v
Objective Result
  |
  v
AI Analyzer
```

The execution result is the source of truth for correctness.

AI analyzes mistakes and learning needs; it does not determine whether test cases passed.

---

# 12. AI Component: Weak Topic Detector

Use a hybrid approach:

```text
Objective metrics
      |
      v
Topic mastery calculation
      |
      v
Weak-topic detection
      |
      v
AI explanation/recommendation
```

Do not use an LLM for simple arithmetic or classification that can be deterministic.

---

# 13. AI Component: Learning Path Generator

Input:

```text
Student:
- Python

Strong:
- Variables
- Loops
- Arrays

Weak:
- Recursion
- Trees
- Dynamic Programming
```

Output:

```text
Step 1: Recursion basics
Step 2: Recursive problem solving
Step 3: Tree traversal
Step 4: Binary trees
Step 5: Dynamic programming
```

The AI should select topics from the predefined topic graph.

---

# 14. AI Component: Daily Quiz Generator

Input:

```text
student performance
weak topics
recent assignments
previous quiz results
difficulty
question count
```

Output:

```json
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "...",
      "topic": "recursion",
      "difficulty": "medium"
    }
  ]
}
```

Generate the quiz once and save it.

Do not generate a new quiz every time the student opens the page.

Flow:

```text
Scheduler
  |
  v
Find active students
  |
  v
Get topic mastery
  |
  v
Python AI
  |
  v
MongoDB
  |
  v
Student GET /quiz/today
```

---

# 15. AI Component: Weekly Class Report

Input:

```text
class performance
student performance
assignment scores
quiz scores
topic scores
submission statistics
activity
```

Output:

```text
Class Summary
Overall Performance
Strong Topics
Weak Topics
Students Needing Attention
Most Improved Students
Recommended Teaching Focus
Next Week Suggestions
```

Flow:

```text
Scheduler
  |
  v
Weekly Report Job
  |
  v
Node analytics aggregation
  |
  v
Python AI
  |
  v
MongoDB
  |
  v
Teacher Dashboard
```

---

# 16. AI Model Configuration

Never hard-code model names throughout the application.

Use environment variables:

```text
AI_ANALYSIS_MODEL=
AI_QUIZ_MODEL=
AI_REPORT_MODEL=
AI_LEARNING_PATH_MODEL=
```

Use a stronger model for complex reasoning and a faster/cost-efficient model for simple generation.

Keep the model configurable so it can be changed without modifying application logic.

---

# 17. Prompt Versioning

Prompts should be isolated:

```text
prompts/
├── analysis_v1
├── quiz_v1
├── learning_path_v1
└── report_v1
```

Store the prompt version in every AI result:

```json
{
  "model": "...",
  "promptVersion": "quiz_v1"
}
```

This makes AI behavior traceable.

---

# 18. Node ↔ Python AI Contract

Base URL:

```text
AI_SERVICE_URL
```

Endpoints:

```text
POST /ai/analyze-submission
POST /ai/generate-quiz
POST /ai/generate-learning-path
POST /ai/generate-weekly-report
```

Node must communicate with Python using JSON.

Python must validate all input with Pydantic.

Python responses must conform to explicit response schemas.

If AI generation fails, Python should return a controlled error and Node should handle it gracefully.

---

# 19. REST API

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Student

```text
GET  /api/student/dashboard
GET  /api/student/progress
GET  /api/student/topics
GET  /api/student/learning-path
```

## Classes

```text
GET  /api/classes
POST /api/classes
GET  /api/classes/:id
PUT  /api/classes/:id
```

## Assignments

```text
GET  /api/assignments
POST /api/assignments
GET  /api/assignments/:id
PUT  /api/assignments/:id
DELETE /api/assignments/:id
```

## Submissions

```text
POST /api/submissions
GET  /api/submissions/:id
GET  /api/submissions/student/:studentId
```

## Quizzes

```text
GET  /api/quiz/today
GET  /api/quiz/:id
POST /api/quiz/:id/submit
```

## Analytics

```text
GET /api/analytics/student/:id
GET /api/analytics/class/:id
```

## Reports

```text
GET  /api/reports/weekly/:classId
POST /api/reports/weekly/:classId/generate
```

---

# 20. Background Jobs

Use Redis + BullMQ.

Queues:

```text
code-execution
ai-analysis
quiz-generation
weekly-report
```

Example:

```text
Submission
    |
    v
code-execution queue
    |
    v
Code Runner
    |
    v
ai-analysis queue
    |
    v
Python AI
```

Background jobs should be retryable.

---

# 21. Frontend Pages

## Student

```text
/login
/student/dashboard
/student/assignments
/student/assignments/:id
/student/submissions
/student/progress
/student/quiz
/student/quiz/:id
/student/learning-path
```

## Teacher

```text
/teacher/dashboard
/teacher/classes
/teacher/classes/:id
/teacher/assignments
/teacher/assignments/create
/teacher/students/:id
/teacher/analytics
/teacher/reports
```

## Admin

```text
/admin/dashboard
/admin/users
/admin/teachers
/admin/students
/admin/classes
```

---

# 22. Student Dashboard Requirements

Display:

```text
Overall progress
Language-wise progress
Topic mastery
Weak topics
Recent submissions
Today's quiz
AI recommendations
Learning path
```

Example:

```text
Overall Progress: 72%

Python      78%
C++         65%
Java        52%

Weak Topics:
Recursion   44%
Trees       39%

Today's Quiz
[Start Quiz]

AI Recommendation:
Practice recursion before moving to trees.
```

---

# 23. Teacher Dashboard Requirements

Display:

```text
Number of students
Average class score
Assignment completion
Strong topics
Weak topics
Students needing attention
Recent submissions
Weekly AI report
```

Teacher should be able to:

```text
Create class
Add students
Create assignment
View submissions
View individual progress
View class analytics
Generate weekly report
```

---

# 24. Admin Dashboard Requirements

Admin manages:

```text
Users
Teachers
Students
Classes
Departments
System-level statistics
```

Admin should not own student learning logic or AI logic.

---

# 25. Security Requirements

Implement:

```text
JWT authentication
Password hashing
Role-based authorization
Input validation
Request size limits
Rate limiting
CORS configuration
Secure HTTP headers
Environment-based secrets
API error sanitization
```

Never expose:

```text
MongoDB credentials
JWT secret
OpenAI API key
Redis credentials
Code execution credentials
```

to the frontend.

Never place secrets in React environment variables that are shipped to the browser.

---

# 26. Error Handling

Every API should return consistent errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "ASSIGNMENT_NOT_FOUND",
    "message": "Assignment not found"
  }
}
```

Success:

```json
{
  "success": true,
  "data": {}
}
```

Frontend must show:

```text
Loading state
Error state
Empty state
Success feedback
```

---

# 27. Logging

Backend logs:

```text
request ID
user ID
route
status
execution time
error
```

AI service logs:

```text
request ID
AI operation
model
prompt version
latency
success/failure
```

Never log passwords, API keys, or complete sensitive code unnecessarily.

---

# 28. Testing Strategy

## Backend

Test:

```text
Authentication
Authorization
Assignments
Submissions
Quiz scoring
Progress calculation
Analytics
```

## AI

Test with fixed test inputs:

```text
Weak student
Average student
Strong student
Invalid input
AI timeout
Malformed AI output
```

## Frontend

Test:

```text
Login
Role routing
Assignment creation
Submission
Quiz
Progress dashboard
Teacher report
```

## End-to-end

Primary test:

```text
Teacher creates assignment
        ↓
Student sees assignment
        ↓
Student submits code
        ↓
Code is executed
        ↓
Result is stored
        ↓
AI analyzes submission
        ↓
Topic mastery updates
        ↓
Student sees recommendation
        ↓
Daily quiz uses weak topics
        ↓
Teacher sees class analytics
        ↓
Weekly report is generated
```

---

# 29. 10-Day Development Schedule

## Day 1 — Foundation

### All teams

- [ ] Create monorepo
- [ ] Create React app
- [ ] Create Node.js app
- [ ] Create FastAPI app
- [ ] Configure MongoDB
- [ ] Configure Redis
- [ ] Configure environment variables
- [ ] Finalize database schemas
- [ ] Finalize API contracts
- [ ] Finalize Node ↔ Python AI contracts
- [ ] Configure Docker
- [ ] Create basic CI/test setup

### Milestone

```text
React -> Node -> MongoDB
             |
             -> Python
```

Communication must work.

---

## Day 2 — Authentication

### Frontend

- [ ] Login
- [ ] Register
- [ ] Protected routes
- [ ] Role-based routing

### Backend

- [ ] User model
- [ ] JWT
- [ ] Password hashing
- [ ] Login API
- [ ] Register API
- [ ] Authorization middleware

### AI

- [ ] FastAPI structure
- [ ] AI provider connection
- [ ] AI response schemas

### Milestone

All three roles can log in and reach their dashboards.

---

## Day 3 — Classes and Assignments

### Frontend

- [ ] Teacher dashboard
- [ ] Create class
- [ ] Create assignment
- [ ] Student assignment list
- [ ] Assignment details

### Backend

- [ ] Class model
- [ ] Assignment model
- [ ] Class APIs
- [ ] Assignment APIs
- [ ] Teacher authorization

### AI

- [ ] Topic taxonomy
- [ ] Topic mastery schema
- [ ] Analysis contract

### Milestone

Teacher creates assignment and student can see it.

---

## Day 4 — Code Submission

### Frontend

- [ ] Monaco editor
- [ ] Language selector
- [ ] Submit button
- [ ] Submission history
- [ ] Result page

### Backend

- [ ] Submission model
- [ ] Submission API
- [ ] Queue
- [ ] Code execution integration

### AI

- [ ] Code analyzer
- [ ] Test-result interpretation
- [ ] Topic scoring

### Critical milestone

```text
Student code
    ↓
Submit
    ↓
Execute
    ↓
Test
    ↓
Score
    ↓
AI analysis
    ↓
Progress update
```

This is the most important vertical slice.

---

## Day 5 — Progress and Weak Topics

### Frontend

- [ ] Progress dashboard
- [ ] Language progress
- [ ] Topic progress
- [ ] Weak topics
- [ ] Submission history

### Backend

- [ ] Progress APIs
- [ ] Topic aggregation
- [ ] Student analytics

### AI

- [ ] Weak topic detection
- [ ] Recommendations
- [ ] Learning path generation

### Milestone

Student can see progress and weak topics.

---

## Day 6 — Daily AI Quiz

### Frontend

- [ ] Today's quiz
- [ ] Question component
- [ ] Submit quiz
- [ ] Quiz result

### Backend

- [ ] Quiz schema
- [ ] Quiz APIs
- [ ] Quiz submission
- [ ] Score calculation

### AI

- [ ] Quiz generator
- [ ] Difficulty selection
- [ ] Weak-topic targeting
- [ ] Explanations

### Milestone

Every active student can receive a personalized quiz.

---

## Day 7 — Teacher Analytics

### Frontend

- [ ] Student table
- [ ] Class performance
- [ ] Topic performance
- [ ] Assignment statistics
- [ ] Student detail page

### Backend

- [ ] Class analytics
- [ ] Student analytics
- [ ] Assignment analytics

### AI

- [ ] Class insights
- [ ] At-risk student detection

### Milestone

Teacher can identify class strengths, weaknesses, and students needing attention.

---

## Day 8 — Weekly AI Report

### Frontend

- [ ] Weekly report page
- [ ] Charts
- [ ] Report cards
- [ ] AI recommendations

### Backend

- [ ] Report aggregation
- [ ] Report API
- [ ] Background report job

### AI

- [ ] Weekly report generator
- [ ] Class summary
- [ ] Weak topic analysis
- [ ] Teaching recommendations

### Milestone

Teacher can generate and view the weekly AI report.

---

## Day 9 — Integration and Hardening

### Frontend

- [ ] Responsive UI
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Form validation

### Backend

- [ ] Authorization testing
- [ ] API validation
- [ ] Rate limiting
- [ ] Error handling
- [ ] Logging
- [ ] Database indexes

### AI

- [ ] Prompt testing
- [ ] AI timeout handling
- [ ] Invalid response handling
- [ ] Fallback behavior
- [ ] Cost monitoring

### Full system

- [ ] Student flow
- [ ] Teacher flow
- [ ] Admin flow
- [ ] Assignment flow
- [ ] Submission flow
- [ ] Quiz flow
- [ ] AI analysis
- [ ] Weekly report

No major new features on Day 9.

---

## Day 10 — Deployment and Demo

### Morning

- [ ] Production frontend build
- [ ] Production backend
- [ ] Production MongoDB
- [ ] Production Redis
- [ ] Python service deployment
- [ ] Environment configuration
- [ ] Verify all APIs

### Afternoon

- [ ] End-to-end test
- [ ] Fix critical bugs
- [ ] Seed demo data
- [ ] Create demo accounts
- [ ] Prepare presentation
- [ ] Prepare architecture diagram

### Final

- [ ] Freeze features
- [ ] Backup database
- [ ] Verify deployment
- [ ] Run complete demo

Do not add new features on Day 10.

---

# 30. Feature Priority

## P0 — Mandatory MVP

- [ ] Authentication
- [ ] Three roles
- [ ] Classes
- [ ] Assignments
- [ ] Code submission
- [ ] Code execution
- [ ] Student progress
- [ ] Weak topic detection
- [ ] Daily quiz
- [ ] Teacher dashboard
- [ ] Weekly AI report

## P1 — Important

- [ ] Learning path
- [ ] Charts
- [ ] Submission history
- [ ] AI feedback
- [ ] Admin dashboard

## P2 — Future

- [ ] Embeddings
- [ ] RAG
- [ ] Learning-resource recommendations
- [ ] Advanced ML prediction
- [ ] Gamification
- [ ] Notifications
- [ ] Email
- [ ] Advanced personalization

If the project falls behind, remove P2 first.

---

# 31. Development Rules for Antigravity

Antigravity agents should work only within their assigned area.

## Frontend Agent

Owns:

```text
/frontend
```

May consume backend APIs but should not modify backend implementation.

## Backend Agent

Owns:

```text
/backend
```

May consume the Python API contract but should not modify AI implementation.

## AI Agent

Owns:

```text
/ai-service
```

May define and implement AI logic but should not directly modify React.

## Shared Documentation

Changes to:

```text
/docs/api-contract.md
/docs/database-schema.md
/docs/ai-contract.md
```

must be coordinated before breaking changes.

---

# 32. Agent Coordination Rules

Before changing an API:

1. Update the API contract.
2. Notify dependent component.
3. Implement backend change.
4. Update frontend/client.
5. Add tests.
6. Verify integration.

Never silently change:

```text
endpoint names
request fields
response fields
database field names
AI response schemas
```

without updating the contract.

---

# 33. AI Safety and Reliability Rules

AI must never:

- Decide user permissions.
- Decide whether a user is authenticated.
- Directly modify database records.
- Execute arbitrary code.
- Be the only source of truth for assignment correctness.
- Invent topic IDs outside the predefined taxonomy.

AI may:

- Analyze code.
- Explain mistakes.
- Generate quiz questions.
- Explain quiz answers.
- Recommend learning paths.
- Summarize class performance.
- Generate teacher recommendations.

---

# 34. Future Vector Search

Do not implement this unless the core MVP is complete.

Potential future flow:

```text
Student weakness
      |
      v
Embedding
      |
      v
MongoDB Vector Search
      |
      v
Relevant learning resources
      |
      v
AI recommendation
```

Possible resources:

```text
documentation
tutorials
lecture notes
practice problems
videos
assignments
```

---

# 35. Definition of MVP Completion

The MVP is complete when the following scenario works without manual database intervention:

```text
1. Admin creates teacher/student accounts.
2. Teacher logs in.
3. Teacher creates a class.
4. Teacher adds students.
5. Teacher creates a programming assignment.
6. Student logs in.
7. Student sees the assignment.
8. Student writes code.
9. Student submits code.
10. Code is executed safely.
11. Test results are stored.
12. AI analyzes the submission.
13. Student topic mastery is updated.
14. Student sees weak topics.
15. AI generates learning recommendations.
16. Daily quiz is generated.
17. Student completes quiz.
18. Quiz result updates topic progress.
19. Teacher views class analytics.
20. Teacher generates weekly AI report.
21. Weekly report is stored and displayed.
```

---

# 36. Final Architecture

```text
                         ┌──────────────────────┐
                         │       REACT          │
                         │      FRONTEND        │
                         │                      │
                         │ Student              │
                         │ Teacher              │
                         │ Admin                │
                         └──────────┬───────────┘
                                    │
                                  REST
                                    │
                                    v
                         ┌──────────────────────┐
                         │      NODE.JS         │
                         │       BACKEND        │
                         │                      │
                         │ Auth                 │
                         │ Users                │
                         │ Classes              │
                         │ Assignments          │
                         │ Submissions          │
                         │ Quiz                 │
                         │ Progress             │
                         │ Analytics            │
                         │ Reports              │
                         └───────┬─────┬────────┘
                                 │     │
                     ┌───────────┘     └────────────┐
                     v                              v
             ┌───────────────┐              ┌───────────────┐
             │    MongoDB    │              │ Redis/BullMQ  │
             │               │              │               │
             │ Users         │              │ AI Jobs       │
             │ Classes       │              │ Reports       │
             │ Assignments   │              │ Quizzes       │
             │ Submissions   │              │ Execution     │
             │ Progress      │              └───────┬───────┘
             │ Quizzes       │                      │
             │ Reports       │                      v
             └───────────────┘              ┌────────────────┐
                                            │ Python FastAPI │
                                            │   AI SERVICE   │
                                            │                │
                                            │ Code Analysis  │
                                            │ Quiz Generator │
                                            │ Weak Topics    │
                                            │ Learning Path  │
                                            │ Weekly Report  │
                                            └───────┬────────┘
                                                    │
                                                    v
                                            ┌────────────────┐
                                            │   AI Provider  │
                                            └────────────────┘
```

---

# 37. Final Engineering Rule

Build the project around four stable contracts:

```text
1. API Contract
   React <-> Node

2. Database Contract
   Node <-> MongoDB

3. AI Contract
   Node <-> Python

4. Execution Contract
   Node <-> Code Runner
```

The most important milestone is **Day 4**:

```text
Teacher creates assignment
        ↓
Student receives assignment
        ↓
Student submits code
        ↓
Code executes
        ↓
Tests produce score
        ↓
AI analyzes mistakes
        ↓
Topic mastery updates
        ↓
Student sees weakness
```

Everything else should build on this foundation.

Do not attempt to build a custom ML model, fine-tuning pipeline, complex multi-agent system, custom compiler, Kubernetes deployment, or full RAG system during the 10-day MVP.

Focus on a reliable vertical slice first, then add personalization and analytics on top of the same progress data.
