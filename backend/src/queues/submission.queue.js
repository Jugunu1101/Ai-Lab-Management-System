const { getQueues } = require("./queue.config");

const enqueueCodeExecution = async ({ submissionId }) => {
  const { codeExecution } = getQueues();

  const job = await codeExecution.add(
    "execute-submission",
    { submissionId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
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

module.exports = {
  enqueueCodeExecution,
};
