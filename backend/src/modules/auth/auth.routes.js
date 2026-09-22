const express = require("express");
const authController = require("./auth.controller");
const validate = require("../../middleware/validate.middleware");
const { 
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const { 
  registerSchema,
  loginSchema
 } = require("./auth.validation");

const router = express.Router();

router.post(
  "/register",
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  validate(loginSchema),
  authController.login
);

router.get(
  "/me",
  authenticate,
  authController.getMe
);

router.get("/test-protected", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "You are authenticated",
    user: req.user,
  });
});

router.get(
  "/test-student",
  authenticate,
  authorize("STUDENT"),
  (req, res) => {
    res.json({
      success: true,
      message: "Student access granted",
    });
  }
);

router.get(
  "/test-teacher",
  authenticate,
  authorize("TEACHER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Teacher access granted",
    });
  }
);

router.get(
  "/test-admin",
  authenticate,
  authorize("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin access granted",
    });
  }
);

module.exports = router;