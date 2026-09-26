const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");
const { enqueueAIAnalysis } = require("../ai.queue");

const Submission = require("../../modules/submissions/submission.model");
const Assignment = require("../../modules/assignments/assignment.model");
const {
  executeTestCases,
} = require("../../services/code-executor/test-case.service");

const processSubmission = async (job) => {
  const { submissionId } = job.data;

  console.log(`[SubmissionWorker] Processing submission: ${submissionId}`);

  const submission = await Submission.findById(submissionId);

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  const assignment = await Assignment.findById(submission.assignmentId);

  if (!assignment) {
    throw new Error(`Assignment not found: ${submission.assignmentId}`);
  }

  // Mark as running
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
    const passedTests = testResults.filter((r) => r.passed).length;

    // Determine status
    const allPassed = totalTests > 0 && passedTests === totalTests;

    if (executionResult.status === "TIME_LIMIT_EXCEEDED" || executionResult.status === "TIMEOUT") {
      submission.status = "TIMEOUT";
    } else if (executionResult.status === "ERROR" || executionResult.status === "COMPILE_ERROR" || executionResult.status === "INTERNAL_ERROR" || executionResult.status === "RUNTIME_ERROR") {
      submission.status = "ERROR";
    } else {
      submission.status = allPassed ? "PASSED" : "FAILED";
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

    await submission.save();

    // Enqueue AI analysis as follow-up
    try {
      await enqueueAIAnalysis({ submissionId });
      console.log(`[SubmissionWorker] AI analysis enqueued for: ${submissionId}`);
    } catch (enqueueError) {
      console.error(
        `[SubmissionWorker] Failed to enqueue AI analysis:`,
        enqueueError.message
      );
    }

    console.log(
      `[SubmissionWorker] Completed: ${submissionId} — ${submission.status} (${passedTests}/${totalTests})`
    );

    return {
      submissionId,
      status: submission.status,
      score: submission.score,
    };
  } catch (error) {
    submission.status = "ERROR";
    await submission.save().catch(() => {});

    throw error;
  }
};

const startSubmissionWorker = () => {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.CODE_EXECUTION,
    processSubmission,
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job, result) => {
    console.log(
      `[SubmissionWorker] Job ${job.id} completed: ${result.status}`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[SubmissionWorker] Job ${job.id} failed:`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error("[SubmissionWorker] Worker error:", error.message);
  });

  console.log("[SubmissionWorker] Started.");

  return worker;
};

module.exports = {
  startSubmissionWorker,
};
