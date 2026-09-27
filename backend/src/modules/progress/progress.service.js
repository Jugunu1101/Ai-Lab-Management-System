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
  const topicList = (Array.isArray(topics) && topics.length > 0)
    ? topics
    : [typeof topics === "string" && topics.trim() ? topics.trim() : "basics"];

  const normalizedLang = (language || "").toLowerCase().trim();
  const updatedProgress = [];

  for (const topic of topicList) {
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

const syncStudentProgressFromDatabase = async ({ studentId, classId, language }) => {
  const mongoose = require("mongoose");
  const Class = require("../classes/class.model");
  const Assignment = require("../assignments/assignment.model");
  const Submission = require("../submissions/submission.model");
  const Quiz = require("../quizzes/quiz.model");
  const QuizAttempt = require("../quizzes/quizAttempt.model");

  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const isClassScoped = !!(classId && classId !== "all");

  let enrolledClassIds = [];

  // 1. Determine enrolled classes and validate authorization
  if (isClassScoped) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      const error = new Error("Invalid class ID");
      error.statusCode = 400;
      error.code = "INVALID_CLASS_ID";
      throw error;
    }

    const targetClass = await Class.findById(classId).select("_id name students").lean();
    if (!targetClass) {
      const error = new Error("Class not found");
      error.statusCode = 404;
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }

    const isEnrolled = (targetClass.students || []).some(
      (s) => s.toString() === studentObjectId.toString()
    );
    if (!isEnrolled) {
      const error = new Error("You are not enrolled in this classroom");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    enrolledClassIds = [targetClass._id];
  } else {
    const enrolledClasses = await Class.find({
      $or: [
        { students: studentId },
        { students: studentObjectId },
        { students: { $in: [studentId, studentObjectId] } },
      ],
    }).select("_id name").lean();
    enrolledClassIds = enrolledClasses.map((c) => c._id);
  }

  // If student is not enrolled in any class, or empty classroom scope
  if (enrolledClassIds.length === 0) {
    return {
      topics: [],
      classroomAverage: 0,
      avgScore: 0,
      strongCount: 0,
      needsImpCount: 0,
      weakCount: 0,
      hasData: false,
    };
  }

  // 2. Fetch assignments belonging to these enrolled classes
  const assignmentQuery = { classId: { $in: enrolledClassIds } };
  if (language) {
    assignmentQuery.language = language.toLowerCase();
  }
  const assignments = await Assignment.find(assignmentQuery).lean();

  // If no assignments exist in the selected classroom scope, return empty state
  if (assignments.length === 0) {
    return {
      topics: [],
      classroomAverage: 0,
      avgScore: 0,
      strongCount: 0,
      needsImpCount: 0,
      weakCount: 0,
      hasData: false,
    };
  }

  const assignMap = new Map();
  const assignmentIds = [];
  const topicSet = new Set();

  for (const a of assignments) {
    assignMap.set(a._id.toString(), a);
    assignmentIds.push(a._id);

    const topics = (a.topics && a.topics.length > 0)
      ? a.topics
      : [a.topic || "basics"];

    for (const t of topics) {
      if (t && t.trim()) {
        topicSet.add(t.toLowerCase().trim());
      }
    }
  }

  // 3. Fetch submissions strictly scoped to these assignments and student
  const submissions = await Submission.find({
    userId: studentObjectId,
    assignmentId: { $in: assignmentIds },
  }).sort({ createdAt: -1 }).lean();

  // Map submissions to topics
  const subsByTopic = new Map();
  for (const s of submissions) {
    const a = assignMap.get(s.assignmentId?.toString());
    const topics = (a?.topics && a.topics.length > 0)
      ? a.topics
      : [a?.topic || "basics"];

    for (const t of topics) {
      const cleanT = t.toLowerCase().trim();
      if (topicSet.has(cleanT)) {
        if (!subsByTopic.has(cleanT)) subsByTopic.set(cleanT, []);
        subsByTopic.get(cleanT).push(s);
      }
    }
  }

  // 4. Fetch quiz attempts by this student and map only to this scope's topics
  const quizAttempts = await QuizAttempt.find({ studentId: studentObjectId })
    .populate("quizId")
    .sort({ createdAt: -1 })
    .lean();

  const quizzesByTopic = new Map();
  for (const qa of quizAttempts) {
    const quiz = qa.quizId;
    if (!quiz) continue;

    if (language && quiz.language && quiz.language.toLowerCase() !== language.toLowerCase()) {
      continue;
    }

    const qTopics = (quiz.topics && quiz.topics.length > 0)
      ? quiz.topics
      : [quiz.topic || "basics"];

    for (const qt of qTopics) {
      const cleanT = qt.toLowerCase().trim();
      if (topicSet.has(cleanT)) {
        if (!quizzesByTopic.has(cleanT)) quizzesByTopic.set(cleanT, []);
        quizzesByTopic.get(cleanT).push(qa);
      }
    }
  }

  // 5. Compute metrics for each topic in this classroom scope
  const topicResults = [];

  for (const topic of topicSet) {
    const topicSubs = subsByTopic.get(topic) || [];
    const topicQuizzes = quizzesByTopic.get(topic) || [];

    // Assignment Score: Average of the student's highest score on each assignment for this topic
    let assignmentScore = 0;
    if (topicSubs.length > 0) {
      const bestScores = new Map();
      topicSubs.forEach((s) => {
        const aid = s.assignmentId.toString();
        const curBest = bestScores.get(aid) || 0;
        if ((s.score || 0) > curBest) bestScores.set(aid, s.score || 0);
      });
      const scoreValues = Array.from(bestScores.values());
      assignmentScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
        : 0;
    }

    // Quiz Score: Average of completed quiz attempt scores for this topic
    let quizScore = 0;
    if (topicQuizzes.length > 0) {
      const qScores = topicQuizzes.map((q) => q.score || 0);
      quizScore = Math.round(qScores.reduce((a, b) => a + b, 0) / qScores.length);
    }

    // Submissions count & success rate
    const totalSubmissions = topicSubs.length;
    const successfulSubmissions = topicSubs.filter((s) => s.status === "PASSED").length;
    const submissionSuccessRate = totalSubmissions > 0
      ? Math.round((successfulSubmissions / totalSubmissions) * 100)
      : 0;

    // Mistakes & attempts
    const attempts = totalSubmissions;
    const mistakes = topicSubs.reduce((sum, s) => {
      const failed = (s.testResults || []).filter((tr) => !tr.passed).length;
      return sum + failed;
    }, 0);

    const lastPracticedAt = topicSubs[0]?.submittedAt ||
      topicSubs[0]?.createdAt ||
      topicQuizzes[0]?.completedAt ||
      topicQuizzes[0]?.createdAt ||
      new Date();

    // 5-Factor Hybrid Topic Mastery Formula (unchanged weights & algorithm)
    const masteryScore = calculateTopicMastery({
      assignmentScore,
      quizScore,
      successfulSubmissions,
      totalSubmissions,
      attempts: Math.max(1, attempts),
      mistakes,
      lastPracticedAt,
    });

    const statusCategory = masteryScore >= 70 ? "Good Mastery" : masteryScore >= 50 ? "Needs Practice" : "Weak Topic";

    // Only update global database Progress records when unscoped (overall progress across classes)
    if (!isClassScoped) {
      try {
        const normalizedLang = language || topicSubs[0]?.language || "cpp";
        let progressDoc = await Progress.findOne({
          studentId: studentObjectId,
          language: normalizedLang.toLowerCase(),
          topic,
        });

        if (!progressDoc) {
          progressDoc = new Progress({
            studentId: studentObjectId,
            language: normalizedLang.toLowerCase(),
            topic,
          });
        }

        progressDoc.assignmentScore = assignmentScore;
        progressDoc.quizScore = quizScore;
        progressDoc.totalSubmissions = totalSubmissions;
        progressDoc.successfulSubmissions = successfulSubmissions;
        progressDoc.submissionSuccessRate = submissionSuccessRate;
        progressDoc.submissionSuccess = successfulSubmissions > 0;
        progressDoc.attempts = attempts;
        progressDoc.mistakes = mistakes;
        progressDoc.lastPracticedAt = lastPracticedAt;
        progressDoc.masteryScore = masteryScore;
        await progressDoc.save();
      } catch (saveErr) {
        // Non-blocking save
      }
    }

    topicResults.push({
      topic,
      masteryScore,
      score: masteryScore,
      assignmentScore,
      quizScore,
      submissionSuccessRate,
      practiceCount: attempts,
      attempts,
      mistakes,
      status: statusCategory,
      lastPracticedAt,
    });
  }

  // Sort ascending by masteryScore (weakest first)
  topicResults.sort((a, b) => a.masteryScore - b.masteryScore);

  const totalScore = topicResults.reduce((acc, t) => acc + t.masteryScore, 0);
  const classroomAverage = topicResults.length > 0 ? Math.round(totalScore / topicResults.length) : 0;
  const strongCount = topicResults.filter((t) => t.masteryScore >= 70).length;
  const needsImpCount = topicResults.filter((t) => t.masteryScore >= 50 && t.masteryScore < 70).length;
  const weakCount = topicResults.filter((t) => t.masteryScore < 50).length;

  return {
    topics: topicResults,
    classroomAverage,
    avgScore: classroomAverage,
    strongCount,
    needsImpCount,
    weakCount,
    hasData: topicResults.length > 0,
  };
};

module.exports = {
  calculateTopicMastery,
  updateProgressFromSubmission,
  updateProgressFromQuiz,
  getStudentProgress,
  getWeakTopics,
  syncStudentProgressFromDatabase,
};
