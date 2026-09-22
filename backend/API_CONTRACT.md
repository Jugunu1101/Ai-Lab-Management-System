# Backend API Contract

> **Runtime:** Node.js + Express  
> **Database:** MongoDB (Mongoose ODM)  
> **Base Path:** All API routes are prefixed with `/api`  
> **Authentication:** JWT Bearer Token via `Authorization` header  
> **Rate Limiting:** 500 req/15min global, 30 req/15min on `/api/auth`  
> **Body Limit:** 2 MB (JSON + URL-encoded)

---

## Table of Contents

- [Health Check](#health-check)
- [Auth Module](#auth-module)
- [Classes Module](#classes-module)
- [Assignments Module](#assignments-module)
- [Submissions Module](#submissions-module)
- [Quizzes Module](#quizzes-module)
- [Progress Module](#progress-module)
- [Student Module](#student-module)
- [Analytics Module](#analytics-module)
- [Reports Module](#reports-module)
- [Admin Module](#admin-module)
- [Error Handling](#error-handling)
- [Data Models](#data-models)

---

## Health Check

| Field    | Value              |
| -------- | ------------------ |
| Method   | `GET`              |
| Path     | `/health`          |
| Auth     | None               |
| Rate     | No rate limit      |

**Response (200):**

```json
{
  "status": "ok",
  "service": "programming-lab-backend",
  "uptime": 12345.678,
  "timestamp": "2026-09-21T12:00:00.000Z"
}
```

---

## Auth Module

> Route prefix: `/api/auth`  
> Source: `src/modules/auth/`  
> Rate Limit: 30 req/15min (stricter)

### POST `/api/auth/register`

| Auth | Validation         |
| ---- | ------------------ |
| None | `registerSchema`   |

**Request Body:**

```json
{
  "name": "string",         // required, 2-100 chars, trimmed
  "email": "string",        // required, valid email, lowercased
  "password": "string",     // required, 6-100 chars
  "role": "string",         // optional, "STUDENT" | "TEACHER", default: "STUDENT"
  "collegeId": "string",    // optional, max 100 chars
  "department": "string"    // optional, max 100 chars
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "role": "STUDENT | TEACHER",
    "collegeId": "string",
    "department": "string",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

### POST `/api/auth/login`

| Auth | Validation     |
| ---- | -------------- |
| None | `loginSchema`  |

**Request Body:**

```json
{
  "email": "string",     // required, valid email, lowercased
  "password": "string"   // required
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "JWT string",
    "user": {
      "_id": "ObjectId",
      "name": "string",
      "email": "string",
      "role": "STUDENT | TEACHER | ADMIN"
    }
  }
}
```

---

### GET `/api/auth/me`

| Auth          | Validation |
| ------------- | ---------- |
| Bearer Token  | None       |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "role": "STUDENT | TEACHER | ADMIN",
    "collegeId": "string",
    "department": "string",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

### GET `/api/auth/test-protected`

| Auth         | Roles |
| ------------ | ----- |
| Bearer Token | Any   |

**Response (200):**

```json
{
  "success": true,
  "message": "You are authenticated",
  "user": { "/* JWT decoded user payload */" }
}
```

---

### GET `/api/auth/test-student`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Response (200):**

```json
{ "success": true, "message": "Student access granted" }
```

---

### GET `/api/auth/test-teacher`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{ "success": true, "message": "Teacher access granted" }
```

---

### GET `/api/auth/test-admin`

| Auth         | Roles |
| ------------ | ----- |
| Bearer Token | ADMIN |

**Response (200):**

```json
{ "success": true, "message": "Admin access granted" }
```

---

## Classes Module

> Route prefix: `/api/classes`  
> Source: `src/modules/classes/`

### POST `/api/classes`

| Auth         | Roles   | Validation          |
| ------------ | ------- | ------------------- |
| Bearer Token | TEACHER | `createClassSchema` |

**Request Body:**

```json
{
  "name": "string",         // required, 2-100 chars
  "code": "string",         // optional, max 50 chars
  "department": "string",   // optional, max 100 chars
  "description": "string",  // optional, max 1000 chars
  "languages": ["string"],  // optional, default: ["javascript", "python", "cpp", "java"]
  "semester": "string"      // optional, max 50 chars
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Class document */" }
}
```

---

### GET `/api/classes`

| Auth         | Roles            |
| ------------ | ---------------- |
| Bearer Token | STUDENT, TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "name": "string",
      "code": "string",
      "department": "string",
      "description": "string",
      "teacherId": "ObjectId",
      "students": ["ObjectId"],
      "languages": ["string"],
      "semester": "string",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

---

### GET `/api/classes/:classId`

| Auth         | Roles            |
| ------------ | ---------------- |
| Bearer Token | STUDENT, TEACHER |

**Path Params:**

| Param     | Type   | Required |
| --------- | ------ | -------- |
| `classId` | string | Yes      |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Class document (populated as needed) */" }
}
```

---

### PUT `/api/classes/:classId`

| Auth         | Roles   | Validation          |
| ------------ | ------- | ------------------- |
| Bearer Token | TEACHER | `updateClassSchema` |

**Request Body (at least 1 field):**

```json
{
  "name": "string",        // 2-100 chars
  "languages": ["string"], // min 1 item
  "semester": "string"     // max 50 chars
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Class document */" }
}
```

---

### POST `/api/classes/:classId/students`

| Auth         | Roles   | Validation         |
| ------------ | ------- | ------------------ |
| Bearer Token | TEACHER | `addStudentSchema` |

**Request Body:**

```json
{
  "studentId": "string"  // required, User ObjectId
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Class document */" }
}
```

---

## Assignments Module

> Route prefix: `/api/assignments`  
> Source: `src/modules/assignments/`

### POST `/api/assignments`

| Auth         | Roles   | Validation                |
| ------------ | ------- | ------------------------- |
| Bearer Token | TEACHER | `createAssignmentSchema`  |

**Request Body:**

```json
{
  "title": "string",          // required, 2-200 chars
  "description": "string",    // required, min 1 char
  "language": "string",       // required, 1-50 chars
  "difficulty": "string",     // required, "EASY" | "MEDIUM" | "HARD"
  "topics": ["string"],       // optional
  "testCases": [
    {
      "input": "string",           // required
      "expectedOutput": "string",  // required
      "isHidden": true             // optional, default: true
    }
  ],
  "deadline": "ISO 8601 | null",  // optional
  "maxAttempts": 3,               // optional, integer >= 1
  "classId": "string"             // required, Class ObjectId
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Assignment document */" }
}
```

---

### GET `/api/assignments`

| Auth         | Roles            |
| ------------ | ---------------- |
| Bearer Token | STUDENT, TEACHER |

**Query Params:**

| Param     | Type   | Description     |
| --------- | ------ | --------------- |
| `classId` | string | Filter by class |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Assignment documents */"]
}
```

---

### GET `/api/assignments/:assignmentId`

| Auth         | Roles            |
| ------------ | ---------------- |
| Bearer Token | STUDENT, TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Assignment document */" }
}
```

---

### GET `/api/assignments/:assignmentId/results`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "assignment": { "/* Assignment document */" },
    "submissions": ["/* Submission documents with populated userId */"]
  }
}
```

---

### PUT `/api/assignments/:assignmentId`

| Auth         | Roles   | Validation                |
| ------------ | ------- | ------------------------- |
| Bearer Token | TEACHER | `updateAssignmentSchema`  |

**Request Body (at least 1 field):**

```json
{
  "title": "string",
  "description": "string",
  "language": "string",
  "difficulty": "EASY | MEDIUM | HARD",
  "topics": ["string"],
  "testCases": [{ "input": "string", "expectedOutput": "string", "isHidden": true }],
  "deadline": "ISO 8601 | null",
  "maxAttempts": 3
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Assignment document */" }
}
```

---

### DELETE `/api/assignments/:assignmentId`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "message": "Assignment deleted"
}
```

---

## Submissions Module

> Route prefix: `/api/submissions`  
> Source: `src/modules/submissions/`

### POST `/api/submissions`

| Auth         | Roles   | Validation                |
| ------------ | ------- | ------------------------- |
| Bearer Token | STUDENT | `createSubmissionSchema`  |

**Request Body:**

```json
{
  "assignmentId": "string",  // required, Assignment ObjectId
  "code": "string",          // required, min 1 char
  "language": "string"       // required, 1-50 chars
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "assignmentId": "ObjectId",
    "userId": "ObjectId",
    "code": "string",
    "language": "string",
    "status": "PENDING | RUNNING | PASSED | FAILED | ERROR | TIMEOUT | COMPLETED",
    "output": "string",
    "testResults": [
      {
        "testCaseIndex": 0,
        "passed": true,
        "actualOutput": "string",
        "expectedOutput": "string",
        "executionTime": 150,
        "error": ""
      }
    ],
    "score": 80,
    "testCasesPassed": 4,
    "totalTestCases": 5,
    "executionTime": 750,
    "attemptNumber": 1,
    "submittedAt": "ISO 8601",
    "aiAnalysis": {
      "mastery": [{ "topic": "loops", "score": 75 }],
      "weakTopics": ["recursion"],
      "mistakes": ["Off-by-one error in loop condition"],
      "recommendations": ["Practice recursion problems"]
    },
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Pipeline:** On creation, the backend:
1. Validates attempt limits
2. Executes code against test cases (via code execution service)
3. Sends code + test results to AI Service (`POST /ai/analyze-submission`)
4. Stores the AI analysis in `aiAnalysis` field
5. Updates the student's Progress records

---

### GET `/api/submissions`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Query Params:**

| Param          | Type   | Description         |
| -------------- | ------ | ------------------- |
| `assignmentId` | string | Filter by assignment|

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Submission documents */"]
}
```

---

### GET `/api/submissions/assignment/:assignmentId`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Submissions with populated userId (name, email) */"]
}
```

---

### GET `/api/submissions/:submissionId/details`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Full Submission with code, test results, AI analysis */" }
}
```

---

### GET `/api/submissions/:submissionId`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Submission document */" }
}
```

---

## Quizzes Module

> Route prefix: `/api/quizzes` (alias: `/api/quiz`)  
> Source: `src/modules/quizzes/`

### POST `/api/quizzes`

| Auth         | Roles          | Validation        |
| ------------ | -------------- | ----------------- |
| Bearer Token | TEACHER, ADMIN | `createQuizSchema`|

**Request Body:**

```json
{
  "title": "string",      // required, 2-200 chars
  "language": "string",   // required
  "topic": "string",      // required
  "questions": [
    {
      "question": "string",           // required
      "options": ["string"],          // required, min 2 items
      "correctAnswer": "string"       // required, "A" | "B" | "C" | "D"
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Quiz document */" }
}
```

---

### GET `/api/quiz/today`

| Auth         | Roles          |
| ------------ | -------------- |
| Bearer Token | STUDENT, ADMIN |

> Must be defined **before** `/:quizId` to avoid param collision.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "title": "string",
    "language": "string",
    "topic": "string",
    "topics": ["string"],
    "questions": [
      {
        "question": "string",
        "options": ["string"],
        "correctAnswer": "A",
        "explanation": "string",
        "topic": "string",
        "difficulty": "easy | medium | hard"
      }
    ],
    "studentId": "ObjectId",
    "targetDate": "ISO 8601",
    "createdAt": "ISO 8601"
  }
}
```

**Pipeline:** If no quiz exists for today, the backend:
1. Fetches student's weak topics from Progress
2. Calls AI Service (`POST /ai/generate-quiz`) to generate a personalized quiz
3. Stores and returns the new quiz

---

### GET `/api/quizzes`

| Auth         | Roles                    |
| ------------ | ------------------------ |
| Bearer Token | STUDENT, TEACHER, ADMIN  |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Quiz documents */"]
}
```

---

### GET `/api/quizzes/:quizId`

| Auth         | Roles                    |
| ------------ | ------------------------ |
| Bearer Token | STUDENT, TEACHER, ADMIN  |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Quiz document */" }
}
```

---

### POST `/api/quizzes/:quizId/submit`

| Auth         | Roles          | Validation         |
| ------------ | -------------- | ------------------ |
| Bearer Token | STUDENT, ADMIN | `submitQuizSchema` |

**Request Body:**

```json
{
  "answers": [
    { "selectedAnswer": "A" },
    { "selectedAnswer": "C" },
    { "selectedAnswer": "" }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "quizId": "ObjectId",
    "studentId": "ObjectId",
    "answers": [
      { "questionIndex": 0, "selectedAnswer": "A", "isCorrect": true },
      { "questionIndex": 1, "selectedAnswer": "C", "isCorrect": false }
    ],
    "score": 50,
    "completedAt": "ISO 8601",
    "createdAt": "ISO 8601"
  }
}
```

**Pipeline:** On submission, the backend:
1. Grades answers against `correctAnswer`
2. Creates a `QuizAttempt` document
3. Updates Progress records with quiz scores

---

### GET `/api/quizzes/:quizId/attempts`

| Auth         | Roles                    |
| ------------ | ------------------------ |
| Bearer Token | STUDENT, TEACHER, ADMIN  |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of QuizAttempt documents */"]
}
```

---

## Progress Module

> Route prefix: `/api/progress`  
> Source: `src/modules/progress/`

### GET `/api/progress`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "studentId": "ObjectId",
      "language": "string",
      "topic": "string",
      "assignmentScore": 85,
      "quizScore": 70,
      "totalSubmissions": 10,
      "successfulSubmissions": 8,
      "submissionSuccessRate": 80,
      "submissionSuccess": true,
      "errorFrequencyFactor": 90,
      "practiceFrequencyFactor": 75,
      "masteryScore": 78,
      "aiMasteryScore": 72,
      "attempts": 10,
      "mistakes": 2,
      "lastPracticedAt": "ISO 8601 | null",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

---

### GET `/api/progress/weak-topics`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Progress records with low masteryScore */"]
}
```

---

## Student Module

> Route prefix: `/api/student`  
> Source: `src/modules/student/`  
> All routes require: `authenticate` + `authorize(["STUDENT", "ADMIN"])`

### GET `/api/student/dashboard`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "/* Aggregated student dashboard: enrolled classes, recent submissions, scores */"
  }
}
```

---

### GET `/api/student/progress`

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Detailed progress breakdown per language and topic */" }
}
```

---

### GET `/api/student/topics`

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Topic mastery list with scores */" }
}
```

---

### GET `/api/student/learning-path`

**Response (200):**

> Internally calls AI Service (`POST /ai/generate-learning-path`).

```json
{
  "success": true,
  "data": {
    "learningPath": [
      {
        "step": 1,
        "topic": "string",
        "objective": "string",
        "activities": ["string"]
      }
    ],
    "summary": "string"
  }
}
```

---

## Analytics Module

> Route prefix: `/api/analytics`  
> Source: `src/modules/analytics/`

### GET `/api/analytics/student`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | STUDENT |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Student analytics: submission trends, score progression */" }
}
```

---

### GET `/api/analytics/class/:classId`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Class analytics: averages, distributions, comparisons */" }
}
```

---

### GET `/api/analytics/class/:classId/topics`

| Auth         | Roles   |
| ------------ | ------- |
| Bearer Token | TEACHER |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Per-topic analytics for the class */" }
}
```

---

## Reports Module

> Route prefix: `/api/reports`  
> Source: `src/modules/reports/`

### GET `/api/reports/student`

| Auth         | Roles          |
| ------------ | -------------- |
| Bearer Token | STUDENT, ADMIN |

**Response (200):**

> Internally calls AI Service (`POST /ai/generate-report`).

```json
{
  "success": true,
  "data": {
    "overallScore": 75,
    "strengths": ["string"],
    "weaknesses": ["string"],
    "summary": "string",
    "recommendations": ["string"],
    "model": "string",
    "promptVersion": "string"
  }
}
```

---

### GET `/api/reports/class/:classId`

| Auth         | Roles          |
| ------------ | -------------- |
| Bearer Token | TEACHER, ADMIN |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Class-level performance summary */" }
}
```

---

### GET `/api/reports/weekly/:classId`

| Auth         | Roles          |
| ------------ | -------------- |
| Bearer Token | TEACHER, ADMIN |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "classId": "ObjectId",
      "weekStart": "ISO 8601",
      "weekEnd": "ISO 8601",
      "summary": "string",
      "strongTopics": ["string"],
      "weakTopics": ["string"],
      "studentsNeedingAttention": [
        { "studentId": "ObjectId", "name": "string", "reason": "string" }
      ],
      "recommendations": ["string"],
      "model": "string",
      "promptVersion": "string",
      "generatedBy": "ObjectId",
      "createdAt": "ISO 8601"
    }
  ]
}
```

---

### POST `/api/reports/weekly/:classId/generate`

| Auth         | Roles          |
| ------------ | -------------- |
| Bearer Token | TEACHER, ADMIN |

**Request Body:**

```json
{}
```

**Pipeline:**
1. Aggregates class performance data for the current week
2. Calls AI Service (`POST /ai/generate-weekly-report`)
3. Stores the report in `weekly_reports` collection
4. Returns the generated report

**Response (201):**

```json
{
  "success": true,
  "data": { "/* WeeklyReport document */" }
}
```

---

## Admin Module

> Route prefix: `/api/admin`  
> Source: `src/modules/admin/`  
> All routes require: `authenticate` + `authorize(["ADMIN"])`

### GET `/api/admin/dashboard`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalStudents": 120,
    "totalTeachers": 25,
    "totalClasses": 10,
    "totalAssignments": 45,
    "totalSubmissions": 890
  }
}
```

---

### GET `/api/admin/users`

**Query Params:**

| Param   | Type   | Description                        |
| ------- | ------ | ---------------------------------- |
| `role`  | string | Filter: STUDENT, TEACHER, ADMIN    |
| `page`  | number | Page number for pagination         |
| `limit` | number | Items per page                     |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "name": "string",
      "email": "string",
      "role": "STUDENT | TEACHER | ADMIN",
      "collegeId": "string",
      "department": "string",
      "createdAt": "ISO 8601"
    }
  ]
}
```

---

### POST `/api/admin/users`

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "STUDENT | TEACHER | ADMIN",
  "collegeId": "string",
  "department": "string"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Created User object (without passwordHash) */" }
}
```

---

### GET `/api/admin/users/:id`

**Response (200):**

```json
{
  "success": true,
  "data": { "/* User object */" }
}
```

---

### PUT `/api/admin/users/:id`

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "role": "STUDENT | TEACHER | ADMIN",
  "collegeId": "string",
  "department": "string"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated User object */" }
}
```

---

### DELETE `/api/admin/users/:id`

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted"
}
```

---

### GET `/api/admin/classes`

**Query Params:**

| Param   | Type   | Description    |
| ------- | ------ | -------------- |
| `page`  | number | Pagination     |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Class documents with populated teacher info */"]
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Error Codes

| Code                        | HTTP | Description                             |
| --------------------------- | ---- | --------------------------------------- |
| `VALIDATION_ERROR`          | 400  | Joi validation failed                   |
| `INVALID_CREDENTIALS`       | 401  | Wrong email or password                 |
| `UNAUTHORIZED`              | 401  | No token or expired token               |
| `FORBIDDEN`                 | 403  | Role not authorized for endpoint        |
| `NOT_FOUND`                 | 404  | Resource not found                      |
| `DUPLICATE_EMAIL`           | 409  | Email already registered                |
| `MAX_ATTEMPTS_REACHED`      | 409  | Assignment max submissions reached      |
| `RATE_LIMIT_EXCEEDED`       | 429  | 500 req/15min exceeded                  |
| `AUTH_RATE_LIMIT_EXCEEDED`  | 429  | 30 req/15min on auth routes             |
| `INTERNAL_SERVER_ERROR`     | 500  | Unhandled exception                     |

### 404 Catch-All

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/unknown-path"
  }
}
```

---

## Data Models

### User

| Field          | Type     | Constraints                     |
| -------------- | -------- | ------------------------------- |
| `_id`          | ObjectId | Auto-generated                  |
| `name`         | String   | required, trimmed               |
| `email`        | String   | required, unique, lowercase     |
| `passwordHash` | String   | required (never exposed in API) |
| `role`         | String   | enum: STUDENT, TEACHER, ADMIN   |
| `collegeId`    | String   | optional                        |
| `department`   | String   | optional                        |
| `createdAt`    | Date     | auto (timestamps)               |
| `updatedAt`    | Date     | auto (timestamps)               |

### Class

| Field         | Type       | Constraints               |
| ------------- | ---------- | ------------------------- |
| `_id`         | ObjectId   | Auto-generated            |
| `name`        | String     | required                  |
| `code`        | String     | optional                  |
| `department`  | String     | optional                  |
| `description` | String     | optional                  |
| `teacherId`   | ObjectId   | ref: User, required       |
| `students`    | [ObjectId] | ref: User                 |
| `languages`   | [String]   | optional                  |
| `semester`    | String     | optional                  |

### Assignment

| Field         | Type       | Constraints                    |
| ------------- | ---------- | ------------------------------ |
| `_id`         | ObjectId   | Auto-generated                 |
| `title`       | String     | required, 2-200 chars          |
| `description` | String     | required                       |
| `language`    | String     | required                       |
| `difficulty`  | String     | enum: EASY, MEDIUM, HARD       |
| `topics`      | [String]   | optional                       |
| `testCases`   | [TestCase] | `{input, expectedOutput, isHidden}` |
| `deadline`    | Date       | optional                       |
| `maxAttempts` | Number     | optional, min 1                |
| `classId`     | ObjectId   | ref: Class, required           |
| `createdBy`   | ObjectId   | ref: User, required            |

### Submission

| Field              | Type          | Constraints                                       |
| ------------------ | ------------- | ------------------------------------------------- |
| `_id`              | ObjectId      | Auto-generated                                    |
| `assignmentId`     | ObjectId      | ref: Assignment                                   |
| `userId`           | ObjectId      | ref: User                                         |
| `code`             | String        | required                                          |
| `language`         | String        | required                                          |
| `status`           | String        | enum: PENDING, RUNNING, PASSED, FAILED, ERROR, TIMEOUT, COMPLETED |
| `output`           | String        | default: ""                                       |
| `testResults`      | [TestResult]  | `{testCaseIndex, passed, actualOutput, expectedOutput, executionTime, error}` |
| `score`            | Number        | 0-100                                             |
| `testCasesPassed`  | Number        | default: 0                                        |
| `totalTestCases`   | Number        | default: 0                                        |
| `executionTime`    | Number        | ms                                                |
| `attemptNumber`    | Number        | min: 1                                            |
| `submittedAt`      | Date          | default: now                                      |
| `aiAnalysis`       | Object        | `{mastery, weakTopics, mistakes, recommendations}`|

### Quiz

| Field        | Type          | Constraints                            |
| ------------ | ------------- | -------------------------------------- |
| `_id`        | ObjectId      | Auto-generated                         |
| `title`      | String        | required                               |
| `language`   | String        | required                               |
| `topic`      | String        | optional                               |
| `topics`     | [String]      | optional                               |
| `studentId`  | ObjectId      | ref: User (for daily quizzes)          |
| `targetDate` | Date          | indexed (for daily quizzes)            |
| `questions`  | [Question]    | `{question, options, correctAnswer, explanation, topic, difficulty}` |
| `createdBy`  | ObjectId      | ref: User                              |

### QuizAttempt

| Field        | Type       | Constraints                                |
| ------------ | ---------- | ------------------------------------------ |
| `_id`        | ObjectId   | Auto-generated                             |
| `quizId`     | ObjectId   | ref: Quiz                                  |
| `studentId`  | ObjectId   | ref: User                                  |
| `answers`    | [Answer]   | `{questionIndex, selectedAnswer, isCorrect}` |
| `score`      | Number     | 0-100                                      |
| `completedAt`| Date       | default: now                               |

### Progress

| Field                    | Type     | Constraints                        |
| ------------------------ | -------- | ---------------------------------- |
| `_id`                    | ObjectId | Auto-generated                     |
| `studentId`              | ObjectId | ref: User                          |
| `language`               | String   | required, lowercase                |
| `topic`                  | String   | required                           |
| `assignmentScore`        | Number   | 0-100                              |
| `quizScore`              | Number   | 0-100                              |
| `totalSubmissions`       | Number   | min: 0                             |
| `successfulSubmissions`  | Number   | min: 0                             |
| `submissionSuccessRate`  | Number   | 0-100                              |
| `errorFrequencyFactor`   | Number   | 0-100                              |
| `practiceFrequencyFactor`| Number   | 0-100                              |
| `masteryScore`           | Number   | 0-100                              |
| `aiMasteryScore`         | Number   | 0-100                              |
| `attempts`               | Number   | min: 0                             |
| `mistakes`               | Number   | min: 0                             |
| `lastPracticedAt`        | Date     | nullable                           |

> **Unique Index:** `(studentId, language, topic)`

### WeeklyReport

| Field                      | Type               | Constraints         |
| -------------------------- | ------------------ | ------------------- |
| `_id`                      | ObjectId           | Auto-generated      |
| `classId`                  | ObjectId           | ref: Class          |
| `weekStart`                | Date               | required            |
| `weekEnd`                  | Date               | required            |
| `summary`                  | String             | required            |
| `strongTopics`             | [String]           |                     |
| `weakTopics`               | [String]           |                     |
| `studentsNeedingAttention` | [StudentAttention] | `{studentId, name, reason}` |
| `recommendations`         | [String]           |                     |
| `model`                    | String             | AI model used       |
| `promptVersion`            | String             |                     |
| `generatedBy`              | ObjectId           | ref: User           |

> **Collection:** `weekly_reports`
