const express = require("express");

const analyticsController = require("./analytics.controller");

const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/student",
  authenticate,
  authorize("STUDENT"),
  analyticsController.getStudentAnalytics,
);

router.get(
  "/student/:studentId",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  analyticsController.getStudentAnalyticsById,
);

router.get(
  "/class/:classId",
  authenticate,
  authorize("TEACHER"),
  analyticsController.getClassAnalytics,
);

router.get(
  "/class/:classId/topics",
  authenticate,
  authorize("TEACHER"),
  analyticsController.getClassTopicAnalytics,
);

module.exports = router;
