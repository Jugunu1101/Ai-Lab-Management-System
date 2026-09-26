const Assignment = require("./assignment.model");
const Class = require("../classes/class.model");
const Submission = require("../submissions/submission.model");
const mongoose = require("mongoose");

const aiService = require("../../services/ai/ai.service");

const createAssignment = async ({
  title,
  description,
  problemStatement,
  constraints,
  inputFormat,
  outputFormat,
  examples,
  starterCode,
  hints,
  explanation,
  language,
  difficulty,
  topics,
  testCases,
  deadline,
  maxAttempts,
  classId,
  teacherId,
  source = "TEACHER",
  assignedTo,
  agentReason,
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
    problemStatement,
    constraints,
    inputFormat,
    outputFormat,
    examples,
    starterCode,
    hints,
    explanation,
    language,
    difficulty,
    topics,
    testCases,
    deadline,
    maxAttempts,
    classId,
    createdBy: teacherId,
    source,
    assignedTo,
    agentReason,
  });

  return assignment;
};

const generateAIAssignment = async ({
  topic,
  language,
  difficulty,
  questionCount = 1,
  classId,
  teacherId,
}) => {
  let excludedTitles = [];

  if (classId) {
    const classData = await Class.findById(classId);
    if (!classData) {
      const error = new Error("Class not found");
      error.statusCode = 404;
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }

    if (classData.teacherId.toString() !== teacherId) {
      const error = new Error("You do not have permission for this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    const existingAssignments = await Assignment.find({ classId }).select("title");
    excludedTitles = existingAssignments.map((a) => a.title);
  }

  const generated = await aiService.generateAssignment({
    topic,
    targetTopics: [topic],
    language,
    difficulty: (difficulty || "MEDIUM").toUpperCase(),
    questionCount: questionCount || 1,
    excludedTitles,
  });

  if (!generated || !generated.title) {
    const error = new Error("Failed to generate AI assignment");
    error.statusCode = 502;
    error.code = "AI_GENERATION_FAILED";
    throw error;
  }

  // Validate test cases
  if (!Array.isArray(generated.testCases) || generated.testCases.length === 0) {
    const error = new Error("AI failed to produce valid test cases");
    error.statusCode = 502;
    error.code = "INVALID_TEST_CASES";
    throw error;
  }

  return generated;
};

const getAssignments = async ({ userId, role, limit, page }) => {
  let classIds = [];
  const classMap = new Map();

  if (role === "TEACHER") {
    const classes = await Class.find({
      teacherId: userId,
    }).select("_id name semester").lean();

    classIds = classes.map((classData) => classData._id);
    classes.forEach((c) => classMap.set(c._id.toString(), c));
  }

  if (role === "STUDENT") {
    const classes = await Class.find({
      students: userId,
    }).select("_id name semester").lean();

    classIds = classes.map((classData) => classData._id);
    classes.forEach((c) => classMap.set(c._id.toString(), c));
  }

  const query = {
    classId: { $in: classIds },
  };

  if (role === "STUDENT") {
    query.$or = [
      { assignedTo: { $exists: false } },
      { assignedTo: null },
      { assignedTo: userId }
    ];
  }

  let assignmentQuery = Assignment.find(query)
    .select("-testCases -starterCode -hints -explanation -problemStatement -constraints -inputFormat -outputFormat -examples")
    .sort({ createdAt: -1 });

  if (limit && Number(limit) > 0) {
    const numLimit = parseInt(limit, 10);
    const numPage = page && Number(page) > 0 ? parseInt(page, 10) : 1;
    assignmentQuery = assignmentQuery.skip((numPage - 1) * numLimit).limit(numLimit);
  }

  const assignments = await assignmentQuery.lean();

  // Populate classId from in-memory map without extra network round-trips
  assignments.forEach((a) => {
    if (a.classId && classMap.has(a.classId.toString())) {
      a.classId = classMap.get(a.classId.toString());
    }
  });

  if (role === "STUDENT") {
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      userId,
      assignmentId: { $in: assignmentIds },
    })
      .select("assignmentId score status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const submissionMap = {};
    for (const sub of submissions) {
      if (!submissionMap[sub.assignmentId]) {
        submissionMap[sub.assignmentId] = {
          attempts: 0,
          bestScore: 0,
          latest: null,
          passed: false
        };
      }
      const sm = submissionMap[sub.assignmentId];
      sm.attempts += 1;
      if (sub.score > sm.bestScore) sm.bestScore = sub.score;
      if (sub.status === "PASSED") sm.passed = true;
      if (!sm.latest) sm.latest = sub;
    }

    return assignments.map((a) => {
      const sm = submissionMap[a._id];
      if (sm) {
        return {
          ...a,
          status: sm.passed ? "COMPLETED" : sm.latest.status,
          score: sm.bestScore,
          attempts: sm.attempts,
          latestSubmissionId: sm.latest._id,
          latestSubmittedAt: sm.latest.createdAt,
          passed: sm.passed
        };
      }
      return {
        ...a,
        status: "NOT_STARTED",
        score: 0,
        attempts: 0,
        passed: false
      };
    });
  }

  if (role === "TEACHER") {
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds }
    }).lean();
    
    const submissionStats = {};
    for (const sub of submissions) {
      if (!submissionStats[sub.assignmentId]) {
        submissionStats[sub.assignmentId] = {
          uniqueStudents: new Set(),
          passedCount: 0,
        };
      }
      const stats = submissionStats[sub.assignmentId];
      stats.uniqueStudents.add(sub.userId.toString());
      if (sub.status === "PASSED") {
        // Just checking if any submission from this student passed, we could be more rigorous
        // but for now let's just count total passed submissions or passed students.
        // Let's count unique students who have at least one PASSED submission.
      }
    }

    // A better approach for passed count: unique students who passed
    const passedStudentsMap = {};
    for (const sub of submissions) {
      if (sub.status === "PASSED") {
        if (!passedStudentsMap[sub.assignmentId]) passedStudentsMap[sub.assignmentId] = new Set();
        passedStudentsMap[sub.assignmentId].add(sub.userId.toString());
      }
    }

    return assignments.map((a) => {
      const stats = submissionStats[a._id];
      const passed = passedStudentsMap[a._id];
      return {
        ...a,
        submissionsCount: stats ? stats.uniqueStudents.size : 0,
        passedCount: passed ? passed.size : 0,
      };
    });
  }

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
    
    if (assignment.assignedTo && assignment.assignedTo.toString() !== userId) {
      const error = new Error(
        "You do not have access to this personalized assignment"
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

  // Initialize with all students in the class
  if (classData.students && classData.students.length > 0) {
    const studentsData = await mongoose.model("User").find({
      _id: { $in: classData.students }
    }, "name email");
    
    for (const student of studentsData) {
      studentResults[student._id.toString()] = {
        student: student,
        attempts: 0,
        bestScore: 0,
        latestScore: 0,
        latestStatus: "NOT_SUBMITTED",
        latestSubmissionAt: null,
        latestSubmission: null,
      };
    }
  }

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
        latestSubmission: submission,
      };
    }

    if (studentResults[studentId].attempts === 0) {
      // First time we see a submission for this student (it's the latest because of sort)
      studentResults[studentId].latestScore = submission.score;
      studentResults[studentId].latestStatus = submission.status;
      studentResults[studentId].latestSubmissionAt = submission.createdAt;
      studentResults[studentId].latestSubmission = submission;
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
  generateAIAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentResults,
};