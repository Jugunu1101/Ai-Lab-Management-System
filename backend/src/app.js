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

// Health Check & Infrastructure Status
const { exec } = require("child_process");
const { isDBConnected } = require("./config/db");

let isDockerAvailable = false;
const checkDocker = () => {
  exec("docker --version", { timeout: 2000 }, (err) => {
    isDockerAvailable = !err;
  });
};
checkDocker();
if (process.env.NODE_ENV !== "test") {
  setInterval(checkDocker, 60000);
}

const handleHealthCheck = (req, res) => {
  const dbConnected = isDBConnected();

  return res.status(200).json({
    status: dbConnected ? "ok" : "degraded",
    service: "programming-lab-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      backend: "running",
      database: dbConnected ? "connected" : "connecting",
      aiMode: process.env.AI_MOCK_MODE === "false" ? "live" : "mock",
      codeExecution: {
        available: isDockerAvailable,
        engine: "docker",
      },
    },
  });
};

app.all("/", handleHealthCheck);
app.all("/health", handleHealthCheck);
app.all("/api/health", handleHealthCheck);


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
app.use("/api/ai", require("./modules/ai/ai.routes"));

// Teacher Dashboard endpoint alias
const analyticsController = require("./modules/analytics/analytics.controller");
const { authenticate, authorize } = require("./middleware/auth.middleware");
app.get(
  "/api/teacher/dashboard",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  analyticsController.getTeacherDashboard
);

// Static Frontend Serving & Single Page App Fallback (if built)
const path = require("path");
const fs = require("fs");
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/health")) {
      return res.sendFile(path.join(frontendDistPath, "index.html"));
    }
    next();
  });
}

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
