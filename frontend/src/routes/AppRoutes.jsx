import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";

// Guards
import ProtectedRoute from "../components/shared/ProtectedRoute";
import RoleRoute from "../components/shared/RoleRoute";

// Auth Pages
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";

// Student Pages
import StudentDashboard from "../pages/student/StudentDashboard";
import StudentClassesPage from "../pages/student/StudentClassesPage";
import JoinClassPage from "../pages/student/JoinClassPage";
import AssignmentList from "../pages/student/AssignmentList";
import AssignmentDetails from "../pages/student/AssignmentDetails";
import SubmissionHistory from "../pages/student/SubmissionHistory";
import ProgressDashboard from "../pages/student/ProgressDashboard";
import TodayQuizPage from "../pages/student/TodayQuizPage";
import LearningPathPage from "../pages/student/LearningPathPage";
import TeacherPendingApprovalPage from "../pages/auth/TeacherPendingApprovalPage";

// Teacher Pages
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import ClassListPage from "../pages/teacher/ClassListPage";
import ClassDetailsPage from "../pages/teacher/ClassDetailsPage";
import AssignmentManagement from "../pages/teacher/AssignmentManagement";
import SubmissionReviewPage from "../pages/teacher/SubmissionReviewPage";
import StudentProgressView from "../pages/teacher/StudentProgressView";
import ClassAnalyticsPage from "../pages/teacher/ClassAnalyticsPage";
import WeeklyReportPage from "../pages/teacher/WeeklyReportPage";

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagementPage from "../pages/admin/UserManagementPage";
import ClassManagementPage from "../pages/admin/ClassManagementPage";

import { ROLES } from "../utils/constants";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/teacher-pending" element={<TeacherPendingApprovalPage />} />
      </Route>

      {/* Student Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.STUDENT]}>
              <AppLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/classes" element={<StudentClassesPage />} />
        <Route path="/student/join-class" element={<JoinClassPage />} />
        <Route path="/student/assignments" element={<AssignmentList />} />
        <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
        <Route path="/student/submissions" element={<SubmissionHistory />} />
        <Route path="/student/progress" element={<ProgressDashboard />} />
        <Route path="/student/topic-mastery" element={<ProgressDashboard />} />
        <Route path="/student/practice" element={<AssignmentList />} />
        <Route path="/student/quiz" element={<TodayQuizPage />} />
        <Route path="/student/daily-quiz" element={<TodayQuizPage />} />
        <Route path="/student/learning-path" element={<LearningPathPage />} />
      </Route>

      {/* Teacher Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.TEACHER]}>
              <AppLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/classes" element={<ClassListPage />} />
        <Route path="/teacher/classes/:id" element={<ClassDetailsPage />} />
        <Route path="/teacher/assignments" element={<AssignmentManagement />} />
        <Route path="/teacher/submissions/:id" element={<SubmissionReviewPage />} />
        <Route path="/teacher/students/:id" element={<StudentProgressView />} />
        <Route path="/teacher/analytics" element={<ClassAnalyticsPage />} />
        <Route path="/teacher/reports" element={<WeeklyReportPage />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AppLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/classes" element={<ClassManagementPage />} />
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
