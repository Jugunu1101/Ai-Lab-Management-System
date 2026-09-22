const mongoose = require("mongoose");
const Class = require("../classes/class.model");
const Assignment = require("../assignments/assignment.model");
const Submission = require("../submissions/submission.model");
const Progress = require("../progress/progress.model");
const Quiz = require("../quizzes/quiz.model");
const QuizAttempt = require("../quizzes/quizAttempt.model");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const { generateLearningPath } = require("../../services/ai/ai.service");

const getStudentDashboard = async ({ studentId }) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // 1. Enrolled classes
  const enrolledClasses = await Class.find({ students: studentObjectId }).select(
    "_id name languages semester"
  );
  const classIds = enrolledClasses.map((c) => c._id);

  // 2. Active assignments
  const now = new Date();
  const activeAssignmentsCount = await Assignment.countDocuments({
    classId: { $in: classIds },
    $or: [{ deadline: null }, { deadline: { $gt: now } }],
  });

  // 3. Submissions summary
  const totalSubmissions = await Submission.countDocuments({
    userId: studentObjectId,
  });

  const avgScoreResult = await Submission.aggregate([
    { $match: { userId: studentObjectId } },
    { $group: { _id: null, avgScore: { $avg: "$score" } } },
  ]);
  const averageScore =
    avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

  // Recent submissions
  const recentSubmissions = await Submission.find({ userId: studentObjectId })
    .populate("assignmentId", "title language difficulty topics")
    .sort({ createdAt: -1 })
    .limit(5);

  // 4. Weak and strong topics
  const progressRecords = await Progress.find({
    studentId: studentObjectId,
  }).sort({ masteryScore: 1 });

  const weakTopics = progressRecords
    .filter((p) => p.masteryScore < 60)
    .slice(0, 5)
    .map((p) => ({
      topic: p.topic,
      language: p.language,
      masteryScore: p.masteryScore,
    }));

  const strongTopics = progressRecords
    .filter((p) => p.masteryScore >= 80)
    .slice(0, 5)
    .map((p) => ({
      topic: p.topic,
      language: p.language,
      masteryScore: p.masteryScore,
    }));

  // 5. Today's quiz status
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayAttempt = await QuizAttempt.findOne({
    studentId: studentObjectId,
    completedAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ completedAt: -1 });

  const todayQuiz = await Quiz.findOne({
    $or: [
      { studentId: studentObjectId, createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { targetDate: { $gte: startOfDay, $lte: endOfDay } },
    ],
  }).sort({ createdAt: -1 });

  const todayQuizStatus = {
    available: !!todayQuiz,
    quizId: todayQuiz ? todayQuiz._id : null,
    completed: !!todayAttempt,
    score: todayAttempt ? todayAttempt.score : null,
  };

  return {
    enrolledClassesCount: enrolledClasses.length,
    activeAssignmentsCount,
    totalSubmissions,
    averageScore,
    todayQuizStatus,
    weakTopics,
    strongTopics,
    recentSubmissions,
  };
};

const getStudentProgress = async ({ studentId, language }) => {
  const query = { studentId };
  if (language) {
    query.language = language.toLowerCase();
  }

  const records = await Progress.find(query).sort({ masteryScore: 1 });

  // Group by language
  const languageGroups = {};
  for (const r of records) {
    const lang = r.language || "unknown";
    if (!languageGroups[lang]) {
      languageGroups[lang] = {
        language: lang,
        topics: [],
        averageMastery: 0,
        weakTopics: [],
        strongTopics: [],
      };
    }
    languageGroups[lang].topics.push({
      topic: r.topic,
      masteryScore: r.masteryScore,
      assignmentScore: r.assignmentScore,
      quizScore: r.quizScore,
      attempts: r.attempts,
      mistakes: r.mistakes,
      lastPracticedAt: r.lastPracticedAt,
    });
    if (r.masteryScore < 60) {
      languageGroups[lang].weakTopics.push(r.topic);
    } else if (r.masteryScore >= 80) {
      languageGroups[lang].strongTopics.push(r.topic);
    }
  }

  // Calculate averages
  for (const lang of Object.keys(languageGroups)) {
    const topics = languageGroups[lang].topics;
    const sum = topics.reduce((acc, t) => acc + t.masteryScore, 0);
    languageGroups[lang].averageMastery =
      topics.length > 0 ? Math.round(sum / topics.length) : 0;
  }

  return {
    languages: Object.values(languageGroups),
    overallTopicCount: records.length,
  };
};

const getStudentTopics = async ({ studentId, language }) => {
  const query = { studentId };
  if (language) {
    query.language = language.toLowerCase();
  }

  const topics = await Progress.find(query).sort({ masteryScore: 1 });
  return topics;
};

const getStudentLearningPath = async ({ studentId, language }) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // 1. Check for cached learning path within last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cachedAnalysis = await AIAnalysis.findOne({
    studentId: studentObjectId,
    type: "LEARNING_PATH",
    createdAt: { $gte: oneDayAgo },
  }).sort({ createdAt: -1 });

  if (cachedAnalysis) {
    return cachedAnalysis.result;
  }

  // 2. Fetch progress data for AI
  const progressQuery = { studentId: studentObjectId };
  if (language) {
    progressQuery.language = language.toLowerCase();
  }
  const progressRecords = await Progress.find(progressQuery).sort({
    masteryScore: 1,
  });

  const mastery = progressRecords.map((p) => ({
    topic: p.topic,
    score: p.masteryScore,
  }));
  const weakTopics = progressRecords
    .filter((p) => p.masteryScore < 60)
    .map((p) => p.topic);

  // 3. Request AI Service
  let aiResult = null;
  try {
    aiResult = await generateLearningPath({
      studentId: studentId.toString(),
      language: language || "python",
      mastery,
      weakTopics,
    });
  } catch (error) {
    console.error("AI learning path generation failed:", error.message);
    const err = new Error("AI service unavailable: Failed to generate learning path");
    err.statusCode = 503;
    throw err;
  }

  // 4. Save to AIAnalysis collection
  await AIAnalysis.create({
    studentId: studentObjectId,
    type: "LEARNING_PATH",
    inputReference: studentId.toString(),
    result: aiResult,
    model: aiResult.model || "gemini-1.5-flash",
    promptVersion: aiResult.promptVersion || "1.0",
  });

  return aiResult;
};

module.exports = {
  getStudentDashboard,
  getStudentProgress,
  getStudentTopics,
  getStudentLearningPath,
};
