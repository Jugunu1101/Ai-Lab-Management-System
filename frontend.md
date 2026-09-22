# Frontend Development Specification

## 1. Overview & Architectural Role

The **Frontend** is a high-performance Single Page Application (SPA) built with **React (JavaScript) + Vite**, **Ant Design (antd)**, **Monaco Editor**, and **Recharts**.

### Core Architecture Rules
- **Presentation Layer Only**: React owns UI, routing, forms, code editing, and presentation states. It must **never** connect directly to MongoDB or call the Python AI service directly.
- **Single Source of Truth**: All data is fetched from and mutated via the Node.js backend REST API (`http://localhost:3000/api`).
- **Standardized UI States**: Every asynchronous screen must provide explicit, polished handling for:
  1. **Loading State** (Spinners, Skeletons)
  2. **Error State** (Alerts, retry buttons, user-friendly messages)
  3. **Empty State** (Empty illustrations, clear call-to-actions)
  4. **Success Feedback** (Notifications, badges, toast messages)
- **Visual Excellence**: Modern dark/light design system with curated harmonious color palettes (slate, indigo, emerald, amber, rose), card glassmorphism, responsive grid layouts, and smooth micro-animations.

---

## 2. Current Implementation Audit

### Status: **0% Implemented (Not Started)**
- The workspace currently contains only `ai-service/` and `backend/`.
- The `frontend/` directory has not yet been initialized.
- No React configuration, components, routes, or UI packages are present.

This document serves as the complete greenfield implementation blueprint to build the frontend to match `programming_lab_ai_architecture.md`.

---

## 3. Technology Stack & Packages

```json
{
  "name": "frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ant-design/icons": "^5.3.0",
    "@monaco-editor/react": "^4.6.0",
    "antd": "^5.15.0",
    "axios": "^1.6.8",
    "jwt-decode": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0"
  }
}
```

---

## 4. Directory Structure

Ensure the `frontend/` directory is constructed according to Architecture Section 2:

```text
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RoleRoute.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   └── CodeEditor.jsx
│   │   ├── student/
│   │   │   ├── WeakTopicsBanner.jsx
│   │   │   ├── DailyQuizWidget.jsx
│   │   │   ├── RecommendedStepsCard.jsx
│   │   │   └── SubmissionResultModal.jsx
│   │   ├── teacher/
│   │   │   ├── CreateAssignmentModal.jsx
│   │   │   ├── CreateClassModal.jsx
│   │   │   └── AtRiskStudentsTable.jsx
│   │   └── admin/
│   │       ├── CreateUserModal.jsx
│   │       └── SystemHealthBadge.jsx
│   ├── layouts/
│   │   ├── AppLayout.jsx
│   │   └── AuthLayout.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── student/
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── AssignmentList.jsx
│   │   │   ├── AssignmentDetails.jsx
│   │   │   ├── SubmissionHistory.jsx
│   │   │   ├── ProgressDashboard.jsx
│   │   │   ├── TodayQuizPage.jsx
│   │   │   └── LearningPathPage.jsx
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── ClassListPage.jsx
│   │   │   ├── ClassDetailsPage.jsx
│   │   │   ├── AssignmentManagement.jsx
│   │   │   ├── SubmissionReviewPage.jsx
│   │   │   ├── StudentProgressView.jsx
│   │   │   ├── ClassAnalyticsPage.jsx
│   │   │   └── WeeklyReportPage.jsx
│   │   └── admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── UserManagementPage.jsx
│   │       └── ClassManagementPage.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useAssignments.js
│   │   └── useQuiz.js
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.service.js
│   │   ├── class.service.js
│   │   ├── assignment.service.js
│   │   ├── submission.service.js
│   │   ├── quiz.service.js
│   │   ├── progress.service.js
│   │   └── report.service.js
│   ├── routes/
│   │   └── AppRoutes.jsx
│   ├── utils/
│   │   ├── formatters.js
│   │   └── constants.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

---

## 5. Routing & Role-Based Access Control

### 5.1 Route Tree (`src/routes/AppRoutes.jsx`)

```jsx
<Routes>
  {/* Public Routes */}
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Route>

  {/* Student Routes */}
  <Route element={<ProtectedRoute><RoleRoute allowedRoles={["STUDENT"]}><AppLayout /></RoleRoute></ProtectedRoute>}>
    <Route path="/student/dashboard" element={<StudentDashboard />} />
    <Route path="/student/assignments" element={<AssignmentList />} />
    <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
    <Route path="/student/submissions" element={<SubmissionHistory />} />
    <Route path="/student/progress" element={<ProgressDashboard />} />
    <Route path="/student/quiz" element={<TodayQuizPage />} />
    <Route path="/student/learning-path" element={<LearningPathPage />} />
  </Route>

  {/* Teacher Routes */}
  <Route element={<ProtectedRoute><RoleRoute allowedRoles={["TEACHER"]}><AppLayout /></RoleRoute></ProtectedRoute>}>
    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
    <Route path="/teacher/classes" element={<ClassListPage />} />
    <Route path="/teacher/classes/:id" element={<ClassDetailsPage />} />
    <Route path="/teacher/assignments" element={<AssignmentManagement />} />
    <Route path="/teacher/submissions/:id" element={<SubmissionReviewPage />} />
    <Route path="/teacher/students/:id" element={<StudentProgressView />} />
    <Route path="/teacher/analytics" element={<ClassAnalyticsPage />} />
    <Route path="/teacher/reports" element={<WeeklyReportPage />} />
  </Route>

  {/* Admin Routes */}
  <Route element={<ProtectedRoute><RoleRoute allowedRoles={["ADMIN"]}><AppLayout /></RoleRoute></ProtectedRoute>}>
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/users" element={<UserManagementPage />} />
    <Route path="/admin/classes" element={<ClassManagementPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

---

## 6. Page & Component Detailed Requirements

### 6.1 Authentication (`/login`, `/register`)
- Clean centered card with institution branding.
- Role-based redirect upon login:
  - `STUDENT` -> `/student/dashboard`
  - `TEACHER` -> `/teacher/dashboard`
  - `ADMIN` -> `/admin/dashboard`
- Store JWT in `localStorage`, set Axios default headers: `Authorization: Bearer <token>`.

---

### 6.2 Student Experience

#### 1. Student Dashboard (`/student/dashboard`)
- **Key Metrics Row**: Overall mastery progress circle (0–100%), assignments completed vs pending, quizzes completed.
- **Weak Topics Warning Card**: Tags with scores < 50% (e.g., Recursion: 42%, Trees: 38%) with direct link to practice or AI recommendations.
- **Daily Quiz Card**: Banner notifying if today's quiz is available or completed. "Start Quiz" button.
- **Language Mastery**: Recharts horizontal bar chart showing Python, C++, Java, and JavaScript proficiency.
- **Active Assignments Table**: Deadline badges, difficulty tags (`EASY`, `MEDIUM`, `HARD`), "Solve Problem" action.

#### 2. Code Editor & Assignment Solver (`/student/assignments/:id`)
- **Split Screen Layout**:
  - **Left Panel**: Problem title, description, allowed topics, example test cases, constraints.
  - **Right Panel**:
    - Top bar: Language selector (`javascript`, `python`, `cpp`, `java`), Theme selector (`vs-dark`, `light`), Reset code button.
    - Monaco Editor component configured with code autocomplete and syntax highlighting.
    - Bottom bar: "Run Tests" (instant test execution) & "Submit Solution" (enqueues submission + triggers AI).
  - **Output Drawer**:
    - Test Case Results: Tabs for each test case displaying Passed/Failed status, execution time, stdout, and expected vs actual output.
    - AI Feedback Tab: Displays AI topic analysis, mistakes identified, and constructive recommendations.

#### 3. Daily AI Quiz (`/student/quiz`)
- One question per step or clean interactive quiz form.
- Multiple-choice questions with 4 radio options.
- Immediate score calculation, showing explanations for incorrect answers and updated mastery points upon submit.

#### 4. Learning Path (`/student/learning-path`)
- Step-by-step visual timeline:
  - Step number, targeted topic, specific learning objectives, and suggested practice activities generated by the AI service.

---

### 6.3 Teacher Experience

#### 1. Teacher Dashboard (`/teacher/dashboard`)
- Class aggregate stat cards: Total Students Enrolled, Average Class Score, Assignment Submission Rate.
- "At-Risk Students" Alert Widget: Students whose mastery score < 50% or who missed recent deadlines.
- Quick Actions: "Create Assignment", "Create Class", "Generate Weekly Report".

#### 2. Create Assignment Page (`/teacher/assignments`)
- Ant Design Form:
  - Title, description (markdown support), target class, programming language, difficulty rating, topic selector (multi-select from taxonomy).
  - Dynamic Form List for Test Cases: Inputs for `input`, `expectedOutput`, and toggle switch for `isHidden`.
  - Submission limits: Max attempts, deadline date-time picker.

#### 3. Class Analytics & Weekly AI Reports (`/teacher/reports`, `/teacher/analytics`)
- **Recharts Visualizations**:
  - Score distribution histogram.
  - Topic mastery bar chart comparing class average against mastery thresholds (Good >= 70, Needs Improvement 50-69, Weak < 50).
- **Weekly Report Generator**:
  - Date range selector.
  - "Generate with AI" button: Triggers Node backend to aggregate class data and fetch report from Python AI service.
  - Rendered report view: Executive summary, Strong topics chips, Weak topics chips, Students needing attention list with AI reasons, actionable teaching recommendations.

---

### 6.4 Admin Experience

#### 1. Admin Dashboard & User Management (`/admin/dashboard`, `/admin/users`)
- Platform-level statistics: Total Users, Total Teachers, Total Students, Active Classes, Total Code Executions.
- User Management Table: Filterable by role, college ID, and department.
- Modal to create or invite new `TEACHER` and `ADMIN` accounts.

---

## 7. API Service Layer Integration (`src/services/api.js`)

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    const customError = {
      code: error.response?.data?.error?.code || "NETWORK_ERROR",
      message: error.response?.data?.error?.message || "An unexpected error occurred",
      status: error.response?.status,
    };
    return Promise.reject(customError);
  }
);

export default api;
```

---

## 8. Step-by-Step Build Plan for Developers

### Step 1: Initialize Project
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install antd @ant-design/icons @monaco-editor/react recharts axios react-router-dom jwt-decode
```

### Step 2: Global Design & Theme Setup
- Configure Ant Design `ConfigProvider` with primary theme tokens (indigo/slate color palette, border radiuses, dark mode support).
- Create `AppLayout` with header navbar, responsive collapsible sidebar, user avatar dropdown, and logout.

### Step 3: Auth & Protected Routes
- Implement `AuthContext` to hold user profile, token, role, and login/logout handlers.
- Implement `ProtectedRoute` and `RoleRoute` to guard student, teacher, and admin paths.
- Build `LoginPage` and `RegisterPage`.

### Step 4: Student Flow Implementation
- Build `StudentDashboard` with stat cards and weak topic banners.
- Build `AssignmentList` and `AssignmentDetails` with Monaco Editor integration.
- Connect code submission API and display test execution results and AI feedback.
- Build `TodayQuizPage` and `LearningPathPage`.

### Step 5: Teacher Flow Implementation
- Build `TeacherDashboard`, `CreateClassModal`, and `CreateAssignmentModal`.
- Build `ClassAnalyticsPage` using Recharts.
- Build `WeeklyReportPage` with "Generate AI Report" button.

### Step 6: Admin Flow Implementation
- Build `AdminDashboard` and `UserManagementPage` with user creation modal.
