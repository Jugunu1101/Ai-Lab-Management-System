const { getQueues } = require("./queue.config");

const enqueueAIAnalysis = async ({ submissionId }) => {
  const { aiAnalysis } = getQueues();

  const job = await aiAnalysis.add(
    "analyze-submission",
    { submissionId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    }
  );

  return job;
};

const enqueueQuizGeneration = async ({
  studentId,
  language,
  topics,
  questionCount,
}) => {
  const { quizGeneration } = getQueues();

  const job = await quizGeneration.add(
    "generate-quiz",
    { studentId, language, topics, questionCount },
    {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: {
        age: 3600,
        count: 500,
      },
      removeOnFail: {
        age: 86400,
      },
    }
  );

  return job;
};

module.exports = {
  enqueueAIAnalysis,
  enqueueQuizGeneration,
};
