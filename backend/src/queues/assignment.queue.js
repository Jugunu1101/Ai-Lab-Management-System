const { getQueues } = require("./queue.config");

const enqueueAssignmentGeneration = async ({
  studentId,
  targetTopics,
  difficulty,
  reason,
}) => {
  const { assignmentGeneration } = getQueues();

  if (!assignmentGeneration) {
    console.warn("Queue system not initialized. Skipping assignment generation.");
    return null;
  }

  const job = await assignmentGeneration.add(
    "generate-assignment-job",
    { studentId, targetTopics, difficulty, reason },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return job;
};

module.exports = { enqueueAssignmentGeneration };
