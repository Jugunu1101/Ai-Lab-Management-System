const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");

const Submission = require("../../modules/submissions/submission.model");
const Assignment = require("../../modules/assignments/assignment.model");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const {
  analyzeSubmission,
} = require("../../services/ai/ai.service");
const {
  updateProgressFromSubmission,
} = require("../../modules/progress/progress.service");

const processAIAnalysis = async (job) => {
  const { submissionId } = job.data;

  console.log(`[AIWorker] Processing AI analysis for: ${submissionId}`);

  const submission = await Submission.findById(submissionId);

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  const assignment = await Assignment.findById(submission.assignmentId);

  if (!assignment) {
    throw new Error(`Assignment not found: ${submission.assignmentId}`);
  }

  const passedTests = submission.testCasesPassed || 0;
  const totalTests = submission.totalTestCases || 0;
  const failedTests = totalTests - passedTests;

  // Call AI service
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
    console.error("[AIWorker] AI service call failed:", {
      code: aiError.code,
      message: aiError.message,
    });

    // Don't throw — AI analysis failure shouldn't block progress updates
    // We still update progress with what we have
  }

  // Store AI analysis in dedicated collection
  let analysisDoc = null;

  if (aiResult) {
    analysisDoc = await AIAnalysis.create({
      studentId: submission.userId,
      type: "CODE_ANALYSIS",
      inputReference: submissionId,
      result: aiResult,
      model: aiResult.model || "unknown",
      promptVersion: aiResult.promptVersion || "v1",
    });

    // Update submission with AI data
    submission.aiAnalysis = {
      mastery: aiResult.mastery || [],
      weakTopics: aiResult.weakTopics || [],
      mistakes: aiResult.mistakes || [],
      recommendations: aiResult.recommendations || [],
    };

    submission.analysisId = analysisDoc._id;
    await submission.save();
  }

  // Update topic progress
  const attempts = await Submission.countDocuments({
    assignmentId: submission.assignmentId,
    userId: submission.userId,
  });

  const submissionSuccess = totalTests > 0 && passedTests === totalTests;

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
  
  const { queueAgentDecision } = require("../agent.queue");
  await queueAgentDecision(submission.userId.toString(), "SUBMISSION_COMPLETED");

  console.log(
    `[AIWorker] Completed analysis for: ${submissionId}`
  );

  return {
    submissionId,
    analysisId: analysisDoc?._id?.toString() || null,
  };
};

const startAIWorker = () => {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.AI_ANALYSIS,
    processAIAnalysis,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(
      `[AIWorker] Job ${job.id} completed. Analysis: ${result.analysisId}`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[AIWorker] Job ${job.id} failed:`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error("[AIWorker] Worker error:", error.message);
  });

  console.log("[AIWorker] Started.");

  return worker;
};

module.exports = {
  startAIWorker,
  processAIAnalysis,
};
