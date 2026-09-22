# Frontend API Contract

> All requests are made via Axios instance with `baseURL = VITE_API_URL || "/api"`.
> The `Authorization: Bearer <token>` header is automatically attached when a token exists in `localStorage`.
> All responses are **unwrapped** by the Axios interceptor — consumers receive `response.data` directly.

---

## Table of Contents

- [Auth Service](#auth-service)
- [Class Service](#class-service)
- [Assignment Service](#assignment-service)
- [Submission Service](#submission-service)
- [Quiz Service](#quiz-service)
- [Progress Service](#progress-service)
- [Report Service](#report-service)
- [Admin Service](#admin-service)

---

## Auth Service

> Source: `src/services/auth.service.js`

### 1. Register

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `POST`                  |
| Endpoint | `/auth/register`        |
| Auth     | None                    |

**Request Body:**

```json
{
  "name": "string (2-100 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (6-100 chars, required)",
  "role": "STUDENT | TEACHER (optional, default: STUDENT)",
  "collegeId": "string (optional)",
  "department": "string (optional)"
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
    "collegeId": "string | undefined",
    "department": "string | undefined",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

### 2. Login

| Field    | Value            |
| -------- | ---------------- |
| Method   | `POST`           |
| Endpoint | `/auth/login`    |
| Auth     | None             |

**Request Body:**

```json
{
  "email": "string (valid email, required)",
  "password": "string (required)"
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

### 3. Get Current User

| Field    | Value         |
| -------- | ------------- |
| Method   | `GET`         |
| Endpoint | `/auth/me`    |
| Auth     | Bearer Token  |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "role": "STUDENT | TEACHER | ADMIN",
    "collegeId": "string | undefined",
    "department": "string | undefined",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

## Class Service

> Source: `src/services/class.service.js`

### 1. Get All Classes

| Field    | Value                       |
| -------- | --------------------------- |
| Method   | `GET`                       |
| Endpoint | `/classes`                  |
| Auth     | Bearer Token (STUDENT, TEACHER) |

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
      "teacherId": "ObjectId (populated User)",
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

### 2. Get Class by ID

| Field    | Value                       |
| -------- | --------------------------- |
| Method   | `GET`                       |
| Endpoint | `/classes/:classId`         |
| Auth     | Bearer Token (STUDENT, TEACHER) |

**Path Params:**

| Param     | Type   | Description |
| --------- | ------ | ----------- |
| `classId` | string | Class ObjectId |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "name": "string",
    "code": "string",
    "department": "string",
    "description": "string",
    "teacherId": "ObjectId | populated User",
    "students": ["ObjectId | populated User"],
    "languages": ["string"],
    "semester": "string",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

### 3. Create Class

| Field    | Value                    |
| -------- | ------------------------ |
| Method   | `POST`                   |
| Endpoint | `/classes`               |
| Auth     | Bearer Token (TEACHER)   |

**Request Body:**

```json
{
  "name": "string (2-100 chars, required)",
  "code": "string (max 50, optional)",
  "department": "string (max 100, optional)",
  "description": "string (max 1000, optional)",
  "languages": ["string (default: ['javascript','python','cpp','java'])"],
  "semester": "string (max 50, optional)"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Class object */" }
}
```

---

### 4. Update Class

| Field    | Value                    |
| -------- | ------------------------ |
| Method   | `PUT`                    |
| Endpoint | `/classes/:classId`      |
| Auth     | Bearer Token (TEACHER)   |

**Request Body (at least 1 field required):**

```json
{
  "name": "string (2-100 chars, optional)",
  "languages": ["string (min 1 item, optional)"],
  "semester": "string (max 50, optional)"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Class object */" }
}
```

---

### 5. Add Student to Class

| Field    | Value                            |
| -------- | -------------------------------- |
| Method   | `POST`                           |
| Endpoint | `/classes/:classId/students`     |
| Auth     | Bearer Token (TEACHER)           |

**Request Body:**

```json
{
  "studentId": "string (required, User ObjectId)"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Class object */" }
}
```

---

## Assignment Service

> Source: `src/services/assignment.service.js`

### 1. Get Assignments

| Field    | Value                             |
| -------- | --------------------------------- |
| Method   | `GET`                             |
| Endpoint | `/assignments`                    |
| Auth     | Bearer Token (STUDENT, TEACHER)   |

**Query Params (optional):**

| Param     | Type   | Description               |
| --------- | ------ | ------------------------- |
| `classId` | string | Filter by class           |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "title": "string",
      "description": "string",
      "language": "string",
      "difficulty": "EASY | MEDIUM | HARD",
      "topics": ["string"],
      "testCases": [
        {
          "input": "string",
          "expectedOutput": "string",
          "isHidden": "boolean"
        }
      ],
      "deadline": "ISO 8601 | null",
      "maxAttempts": "number | null",
      "classId": "ObjectId",
      "createdBy": "ObjectId",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

---

### 2. Get Assignment by ID

| Field    | Value                             |
| -------- | --------------------------------- |
| Method   | `GET`                             |
| Endpoint | `/assignments/:assignmentId`      |
| Auth     | Bearer Token (STUDENT, TEACHER)   |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Assignment object */" }
}
```

---

### 3. Create Assignment

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `POST`                  |
| Endpoint | `/assignments`          |
| Auth     | Bearer Token (TEACHER)  |

**Request Body:**

```json
{
  "title": "string (2-200 chars, required)",
  "description": "string (required)",
  "language": "string (1-50 chars, required)",
  "difficulty": "EASY | MEDIUM | HARD (required)",
  "topics": ["string (optional)"],
  "testCases": [
    {
      "input": "string (required)",
      "expectedOutput": "string (required)",
      "isHidden": "boolean (optional)"
    }
  ],
  "deadline": "ISO 8601 date | null (optional)",
  "maxAttempts": "number (min 1, optional)",
  "classId": "string (required)"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Assignment object */" }
}
```

---

### 4. Update Assignment

| Field    | Value                              |
| -------- | ---------------------------------- |
| Method   | `PUT`                              |
| Endpoint | `/assignments/:assignmentId`       |
| Auth     | Bearer Token (TEACHER)             |

**Request Body (at least 1 field required):**

```json
{
  "title": "string (2-200 chars)",
  "description": "string",
  "language": "string (1-50 chars)",
  "difficulty": "EASY | MEDIUM | HARD",
  "topics": ["string"],
  "testCases": [{ "input": "string", "expectedOutput": "string", "isHidden": "boolean" }],
  "deadline": "ISO 8601 | null",
  "maxAttempts": "number (min 1) | null"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Updated Assignment object */" }
}
```

---

### 5. Delete Assignment

| Field    | Value                              |
| -------- | ---------------------------------- |
| Method   | `DELETE`                           |
| Endpoint | `/assignments/:assignmentId`       |
| Auth     | Bearer Token (TEACHER)             |

**Response (200):**

```json
{
  "success": true,
  "message": "Assignment deleted"
}
```

---

### 6. Get Assignment Results

| Field    | Value                                     |
| -------- | ----------------------------------------- |
| Method   | `GET`                                     |
| Endpoint | `/assignments/:assignmentId/results`      |
| Auth     | Bearer Token (TEACHER)                    |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "assignment": { "/* Assignment object */" },
    "submissions": ["/* Submission objects with user info */"]
  }
}
```

---

## Submission Service

> Source: `src/services/submission.service.js`

### 1. Submit Code

| Field    | Value                    |
| -------- | ------------------------ |
| Method   | `POST`                   |
| Endpoint | `/submissions`           |
| Auth     | Bearer Token (STUDENT)   |

**Request Body:**

```json
{
  "assignmentId": "string (required)",
  "code": "string (min 1 char, required)",
  "language": "string (1-50 chars, required)"
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
        "testCaseIndex": "number",
        "passed": "boolean",
        "actualOutput": "string",
        "expectedOutput": "string",
        "executionTime": "number (ms)",
        "error": "string"
      }
    ],
    "score": "number (0-100)",
    "testCasesPassed": "number",
    "totalTestCases": "number",
    "executionTime": "number (ms)",
    "attemptNumber": "number",
    "submittedAt": "ISO 8601",
    "aiAnalysis": {
      "mastery": [{ "topic": "string", "score": "number (0-100)" }],
      "weakTopics": ["string"],
      "mistakes": ["string"],
      "recommendations": ["string"]
    },
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

### 2. Get My Submissions

| Field    | Value                    |
| -------- | ------------------------ |
| Method   | `GET`                    |
| Endpoint | `/submissions`           |
| Auth     | Bearer Token (STUDENT)   |

**Query Params (optional):**

| Param          | Type   | Description               |
| -------------- | ------ | ------------------------- |
| `assignmentId` | string | Filter by assignment      |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Submission objects */"]
}
```

---

### 3. Get Submission by ID

| Field    | Value                              |
| -------- | ---------------------------------- |
| Method   | `GET`                              |
| Endpoint | `/submissions/:submissionId`       |
| Auth     | Bearer Token (STUDENT)             |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Submission object */" }
}
```

---

### 4. Get Assignment Submissions (Teacher)

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| Method   | `GET`                                       |
| Endpoint | `/submissions/assignment/:assignmentId`     |
| Auth     | Bearer Token (TEACHER)                      |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Submission objects with populated user */"]
}
```

---

### 5. Get Submission Details (Teacher)

| Field    | Value                                     |
| -------- | ----------------------------------------- |
| Method   | `GET`                                     |
| Endpoint | `/submissions/:submissionId/details`      |
| Auth     | Bearer Token (TEACHER)                    |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Full Submission object with code, test results, AI analysis */" }
}
```

---

## Quiz Service

> Source: `src/services/quiz.service.js`

### 1. Get Today's Quiz

| Field    | Value                        |
| -------- | ---------------------------- |
| Method   | `GET`                        |
| Endpoint | `/quiz/today`                |
| Auth     | Bearer Token (STUDENT, ADMIN)|

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
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "A | B | C | D",
        "explanation": "string",
        "topic": "string",
        "difficulty": "string"
      }
    ],
    "studentId": "ObjectId",
    "targetDate": "ISO 8601",
    "createdAt": "ISO 8601"
  }
}
```

---

### 2. Get All Quizzes

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Method   | `GET`                                   |
| Endpoint | `/quizzes`                              |
| Auth     | Bearer Token (STUDENT, TEACHER, ADMIN)  |

**Query Params (optional):**

| Param     | Type   | Description          |
| --------- | ------ | -------------------- |
| `classId` | string | Filter by class      |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Quiz objects */"]
}
```

---

### 3. Get Quiz by ID

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Method   | `GET`                                   |
| Endpoint | `/quizzes/:quizId`                      |
| Auth     | Bearer Token (STUDENT, TEACHER, ADMIN)  |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Quiz object */" }
}
```

---

### 4. Create Quiz

| Field    | Value                               |
| -------- | ----------------------------------- |
| Method   | `POST`                              |
| Endpoint | `/quizzes`                          |
| Auth     | Bearer Token (TEACHER, ADMIN)       |

**Request Body:**

```json
{
  "title": "string (2-200 chars, required)",
  "language": "string (required)",
  "topic": "string (required)",
  "questions": [
    {
      "question": "string (required)",
      "options": ["string (min 2 items, required)"],
      "correctAnswer": "string (required)"
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Quiz object */" }
}
```

---

### 5. Submit Quiz Answers

| Field    | Value                               |
| -------- | ----------------------------------- |
| Method   | `POST`                              |
| Endpoint | `/quizzes/:quizId/submit`           |
| Auth     | Bearer Token (STUDENT, ADMIN)       |

**Request Body:**

```json
{
  "answers": [
    {
      "selectedAnswer": "string (A | B | C | D or empty)"
    }
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
      {
        "questionIndex": "number",
        "selectedAnswer": "string",
        "isCorrect": "boolean"
      }
    ],
    "score": "number (0-100)",
    "completedAt": "ISO 8601"
  }
}
```

---

### 6. Get Quiz Attempts

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Method   | `GET`                                   |
| Endpoint | `/quizzes/:quizId/attempts`             |
| Auth     | Bearer Token (STUDENT, TEACHER, ADMIN)  |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of QuizAttempt objects */"]
}
```

---

## Progress Service

> Source: `src/services/progress.service.js`

### 1. Get Progress

| Field    | Value                    |
| -------- | ------------------------ |
| Method   | `GET`                    |
| Endpoint | `/progress`              |
| Auth     | Bearer Token (STUDENT)   |

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
      "assignmentScore": "number (0-100)",
      "quizScore": "number (0-100)",
      "totalSubmissions": "number",
      "successfulSubmissions": "number",
      "submissionSuccessRate": "number (0-100)",
      "errorFrequencyFactor": "number (0-100)",
      "practiceFrequencyFactor": "number (0-100)",
      "masteryScore": "number (0-100)",
      "aiMasteryScore": "number (0-100)",
      "attempts": "number",
      "mistakes": "number",
      "lastPracticedAt": "ISO 8601 | null"
    }
  ]
}
```

---

### 2. Get Weak Topics

| Field    | Value                       |
| -------- | --------------------------- |
| Method   | `GET`                       |
| Endpoint | `/progress/weak-topics`     |
| Auth     | Bearer Token (STUDENT)      |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Progress objects where masteryScore is below threshold */"]
}
```

---

### 3. Get Student Dashboard

| Field    | Value                        |
| -------- | ---------------------------- |
| Method   | `GET`                        |
| Endpoint | `/student/dashboard`         |
| Auth     | Bearer Token (STUDENT, ADMIN)|

**Response (200):**

```json
{
  "success": true,
  "data": {
    "/* Aggregated dashboard data: classes, scores, recent activity */"
  }
}
```

---

### 4. Get Student Progress

| Field    | Value                        |
| -------- | ---------------------------- |
| Method   | `GET`                        |
| Endpoint | `/student/progress`          |
| Auth     | Bearer Token (STUDENT, ADMIN)|

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Detailed progress breakdown */" }
}
```

---

### 5. Get Student Topics

| Field    | Value                        |
| -------- | ---------------------------- |
| Method   | `GET`                        |
| Endpoint | `/student/topics`            |
| Auth     | Bearer Token (STUDENT, ADMIN)|

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Topic mastery list with scores */" }
}
```

---

### 6. Get Student Learning Path

| Field    | Value                            |
| -------- | -------------------------------- |
| Method   | `GET`                            |
| Endpoint | `/student/learning-path`         |
| Auth     | Bearer Token (STUDENT, ADMIN)    |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "learningPath": [
      {
        "step": "number",
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

## Report Service

> Source: `src/services/report.service.js`

### 1. Get Student Report

| Field    | Value                         |
| -------- | ----------------------------- |
| Method   | `GET`                         |
| Endpoint | `/reports/student`            |
| Auth     | Bearer Token (STUDENT, ADMIN) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overallScore": "number (0-100)",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "summary": "string",
    "recommendations": ["string"]
  }
}
```

---

### 2. Get Class Report

| Field    | Value                           |
| -------- | ------------------------------- |
| Method   | `GET`                           |
| Endpoint | `/reports/class/:classId`       |
| Auth     | Bearer Token (TEACHER, ADMIN)   |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Class-level performance report */" }
}
```

---

### 3. Get Weekly Reports

| Field    | Value                              |
| -------- | ---------------------------------- |
| Method   | `GET`                              |
| Endpoint | `/reports/weekly/:classId`         |
| Auth     | Bearer Token (TEACHER, ADMIN)      |

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
      "createdAt": "ISO 8601"
    }
  ]
}
```

---

### 4. Generate Weekly Report

| Field    | Value                                      |
| -------- | ------------------------------------------ |
| Method   | `POST`                                     |
| Endpoint | `/reports/weekly/:classId/generate`        |
| Auth     | Bearer Token (TEACHER, ADMIN)              |

**Request Body:**

```json
{}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Generated WeeklyReport object */" }
}
```

---

### 5. Get Class Analytics

| Field    | Value                              |
| -------- | ---------------------------------- |
| Method   | `GET`                              |
| Endpoint | `/analytics/class/:classId`        |
| Auth     | Bearer Token (TEACHER)             |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* Class analytics: topic averages, score distributions */" }
}
```

---

## Admin Service

> Source: `src/services/admin.service.js`

### 1. Get Admin Dashboard

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `GET`                   |
| Endpoint | `/admin/dashboard`      |
| Auth     | Bearer Token (ADMIN)    |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": "number",
    "totalStudents": "number",
    "totalTeachers": "number",
    "totalClasses": "number",
    "totalAssignments": "number",
    "totalSubmissions": "number"
  }
}
```

---

### 2. Get Users

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `GET`                   |
| Endpoint | `/admin/users`          |
| Auth     | Bearer Token (ADMIN)    |

**Query Params (optional):**

| Param  | Type   | Description              |
| ------ | ------ | ------------------------ |
| `role` | string | Filter by STUDENT/TEACHER/ADMIN |
| `page` | number | Pagination               |
| `limit`| number | Items per page           |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of User objects (without passwordHash) */"]
}
```

---

### 3. Get User by ID

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `GET`                   |
| Endpoint | `/admin/users/:id`      |
| Auth     | Bearer Token (ADMIN)    |

**Response (200):**

```json
{
  "success": true,
  "data": { "/* User object */" }
}
```

---

### 4. Create User

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `POST`                  |
| Endpoint | `/admin/users`          |
| Auth     | Bearer Token (ADMIN)    |

**Request Body:**

```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "STUDENT | TEACHER | ADMIN (required)",
  "collegeId": "string (optional)",
  "department": "string (optional)"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { "/* Created User object */" }
}
```

---

### 5. Update User

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `PUT`                   |
| Endpoint | `/admin/users/:id`      |
| Auth     | Bearer Token (ADMIN)    |

**Request Body:**

```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "STUDENT | TEACHER | ADMIN (optional)",
  "collegeId": "string (optional)",
  "department": "string (optional)"
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

### 6. Delete User

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `DELETE`                |
| Endpoint | `/admin/users/:id`      |
| Auth     | Bearer Token (ADMIN)    |

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted"
}
```

---

### 7. Get Classes (Admin)

| Field    | Value                   |
| -------- | ----------------------- |
| Method   | `GET`                   |
| Endpoint | `/admin/classes`        |
| Auth     | Bearer Token (ADMIN)    |

**Query Params (optional):**

| Param  | Type   | Description    |
| ------ | ------ | -------------- |
| `page` | number | Pagination     |
| `limit`| number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": ["/* Array of Class objects */"]
}
```

---

## Standard Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable error message",
    "details": "object | null (validation details, if any)"
  }
}
```

### Common Error Codes

| Code                       | HTTP Status | Description                          |
| -------------------------- | ----------- | ------------------------------------ |
| `VALIDATION_ERROR`         | 400         | Request body failed validation       |
| `UNAUTHORIZED`             | 401         | Missing or invalid token             |
| `FORBIDDEN`                | 403         | Insufficient role permissions        |
| `NOT_FOUND`                | 404         | Resource not found                   |
| `RATE_LIMIT_EXCEEDED`      | 429         | Global rate limit (500 req/15min)    |
| `AUTH_RATE_LIMIT_EXCEEDED`  | 429         | Auth rate limit (30 req/15min)       |
| `INTERNAL_SERVER_ERROR`    | 500         | Unexpected server error              |
