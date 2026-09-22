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

  const isEnrolled = classData.students.some(
    (studentId) => studentId.toString() === userId,
  );

  if (!isEnrolled) {
    const error = new Error("You must be enrolled in this class to submit");

    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

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
    language,
    attemptNumber,
  });

  return submission;
};

const getSubmissions = async ({ userId }) => {
  const submissions = await Submission.find({
    userId,
  })
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
    submissionObject.testResults =
      submissionObject.testResults.map((result) => {
        const testCase =
          assignment.testCases[result.testCaseIndex];

        if (testCase && testCase.isHidden) {
          return {
            testCaseIndex: result.testCaseIndex,
            passed: result.passed,
            executionTime: result.executionTime,
            error: result.error,
          };
        }

        return result;
      });
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

const executeSubmission = async ({ submissionId }) => {
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

  const supportedLanguages = ["javascript", "python", "cpp", "java"];
  if (!supportedLanguages.includes(submission.language.toLowerCase())) {
    const error = new Error(
      `Unsupported language "${submission.language}". Supported: ${supportedLanguages.join(", ")}`
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

    if (executionResult.status === "TIMEOUT") {
      submission.status = "TIMEOUT";
    } else if (executionResult.status === "ERROR") {
      submission.status = "ERROR";
    } else {
      submission.status = submissionSuccess ? "PASSED" : "FAILED";
    }

    submission.testResults = testResults;
    submission.score = executionResult.score;
    submission.testCasesPassed = passedTests;
    submission.totalTestCases = totalTests;

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

module.exports = {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  getAssignmentSubmissions,
  getSubmissionDetailsForTeacher,
  executeSubmission,
};