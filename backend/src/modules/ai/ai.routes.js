const express = require("express");
const aiInterventionController = require("./aiIntervention.controller");
const { authenticate, authorize } = require("../../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/interventions",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  aiInterventionController.getInterventions
);

module.exports = router;
