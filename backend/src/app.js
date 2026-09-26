const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/error.middleware");

// Module routes
const authRoutes = require("./modules/auth/auth.routes");
const studentRoutes = require("./modules/student/student.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const classRoutes = require("./modules/classes/class.routes");
const assignmentRoutes = require("./modules/assignments/assignment.routes");
const submissionRoutes = require("./modules/submissions/submission.routes");
const progressRoutes = require("./modules/progress/progress.routes");
const quizRoutes = require("./modules/quizzes/quiz.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const reportsRoutes = require("./modules/reports/reports.routes");
const collegeRoutes = require("./modules/colleges/college.routes");

const { requestLogger } = require("./middleware/logger.middleware");

const app = express();

// Structured Logging & Request ID tracking
app.use(requestLogger);

// Security Headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.GLOBAL_RATE_LIMIT ? parseInt(process.env.GLOBAL_RATE_LIMIT, 10) : 10000, // Configurable limit for campus traffic
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later.",
    },
  },
});
app.use("/api", globalLimiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT ? parseInt(process.env.AUTH_RATE_LIMIT, 10) : 5000,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many login/registration attempts, please try again later.",
    },
  },
});
app.use("/api/auth", authLimiter);

// Body Parsers with limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "programming-lab-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/quiz", quizRoutes); // alias for singular /api/quiz endpoints
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/colleges", collegeRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
