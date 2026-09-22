require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startSubmissionWorker } = require("./queues/workers/submission.worker");
const { startAIWorker } = require("./queues/workers/ai.worker");
const { startReportWorker } = require("./queues/workers/report.worker");

console.log("JWT secret loaded:", !!process.env.JWT_SECRET);

const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

const { checkRedisAvailability } = require("./config/redis");

// Initialize BullMQ Workers
const startWorkers = async () => {
  try {
    const isRedisUp = await checkRedisAvailability();
    if (!isRedisUp) {
      console.warn(
        `[BullMQ] Redis is not reachable at ${process.env.REDIS_URL || "redis://localhost:6379"}. Background workers will not start.`
      );
      console.warn(
        `[BullMQ] Submissions will fall back to synchronous execution mode. Start Redis to enable queue workers.`
      );
      return;
    }

    startSubmissionWorker();
    startAIWorker();
    startReportWorker();
    console.log("BullMQ background workers initialized.");
  } catch (err) {
    console.warn("Failed to initialize BullMQ workers:", err.message);
  }
};

startWorkers();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});