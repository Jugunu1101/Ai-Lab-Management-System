const express = require("express");
const quizController = require("./quiz.controller");
const validate = require("../../middleware/validate.middleware");
const { authenticate, authorize } = require("../../middleware/auth.middleware");
const { createQuizSchema, submitQuizSchema } = require("./quiz.validation");

const router = express.Router();

// Teacher creates quiz
router.post(
  "/",
  authenticate,
  authorize(["TEACHER", "ADMIN"]),
  validate(createQuizSchema),
  quizController.createQuiz
);

// Daily personalized quiz for student (MUST BE BEFORE /:quizId)
router.get(
  "/today",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  quizController.getTodayQuiz
);

// On-demand AI topic practice quiz
router.get(
  "/practice",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  quizController.getPracticeQuiz
);

// List available quizzes
router.get(
  "/",
  authenticate,
  authorize(["STUDENT", "TEACHER", "ADMIN"]),
  quizController.getQuizzes
);

// Submit quiz answers
router.post(
  "/:quizId/submit",
  authenticate,
  authorize(["STUDENT", "ADMIN"]),
  validate(submitQuizSchema),
  quizController.submitQuiz
);

// Get student's attempts for a quiz
router.get(
  "/:quizId/attempts",
  authenticate,
  authorize(["STUDENT", "TEACHER", "ADMIN"]),
  quizController.getQuizAttempts
);

// Get specific quiz details
router.get(
  "/:quizId",
  authenticate,
  authorize(["STUDENT", "TEACHER", "ADMIN"]),
  quizController.getQuizById
);

module.exports = router;
