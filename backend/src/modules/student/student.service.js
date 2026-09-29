const mongoose = require("mongoose");
const Class = require("../classes/class.model");
const Assignment = require("../assignments/assignment.model");
const Submission = require("../submissions/submission.model");
const Progress = require("../progress/progress.model");
const Quiz = require("../quizzes/quiz.model");
const QuizAttempt = require("../quizzes/quizAttempt.model");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const { generateLearningPath } = require("../../services/ai/ai.service");
const { getRedisConnection } = require("../../config/redis");

// In-flight SingleFlight request deduplication map
const inFlightDashboards = new Map();
const DASHBOARD_CACHE_TTL_SEC = 20;

const invalidateStudentDashboardCache = async (studentId) => {
  try {
    const redis = getRedisConnection();
    if (redis && redis.status === "ready") {
      await redis.del(`student:dashboard:${studentId}`);
    }
  } catch (err) {
    // Non-blocking fail-safe
  }
};


const getStudentDashboard = async ({ studentId }) => {
  const cacheKey = `student:dashboard:${studentId}`;

  // 1. Check Redis Cache
  try {
    const redis = getRedisConnection();
    if (redis && redis.status === "ready") {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (err) {
    // Transparent fallback to database
  }

  // 2. SingleFlight Deduplication: Coalesce concurrent requests for the same student
  if (inFlightDashboards.has(studentId)) {
    return inFlightDashboards.get(studentId);
  }

  const computePromise = (async () => {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Wave 1: Execute optimized, lean, projected independent queries concurrently
    const [
      enrolledClasses,
      submissionStatsResult,
      recentSubmissions,
      progressRecords,
      todayAttempt,
      todayQuiz,
      aiAssignment,
    ] = await Promise.all([
      Class.find({
        $or: [
          { students: studentId },
          { students: studentObjectId },
          { students: { $in: [studentId, studentObjectId] } },
        ],
      })
        .select("_id")
        .lean(),
      // 2. Combined total submissions count & average score in single aggregation
      Submission.aggregate([
        { $match: { userId: studentObjectId } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            avgScore: { $avg: "$score" },
          },
        },
      ]),
      // 3. Recent submissions (tight field projection)
      Submission.find({ userId: studentObjectId })
        .select("_id score status createdAt assignmentId attemptNumber")
        .populate("assignmentId", "title language difficulty topics")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // 4. Progress records (tight field projection, uses compound index)
      Progress.find({ studentId: studentObjectId })
        .select("topic language masteryScore")
        .sort({ masteryScore: 1 })
        .lean(),
      // 5. Today's quiz attempt (uses compound index)
      QuizAttempt.findOne({
        studentId: studentObjectId,
        $or: [
          { completedAt: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        ],
      })
        .select("score completedAt")
        .sort({ completedAt: -1, createdAt: -1 })
        .lean(),
      // 6. Today's quiz existence check
      Quiz.findOne({
        $or: [
          { studentId: studentObjectId, createdAt: { $gte: startOfDay, $lte: endOfDay } },
          { targetDate: { $gte: startOfDay, $lte: endOfDay } },
        ],
      })
        .select("_id")
        .sort({ createdAt: -1 })
        .lean(),
      // 7. Pending AI recommended assignment
      Assignment.findOne({
        assignedTo: studentObjectId,
        source: { $in: ["AI_AGENT", "AI_GENERATED"] },
      })
        .select("title description topics language difficulty agentReason")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const classIds = enrolledClasses.map((c) => c._id);
    const now = new Date();

    // Wave 2: Run dependent queries in parallel
    const [activeAssignmentsCount, aiPassedSubmission] = await Promise.all([
      classIds.length > 0
        ? Assignment.countDocuments({
            classId: { $in: classIds },
            $or: [{ deadline: null }, { deadline: { $gt: now } }],
          })
        : 0,
      aiAssignment
        ? Submission.findOne({
            userId: studentObjectId,
            assignmentId: aiAssignment._id,
            status: "PASSED",
          })
            .select("_id")
            .lean()
        : null,
    ]);

    const subStats = submissionStatsResult[0] || {};
    const totalSubmissions = subStats.totalSubmissions || 0;
    const avgSubmissionScore = subStats.avgScore !== undefined && subStats.avgScore !== null
      ? Math.round(subStats.avgScore)
      : 0;

    // Calculate actual overall mastery from student's topic progress records
    let overallMastery = 0;
    if (progressRecords && progressRecords.length > 0) {
      const totalMastery = progressRecords.reduce((sum, p) => sum + (p.masteryScore || 0), 0);
      overallMastery = Math.round(totalMastery / progressRecords.length);
    } else if (totalSubmissions > 0) {
      overallMastery = avgSubmissionScore;
    }

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

    const todayQuizStatus = {
      available: !!todayQuiz,
      quizId: todayQuiz ? todayQuiz._id : null,
      completed: !!todayAttempt,
      score: todayAttempt ? todayAttempt.score : null,
    };

    let aiRecommendedAssignment = null;
    if (aiAssignment && !aiPassedSubmission) {
      aiRecommendedAssignment = {
        _id: aiAssignment._id,
        title: aiAssignment.title,
        description: aiAssignment.description,
        topic: aiAssignment.topics?.[0] || "Practice",
        topics: aiAssignment.topics || [],
        language: aiAssignment.language,
        difficulty: aiAssignment.difficulty,
        agentReason: aiAssignment.agentReason,
      };
    }

    const dashboardPayload = {
      enrolledClassesCount: enrolledClasses.length,
      activeAssignmentsCount,
      totalSubmissions,
      averageScore: overallMastery > 0 ? overallMastery : avgSubmissionScore,
      overallMastery,
      todayQuizStatus,
      weakTopics,
      strongTopics,
      recentSubmissions,
      aiRecommendedAssignment,
    };

    // Store in Redis with safe short TTL
    try {
      const redis = getRedisConnection();
      if (redis && redis.status === "ready") {
        await redis.setex(cacheKey, DASHBOARD_CACHE_TTL_SEC, JSON.stringify(dashboardPayload));
      }
    } catch (err) {
      // Non-blocking
    }

    return dashboardPayload;
  })();

  inFlightDashboards.set(studentId, computePromise);
  try {
    return await computePromise;
  } finally {
    inFlightDashboards.delete(studentId);
  }
};

const getStudentProgress = async ({ studentId, language }) => {
  const query = { studentId };
  if (language) {
    query.language = language.toLowerCase();
  }

  const records = await Progress.find(query)
    .select("language topic masteryScore assignmentScore quizScore attempts mistakes lastPracticedAt")
    .sort({ masteryScore: 1 })
    .lean();

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

const { syncStudentProgressFromDatabase } = require("../progress/progress.service");

const getStudentTopics = async ({ studentId, classId, language }) => {
  const result = await syncStudentProgressFromDatabase({ studentId, classId, language });
  return result;
};

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const inFlightLearningPaths = new Map();

const buildFallbackLearningPath = (weakTopics, language) => {
  const defaultTopics = weakTopics && weakTopics.length > 0 ? weakTopics : ["basics", "logic", "syntax", "loops", "arrays", "functions"];
  const steps = defaultTopics.slice(0, 6).map((topic, idx) => ({
    step: idx + 1,
    topic,
    priority: idx < 2 ? "HIGH" : "MEDIUM",
    estimatedTime: "45m",
    objective: `Master core principles and common patterns for ${topic}.`,
    suggestedActivity: `Solve targeted practice problems and quizzes on ${topic}.`,
    status: idx === 0 ? "IN_PROGRESS" : "PENDING",
  }));

  return {
    targetFocus: defaultTopics.slice(0, 3),
    recommendedNextStep: `Practice ${defaultTopics[0]}`,
    agentReason: `Structured roadmap focusing on ${defaultTopics.slice(0, 3).join(", ")} to improve overall code quality and test pass rates.`,
    steps,
    model: "system-heuristic",
    promptVersion: "1.0",
  };
};

const getStudentLearningPath = async ({ studentId, language }) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const progressQuery = { studentId: studentObjectId };
  if (language) {
    progressQuery.language = language.toLowerCase();
  }

  // 1. Run all independent queries in parallel
  const [
    progressRecords,
    todayDailyQuiz,
    todayAttempt,
    enrolledClasses,
    cachedAnalysis,
    pendingAIAssignment,
  ] = await Promise.all([
    Progress.find(progressQuery).sort({ masteryScore: 1 }).lean(),
    Quiz.findOne({
      studentId: studentObjectId,
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { targetDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .select("_id")
      .sort({ createdAt: -1 })
      .lean(),
    QuizAttempt.findOne({
      studentId: studentObjectId,
      $or: [
        { completedAt: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .select("_id score completedAt")
      .sort({ completedAt: -1, createdAt: -1 })
      .lean(),
    Class.find({
      $or: [
        { students: studentId },
        { students: studentObjectId },
        { students: { $in: [studentId, studentObjectId] } },
      ],
    }).select("_id").lean(),
    AIAnalysis.findOne({
      studentId: studentObjectId,
      type: "LEARNING_PATH",
      createdAt: { $gte: oneDayAgo },
    }).sort({ createdAt: -1 }).lean(),
    Assignment.findOne({
      assignedTo: studentObjectId,
      source: { $in: ["AI_AGENT", "AI_GENERATED"] },
    }).sort({ createdAt: -1 }).lean(),
  ]);

  const classIds = enrolledClasses.map((c) => c._id);

  // 2. Run dependent queries in parallel
  const [todayDailyAttempt, activeAssignment, passedSub] = await Promise.all([
    todayDailyQuiz
      ? QuizAttempt.findOne({
          studentId: studentObjectId,
          quizId: todayDailyQuiz._id,
        }).select("_id").lean()
      : null,
    classIds.length > 0
      ? Assignment.findOne({
          classId: { $in: classIds },
          $or: [{ deadline: null }, { deadline: { $gt: new Date() } }],
        }).select("title").lean()
      : null,
    pendingAIAssignment
      ? Submission.findOne({
          userId: studentObjectId,
          assignmentId: pendingAIAssignment._id,
          status: "PASSED",
        }).select("_id").lean()
      : null,
  ]);

  const hasCompletedDailyQuiz = Boolean(todayAttempt || todayDailyAttempt);

  const mastery = progressRecords.map((p) => ({
    topic: p.topic,
    score: p.masteryScore,
  }));
  const weakTopics = progressRecords
    .filter((p) => p.masteryScore < 60)
    .map((p) => p.topic);
  // 3. Determine AI analysis or generate new with SingleFlight deduplication
  let aiResult = null;
  if (
    cachedAnalysis &&
    cachedAnalysis.result &&
    Array.isArray(cachedAnalysis.result.steps) &&
    cachedAnalysis.result.steps.length > 0
  ) {
    aiResult = JSON.parse(JSON.stringify(cachedAnalysis.result));
  } else {
    const studentKey = studentId.toString();
    if (inFlightLearningPaths.has(studentKey)) {
      aiResult = await inFlightLearningPaths.get(studentKey);
    } else {
      const fetchPromise = (async () => {
        try {
          const generated = await generateLearningPath({
            studentId: studentKey,
            language: language || "python",
            mastery,
            weakTopics: weakTopics.length > 0 ? weakTopics : (progressRecords.length > 0 ? progressRecords.map(p => p.topic) : ["basics", "logic", "syntax"]),
          });

          await AIAnalysis.create({
            studentId: studentObjectId,
            type: "LEARNING_PATH",
            inputReference: studentKey,
            result: generated,
            model: generated.model || "gemini-1.5-flash",
            promptVersion: generated.promptVersion || "1.0",
          }).catch(() => {});

          return generated;
        } catch (error) {
          console.warn("AI learning path generation fallback:", error.message);
          const fallback = buildFallbackLearningPath(weakTopics, language);
          await AIAnalysis.create({
            studentId: studentObjectId,
            type: "LEARNING_PATH",
            inputReference: studentKey,
            result: fallback,
            model: "system-heuristic",
            promptVersion: "1.0",
          }).catch(() => {});
          return fallback;
        }
      })();

      inFlightLearningPaths.set(studentKey, fetchPromise);
      try {
        aiResult = await fetchPromise;
      } finally {
        inFlightLearningPaths.delete(studentKey);
      }
    }
  }

  // 4. Re-align steps with current topic mastery from DB
  let inProgressFound = false;
  let activeStepTopic = null;
  let activeStepProg = null;

  const CURRICULUM_ORDER = [
    "basics",
    "syntax",
    "variables",
    "conditionals",
    "logic",
    "loops",
    "arrays",
    "functions",
    "recursion",
  ];

  const getTopicOrder = (topic) => {
    const idx = CURRICULUM_ORDER.indexOf(topic.toLowerCase());
    return idx >= 0 ? idx : 99;
  };

  if (Array.isArray(aiResult.steps)) {
    // 1. Ensure all progress records exist in steps
    const existingTopics = new Set(aiResult.steps.map((s) => s.topic.toLowerCase()));
    for (const prog of progressRecords) {
      if (!existingTopics.has(prog.topic.toLowerCase())) {
        aiResult.steps.push({
          step: aiResult.steps.length + 1,
          topic: prog.topic,
          priority: prog.masteryScore < 60 ? "HIGH" : "LOW",
          estimatedTime: "30m",
          objective: `Master core principles and common patterns for ${prog.topic}.`,
          suggestedActivity: `Solve targeted practice problems and quizzes on ${prog.topic}.`,
          status: prog.masteryScore >= 60 ? "COMPLETED" : "PENDING",
          masteryScore: prog.masteryScore,
        });
        existingTopics.add(prog.topic.toLowerCase());
      }
    }

    // 2. Attach mastery scores and determine status
    aiResult.steps = aiResult.steps.map((step) => {
      const prog = progressRecords.find(
        (p) => p.topic.toLowerCase() === step.topic.toLowerCase()
      );
      const score = prog ? prog.masteryScore : (step.masteryScore || 0);
      step.masteryScore = score;
      if (score >= 60) {
        step.status = "COMPLETED";
      }
      return step;
    });

    // 3. Sort steps logically: COMPLETED first (by curriculum order), then IN_PROGRESS / PENDING (by curriculum order)
    aiResult.steps.sort((a, b) => {
      const aCompleted = a.status === "COMPLETED";
      const bCompleted = b.status === "COMPLETED";
      if (aCompleted && !bCompleted) return -1;
      if (!aCompleted && bCompleted) return 1;
      return getTopicOrder(a.topic) - getTopicOrder(b.topic);
    });

    // 4. Assign IN_PROGRESS to the first unmastered step and PENDING to subsequent
    aiResult.steps = aiResult.steps.map((step, idx) => {
      step.step = idx + 1;
      if (step.status !== "COMPLETED") {
        if (!inProgressFound) {
          step.status = "IN_PROGRESS";
          inProgressFound = true;
          activeStepTopic = step.topic;
          activeStepProg = progressRecords.find(
            (p) => p.topic.toLowerCase() === step.topic.toLowerCase()
          );
        } else {
          step.status = "PENDING";
        }
      }
      return step;
    });
  }

  // Update target focus based on remaining unmastered topics
  const remainingWeak = progressRecords.filter((p) => p.masteryScore < 60).map((p) => p.topic);
  aiResult.targetFocus = remainingWeak.length > 0 ? remainingWeak : (activeStepTopic ? [activeStepTopic] : (progressRecords.length > 0 ? [progressRecords[0].topic] : ["basics"]));

  // 5. Check for pending AI recommended assignment
  if (pendingAIAssignment && !passedSub) {
    aiResult.aiRecommendedAssignment = {
      _id: pendingAIAssignment._id,
      title: pendingAIAssignment.title,
      description: pendingAIAssignment.description,
      topic: pendingAIAssignment.topics?.[0] || activeStepTopic || "Practice",
      topics: pendingAIAssignment.topics || [],
      language: pendingAIAssignment.language,
      difficulty: pendingAIAssignment.difficulty,
      agentReason: pendingAIAssignment.agentReason,
    };
  }

  // 7. Compute dynamic nextActivity
  let nextActivity = null;

  const actLang = language || activeStepProg?.language || (progressRecords.length > 0 ? progressRecords[0].language : null);

  if (aiResult.aiRecommendedAssignment) {
    const aiAssign = aiResult.aiRecommendedAssignment;
    nextActivity = {
      type: "AI_RECOMMENDED_ASSIGNMENT",
      title: aiAssign.title,
      actionText: "Start AI Practice",
      topic: aiAssign.topic,
      targetUrl: `/student/assignments/${aiAssign._id}`,
      reason: aiAssign.agentReason || `AI detected a weakness in ${aiAssign.topic} and created a personalized coding practice assignment for you.`,
      assignmentId: aiAssign._id.toString(),
    };
  } else if (!hasCompletedDailyQuiz) {
    nextActivity = {
      type: "DAILY_QUIZ",
      title: "Daily AI Quiz",
      actionText: "Start Daily Quiz",
      topic: activeStepTopic || "basics",
      targetUrl: `/student/quiz${actLang ? `?language=${encodeURIComponent(actLang)}` : ''}`,
      reason: "Complete today's 10-question Daily Quiz to evaluate your progress and update topic mastery.",
    };
  } else if (activeStepTopic) {
    const isRevision = activeStepProg && ((activeStepProg.mistakes || 0) >= 3 || (activeStepProg.attempts || 0) >= 4);
    const actionVerb = isRevision ? "Revise" : "Practice";
    const title = `${actionVerb} ${capitalize(activeStepTopic)}`;

    nextActivity = {
      type: isRevision ? "REVISION" : "AI_PRACTICE",
      title,
      actionText: title,
      topic: activeStepTopic,
      targetUrl: `/student/quiz?practice=true&topic=${encodeURIComponent(activeStepTopic)}${actLang ? `&language=${encodeURIComponent(actLang)}` : ''}`,
      reason: isRevision
        ? `Repeated challenges detected on ${activeStepTopic}. Complete 10-question targeted revision.`
        : `Targeted 10-question AI practice to boost your ${activeStepTopic} mastery above 60%.`,
    };
  } else if (activeAssignment) {
    nextActivity = {
      type: "TEACHER_ASSIGNMENT",
      title: activeAssignment.title || "Teacher Assignment",
      actionText: "View Assignment",
      topic: "assignment",
      targetUrl: "/student/assignments",
      reason: "All current topics are mastered! Continue with your class assignments.",
    };
  } else {
    nextActivity = {
      type: "CODING_PRACTICE",
      title: "Coding Practice",
      actionText: "Start Coding Practice",
      topic: "general",
      targetUrl: "/student/assignments",
      reason: "All current topics are mastered! Explore open problem sets to build expertise.",
    };
  }

  aiResult.nextActivity = nextActivity;
  return aiResult;
};

module.exports = {
  getStudentDashboard,
  getStudentProgress,
  getStudentTopics,
  getStudentLearningPath,
  invalidateStudentDashboardCache,
};
