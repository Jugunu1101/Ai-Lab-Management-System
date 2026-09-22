const express = require("express");
const adminController = require("./admin.controller");
const {
  authenticate,
  authorize,
} = require("../../middleware/auth.middleware");

const router = express.Router();

// All admin endpoints strictly require ADMIN role
router.use(authenticate);
router.use(authorize(["ADMIN"]));

// Dashboard & metrics
router.get("/dashboard", adminController.getAdminDashboard);

// Teacher approval workflow
router.get("/teachers/pending", adminController.getPendingTeachers);
router.post("/teachers/:id/approve", adminController.approveTeacher);
router.post("/teachers/:id/reject", adminController.rejectTeacher);

// College profile & domains
router.get("/college", adminController.getCollege);
router.put("/college/domains", adminController.updateCollegeDomains);

// User management
router.get("/users", adminController.getUsers);
router.post("/users", adminController.createUser);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// Classes management
router.get("/classes", adminController.getClasses);

module.exports = router;
