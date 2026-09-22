const adminService = require("./admin.service");

const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getAdminDashboard({
      collegeId: req.user.collegeId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.getUsers({
      role: req.query.role,
      department: req.query.department,
      approvalStatus: req.query.approvalStatus,
      search: req.query.search,
      collegeId: req.user.collegeId,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getPendingTeachers = async (req, res, next) => {
  try {
    const teachers = await adminService.getPendingTeachers({
      collegeId: req.user.collegeId,
    });
    return res.status(200).json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
};

const approveTeacher = async (req, res, next) => {
  try {
    const result = await adminService.approveTeacher(
      req.params.id,
      req.user.userId,
      req.user.collegeId
    );
    return res.status(200).json({
      success: true,
      message: "Teacher account approved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const rejectTeacher = async (req, res, next) => {
  try {
    const result = await adminService.rejectTeacher(
      req.params.id,
      req.user.userId,
      req.user.collegeId
    );
    return res.status(200).json({
      success: true,
      message: "Teacher account registration rejected",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await adminService.createUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      collegeId: req.user.collegeId || req.body.collegeId,
      department: req.body.department,
      approvalStatus: req.body.approvalStatus,
    });
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id, req.user.collegeId);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body, req.user.collegeId);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const result = await adminService.deleteUser(
      req.params.id,
      req.user.userId,
      req.user.collegeId
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    const classes = await adminService.getClasses({
      collegeId: req.user.collegeId,
    });
    return res.status(200).json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

const getCollege = async (req, res, next) => {
  try {
    const college = await adminService.getAdminCollege(req.user.collegeId);
    return res.status(200).json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
};

const updateCollegeDomains = async (req, res, next) => {
  try {
    const college = await adminService.updateAdminCollegeDomains(
      req.user.collegeId,
      req.body.domains
    );
    return res.status(200).json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getUsers,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getClasses,
  getCollege,
  updateCollegeDomains,
};
