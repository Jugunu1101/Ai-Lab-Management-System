const Assignment = require("./assignment.model");
const Class = require("../classes/class.model");
const Submission = require("../submissions/submission.model");

const createAssignment = async ({
  title,
  description,
  language,
  difficulty,
  topics,
  testCases,
  deadline,
  classId,
  teacherId,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to create an assignment for this class"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const assignment = await Assignment.create({
    title,
    description,
    language,
    difficulty,
    topics,
    testCases,
    deadline,
    classId,
    createdBy: teacherId,
  });

  return assignment;
};

const getAssignments = async ({ userId, role }) => {
  let classIds = [];

  if (role === "TEACHER") {
    const classes = await Class.find({
      teacherId: userId,
    }).select("_id");

    classIds = classes.map((classData) => classData._id);
  }

  if (role === "STUDENT") {
    const classes = await Class.find({
      students: userId,
    }).select("_id");

    classIds = classes.map((classData) => classData._id);
  }

  const assignments = await Assignment.find({
    classId: { $in: classIds },
  })
    .populate("classId", "name semester")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return assignments;
};

const getAssignmentById = async ({
  assignmentId,
  userId,
  role,
}) => {
  const assignment = await Assignment.findById(assignmentId)
    .populate("classId", "name semester teacherId students")
    .populate("createdBy", "name email");

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = assignment.classId;

  if (role === "TEACHER") {
    if (classData.teacherId.toString() !== userId) {
      const error = new Error(
        "You do not have access to this assignment"
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  if (role === "STUDENT") {
    const isEnrolled = classData.students.some(
      (studentId) => studentId.toString() === userId
    );

    if (!isEnrolled) {
      const error = new Error(
        "You do not have access to this assignment"
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    assignment.testCases = assignment.testCases.filter(
      (testCase) => !testCase.isHidden
    );
  }

  return assignment;
};

const updateAssignment = async ({
  assignmentId,
  teacherId,
  updates,
}) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to update this assignment"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (updates.title !== undefined) {
    assignment.title = updates.title;
  }

  if (updates.description !== undefined) {
    assignment.description = updates.description;
  }

  if (updates.language !== undefined) {
    assignment.language = updates.language;
  }

  if (updates.difficulty !== undefined) {
    assignment.difficulty = updates.difficulty;
  }

  if (updates.topics !== undefined) {
    assignment.topics = updates.topics;
  }

  if (updates.testCases !== undefined) {
    assignment.testCases = updates.testCases;
  }

  if (updates.deadline !== undefined) {
    assignment.deadline = updates.deadline;
  }

  if (updates.maxAttempts !== undefined) {
    assignment.maxAttempts = updates.maxAttempts;
  }

  await assignment.save();

  return assignment;
};

const deleteAssignment = async ({
  assignmentId,
  teacherId,
}) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to delete this assignment"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  await Assignment.findByIdAndDelete(assignmentId);

  return assignment;
};

const getAssignmentResults = async ({ assignmentId, teacherId }) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have access to this assignment results",
    );

    error.statusCode = 403;
    error.code = "FORBIDDEN";

    throw error;
  }

  const submissions = await Submission.find({
    assignmentId,
  })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const studentResults = {};

  for (const submission of submissions) {
    const studentId = submission.userId._id.toString();

    if (!studentResults[studentId]) {
      studentResults[studentId] = {
        student: submission.userId,
        attempts: 0,
        bestScore: 0,
        latestScore: submission.score,
        latestStatus: submission.status,
        latestSubmissionAt: submission.createdAt,
      };
    }

    studentResults[studentId].attempts += 1;

    if (submission.score > studentResults[studentId].bestScore) {
      studentResults[studentId].bestScore = submission.score;
    }
  }

  return Object.values(studentResults);
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentResults,
};