const express = require("express");

const classController = require("./class.controller");
const validate = require("../../middleware/validate.middleware");

const {
  createClassSchema,
  addStudentSchema,
  joinClassSchema,
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

router.post(
  "/join",
  authenticate,
  authorize("STUDENT"),
  validate(joinClassSchema),
  classController.joinClassByCode
);

router.get(
  "/",
  authenticate,
  authorize("STUDENT", "TEACHER", "ADMIN"),
  classController.getClasses
);

router.get(
  "/:classId",
  authenticate,
  authorize("STUDENT", "TEACHER", "ADMIN"),
  classController.getClassById
);

router.put(
  "/:classId",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validate(updateClassSchema),
  classController.updateClass
);

router.delete(
  "/:classId",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  classController.deleteClass
);

module.exports = router;