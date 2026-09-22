const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");

const QUEUE_NAMES = {
  CODE_EXECUTION: "code-execution",
  AI_ANALYSIS: "ai-analysis",
  QUIZ_GENERATION: "quiz-generation",
  WEEKLY_REPORT: "weekly-report",
};

let queues = null;

const getQueues = () => {
  if (queues) {
    return queues;
  }

  const connection = getRedisConnection();

  queues = {
    codeExecution: new Queue(QUEUE_NAMES.CODE_EXECUTION, { connection }),
    aiAnalysis: new Queue(QUEUE_NAMES.AI_ANALYSIS, { connection }),
    quizGeneration: new Queue(QUEUE_NAMES.QUIZ_GENERATION, { connection }),
    weeklyReport: new Queue(QUEUE_NAMES.WEEKLY_REPORT, { connection }),
  };

  return queues;
};

module.exports = {
  QUEUE_NAMES,
  getQueues,
};
