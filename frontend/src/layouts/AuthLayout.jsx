import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Button, Tooltip } from "antd";
import { CodeOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ROLES } from "../utils/constants";

export const AuthLayout = () => {
  const { isAuthenticated, role } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // If already authenticated, redirect to appropriate home
  if (isAuthenticated && role) {
    if (role === ROLES.STUDENT) return <Navigate to="/student/dashboard" replace />;
    if (role === ROLES.TEACHER) return <Navigate to="/teacher/dashboard" replace />;
    if (role === ROLES.ADMIN) return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        background: isDarkMode
          ? "radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, #0b0f19 70%)"
          : "radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08) 0%, #f8fafc 70%)",
        position: "relative",
      }}
    >
      {/* Top right theme toggle */}
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <Tooltip title={isDarkMode ? "Light Mode" : "Dark Mode"}>
          <Button
            type="text"
            shape="circle"
            icon={isDarkMode ? <SunOutlined style={{ color: "#f59e0b" }} /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ width: 40, height: 40 }}
          />
        </Tooltip>
      </div>

      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff",
            marginBottom: 16,
            boxShadow: "0 8px 20px rgba(99, 102, 241, 0.4)",
          }}
        >
          <CodeOutlined style={{ fontSize: 28 }} />
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          CodeLab AI
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 360, margin: "0 auto" }}>
          Intelligent Programming Lab Management & Autonomous AI Assessment
        </p>
      </div>

      {/* Auth Card Container */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "36px 32px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <Outlet />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        © {new Date().getFullYear()} CodeLab AI. Powered by DeepMind & Multi-Language Isolated Sandboxes.
      </div>
    </div>
  );
};

export default AuthLayout;
