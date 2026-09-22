const express = require("express");
const reportsController = require("./reports.controller");
const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/student",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  reportsController.getStudentReport
);

router.get(
  "/class/:classId",
  authenticate,
  authorize(["TEACHER", "ADMIN"]),
  reportsController.getClassReport
);

router.get(
  "/weekly/:classId",
  authenticate,
  authorize(["TEACHER", "ADMIN"]),
  reportsController.getWeeklyReports
);

router.post(
  "/weekly/:classId/generate",
  authenticate,
  authorize(["TEACHER", "ADMIN"]),
  reportsController.generateWeeklyReport
);

module.exports = router;
