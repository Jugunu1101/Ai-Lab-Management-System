const Progress = require("./progress.model");

/**
 * Calculates topic mastery based on Architecture Section 7 formula:
 * Topic Score = (0.35 * assignmentScore) + (0.25 * quizScore) +
 *               (0.20 * submissionSuccessRate) + (0.10 * errorFrequencyFactor) +
 *               (0.10 * practiceFrequencyFactor)
 */
const calculateTopicMastery = ({
  assignmentScore = 0,
  quizScore = 0,
  successfulSubmissions = 0,
  totalSubmissions = 0,
  attempts = 1,
  mistakes = 0,
  lastPracticedAt = new Date(),
}) => {
  const submissionSuccessRate =
    totalSubmissions > 0
      ? Math.round((successfulSubmissions / totalSubmissions) * 100)
      : 0;

  // errorFrequencyFactor: lower mistakes -> higher score
  const errorRate = mistakes / Math.max(1, attempts);
  const errorFrequencyFactor = Math.max(
    0,
    Math.min(100, Math.round(100 - errorRate * 20))
  );

  // practiceFrequencyFactor: based on days elapsed since last practice
  const daysSincePractice = lastPracticedAt
    ? (Date.now() - new Date(lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  let practiceFrequencyFactor = 100;
  if (daysSincePractice > 14) {
    practiceFrequencyFactor = 30;
  } else if (daysSincePractice > 7) {
    practiceFrequencyFactor = 50;
  } else if (daysSincePractice > 3) {
    practiceFrequencyFactor = 75;
  }

  const rawMastery =
    0.35 * assignmentScore +
    0.25 * quizScore +
    0.20 * submissionSuccessRate +
    0.10 * errorFrequencyFactor +
    0.10 * practiceFrequencyFactor;

  return Math.max(0, Math.min(100, Math.round(rawMastery)));
};

const updateProgressFromSubmission = async ({
  studentId,
  language,
  topics,
  score,
  submissionSuccess,
  attempts,
  mistakes,
  aiMastery,
}) => {
  if (!topics || topics.length === 0) {
    return [];
  }

  const normalizedLang = (language || "").toLowerCase().trim();
  const updatedProgress = [];

  for (const topic of topics) {
    let progress = await Progress.findOne({
      studentId,
      language: normalizedLang,
      topic,
    });

    const aiTopic = aiMastery?.find((item) => item.topic === topic);

    if (!progress) {
      progress = new Progress({
        studentId,
        language: normalizedLang,
        topic,
      });
    }

    progress.assignmentScore = score;
    progress.submissionSuccess = !!submissionSuccess;
    progress.totalSubmissions = (progress.totalSubmissions || 0) + 1;
    if (submissionSuccess) {
      progress.successfulSubmissions = (progress.successfulSubmissions || 0) + 1;
    }
    progress.submissionSuccessRate = Math.round(
      (progress.successfulSubmissions / progress.totalSubmissions) * 100
    );

    progress.attempts = attempts || progress.attempts + 1;
    progress.mistakes = (progress.mistakes || 0) + (mistakes || 0);

    if (aiTopic && typeof aiTopic.score === "number") {
      progress.aiMasteryScore = aiTopic.score;
    }

    progress.lastPracticedAt = new Date();

    progress.masteryScore = calculateTopicMastery({
      assignmentScore: progress.assignmentScore,
      quizScore: progress.quizScore,
      successfulSubmissions: progress.successfulSubmissions,
      totalSubmissions: progress.totalSubmissions,
      attempts: progress.attempts,
      mistakes: progress.mistakes,
      lastPracticedAt: progress.lastPracticedAt,
    });

    await progress.save();
    updatedProgress.push(progress);
  }

  return updatedProgress;
};

const updateProgressFromQuiz = async ({
  studentId,
  language,
  topic,
  quizScore,
}) => {
  const normalizedLang = (language || "").toLowerCase().trim();

  let progress = await Progress.findOne({
    studentId,
    language: normalizedLang,
    topic,
  });

  if (!progress) {
    progress = new Progress({
      studentId,
      language: normalizedLang,
      topic,
    });
  }

  progress.quizScore = quizScore;
  progress.lastPracticedAt = new Date();

  progress.masteryScore = calculateTopicMastery({
    assignmentScore: progress.assignmentScore,
    quizScore: progress.quizScore,
    successfulSubmissions: progress.successfulSubmissions,
    totalSubmissions: progress.totalSubmissions,
    attempts: progress.attempts,
    mistakes: progress.mistakes,
    lastPracticedAt: progress.lastPracticedAt,
  });

  await progress.save();
  return progress;
};

const getStudentProgress = async ({ studentId, language }) => {
  const filter = { studentId };

  if (language) {
    filter.language = language.toLowerCase();
  }

  const progress = await Progress.find(filter).sort({
    masteryScore: 1,
    topic: 1,
  });

  return progress;
};

const getWeakTopics = async ({ studentId, language }) => {
  const filter = {
    studentId,
    masteryScore: { $lt: 60 },
  };

  if (language) {
    filter.language = language.toLowerCase();
  }

  const progress = await Progress.find(filter).sort({
    masteryScore: 1,
    topic: 1,
  });

  return progress;
};

module.exports = {
  calculateTopicMastery,
  updateProgressFromSubmission,
  updateProgressFromQuiz,
  getStudentProgress,
  getWeakTopics,
};
