const express = require("express");

const assignmentController = require("./assignment.controller");
const validate = require("../../middleware/validate.middleware");

const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const {
  createAssignmentSchema,
  updateAssignmentSchema,
} = require("./assignment.validation");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("TEACHER"),
  validate(createAssignmentSchema),
  assignmentController.createAssignment
);

router.get(
  "/",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  assignmentController.getAssignments
);

router.get(
  "/:assignmentId/results",
  authenticate,
  authorize("TEACHER"),
  assignmentController.getAssignmentResults,
);

router.get(
  "/:assignmentId",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  assignmentController.getAssignmentById
);

router.put(
  "/:assignmentId",
  authenticate,
  authorize("TEACHER"),
  validate(updateAssignmentSchema),
  assignmentController.updateAssignment
);

router.delete(
  "/:assignmentId",
  authenticate,
  authorize("TEACHER"),
  assignmentController.deleteAssignment
);

module.exports = router;