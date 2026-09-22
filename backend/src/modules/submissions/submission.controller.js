const submissionService = require("./submission.service");
const { enqueueCodeExecution } = require("../../queues/submission.queue");

const createSubmission = async (req, res, next) => {
  try {
    const submission = await submissionService.createSubmission({
      assignmentId: req.body.assignmentId,
      code: req.body.code,
      language: req.body.language,
      userId: req.user.userId,
    });

    // Enqueue code execution job onto BullMQ
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
      const result = await submissionService.executeSubmission({
        submissionId: submission._id,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

const getSubmissions = async (req, res, next) => {
  try {
    const submissions = await submissionService.getSubmissions({
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

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById({
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
  getSubmissions,
  getSubmissionById,
  getAssignmentSubmissions,
  getSubmissionDetailsForTeacher,
  getSubmissionsByStudent,
};