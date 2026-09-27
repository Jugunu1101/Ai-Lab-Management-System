# 🔌 Offline & Local Development Guide

This guide explains how to run the entire **AI-Powered Programming Lab Management Platform** locally without an active internet connection.

---

## 1. Quick Architecture Overview

```
React (Vite :5173)
  ↓ (API proxy)
Node.js / Express (:3000)
  ↓
Local MongoDB (:27017) + Local Redis (:6379)
  ↓
Code Execution (Local Docker Engine)
  ↓
Python FastAPI (:8000) with AI_MOCK_MODE=true
```

---

## 2. Starting Local Database & Cache (Docker)

If using Docker Desktop (recommended):

```bash
# Start MongoDB 7.0 container
docker run -d --name programming-lab-mongodb --restart unless-stopped -p 27017:27017 -v mongo_data:/data/db mongo:7.0

# Start Redis 7 container
docker run -d --name programming-lab-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
```

Or using Docker Compose for just the backing services:

```bash
docker compose up -d mongodb redis
```

---

## 3. Configuring Database URIs (Switching Between Local & Atlas)

The project supports switching between **Local MongoDB** and **MongoDB Atlas** purely through environment configuration in `.env` and `backend/.env`.

### Option A: Local MongoDB (Offline & Local Development — Default)
```env
MONGODB_URI=mongodb://localhost:27017/ai-lab
MONGODB_DB_NAME=ai-lab
```

### Option B: Remote MongoDB Atlas (Cloud Production — Requires Active Internet)
```env
# Comment out the local URI and uncomment the Atlas URI:
# MONGODB_URI=mongodb+srv://<username>:<password>@project.8lpp7ls.mongodb.net/
MONGODB_DB_NAME=ai-lab
```

> **Note:** Never commit production database passwords or credentials to version control.

---

## 4. Seeding the Local Database

Seed demo accounts, classes, and programming problems (JavaScript, C++, Python):

```bash
cd backend
npm run seed
```

### Default Demo Credentials
- **Password for all accounts:** `Password@123`
- **Student:** `student@lab.edu`
- **Teacher:** `teacher@lab.edu`
- **Admin:** `admin@lab.edu`

---

## 5. Running the AI Service in Mock Mode (No Internet Required)

The Python FastAPI microservice includes an offline deterministic mock generator.

```bash
cd ai-service

# Ensure .env has AI_MOCK_MODE=true
# AI_MOCK_MODE=true

# Windows:
venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000

# macOS / Linux:
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Verify AI health:
```bash
curl http://localhost:8000/health
# {"status":"healthy","service":"Programming Lab AI Service","environment":"development","aiMode":"mock"}
```

---

## 6. Running the Node.js Backend

```bash
cd backend

npm install
npm run dev
```

Verify backend health & dependencies:
```bash
curl http://localhost:3000/health
```

Expected health JSON:
```json
{
  "status": "ok",
  "service": "programming-lab-backend",
  "checks": {
    "backend": "running",
    "database": "connected",
    "aiMode": "mock",
    "codeExecution": {
      "available": true,
      "engine": "docker"
    }
  }
}
```

---

## 7. Running Code Execution (Docker Sandboxes)

Code execution runs isolated code inside ephemeral Docker containers without needing external network access:
- **C / C++**: `gcc:latest`
- **Python**: `python:3.11-alpine`
- **JavaScript**: `node:22-alpine`
- **Java**: `eclipse-temurin:21-alpine`

Pre-cache these images once while online:
```bash
docker pull gcc:latest
docker pull python:3.11-alpine
docker pull node:22-alpine
docker pull eclipse-temurin:21-alpine
```

When offline, test execution does not depend on MongoDB Atlas or any remote service.

---

## 8. Running the React Frontend

```bash
cd frontend

npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 9. Feature Availability Matrix

| Feature | Offline (Local Mode) | Online (Cloud / Atlas) | Notes |
|---------|:-------------------:|:---------------------:|-------|
| Frontend UI & Monaco Editor | ✅ Works | ✅ Works | Runs locally on port 5173 |
| Student / Teacher / Admin Login | ✅ Works | ✅ Works | Authenticates via local MongoDB |
| Assignment Browsing & Details | ✅ Works | ✅ Works | Loaded from local database |
| "Run Tests" in Code Editor | ✅ Works | ✅ Works | Executes locally in Docker containers |
| "Submit Solution" & Grading | ✅ Works | ✅ Works | Validates, executes in Docker, saves to local DB |
| Submission History | ✅ Works | ✅ Works | Stored in local MongoDB |
| Class Management & Progress | ✅ Works | ✅ Works | Stored in local MongoDB |
| AI Submission Feedback | ✅ Works (Mock) | ✅ Works (Live LLM) | Deterministic mock responses when offline |
| AI Daily Quizzes | ✅ Works (Mock) | ✅ Works (Live LLM) | Mock quiz generation when offline |
| AI Weak Topics & Learning Paths | ✅ Works (Mock) | ✅ Works (Live LLM) | Rule-based & mock taxonomy when offline |
| MongoDB Atlas Cloud DB | ❌ Requires Internet | ✅ Works | Needs DNS resolution & internet connection |
| Live OpenAI / Gemini API calls | ❌ Requires Internet | ✅ Works | Requires external API connection |

---

## 10. Error Handling & Sanitization

If the database or code execution service is stopped, the application displays clean, user-friendly messages instead of raw network or driver traces:

- **Database offline during assignment fetch:**
  `"Unable to load assignments. Please check that the backend and database are running."`
- **Database offline during submission:**
  `"Submission could not be saved. Please check the local database connection."`
- **Docker unavailable during test run:**
  `"Code execution service is unavailable. Please make sure the execution service is running."`
- **AI service unavailable:**
  `"AI service is currently unavailable. Please verify the AI service is running or switch to mock mode."`
