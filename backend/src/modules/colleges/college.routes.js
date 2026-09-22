const express = require("express");
const collegeController = require("./college.controller");
const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const router = express.Router();

// Public: Get list of colleges for registration & login
router.get("/public", collegeController.getPublicColleges);

// Authenticated
router.get("/:id", authenticate, collegeController.getCollegeById);

// Admin only: create college or update domains
router.post("/", authenticate, authorize("ADMIN"), collegeController.createCollege);
router.put(
  "/:id/domains",
  authenticate,
  authorize("ADMIN"),
  collegeController.updateCollegeDomains
);

module.exports = router;
