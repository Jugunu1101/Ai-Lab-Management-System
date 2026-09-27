const submissionService = require("./submission.service");
const { enqueueCodeExecution } = require("../../queues/submission.queue");
const { enqueueAIAnalysis } = require("../../queues/ai.queue");
const { checkRedisAvailability } = require("../../config/redis");

const createSubmission = async (req, res, next) => {
  try {
    const submission = await submissionService.createSubmission({
      assignmentId: req.body.assignmentId,
      code: req.body.code,
      language: req.body.language,
      userId: req.user.userId,
    });

    const isRedisUp = await checkRedisAvailability();

    if (isRedisUp) {
      try {
        await enqueueCodeExecution({ submissionId: submission._id });
        return res.status(201).json({
          success: true,
          message: "Submission received and enqueued for execution",
          data: submission,
        });
      } catch (queueError) {
        console.warn(
          "Queue enqueue failed, falling back to synchronous execution:",
          queueError.message
        );
      }
    }

    const result = await submissionService.executeSubmission({
      submissionId: submission._id,
      skipAI: false,
    });

    if (isRedisUp) {
      enqueueAIAnalysis({ submissionId: submission._id }).catch((err) => {
        console.warn("Failed to enqueue AI analysis:", err.message);
      });
    }

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const runPublicTests = async (req, res, next) => {
  try {
    const result = await submissionService.runPublicTests({
      assignmentId: req.body.assignmentId,
      code: req.body.code,
      language: req.body.language,
      userId: req.user.userId,
      testCases: req.body.testCases,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSubmissions = async (req, res, next) => {
  try {
    const submissions = await submissionService.getSubmissions({
      userId: req.user.userId,
      assignmentId: req.query.assignmentId,
    });

    return res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById({
      submissionId: req.params.submissionId,
      userId: req.user.userId,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const submissions =
      await submissionService.getAssignmentSubmissions({
        assignmentId: req.params.assignmentId,
        userId: req.user.userId,
      });

    return res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

const getSubmissionDetailsForTeacher = async (
  req,
  res,
  next
) => {
  try {
    const submission =
      await submissionService.getSubmissionDetailsForTeacher({
        submissionId: req.params.submissionId,
        userId: req.user.userId,
      });

    return res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

const getSubmissionsByStudent = async (req, res, next) => {
  try {
    const submissions = await submissionService.getSubmissionsByStudent({
      studentId: req.params.studentId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubmission,
  runPublicTests,
  getSubmissions,
  getSubmissionById,
  getAssignmentSubmissions,
  getSubmissionDetailsForTeacher,
  getSubmissionsByStudent,
};