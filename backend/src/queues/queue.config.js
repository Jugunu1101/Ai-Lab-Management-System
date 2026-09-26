const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");

const QUEUE_NAMES = {
  CODE_EXECUTION: "code-execution",
  AI_ANALYSIS: "ai-analysis",
  QUIZ_GENERATION: "quiz-generation",
  WEEKLY_REPORT: "weekly-report",
  AGENT_DECISION: "agent-decision",
  ASSIGNMENT_GENERATION: "assignment-generation",
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
    agentDecision: new Queue(QUEUE_NAMES.AGENT_DECISION, { connection }),
    assignmentGeneration: new Queue(QUEUE_NAMES.ASSIGNMENT_GENERATION, { connection }),
  };

  return queues;
};

module.exports = {
  QUEUE_NAMES,
  getQueues,
};
