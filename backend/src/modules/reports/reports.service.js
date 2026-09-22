const {
  getStudentAnalytics,
  getClassAnalytics,
  getClassTopicAnalytics,
} = require("../analytics/analytics.service");
const Progress = require("../progress/progress.model");
const Class = require("../classes/class.model");
const WeeklyReport = require("./weeklyReport.model");
const { enqueueWeeklyReport } = require("../../queues/report.queue");

const getStudentReport = async ({ studentId }) => {
  const [analytics, progress] = await Promise.all([
    getStudentAnalytics({ studentId }),
    Progress.find({ studentId })
      .select(
        "language topic assignmentScore quizScore masteryScore lastPracticedAt"
      )
      .sort({ masteryScore: -1 }),
  ]);

  return {
    summary: {
      totalAssignments: analytics.totalAssignments,
      averageAssignmentScore: analytics.averageAssignmentScore,
      totalQuizzes: analytics.totalQuizzes,
      averageQuizScore: analytics.averageQuizScore,
      averageMasteryScore: analytics.averageMasteryScore,
    },
    topicPerformance: progress.map((item) => ({
      language: item.language,
      topic: item.topic,
      assignmentScore: item.assignmentScore,
      quizScore: item.quizScore,
      masteryScore: item.masteryScore,
      lastPracticedAt: item.lastPracticedAt,
    })),
    weakTopics: analytics.weakTopics,
  };
};

const getClassReport = async ({ classId, teacherId }) => {
  const [analytics, topicAnalytics] = await Promise.all([
    getClassAnalytics({
      classId,
      teacherId,
    }),
    getClassTopicAnalytics({
      classId,
      teacherId,
    }),
  ]);

  return {
    summary: {
      studentCount: analytics.studentCount,
      assignmentCount: analytics.assignmentCount,
      submissionCount: analytics.submissionCount,
      averageScore: analytics.averageScore,
      completionRate: analytics.completionRate,
    },
    topicPerformance: topicAnalytics.topics,
    weakTopics: topicAnalytics.weakTopics,
  };
};

const getWeeklyReportsByClass = async ({ classId, teacherId, userRole }) => {
  const classData = await Class.findById(classId);
  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (userRole !== "ADMIN" && classData.teacherId.toString() !== teacherId) {
    const error = new Error("You do not have access to this class reports");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const reports = await WeeklyReport.find({ classId }).sort({ createdAt: -1 });
  return reports;
};

const getLatestWeeklyReport = async ({ classId, teacherId, userRole }) => {
  const classData = await Class.findById(classId);
  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (userRole !== "ADMIN" && classData.teacherId.toString() !== teacherId) {
    const error = new Error("You do not have access to this class reports");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const report = await WeeklyReport.findOne({ classId }).sort({ createdAt: -1 });
  return report;
};

const triggerWeeklyReportGeneration = async ({ classId, teacherId }) => {
  const classData = await Class.findById(classId);
  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error("You are not authorized to generate reports for this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // Enqueue report generation via BullMQ
  try {
    const job = await enqueueWeeklyReport({ classId, teacherId });
    return {
      message: "Weekly report generation enqueued successfully",
      jobId: job.id,
      classId,
    };
  } catch (err) {
    console.warn("Queue unavailable for report generation:", err.message);
    const error = new Error("Report generation queue unavailable: " + err.message);
    error.statusCode = 503;
    error.code = "QUEUE_UNAVAILABLE";
    throw error;
  }
};

module.exports = {
  getStudentReport,
  getClassReport,
  getWeeklyReportsByClass,
  getLatestWeeklyReport,
  triggerWeeklyReportGeneration,
};
