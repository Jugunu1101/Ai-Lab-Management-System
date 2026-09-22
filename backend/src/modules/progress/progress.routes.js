const express = require("express");

const progressController = require("./progress.controller");

const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("STUDENT"),
  progressController.getStudentProgress,
);

router.get(
  "/weak-topics",
  authenticate,
  authorize("STUDENT"),
  progressController.getWeakTopics,
);

module.exports = router;
