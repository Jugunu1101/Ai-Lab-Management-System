const mongoose = require("mongoose");
const Submission = require("./submission.model");
const Assignment = require("../assignments/assignment.model");
const Class = require("../classes/class.model");
const {
  executeTestCases,
} = require("../../services/code-executor/test-case.service");
const {
  updateProgressFromSubmission,
} = require("../progress/progress.service");
const {
  analyzeSubmission,
} = require("../../services/ai/ai.service");
const { invalidateStudentDashboardCache } = require("../student/student.service");

const SUPPORTED_LANGUAGES = ["javascript", "python", "cpp", "c", "java"];

const normalizeLanguage = (language) =>
  String(language || "javascript").toLowerCase().trim();

const assertEnrolled = (classData, userId) => {
  const isEnrolled = classData.students.some(
    (studentId) => studentId.toString() === String(userId),
  );
  
  const isTeacher = classData.teacherId.toString() === String(userId);

  if (!isEnrolled && !isTeacher) {
    const error = new Error("You must be enrolled in or teach this class to submit");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

const createSubmission = async ({ assignmentId, userId, code, language }) => {
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

  assertEnrolled(classData, userId);

  if (assignment.deadline && new Date() > assignment.deadline) {
    const error = new Error("Assignment deadline has passed");

    error.statusCode = 400;
    error.code = "DEADLINE_PASSED";
    throw error;
  }

  const submissionCount = await Submission.countDocuments({
    assignmentId,
    userId,
  });

  const attemptNumber = submissionCount + 1;

  if (
    assignment.maxAttempts !== null &&
    submissionCount >= assignment.maxAttempts
  ) {
    const error = new Error("Maximum submission attempts reached");

    error.statusCode = 400;
    error.code = "MAX_ATTEMPTS_REACHED";
    throw error;
  }

  const submission = await Submission.create({
    assignmentId,
    userId,
    code,
    language: normalizeLanguage(language),
    attemptNumber,
  });

  await invalidateStudentDashboardCache(userId);

  return submission;
};

const getSubmissions = async ({ userId, assignmentId }) => {
  const query = { userId };

  if (assignmentId) {
    if (mongoose.Types.ObjectId.isValid(assignmentId)) {
      query.assignmentId = new mongoose.Types.ObjectId(assignmentId);
    } else {
      return [];
    }
  }

  const submissions = await Submission.find(query)
    .populate("assignmentId", "title language difficulty")
    .sort({ createdAt: -1 });

  return submissions;
};

const getSubmissionById = async ({
  submissionId,
  userId,
}) => {
  const submission = await Submission.findById(submissionId)
    .populate(
      "assignmentId",
      "title description language difficulty topics"
    );

  if (!submission) {
    const error = new Error("Submission not found");
    error.statusCode = 404;
    error.code = "SUBMISSION_NOT_FOUND";
    throw error;
  }

  if (submission.userId.toString() !== userId) {
    const error = new Error(
      "You do not have access to this submission"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const submissionObject = submission.toObject();

  const assignment = await Assignment.findById(
    submission.assignmentId._id
  ).select("testCases");

  if (assignment) {
    submissionObject.testResults = (submissionObject.testResults || []).map(
      (result) => {
        const testCase = assignment.testCases[result.testCaseIndex];

        if (testCase && testCase.isHidden) {
          return {
            testCaseIndex: result.testCaseIndex,
            passed: result.passed,
            executionTime: result.executionTime,
            error: result.error,
          };
        }

        return {
          ...result,
          input: testCase?.input,
          isHidden: false,
        };
      },
    );
  }

  return submissionObject;
};

const getAssignmentSubmissions = async ({
  assignmentId,
  userId,
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

  if (classData.teacherId.toString() !== userId) {
    const error = new Error(
      "You do not have access to this assignment submissions"
    );

    error.statusCode = 403;
    error.code = "FORBIDDEN";

    throw error;
  }

  const submissions = await Submission.find({
    assignmentId,
  })
    .populate("userId", "name email")
    .select(
      "userId language status score createdAt updatedAt"
    )
    .sort({ createdAt: -1 });

  return submissions;
};

const getSubmissionDetailsForTeacher = async ({
  submissionId,
  userId,
}) => {
  const submission = await Submission.findById(submissionId)
    .populate("userId", "name email")
    .populate(
      "assignmentId",
      "title description language difficulty topics classId"
    );

  if (!submission) {
    const error = new Error("Submission not found");
    error.statusCode = 404;
    error.code = "SUBMISSION_NOT_FOUND";
    throw error;
  }

  const assignment = submission.assignmentId;

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== userId) {
    const error = new Error(
      "You do not have access to this submission"
    );

    error.statusCode = 403;
    error.code = "FORBIDDEN";

    throw error;
  }

  return submission;
};

const runPublicTests = async ({ assignmentId, userId, code, language }) => {
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

  assertEnrolled(classData, userId);

  const normalizedLanguage = normalizeLanguage(language);

  if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
    const error = new Error(
      `Unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
    );
    error.statusCode = 400;
    error.code = "UNSUPPORTED_LANGUAGE";
    throw error;
  }

  const publicCases = (assignment.testCases || []).filter((tc) => !tc.isHidden);

  if (publicCases.length === 0) {
    const error = new Error("This assignment has no public test cases to run");
    error.statusCode = 400;
    error.code = "NO_PUBLIC_TESTS";
    throw error;
  }

  const executionResult = await executeTestCases({
    code,
    language: normalizedLanguage,
    testCases: publicCases,
  });

  const testResults = executionResult.testResults || [];
  const passedCount = testResults.filter((result) => result.passed).length;

  return {
    status: executionResult.status,
    passed: publicCases.length > 0 && passedCount === publicCases.length,
    passedCount,
    totalCount: publicCases.length,
    score: executionResult.score,
    details: testResults.map((result, index) => ({
      index: index + 1,
      input: publicCases[index]?.input || "",
      expectedOutput: result.expectedOutput,
      actualOutput: result.actualOutput,
      passed: result.passed,
      executionTime: result.executionTime,
      error: result.error || "",
    })),
  };
};

const executeSubmission = async ({ submissionId, skipAI = false }) => {
  const submission = await Submission.findById(submissionId);

  if (!submission) {
    const error = new Error("Submission not found");
    error.statusCode = 404;
    error.code = "SUBMISSION_NOT_FOUND";
    throw error;
  }

  const assignment = await Assignment.findById(submission.assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  if (!SUPPORTED_LANGUAGES.includes(normalizeLanguage(submission.language))) {
    const error = new Error(
      `Unsupported language "${submission.language}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
    );
    error.statusCode = 400;
    error.code = "UNSUPPORTED_LANGUAGE";
    throw error;
  }

  submission.status = "RUNNING";
  await submission.save();

  try {
    const executionResult = await executeTestCases({
      code: submission.code,
      language: submission.language,
      testCases: assignment.testCases,
    });

    const testResults = executionResult.testResults || [];
    const totalTests = testResults.length;
    const passedTests = testResults.filter((result) => result.passed).length;
    const failedTests = totalTests - passedTests;
    const submissionSuccess = totalTests > 0 && passedTests === totalTests;

    if (executionResult.status === "TIME_LIMIT_EXCEEDED" || executionResult.status === "TIMEOUT") {
      submission.status = "TIMEOUT";
    } else if (executionResult.status === "COMPILE_ERROR" || executionResult.status === "RUNTIME_ERROR" || executionResult.status === "INTERNAL_ERROR" || executionResult.status === "ERROR") {
      submission.status = "ERROR";
    } else {
      submission.status = submissionSuccess ? "PASSED" : "FAILED";
    }

    submission.testResults = testResults;
    submission.score = executionResult.score;
    submission.testCasesPassed = passedTests;
    submission.totalTestCases = totalTests;
    submission.executionTime = testResults.reduce(
      (sum, result) => sum + (result.executionTime || 0),
      0
    );

    if (totalTests > 0) {
      submission.output = testResults
        .map((result) => result.actualOutput)
        .join("\n");
    }

    const attempts = await Submission.countDocuments({
      assignmentId: submission.assignmentId,
      userId: submission.userId,
    });

    let aiResult = null;

    if (!skipAI) {
      try {
        aiResult = await analyzeSubmission({
          student: {
            id: submission.userId.toString(),
          },

          assignment: {
            id: assignment._id.toString(),
            language: assignment.language,
            topics: assignment.topics,
          },

          submission: {
            code: submission.code,
          },

          testResults: {
            passed: passedTests,
            failed: failedTests,
          },
        });
      } catch (aiError) {
        console.error("AI analysis failed:", {
          code: aiError.code,
          message: aiError.message,
        });
      }

      if (aiResult) {
        submission.aiAnalysis = {
          mastery: aiResult.mastery || [],
          weakTopics: aiResult.weakTopics || [],
          mistakes: aiResult.mistakes || [],
          recommendations: aiResult.recommendations || [],
        };
      }
    }

    await submission.save();

    await updateProgressFromSubmission({
      studentId: submission.userId,
      language: submission.language,
      topics: assignment.topics,
      score: submission.score,
      submissionSuccess,
      attempts,
      mistakes: failedTests,
      aiMastery: aiResult?.mastery || [],
    });

    return submission;
  } catch (error) {
    submission.status = "FAILED";

    await submission.save().catch(() => {});

    throw error;
  }
};

const getSubmissionsByStudent = async ({ studentId, teacherId }) => {
  // Find all classes taught by this teacher that include this student
  const classes = await Class.find({
    teacherId,
    students: studentId,
  }).select("_id");

  if (classes.length === 0) {
    const error = new Error(
      "Student not found in any of your classes"
    );
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const classIds = classes.map((c) => c._id);

  // Find all assignments for these classes
  const assignments = await Assignment.find({
    classId: { $in: classIds },
  }).select("_id title classId");

  const assignmentIds = assignments.map((a) => a._id);

  // Get all submissions from this student for these assignments
  const submissions = await Submission.find({
    userId: studentId,
    assignmentId: { $in: assignmentIds },
  })
    .populate("assignmentId", "title description language difficulty classId")
    .select("assignmentId language status score createdAt updatedAt attemptNumber")
    .sort({ createdAt: -1 });

  return submissions;
};

module.exports = {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  getAssignmentSubmissions,
  getSubmissionDetailsForTeacher,
  executeSubmission,
  runPublicTests,
  getSubmissionsByStudent,
};