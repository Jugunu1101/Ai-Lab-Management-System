# API Testing Guide

**Date:** 2026-09-22  
**Status:** Complete test suite ready

---

## 📋 Prerequisites

Before running tests, ensure these services are running:

1. **MongoDB** - Database (default: `mongodb://localhost:27017/programming-lab`)
2. **Redis** - Job queue for code execution (default: `localhost:6379`)
3. **Docker** - Code execution sandbox
4. **AI Service** - FastAPI microservice (optional, for AI features)

---

## 🚀 Quick Start - Automated Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:3000`

### 2. Run the Test Suite

```bash
# In a new terminal
cd backend
node test-api.js
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║         API ENDPOINT TESTING - COMPREHENSIVE SUITE         ║
╚════════════════════════════════════════════════════════════╝

Base URL: http://localhost:3000
Time: 2026-09-22T15:26:33.827Z

============================================================
  HEALTH CHECK
============================================================
✓ GET /health - Status: OK

============================================================
  AUTHENTICATION
============================================================
✓ POST /api/auth/register (Admin)
✓ POST /api/auth/register (Teacher)
✓ POST /api/auth/register (Student)
✓ POST /api/auth/login (validates correctly)
✓ GET /api/auth/me - User: Test Student

... [more tests]

Total Duration: 12.45s
✓ All endpoint tests completed!
```

---

## 🧪 What the Test Suite Tests

### Coverage Summary

| Category | Endpoints Tested | Description |
|----------|------------------|-------------|
| **Health** | 1 | Server health check |
| **Authentication** | 3 | Register, login, get user |
| **Classes** | 5 | CRUD operations + enrollment |
| **Assignments** | 5 | CRUD + results viewing |
| **Submissions** | 6 | Create, view, teacher access ✨ |
| **Progress** | 2 | Student progress tracking |
| **Analytics** | 4 | Student & class analytics ✨ |
| **Quizzes** | 5 | Generate, view, submit |
| **Reports** | 2 | Weekly report generation |
| **Student Dashboard** | 3 | Dashboard, progress, learning path |
| **Admin** | 2 | Dashboard, user management |
| **Colleges** | 1 | Public college listing |

**Total:** 39 endpoint tests covering all 29 unique API routes

✨ Includes tests for the 2 newly added endpoints:
- `GET /api/submissions/student/:studentId`
- `GET /api/analytics/student/:id`

---

## 📝 Manual Testing with cURL

If you prefer manual testing or the automated suite fails, use these cURL commands:

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"OK","timestamp":"..."}`

---

### 2. Register a Student

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@university.edu",
    "password": "SecurePass123!",
    "role": "STUDENT"
  }'
```

Save the returned `token` for authenticated requests.

---

### 3. Register a Teacher

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@university.edu",
    "password": "SecurePass123!",
    "role": "TEACHER"
  }'
```

---

### 4. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@university.edu",
    "password": "SecurePass123!"
  }'
```

---

### 5. Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 6. Create a Class (Teacher)

```bash
curl -X POST http://localhost:3000/api/classes \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to JavaScript",
    "code": "CS101",
    "description": "Learn JavaScript fundamentals",
    "languages": ["javascript"],
    "semester": "Fall 2026"
  }'
```

Save the returned `_id` as `CLASS_ID`.

---

### 7. Enroll Student in Class (Teacher)

```bash
curl -X POST http://localhost:3000/api/classes/CLASS_ID/students \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_ID"
  }'
```

---

### 8. Create Assignment (Teacher)

```bash
curl -X POST http://localhost:3000/api/assignments \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sum of Two Numbers",
    "description": "Write a function that returns the sum of two numbers",
    "language": "javascript",
    "difficulty": "EASY",
    "topics": ["functions", "arithmetic"],
    "testCases": [
      {
        "input": "1, 2",
        "expectedOutput": "3",
        "isHidden": false
      },
      {
        "input": "10, 20",
        "expectedOutput": "30",
        "isHidden": true
      }
    ],
    "deadline": "2026-09-30T23:59:59Z",
    "classId": "CLASS_ID"
  }'
```

Save the returned `_id` as `ASSIGNMENT_ID`.

---

### 9. Submit Solution (Student)

```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "ASSIGNMENT_ID",
    "code": "function sum(a, b) { return a + b; }",
    "language": "javascript"
  }'
```

Save the returned `_id` as `SUBMISSION_ID`.

---

### 10. ✨ NEW: Get Student Submissions by ID (Teacher)

```bash
curl http://localhost:3000/api/submissions/student/STUDENT_ID \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

**Purpose:** View all submissions from a specific student across all assignments.

---

### 11. ✨ NEW: Get Student Analytics by ID (Teacher)

```bash
curl http://localhost:3000/api/analytics/student/STUDENT_ID \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

**Purpose:** View detailed analytics for a specific student.

---

### 12. View Student Progress (Student)

```bash
curl http://localhost:3000/api/progress \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

---

### 13. Generate Quiz (Student)

```bash
curl -X POST http://localhost:3000/api/quizzes/generate \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "topics": ["arrays", "loops"]
  }'
```

---

### 14. Get Class Analytics (Teacher)

```bash
curl http://localhost:3000/api/analytics/class/CLASS_ID \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

---

### 15. Generate Weekly Report (Teacher)

```bash
curl -X POST http://localhost:3000/api/reports/weekly/CLASS_ID/generate \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

---

## 🔧 Troubleshooting

### Server Won't Start

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:** Start MongoDB:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

---

**Error:** `Redis connection failed`

**Solution:** Start Redis:
```bash
# Windows (with Redis installed)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

---

**Error:** `Docker daemon not running`

**Solution:** Start Docker Desktop or Docker daemon.

---

### Tests Fail with 401 Unauthorized

- Check that you're using the correct token
- Ensure the token hasn't expired (tokens expire after 7 days by default)
- Re-register/login to get a fresh token

---

### Tests Fail with 404 Not Found

- Verify the endpoint path is correct
- Check that the resource ID exists
- Ensure you've created the required resources first (class, assignment, etc.)

---

### Submission Status Stuck at PENDING

**Causes:**
1. Redis not running (job queue can't process)
2. Docker not running (can't execute code)
3. BullMQ worker not started

**Solution:**
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check Docker
docker ps

# Check backend logs for worker errors
```

---

## 📊 Understanding Test Results

### Success Indicators

✓ Green checkmark = Endpoint working correctly
- Status code 200/201
- Expected response structure
- Proper authorization checks

### Failure Indicators

✗ Red X = Endpoint issue
- Connection refused (server not running)
- 401 Unauthorized (bad token)
- 404 Not Found (resource doesn't exist)
- 500 Internal Server Error (bug in code)

---

## 🎯 Test Data Cleanup

The automated test creates:
- 3 users (admin, teacher, student)
- 1 class
- 1 assignment
- 1 submission
- 1-2 quizzes

To clean up test data:

```javascript
// In MongoDB shell or Compass
use programming-lab

db.users.deleteMany({ email: /test\.edu$/ })
db.classes.deleteMany({ code: 'CS101' })
db.assignments.deleteMany({ title: /Test Assignment/ })
db.submissions.deleteMany({ /* from test users */ })
db.quizzes.deleteMany({ /* from test users */ })
```

Or drop the entire test database:
```bash
mongo programming-lab --eval "db.dropDatabase()"
```

---

## 📈 Performance Testing

To test with load:

```bash
# Install Apache Bench
# Windows: Download from Apache website
# macOS: pre-installed
# Linux: apt-get install apache2-utils

# Test health endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/health

# Test with authentication
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/assignments
```

---

## 🐛 Reporting Issues

If tests reveal bugs:

1. **Check logs:** `backend/logs/` or console output
2. **Get full error:** Look for stack traces
3. **Minimal reproduction:** Isolate the failing endpoint
4. **Document:**
   - Endpoint that failed
   - Request payload
   - Expected vs actual response
   - Environment (Node version, OS, etc.)

---

## ✅ Test Checklist

Before deploying to production:

- [ ] All automated tests pass
- [ ] Health check responds correctly
- [ ] User registration works for all roles
- [ ] Authentication tokens are generated
- [ ] Teachers can create classes and assignments
- [ ] Students can submit code
- [ ] Code execution sandbox works (Docker)
- [ ] Background jobs process (Redis + BullMQ)
- [ ] Database indexes are created
- [ ] Rate limiting is active
- [ ] Error responses are consistent
- [ ] CORS is properly configured

---

## 📚 Next Steps

1. **Integration Tests:** Set up Jest with Supertest
2. **Unit Tests:** Test services and controllers in isolation
3. **E2E Tests:** Test frontend + backend together
4. **CI/CD:** Automate tests in GitHub Actions / GitLab CI

---

**Test Suite Version:** 1.0  
**Last Updated:** 2026-09-22  
**Maintained By:** Development Team