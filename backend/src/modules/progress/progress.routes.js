const express = require("express");

const progressController = require("./progress.controller");

const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  progressController.getStudentProgress,
);

router.get(
  "/weak-topics",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  progressController.getWeakTopics,
);

module.exports = router;
