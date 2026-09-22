const { getQueues } = require("./queue.config");

const enqueueWeeklyReport = async ({ classId, teacherId }) => {
  const { weeklyReport } = getQueues();

  const job = await weeklyReport.add(
    "generate-weekly-report",
    { classId, teacherId },
    {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 7200,
        count: 200,
      },
      removeOnFail: {
        age: 86400,
      },
    }
  );

  return job;
};

module.exports = {
  enqueueWeeklyReport,
};
