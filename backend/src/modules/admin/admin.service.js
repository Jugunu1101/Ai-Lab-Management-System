const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const Class = require("../classes/class.model");
const Assignment = require("../assignments/assignment.model");
const Submission = require("../submissions/submission.model");
const College = require("../colleges/college.model");

const getAdminDashboard = async ({ collegeId } = {}) => {
  const userFilter = collegeId ? { collegeId } : {};
  const classFilter = collegeId ? { collegeId } : {};

  // For assignments and submissions, get classes of this college if scoped
  let assignmentFilter = {};
  let submissionFilter = {};
  if (collegeId) {
    const collegeClasses = await Class.find({ collegeId }).select("_id");
    const classIds = collegeClasses.map((c) => c._id);
    assignmentFilter = { classId: { $in: classIds } };
    const collegeUsers = await User.find({ collegeId }).select("_id");
    const userIds = collegeUsers.map((u) => u._id);
    submissionFilter = { userId: { $in: userIds } };
  }

  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    pendingTeachers,
    totalClasses,
    totalAssignments,
    totalSubmissions,
    passedSubmissions,
  ] = await Promise.all([
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, role: "STUDENT" }),
    User.countDocuments({ ...userFilter, role: "TEACHER" }),
    User.countDocuments({ ...userFilter, role: "ADMIN" }),
    User.countDocuments({ ...userFilter, role: "TEACHER", approvalStatus: "PENDING" }),
    Class.countDocuments(classFilter),
    Assignment.countDocuments(assignmentFilter),
    Submission.countDocuments(submissionFilter),
    Submission.countDocuments({ ...submissionFilter, status: "PASSED" }),
  ]);

  const submissionSuccessRate =
    totalSubmissions > 0
      ? Math.round((passedSubmissions / totalSubmissions) * 100)
      : 0;

  const recentUsers = await User.find(userFilter)
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .limit(5);

  const recentSubmissions = await Submission.find(submissionFilter)
    .populate("userId", "name email role")
    .populate("assignmentId", "title language")
    .sort({ createdAt: -1 })
    .limit(5);

  // College information if scoped
  let college = null;
  if (collegeId) {
    college = await College.findById(collegeId).select("name code domains departments");
  }

  return {
    metrics: {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      pendingTeachers,
      totalClasses,
      totalAssignments,
      totalSubmissions,
      passedSubmissions,
      submissionSuccessRate,
    },
    college,
    recentUsers,
    recentSubmissions,
  };
};

const getUsers = async ({
  role,
  department,
  approvalStatus,
  search,
  collegeId,
  page = 1,
  limit = 20,
}) => {
  const filter = {};

  if (collegeId) {
    filter.collegeId = collegeId;
  }

  if (role && role !== "ALL") {
    filter.role = role.toUpperCase();
  }

  if (department) {
    filter.department = department;
  }

  if (approvalStatus && approvalStatus !== "ALL") {
    filter.approvalStatus = approvalStatus.toUpperCase();
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .populate("collegeId", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

const getPendingTeachers = async ({ collegeId }) => {
  const filter = { role: "TEACHER", approvalStatus: "PENDING" };
  if (collegeId) {
    filter.collegeId = collegeId;
  }

  const teachers = await User.find(filter)
    .select("-passwordHash")
    .populate("collegeId", "name code")
    .sort({ createdAt: -1 });

  return teachers;
};

const approveTeacher = async (teacherId, adminId, collegeId) => {
  const filter = { _id: teacherId, role: "TEACHER" };
  if (collegeId) {
    filter.collegeId = collegeId;
  }

  const teacher = await User.findOne(filter);
  if (!teacher) {
    const error = new Error("Teacher not found or belongs to another college");
    error.statusCode = 404;
    error.code = "TEACHER_NOT_FOUND";
    throw error;
  }

  teacher.approvalStatus = "APPROVED";
  teacher.approvedBy = adminId;
  teacher.approvedAt = new Date();
  await teacher.save();

  return {
    id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    approvalStatus: teacher.approvalStatus,
    approvedAt: teacher.approvedAt,
  };
};

const rejectTeacher = async (teacherId, adminId, collegeId) => {
  const filter = { _id: teacherId, role: "TEACHER" };
  if (collegeId) {
    filter.collegeId = collegeId;
  }

  const teacher = await User.findOne(filter);
  if (!teacher) {
    const error = new Error("Teacher not found or belongs to another college");
    error.statusCode = 404;
    error.code = "TEACHER_NOT_FOUND";
    throw error;
  }

  teacher.approvalStatus = "REJECTED";
  teacher.approvedBy = adminId;
  await teacher.save();

  return {
    id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    approvalStatus: teacher.approvalStatus,
  };
};

const createUser = async ({
  name,
  email,
  password,
  role = "STUDENT",
  collegeId = "",
  department = "",
  approvalStatus = "APPROVED",
}) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("User with this email already exists");
    error.statusCode = 409;
    error.code = "USER_EXISTS";
    throw error;
  }

  const validRoles = ["STUDENT", "TEACHER", "ADMIN"];
  const userRole = role.toUpperCase();
  if (!validRoles.includes(userRole)) {
    const error = new Error(
      `Invalid role "${role}". Allowed roles: ${validRoles.join(", ")}`
    );
    error.statusCode = 400;
    error.code = "INVALID_ROLE";
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: userRole,
    collegeId: collegeId || undefined,
    department,
    approvalStatus: userRole === "TEACHER" ? (approvalStatus || "APPROVED") : "APPROVED",
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId,
    department: user.department,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt,
  };
};

const getUserById = async (userId, collegeId) => {
  const filter = { _id: userId };
  if (collegeId) {
    filter.collegeId = collegeId;
  }
  const user = await User.findOne(filter)
    .select("-passwordHash")
    .populate("collegeId", "name code");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }
  return user;
};

const updateUser = async (userId, updates, collegeId) => {
  const allowed = ["name", "role", "department", "approvalStatus"];
  const sanitized = {};

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }

  if (sanitized.role) {
    sanitized.role = sanitized.role.toUpperCase();
  }

  if (updates.password) {
    sanitized.passwordHash = await bcrypt.hash(updates.password, 12);
  }

  const filter = { _id: userId };
  if (collegeId) filter.collegeId = collegeId;

  const user = await User.findOneAndUpdate(filter, sanitized, {
    new: true,
  }).select("-passwordHash");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  return user;
};

const deleteUser = async (userId, currentAdminId, collegeId) => {
  if (userId.toString() === currentAdminId.toString()) {
    const error = new Error("Admins cannot delete their own account");
    error.statusCode = 400;
    error.code = "SELF_DELETION_FORBIDDEN";
    throw error;
  }

  const filter = { _id: userId };
  if (collegeId) filter.collegeId = collegeId;

  const user = await User.findOneAndDelete(filter);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  return { message: "User deleted successfully", userId };
};

const getClasses = async ({ collegeId } = {}) => {
  const filter = collegeId ? { collegeId } : {};
  const classes = await Class.find(filter)
    .populate("teacherId", "name email department")
    .sort({ createdAt: -1 });

  return classes.map((c) => ({
    id: c._id,
    name: c.name,
    code: c.code,
    department: c.department,
    languages: c.languages,
    semester: c.semester,
    teacher: c.teacherId,
    studentCount: c.students ? c.students.length : 0,
    createdAt: c.createdAt,
  }));
};

const getAdminCollege = async (collegeId) => {
  if (!collegeId) return null;
  return await College.findById(collegeId);
};

const updateAdminCollegeDomains = async (collegeId, domains) => {
  if (!collegeId) {
    const error = new Error("No college associated with this admin");
    error.statusCode = 400;
    throw error;
  }
  const college = await College.findById(collegeId);
  if (!college) {
    const error = new Error("College not found");
    error.statusCode = 404;
    throw error;
  }
  college.domains = domains.map((d) => d.toLowerCase().trim());
  await college.save();
  return college;
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
  getAdminCollege,
  updateAdminCollegeDomains,
};
