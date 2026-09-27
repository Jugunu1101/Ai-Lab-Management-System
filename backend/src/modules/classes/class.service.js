const mongoose = require("mongoose");
const Class = require("./class.model");
const User = require("../users/user.model");
const { invalidateStudentDashboardCache } = require("../student/student.service");

const generateClassCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous chars (0, O, I, 1, L)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const createClass = async ({
  name,
  code,
  department,
  description,
  languages,
  semester,
  teacherId,
  collegeId,
}) => {
  let classCode = code ? code.toUpperCase().trim() : null;

  // Auto-generate code if not provided
  if (!classCode) {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      classCode = generateClassCode();
      const existing = await Class.findOne({ code: classCode });
      if (!existing) {
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      const error = new Error("Failed to generate unique class code. Please try again.");
      error.statusCode = 500;
      error.code = "CODE_GENERATION_FAILED";
      throw error;
    }
  } else {
    // Check if provided code already exists
    const existing = await Class.findOne({ code: classCode });
    if (existing) {
      const error = new Error("Class code already exists. Please choose a different code.");
      error.statusCode = 409;
      error.code = "CODE_ALREADY_EXISTS";
      throw error;
    }
  }

  const newClass = await Class.create({
    name,
    code: classCode,
    department,
    description,
    languages: languages && languages.length > 0 ? languages : ["javascript", "python", "cpp", "java"],
    semester,
    teacherId,
    collegeId,
    students: [],
  });

  return newClass;
};

const addStudentToClass = async ({
  classId,
  studentId,
  email,
  teacherId,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId
    ? (classData.teacherId._id || classData.teacherId).toString()
    : null;

  if (!ownerId || ownerId !== (teacherId ? teacherId.toString() : "")) {
    const error = new Error("You do not have access to this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  let targetStudentId = studentId;

  if (email) {
    const studentByEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (!studentByEmail) {
      const error = new Error(`No student found with email: ${email}`);
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }
    targetStudentId = studentByEmail._id.toString();
  }

  const student = await User.findById(targetStudentId);

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  if (student.role !== "STUDENT") {
    const error = new Error("Only students can be added to a class");
    error.statusCode = 400;
    error.code = "INVALID_STUDENT";
    throw error;
  }

  const alreadyEnrolled = classData.students.some(
    (id) => id.toString() === targetStudentId
  );

  if (alreadyEnrolled) {
    const error = new Error("Student is already enrolled in this class");
    error.statusCode = 409;
    error.code = "STUDENT_ALREADY_ENROLLED";
    throw error;
  }

  classData.students.push(targetStudentId);

  await classData.save();

  return classData;
};

const getClasses = async ({ userId, role, search }) => {
  const Assignment = require("../assignments/assignment.model");
  
  let classes;

  if (role === "TEACHER") {
    const teacherObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    classes = await Class.find({
      $or: [{ teacherId: userId }, { teacherId: teacherObjectId }],
    })
      .populate("teacherId", "name email")
      .lean();

  } else if (role === "STUDENT") {
    const studentObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    classes = await Class.find({
      $or: [
        { students: userId },
        { students: studentObjectId },
        { students: { $in: [userId, studentObjectId] } },
      ],
    })
      .populate("teacherId", "name email")
      .lean();

  } else if (role === "ADMIN") {
    classes = await Class.find()
      .populate("teacherId", "name email")
      .lean();

  } else {
    classes = [];
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    classes = classes.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.code?.toLowerCase().includes(term) ||
        c.department?.toLowerCase().includes(term) ||
        c.teacherId?.name?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
    );
  }

  // Attach assignmentsCount to each class
  if (classes.length > 0) {
    const classIds = classes.map(c => c._id);
    const assignmentsAggr = await Assignment.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: "$classId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    assignmentsAggr.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    classes = classes.map(c => ({
      ...c,
      assignmentsCount: countMap[c._id.toString()] || 0
    }));
  }

  return classes;
};

const getClassById = async ({ classId, userId, role }) => {
  const classData = await Class.findById(classId)
    .populate("teacherId", "name email")
    .populate("students", "name email collegeId department");

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (role === "TEACHER") {
    const ownerId = classData.teacherId
      ? (classData.teacherId._id || classData.teacherId).toString()
      : null;

    if (!ownerId || ownerId !== (userId ? userId.toString() : "")) {
      const error = new Error("You do not have access to this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  if (role === "STUDENT") {
    const targetUserIdStr = userId ? userId.toString() : "";
    const isEnrolled = classData.students.some(
      (student) => (student._id || student).toString() === targetUserIdStr
    );

    if (!isEnrolled) {
      const error = new Error("You do not have access to this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  // Attach averageMastery score to each student in the roster
  const Progress = require("../progress/progress.model");
  const classObj = classData.toObject();

  if (classObj.students && classObj.students.length > 0) {
    const studentIds = classObj.students.map((s) => s._id);
    const allProgress = await Progress.find({
      studentId: { $in: studentIds },
    }).select("studentId masteryScore").lean();

    // Group by studentId
    const progressByStudent = {};
    for (const p of allProgress) {
      const sid = p.studentId.toString();
      if (!progressByStudent[sid]) {
        progressByStudent[sid] = { total: 0, count: 0 };
      }
      progressByStudent[sid].total += p.masteryScore || 0;
      progressByStudent[sid].count += 1;
    }

    classObj.students = classObj.students.map((student) => {
      const sid = student._id.toString();
      const prog = progressByStudent[sid];
      const averageMastery = prog && prog.count > 0
        ? Math.round(prog.total / prog.count)
        : null; // null = no data yet, not 0%
      return {
        ...student,
        score: averageMastery,
        hasMasteryData: averageMastery !== null,
      };
    });
  }

  return classObj;
};


const updateClass = async ({
  classId,
  teacherId,
  updates,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId
    ? (classData.teacherId._id || classData.teacherId).toString()
    : null;

  if (!ownerId || ownerId !== (teacherId ? teacherId.toString() : "")) {
    const error = new Error("You do not have permission to update this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (updates.name !== undefined) {
    classData.name = updates.name;
  }

  if (updates.languages !== undefined) {
    classData.languages = updates.languages;
  }

  if (updates.semester !== undefined) {
    classData.semester = updates.semester;
  }

  await classData.save();

  return classData;
};

const deleteClass = async ({ classId, userId, role }) => {
  const Assignment = require("../assignments/assignment.model");
  const Submission = require("../submissions/submission.model");
  const WeeklyReport = require("../reports/weeklyReport.model");
  const AIAnalysis = require("../../services/ai/aiAnalysis.model");
  const AIIntervention = require("../ai/aiIntervention.model");

  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId
    ? (classData.teacherId._id || classData.teacherId).toString()
    : null;
  const currentUserId = (userId || "").toString();

  // Authorization: Only owner or ADMIN can delete
  if (role !== "ADMIN" && (!ownerId || ownerId !== currentUserId)) {
    const error = new Error("You do not have permission to delete this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // 1. Find all assignments belonging to this class
  const assignments = await Assignment.find({ classId: classData._id }).select("_id").lean();
  const assignmentIds = assignments.map((a) => a._id);

  // 2. Cascade delete submissions for assignments belonging to this class
  if (assignmentIds.length > 0) {
    await Submission.deleteMany({ assignment: { $in: assignmentIds } });
  }

  // 3. Delete assignments for this class
  await Assignment.deleteMany({ classId: classData._id });

  // 4. Delete weekly reports for this class
  await WeeklyReport.deleteMany({
    $or: [{ classId: classData._id }, { classId: classData._id.toString() }],
  });

  // 5. Delete AI analysis records for this class
  await AIAnalysis.deleteMany({
    $or: [{ classId: classData._id }, { classId: classData._id.toString() }],
  });

  // 6. Delete AI intervention records specifically tied to this class
  await AIIntervention.deleteMany({
    $or: [{ classId: classData._id }, { classId: classData._id.toString() }],
  });

  // 7. Invalidate student dashboard caches for enrolled students (preserve independent students)
  if (classData.students && classData.students.length > 0) {
    for (const studentId of classData.students) {
      try {
        await invalidateStudentDashboardCache(studentId.toString());
      } catch (err) {
        // Continue cleanup
      }
    }
  }

  // 8. Delete the class itself
  await Class.findByIdAndDelete(classData._id);

  return {
    deletedClassId: classData._id.toString(),
    deletedClassName: classData.name,
    assignmentsDeleted: assignmentIds.length,
  };
};

const joinClassByCode = async ({ code, studentId }) => {
  // Find class by code
  const classData = await Class.findOne({ code: code.toUpperCase().trim() });

  if (!classData) {
    const error = new Error("Invalid class code. Please check and try again.");
    error.statusCode = 404;
    error.code = "INVALID_CLASS_CODE";
    throw error;
  }

  // Verify the user is a student
  const student = await User.findById(studentId);
  if (!student || student.role !== "STUDENT") {
    const error = new Error("Only students can join classes");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // Check if already enrolled
  const alreadyEnrolled = classData.students.some(
    (id) => id.toString() === studentId
  );

  if (alreadyEnrolled) {
    const error = new Error("You are already enrolled in this class");
    error.statusCode = 409;
    error.code = "ALREADY_ENROLLED";
    throw error;
  }

  // Add student to class
  classData.students.push(studentId);
  await classData.save();

  await invalidateStudentDashboardCache(studentId);

  return classData.populate("teacherId", "name email");
};

module.exports = {
  createClass,
  deleteClass,
  addStudentToClass,
  getClasses,
  getClassById,
  updateClass,
  joinClassByCode,
};