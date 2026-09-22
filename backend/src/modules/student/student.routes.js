const express = require("express");
const studentController = require("./student.controller");
const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.use(authorize(["STUDENT", "ADMIN"]));

router.get("/dashboard", studentController.getStudentDashboard);
router.get("/progress", studentController.getStudentProgress);
router.get("/topics", studentController.getStudentTopics);
router.get("/learning-path", studentController.getStudentLearningPath);

module.exports = router;
