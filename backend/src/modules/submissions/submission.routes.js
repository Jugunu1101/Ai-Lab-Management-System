const express = require("express");

const submissionController = require("./submission.controller");
const validate = require("../../middleware/validate.middleware");

const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const {
  createSubmissionSchema,
  runTestsSchema,
} = require("./submission.validation");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  validate(createSubmissionSchema),
  submissionController.createSubmission
);

router.post(
  "/run",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  validate(runTestsSchema),
  submissionController.runPublicTests
);

router.get(
  "/",
  authenticate,
  authorize("STUDENT", "TEACHER", "ADMIN"),
  submissionController.getSubmissions
);

router.get(
  "/assignment/:assignmentId",
  authenticate,
  authorize("TEACHER"),
  submissionController.getAssignmentSubmissions
);

router.get(
  "/:submissionId/details",
  authenticate,
  authorize("TEACHER"),
  submissionController.getSubmissionDetailsForTeacher
);

router.get(
  "/student/:studentId",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  submissionController.getSubmissionsByStudent
);

router.get(
  "/:submissionId",
  authenticate,
  authorize("STUDENT", "TEACHER", "ADMIN"),
  submissionController.getSubmissionById
);

module.exports = router;