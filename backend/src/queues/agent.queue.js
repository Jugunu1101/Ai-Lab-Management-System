const { getQueues } = require("./queue.config");

const queueAgentDecision = async (studentId, triggerSource = "SUBMISSION_COMPLETED") => {
  const { agentDecision } = getQueues();
  
  if (!agentDecision) {
    console.warn("Queue system not initialized. Skipping agent decision.");
    return null;
  }

  const job = await agentDecision.add(
    "agent-decision-job",
    { studentId, triggerSource },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return job;
};

module.exports = { queueAgentDecision };
