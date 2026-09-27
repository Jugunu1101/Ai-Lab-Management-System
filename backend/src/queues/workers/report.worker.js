const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");
const { generateWeeklyReportData } = require("../../modules/reports/reports.service");

const processWeeklyReport = async (job) => {
  const { classId, teacherId, startDate, endDate } = job.data;

  console.log(`[ReportWorker] Generating weekly report for class: ${classId}`);

  const report = await generateWeeklyReportData({
    classId,
    teacherId,
    userRole: "TEACHER",
    startDate,
    endDate,
  });

  console.log(`[ReportWorker] Weekly report saved: ${report._id}`);

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
