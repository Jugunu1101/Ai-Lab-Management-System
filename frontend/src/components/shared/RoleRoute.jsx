import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";
import LoadingSpinner from "./LoadingSpinner";

export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { role, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingSpinner tip="Checking permissions..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Route to appropriate default dashboard based on user's actual role
    if (role === ROLES.STUDENT) {
      return <Navigate to="/student/dashboard" replace />;
    }
    if (role === ROLES.TEACHER) {
      return <Navigate to="/teacher/dashboard" replace />;
    }
    if (role === ROLES.ADMIN) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoleRoute;
