const express = require("express");

const classController = require("./class.controller");
const validate = require("../../middleware/validate.middleware");

const {
  createClassSchema,
  addStudentSchema,
  updateClassSchema,
} = require("./class.validation");
const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("TEACHER"),
  validate(createClassSchema),
  classController.createClass
);

router.post(
  "/:classId/students",
  authenticate,
  authorize("TEACHER"),
  validate(addStudentSchema),
  classController.addStudent
);

router.get(
  "/",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  classController.getClasses
);

router.get(
  "/:classId",
  authenticate,
  authorize("STUDENT", "TEACHER"),
  classController.getClassById
);

router.put(
  "/:classId",
  authenticate,
  authorize("TEACHER"),
  validate(updateClassSchema),
  classController.updateClass
);

module.exports = router;