const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");

const Class = require("../../modules/classes/class.model");
const Assignment = require("../../modules/assignments/assignment.model");
const Submission = require("../../modules/submissions/submission.model");
const QuizAttempt = require("../../modules/quizzes/quizAttempt.model");
const Progress = require("../../modules/progress/progress.model");
const WeeklyReport = require("../../modules/reports/weeklyReport.model");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const {
  generateWeeklyReport,
} = require("../../services/ai/ai.service");

const processWeeklyReport = async (job) => {
  const { classId, teacherId } = job.data;

  console.log(`[ReportWorker] Generating weekly report for class: ${classId}`);

  const classData = await Class.findById(classId).populate(
    "students",
    "name email"
  );

  if (!classData) {
    throw new Error(`Class not found: ${classId}`);
  }

  // Calculate week boundaries
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Gather class metrics
  const assignments = await Assignment.find({ classId }).select("_id title topics");
  const assignmentIds = assignments.map((a) => a._id);

  const submissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
    createdAt: { $gte: weekStart, $lte: weekEnd },
  }).select("userId score status assignmentId");

  const quizAttempts = await QuizAttempt.find({
    studentId: { $in: classData.students.map((s) => s._id) },
    createdAt: { $gte: weekStart, $lte: weekEnd },
  }).select("studentId score");

  const progress = await Progress.find({
    studentId: { $in: classData.students.map((s) => s._id) },
  }).select("studentId language topic masteryScore assignmentScore quizScore");

  // Compute aggregate stats
  const avgSubmissionScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
        )
      : 0;

  const avgQuizScore =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => sum + q.score, 0) /
            quizAttempts.length
        )
      : 0;

  // Topic aggregation
  const topicMap = {};
  for (const item of progress) {
    const key = `${item.language}:${item.topic}`;
    if (!topicMap[key]) {
      topicMap[key] = { topic: item.topic, language: item.language, total: 0, count: 0 };
    }
    topicMap[key].total += item.masteryScore;
    topicMap[key].count += 1;
  }

  const topicAverages = Object.values(topicMap).map((t) => ({
    topic: t.topic,
    language: t.language,
    averageMastery: t.count > 0 ? Math.round(t.total / t.count) : 0,
  }));

  const strongTopics = topicAverages
    .filter((t) => t.averageMastery >= 70)
    .map((t) => t.topic);

  const weakTopics = topicAverages
    .filter((t) => t.averageMastery < 50)
    .map((t) => t.topic);

  // Per-student performance for attention flags
  const studentPerformance = {};
  for (const sub of submissions) {
    const sid = sub.userId.toString();
    if (!studentPerformance[sid]) {
      studentPerformance[sid] = { scores: [], failCount: 0 };
    }
    studentPerformance[sid].scores.push(sub.score);
    if (sub.status === "FAILED" || sub.status === "ERROR") {
      studentPerformance[sid].failCount++;
    }
  }

  const studentsNeedingAttention = [];
  for (const student of classData.students) {
    const sid = student._id.toString();
    const perf = studentPerformance[sid];
    if (!perf) {
      studentsNeedingAttention.push({
        studentId: student._id,
        name: student.name,
        reason: "No submissions this week",
      });
      continue;
    }
    const avg =
      perf.scores.reduce((sum, s) => sum + s, 0) / perf.scores.length;
    if (avg < 50) {
      studentsNeedingAttention.push({
        studentId: student._id,
        name: student.name,
        reason: `Low average score: ${Math.round(avg)}%`,
      });
    }
  }

  // Prepare metrics payload for AI
  const metricsPayload = {
    className: classData.name,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    studentCount: classData.students.length,
    assignmentCount: assignments.length,
    submissionCount: submissions.length,
    averageSubmissionScore: avgSubmissionScore,
    averageQuizScore: avgQuizScore,
    strongTopics,
    weakTopics,
    studentsNeedingAttention: studentsNeedingAttention.map((s) => ({
      name: s.name,
      reason: s.reason,
    })),
  };

  // Call AI service for summary and recommendations
  let aiResult = null;
  try {
    aiResult = await generateWeeklyReport(metricsPayload);
  } catch (aiError) {
    console.error(
      "[ReportWorker] AI service failed:",
      aiError.message
    );
    throw new Error(`Weekly report AI generation failed: ${aiError.message}`);
  }

  // Save weekly report
  const report = await WeeklyReport.create({
    classId,
    weekStart,
    weekEnd,
    summary: aiResult.summary || "",
    strongTopics,
    weakTopics,
    studentsNeedingAttention,
    recommendations: aiResult.recommendations || [],
    model: aiResult.model || "unknown",
    promptVersion: aiResult.promptVersion || "v1",
    generatedBy: teacherId,
  });

  // Store AI analysis audit trail
  if (aiResult && aiResult.model !== "fallback") {
    await AIAnalysis.create({
      classId,
      type: "WEEKLY_REPORT",
      inputReference: classId,
      result: aiResult,
      model: aiResult.model || "unknown",
      promptVersion: aiResult.promptVersion || "v1",
    });
  }

  console.log(
    `[ReportWorker] Weekly report saved: ${report._id}`
  );

  return {
    reportId: report._id.toString(),
    classId,
  };
};

const startReportWorker = () => {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.WEEKLY_REPORT,
    processWeeklyReport,
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(
      `[ReportWorker] Job ${job.id} completed. Report: ${result.reportId}`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[ReportWorker] Job ${job.id} failed:`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error("[ReportWorker] Worker error:", error.message);
  });

  console.log("[ReportWorker] Started.");

  return worker;
};

module.exports = {
  startReportWorker,
};
