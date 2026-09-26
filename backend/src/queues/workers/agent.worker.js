const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");

const Progress = require("../../modules/progress/progress.model");
const Submission = require("../../modules/submissions/submission.model");
const QuizAttempt = require("../../modules/quizzes/quizAttempt.model");
const { agentDecide } = require("../../services/ai/ai.service");
const { enqueueQuizGeneration } = require("../ai.queue");

const processAgentDecision = async (job) => {
  const { studentId, triggerSource } = job.data;
  console.log(`[AgentWorker] Processing agent decision for student: ${studentId} triggered by ${triggerSource}`);

  // Fetch mastery
  const progressList = await Progress.find({ studentId }).sort({ masteryScore: 1 });
  const mastery = progressList.map(p => ({
    topic: p.topic,
    score: p.masteryScore,
    trend: "stable", // simple fallback
    attempts: p.attempts || 0
  }));

  // Fetch recent mistakes
  const recentSubmissions = await Submission.find({ userId: studentId })
    .sort({ createdAt: -1 })
    .limit(5);

  const recentMistakes = [];
  recentSubmissions.forEach(sub => {
    if (sub.aiAnalysis && sub.aiAnalysis.mistakes) {
      recentMistakes.push(...sub.aiAnalysis.mistakes);
    }
  });

  // Fetch recent quizzes
  const recentQuizzes = await QuizAttempt.find({ studentId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("quizId", "topics");

  const recentQuizResults = recentQuizzes.map(q => ({
    quizId: q.quizId._id,
    topics: q.quizId.topics,
    score: q.score,
    percentage: (q.score / Math.max(1, q.answers.length)) * 100
  }));

  const decisionData = {
    studentId,
    mastery,
    recentMistakes,
    recentQuizResults,
    recentAssignments: recentSubmissions.map(s => ({
      assignmentId: s.assignmentId,
      score: s.score,
      status: s.status
    }))
  };

  try {
    const decision = await agentDecide(decisionData);
    console.log(`[AgentWorker] Agent decided: ${decision.action} for ${studentId}`);

    if (decision.action === "GENERATE_QUIZ") {
      await enqueueQuizGeneration({
        studentId,
        language: progressList[0]?.language || "javascript", // fallback
        topics: decision.targetTopics,
        questionCount: decision.questionCount || 3,
        difficulty: decision.difficulty || "medium"
      });
      console.log(`[AgentWorker] Enqueued quiz generation for ${studentId}`);
    } else if (decision.action === "ASSIGN_PRACTICE") {
      const { enqueueAssignmentGeneration } = require("../assignment.queue");
      const targetLang = progressList[0]?.language || "cpp";
      await enqueueAssignmentGeneration({
        studentId,
        language: targetLang,
        targetTopics: decision.targetTopics,
        difficulty: decision.difficulty || "medium",
        reason: decision.reason || "Autonomous practice recommendation"
      });
      console.log(`[AgentWorker] Enqueued assignment generation for ${studentId} in ${targetLang}`);
    }

    // You could save this decision in a DB table for the student dashboard.

  } catch (error) {
    console.error(`[AgentWorker] Agent decision failed:`, error.message);
  }

  return { studentId, triggerSource };
};

const startAgentWorker = () => {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.AGENT_DECISION,
    processAgentDecision,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[AgentWorker] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[AgentWorker] Job ${job.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[AgentWorker] Worker error:", error.message);
  });

  console.log("[AgentWorker] Started.");

  return worker;
};

module.exports = {
  startAgentWorker,
  processAgentDecision
};
