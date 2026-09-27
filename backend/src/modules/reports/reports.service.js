const {
  getStudentAnalytics,
  getClassAnalytics,
  getClassTopicAnalytics,
} = require("../analytics/analytics.service");
const Progress = require("../progress/progress.model");
const Class = require("../classes/class.model");
const Assignment = require("../assignments/assignment.model");
const Submission = require("../submissions/submission.model");
const QuizAttempt = require("../quizzes/quizAttempt.model");
const User = require("../users/user.model");
const WeeklyReport = require("./weeklyReport.model");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const { generateWeeklyReport } = require("../../services/ai/ai.service");
const { enqueueWeeklyReport } = require("../../queues/report.queue");

const resolveClass = async (classId, populateOptions = null) => {
  const mongoose = require("mongoose");
  let query;
  if (mongoose.Types.ObjectId.isValid(classId)) {
    query = Class.findById(classId);
  } else {
    query = Class.findOne({ $or: [{ code: classId }, { name: classId }] });
  }
  if (populateOptions) {
    query = query.populate(populateOptions);
  }
  return query;
};

const formatWeeklyReport = (report) => {
  if (!report) return null;
  const doc = report.toObject ? report.toObject() : report;

  const strongConcepts = doc.strongConcepts && doc.strongConcepts.length > 0
    ? doc.strongConcepts
    : (doc.strongTopics || []).map((t) => ({ topic: t, score: 75 }));

  const vulnerableConcepts = doc.vulnerableConcepts && doc.vulnerableConcepts.length > 0
    ? doc.vulnerableConcepts
    : (doc.weakTopics || []).map((t) => ({ topic: t, score: 45 }));

  const studentsAttention = (doc.studentsNeedingAttention || doc.studentsNeedingIntervention || []).map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName || s.name || "Student",
    name: s.studentName || s.name || "Student",
    reason: s.reason || (Array.isArray(s.reasons) ? s.reasons.join("; ") : ""),
    reasons: Array.isArray(s.reasons) && s.reasons.length > 0 ? s.reasons : (s.reason ? [s.reason] : []),
    score: s.score !== undefined ? s.score : null,
  }));

  return {
    _id: doc._id,
    classId: doc.classId,
    className: doc.className || "",
    weekStart: doc.weekStart,
    weekEnd: doc.weekEnd,
    period: {
      start: doc.weekStart,
      end: doc.weekEnd,
    },
    statistics: doc.statistics || {
      totalStudents: 0,
      activeStudents: 0,
      totalSubmissions: 0,
      averageScore: 0,
      medianScore: 0,
    },
    strongConcepts,
    vulnerableConcepts,
    strongTopics: doc.strongTopics || strongConcepts.map((c) => c.topic),
    weakTopics: doc.weakTopics || vulnerableConcepts.map((c) => c.topic),
    studentsNeedingAttention: studentsAttention,
    studentsNeedingIntervention: studentsAttention,
    summary: doc.summary,
    aiReport: {
      executiveSummary: doc.summary,
      recommendations: doc.recommendations || [],
    },
    recommendations: doc.recommendations || [],
    diagnostics: doc.diagnostics || {
      classId: doc.classId ? doc.classId.toString() : "",
      className: doc.className || "",
      studentCount: doc.statistics?.totalStudents || 0,
      assignmentCount: 0,
      submissionCount: doc.statistics?.totalSubmissions || 0,
      weeklySubmissionCount: doc.statistics?.totalSubmissions || 0,
      quizAttemptCount: 0,
      dateStart: doc.weekStart ? doc.weekStart.toISOString() : "",
      dateEnd: doc.weekEnd ? doc.weekEnd.toISOString() : "",
    },
    model: doc.model,
    promptVersion: doc.promptVersion,
    generatedBy: doc.generatedBy,
    createdAt: doc.createdAt,
  };
};

const getStudentReport = async ({ studentId }) => {
  const [analytics, progress] = await Promise.all([
    getStudentAnalytics({ studentId }),
    Progress.find({ studentId })
      .select(
        "language topic assignmentScore quizScore masteryScore lastPracticedAt"
      )
      .sort({ masteryScore: -1 }),
  ]);

  return {
    summary: {
      totalAssignments: analytics.totalAssignments,
      averageAssignmentScore: analytics.averageAssignmentScore,
      totalQuizzes: analytics.totalQuizzes,
      averageQuizScore: analytics.averageQuizScore,
      averageMasteryScore: analytics.averageMasteryScore,
    },
    topicPerformance: progress.map((item) => ({
      language: item.language,
      topic: item.topic,
      assignmentScore: item.assignmentScore,
      quizScore: item.quizScore,
      masteryScore: item.masteryScore,
      lastPracticedAt: item.lastPracticedAt,
    })),
    weakTopics: analytics.weakTopics,
  };
};

const getClassReport = async ({ classId, teacherId }) => {
  const [analytics, topicAnalytics] = await Promise.all([
    getClassAnalytics({
      classId,
      teacherId,
    }),
    getClassTopicAnalytics({
      classId,
      teacherId,
    }),
  ]);

  return {
    summary: {
      studentCount: analytics.studentCount,
      assignmentCount: analytics.assignmentCount,
      submissionCount: analytics.submissionCount,
      averageScore: analytics.averageScore,
      completionRate: analytics.completionRate,
    },
    topicPerformance: topicAnalytics.topics,
    weakTopics: topicAnalytics.weakTopics,
  };
};

const getWeeklyReportsByClass = async ({ classId, teacherId, userRole }) => {
  const classData = await resolveClass(classId);
  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId ? classData.teacherId.toString() : null;
  if (userRole !== "ADMIN" && (!ownerId || ownerId !== (teacherId ? teacherId.toString() : ""))) {
    const error = new Error("You do not have access to this class reports");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const reports = await WeeklyReport.find({ classId: classData._id }).sort({ createdAt: -1 });
  return reports.map(formatWeeklyReport);
};

const getLatestWeeklyReport = async ({ classId, teacherId, userRole }) => {
  const classData = await resolveClass(classId);
  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId ? classData.teacherId.toString() : null;
  if (userRole !== "ADMIN" && (!ownerId || ownerId !== (teacherId ? teacherId.toString() : ""))) {
    const error = new Error("You do not have access to this class reports");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const report = await WeeklyReport.findOne({ classId: classData._id }).sort({ createdAt: -1 });
  return formatWeeklyReport(report);
};

/**
 * Authoritative aggregation and report synthesis
 */
const generateWeeklyReportData = async ({
  classId,
  teacherId,
  userRole,
  startDate,
  endDate,
}) => {
  const classData = await resolveClass(classId, {
    path: "students",
    select: "name email collegeId department",
  });

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const ownerId = classData.teacherId ? classData.teacherId.toString() : null;
  if (userRole !== "ADMIN" && (!ownerId || ownerId !== (teacherId ? teacherId.toString() : ""))) {
    const error = new Error(
      "You do not have access to generate reports for this class"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const realClassId = classData._id;

  // 1. Calculate and normalize week boundaries
  let weekStart;
  let weekEnd;

  if (startDate) {
    weekStart = new Date(startDate);
    if (!isNaN(weekStart.getTime())) {
      if (typeof startDate === "string" && !startDate.includes("T")) {
        weekStart.setUTCHours(0, 0, 0, 0);
      }
    }
  }

  if (endDate) {
    weekEnd = new Date(endDate);
    if (!isNaN(weekEnd.getTime())) {
      if (typeof endDate === "string" && !endDate.includes("T")) {
        weekEnd.setUTCHours(23, 59, 59, 999);
      } else if (
        weekEnd.getUTCHours() === 0 &&
        weekEnd.getUTCMinutes() === 0 &&
        weekEnd.getUTCSeconds() === 0 &&
        weekEnd.getUTCMilliseconds() === 0
      ) {
        weekEnd.setUTCHours(23, 59, 59, 999);
      }
    }
  }

  if (!weekStart || isNaN(weekStart.getTime())) {
    const now = new Date();
    weekEnd = new Date(now);
    weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setUTCHours(0, 0, 0, 0);
  } else if (!weekEnd || isNaN(weekEnd.getTime())) {
    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setUTCHours(23, 59, 59, 999);
  }

  // Ensure chronological order
  if (weekStart > weekEnd) {
    const tmp = weekStart;
    weekStart = weekEnd;
    weekEnd = tmp;
  }

  const enrolledStudents = classData.students || [];
  const enrolledStudentIds = enrolledStudents.map((s) => s._id);
  const totalStudents = enrolledStudents.length;

  // 2. Fetch assignments for this class
  const assignments = await Assignment.find({ classId: realClassId })
    .select("_id title topics language")
    .lean();
  const assignmentIds = assignments.map((a) => a._id);

  // 3. Fetch real submissions within date range
  const validStatuses = ["PASSED", "FAILED", "ERROR", "TIMEOUT", "COMPLETED"];
  const submissionQuery = {
    assignmentId: { $in: assignmentIds },
    status: { $in: validStatuses },
    $or: [
      { createdAt: { $gte: weekStart, $lte: weekEnd } },
      { submittedAt: { $gte: weekStart, $lte: weekEnd } },
    ],
  };
  if (enrolledStudentIds.length > 0) {
    submissionQuery.userId = { $in: enrolledStudentIds };
  }

  const submissions = await Submission.find(submissionQuery)
    .select("userId assignmentId score status createdAt submittedAt aiAnalysis")
    .lean();

  // 4. Fetch real quiz attempts within date range
  const quizAttempts = await QuizAttempt.find({
    studentId: { $in: enrolledStudentIds },
    $or: [
      { createdAt: { $gte: weekStart, $lte: weekEnd } },
      { completedAt: { $gte: weekStart, $lte: weekEnd } },
    ],
  })
    .select("studentId score createdAt completedAt")
    .lean();

  // 5. Fetch real progress records
  const progress = await Progress.find({
    studentId: { $in: enrolledStudentIds },
  })
    .select("studentId language topic masteryScore assignmentScore quizScore")
    .lean();

  // 6. Cohort statistics
  const activeStudentIds = new Set([
    ...submissions.map((s) => s.userId.toString()),
    ...quizAttempts.map((q) => q.studentId.toString()),
  ]);
  const activeStudents = activeStudentIds.size;
  const totalSubmissions = submissions.length;

  // Group submissions by student (authoritative best-score calculation per assignment)
  const studentSubmissionsMap = new Map();
  for (const sub of submissions) {
    const sid = sub.userId.toString();
    if (!studentSubmissionsMap.has(sid)) {
      studentSubmissionsMap.set(sid, []);
    }
    studentSubmissionsMap.get(sid).push(sub);
  }

  // Group quiz attempts by student
  const studentQuizzesMap = new Map();
  for (const q of quizAttempts) {
    const sid = q.studentId.toString();
    if (!studentQuizzesMap.has(sid)) {
      studentQuizzesMap.set(sid, []);
    }
    studentQuizzesMap.get(sid).push(q);
  }

  // Group progress records by student
  const studentProgressMap = new Map();
  for (const p of progress) {
    const sid = p.studentId.toString();
    if (!studentProgressMap.has(sid)) {
      studentProgressMap.set(sid, []);
    }
    studentProgressMap.get(sid).push(p);
  }

  // Calculate authoritative student-level performance
  const studentScores = [];
  const targetStudents = enrolledStudents.length > 0
    ? enrolledStudents
    : Array.from(activeStudentIds).map((id) => ({ _id: id }));

  for (const student of targetStudents) {
    const sid = student._id.toString();
    const sProgress = studentProgressMap.get(sid) || [];
    const sSubs = studentSubmissionsMap.get(sid) || [];
    const sQuizzes = studentQuizzesMap.get(sid) || [];

    let studentMastery = null;

    if (sProgress.length > 0) {
      // 1. Authoritative topic mastery from Progress collection (5-factor hybrid algorithm)
      const sum = sProgress.reduce((acc, p) => acc + (p.masteryScore || 0), 0);
      studentMastery = sum / sProgress.length;
    } else if (sSubs.length > 0) {
      // 2. Assignment submission scores during this reporting period
      const bestScores = new Map();
      for (const sub of sSubs) {
        const aid = sub.assignmentId.toString();
        const score = sub.score !== undefined && sub.score !== null ? Number(sub.score) : 0;
        if (!bestScores.has(aid) || score > bestScores.get(aid)) {
          bestScores.set(aid, score);
        }
      }
      const scores = Array.from(bestScores.values());
      if (scores.length > 0) {
        studentMastery = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }
    } else if (sQuizzes.length > 0) {
      // 3. Quiz attempts during this reporting period
      studentMastery = sQuizzes.reduce((sum, q) => sum + (Number(q.score) || 0), 0) / sQuizzes.length;
    }

    if (studentMastery !== null) {
      studentScores.push(Math.round(studentMastery * 10) / 10);
    }
  }

  let averageScore = 0;
  let medianScore = 0;

  if (studentScores.length > 0) {
    averageScore = Math.round(
      studentScores.reduce((sum, s) => sum + s, 0) / studentScores.length
    );
    const sorted = [...studentScores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      medianScore = Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    } else {
      medianScore = sorted[mid];
    }
  }

  // 7. Topic Mastery, Strong Concepts (>= 70%) and Vulnerable Concepts (< 50%)
  const topicStudentScores = new Map();

  for (const p of progress) {
    if (!p.topic) continue;
    const cleanTopic = p.topic.trim();
    const formattedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
    if (!topicStudentScores.has(formattedTopic)) {
      topicStudentScores.set(formattedTopic, new Map());
    }
    const sMap = topicStudentScores.get(formattedTopic);
    const sid = p.studentId.toString();
    if (!sMap.has(sid)) sMap.set(sid, []);
    sMap.get(sid).push(p.masteryScore || 0);
  }

  for (const a of assignments) {
    let asgnTopics = a.topics && a.topics.length > 0 ? a.topics : [];
    if (asgnTopics.length === 0) {
      if (a.title && /factorial/i.test(a.title)) asgnTopics = ["Recursion & Functions", "Loops"];
      else if (a.title && /triangle|nested/i.test(a.title)) asgnTopics = ["Nested Loops", "Algorithms"];
      else if (a.title && /search|binary/i.test(a.title)) asgnTopics = ["Searching Algorithms"];
      else if (a.title && /matrix/i.test(a.title)) asgnTopics = ["2D Arrays & Matrices"];
      else if (a.language) asgnTopics = [`${a.language.toUpperCase()} Basics`];
      else asgnTopics = ["General Programming"];
    }

    for (const t of asgnTopics) {
      if (!t) continue;
      const cleanTopic = t.trim();
      const formattedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

      if (!topicStudentScores.has(formattedTopic)) {
        topicStudentScores.set(formattedTopic, new Map());
      }
      const sMap = topicStudentScores.get(formattedTopic);
      for (const sub of submissions) {
        if (sub.assignmentId.toString() === a._id.toString()) {
          const sid = sub.userId.toString();
          if (!sMap.has(sid)) sMap.set(sid, []);
          sMap.get(sid).push(sub.score !== undefined && sub.score !== null ? Number(sub.score) : 0);
        }
      }
    }
  }

  // Also include topics directly from submissions' aiAnalysis.mastery
  for (const sub of submissions) {
    if (sub.aiAnalysis && Array.isArray(sub.aiAnalysis.mastery)) {
      for (const m of sub.aiAnalysis.mastery) {
        if (!m || !m.topic) continue;
        const cleanTopic = m.topic.trim();
        const formattedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
        if (!topicStudentScores.has(formattedTopic)) {
          topicStudentScores.set(formattedTopic, new Map());
        }
        const sMap = topicStudentScores.get(formattedTopic);
        const sid = sub.userId.toString();
        if (!sMap.has(sid)) sMap.set(sid, []);
        sMap.get(sid).push(Number(m.score) || 0);
      }
    }
  }

  const topicAverages = [];
  const strongConcepts = [];
  const vulnerableConcepts = [];

  for (const [topic, sMap] of topicStudentScores.entries()) {
    const studentTopicAvgs = [];
    for (const scores of sMap.values()) {
      if (scores.length > 0) {
        const studentAvg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        studentTopicAvgs.push(studentAvg);
      }
    }

    if (studentTopicAvgs.length > 0) {
      const classTopicAvg = Math.round(
        (studentTopicAvgs.reduce((sum, val) => sum + val, 0) / studentTopicAvgs.length) * 10
      ) / 10;
      const roundedScore = Math.round(classTopicAvg);
      topicAverages.push({ topic, averageScore: roundedScore });

      // Strong concepts: score >= 70
      if (roundedScore >= 70) {
        strongConcepts.push({ topic, score: roundedScore });
      }

      // Vulnerable concepts: score < 50 (strictly < 50, 49 -> vulnerable, 50 -> NOT vulnerable)
      if (classTopicAvg < 50) {
        vulnerableConcepts.push({ topic, score: roundedScore });
      }
    }
  }

  strongConcepts.sort((a, b) => b.score - a.score);
  vulnerableConcepts.sort((a, b) => a.score - b.score);
  const strongTopics = strongConcepts.map((c) => c.topic);
  const weakTopics = vulnerableConcepts.map((c) => c.topic);

  // 8. Students Flagged for Direct Intervention
  const flaggedStudents = [];
  const hasClassActivity = submissions.length > 0 || quizAttempts.length > 0;

  for (const student of enrolledStudents) {
    const sid = student._id.toString();
    const sSubs = studentSubmissionsMap.get(sid) || [];
    const sProgress = progress.filter((p) => p.studentId.toString() === sid);
    const reasons = [];

    if (sSubs.length === 0) {
      // Student has NO submissions during this period
      if (hasClassActivity) {
        // Only flag if class had active work or student has weak mastery
        const studentMastery = sProgress.length > 0
          ? sProgress.reduce((sum, p) => sum + (p.masteryScore || 0), 0) / sProgress.length
          : null;

        if (studentMastery !== null && studentMastery < 50) {
          reasons.push("No submissions during this period");
          reasons.push(`Overall mastery: ${Math.round(studentMastery)}%`);
        } else if (assignments.length > 0) {
          reasons.push("No submissions during this period");
        }
      }
    } else {
      // Student DID submit work during this period: NEVER say "No submissions"
      const subScores = sSubs.map((s) => Number(s.score) || 0);
      const avgSubScore = subScores.reduce((sum, s) => sum + s, 0) / subScores.length;
      const failedSubs = sSubs.filter(
        (s) => s.status === "FAILED" || s.status === "ERROR" || (s.score !== null && s.score < 50)
      ).length;

      if (avgSubScore < 50) {
        reasons.push(`Low assignment performance: ${Math.round(avgSubScore)}%`);
      }
      if (failedSubs >= 2) {
        reasons.push(`${failedSubs} failed assignment submissions`);
      }

      // Weak topics from mastery
      const studentWeakTopics = sProgress.filter((p) => (p.masteryScore || 0) < 50);
      for (const wp of studentWeakTopics) {
        reasons.push(`${wp.topic} mastery: ${Math.round(wp.masteryScore)}%`);
      }

      const studentMastery = sProgress.length > 0
        ? sProgress.reduce((sum, p) => sum + (p.masteryScore || 0), 0) / sProgress.length
        : null;
      if (studentMastery !== null && studentMastery < 45 && !reasons.some((r) => r.includes("mastery"))) {
        reasons.push(`Overall mastery: ${Math.round(studentMastery)}%`);
      }
    }

    if (reasons.length > 0) {
      const avgSubScore = sSubs.length > 0
        ? Math.round(sSubs.reduce((sum, s) => sum + (Number(s.score) || 0), 0) / sSubs.length)
        : null;

      flaggedStudents.push({
        studentId: student._id,
        studentName: student.name || "Student",
        name: student.name || "Student",
        reasons,
        reason: reasons.join("; "),
        score: avgSubScore,
      });
    }
  }

  // Sort flagged students by score ascending (lowest score / highest need first)
  flaggedStudents.sort((a, b) => (a.score || 0) - (b.score || 0));

  // 9. AI Metrics Payload
  const metricsPayload = {
    classId: classId.toString(),
    className: classData.name,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    studentCount: totalStudents,
    activeStudents: activeStudents,
    submissionCount: totalSubmissions,
    averageScore: averageScore,
    averageSubmissionScore: averageScore,
    topicAverages: topicAverages,
    strongTopics: strongTopics,
    weakTopics: weakTopics,
    atRiskStudents: flaggedStudents.map((s) => ({
      studentId: s.studentId ? s.studentId.toString() : undefined,
      name: s.studentName,
      reason: s.reason,
      averageScore: s.score !== null ? s.score : undefined,
    })),
    studentsNeedingAttention: flaggedStudents.map((s) => ({
      studentId: s.studentId ? s.studentId.toString() : undefined,
      name: s.studentName,
      reason: s.reason,
      averageScore: s.score !== null ? s.score : undefined,
    })),
  };

  // 10. AI Service Integration & Fallback Handling
  let aiSummary = "";
  let aiRecommendations = [];
  let aiModel = "gemini-1.5-flash";
  let aiPromptVersion = "1.0";
  let aiResult = null;

  try {
    aiResult = await generateWeeklyReport(metricsPayload);
    if (aiResult) {
      aiSummary = aiResult.summary || "";
      aiRecommendations = aiResult.recommendations || [];
      aiModel = aiResult.model || aiModel;
      aiPromptVersion = aiResult.promptVersion || aiPromptVersion;
    }
  } catch (err) {
    console.warn("[WeeklyReport] AI service call failed, generating deterministic fallback:", err.message);
    if (totalSubmissions === 0 && activeStudents === 0) {
      aiSummary = `No student activity was recorded for ${classData.name} during this period.`;
      aiRecommendations = [
        "Encourage students to begin working on assigned laboratory exercises and quizzes.",
        "Verify assignment publication dates and ensure deadlines align with the syllabus.",
      ];
    } else {
      const weakSummary = weakTopics.length > 0
        ? `Key areas requiring intervention include ${weakTopics.join(", ")}.`
        : "No concepts currently fall below the 50% vulnerability threshold.";
      aiSummary = `Cohort ${classData.name} recorded ${totalSubmissions} submissions from ${activeStudents} active students with an average score of ${averageScore}%. ${weakSummary}`;
      aiRecommendations = weakTopics.length > 0
        ? weakTopics.map((w) => `Conduct targeted review and provide hands-on practice problems focusing on ${w}.`)
        : ["Introduce advanced optimization challenges and algorithmic problem sets to maintain engagement."];
    }
  }

  const diagnostics = {
    classId: realClassId.toString(),
    className: classData.name,
    teacherId: classData.teacherId ? classData.teacherId.toString() : "",
    studentCount: totalStudents,
    assignmentCount: assignments.length,
    submissionCount: totalSubmissions,
    weeklySubmissionCount: totalSubmissions,
    quizAttemptCount: quizAttempts.length,
    dateStart: weekStart.toISOString(),
    dateEnd: weekEnd.toISOString(),
  };

  // 11. Persist to MongoDB
  const report = await WeeklyReport.create({
    classId: realClassId,
    className: classData.name,
    weekStart,
    weekEnd,
    summary: aiSummary,
    strongTopics,
    weakTopics,
    strongConcepts,
    vulnerableConcepts,
    studentsNeedingAttention: flaggedStudents,
    studentsNeedingIntervention: flaggedStudents,
    statistics: {
      totalStudents,
      activeStudents,
      totalSubmissions,
      averageScore,
      medianScore,
    },
    recommendations: aiRecommendations,
    diagnostics,
    model: aiModel,
    promptVersion: aiPromptVersion,
    generatedBy: teacherId,
  });

  // Store AI analysis audit trail if AI result returned
  if (aiResult && aiResult.model !== "fallback") {
    try {
      await AIAnalysis.create({
        classId,
        type: "WEEKLY_REPORT",
        inputReference: classId,
        result: aiResult,
        model: aiModel,
        promptVersion: aiPromptVersion,
      });
    } catch (auditErr) {
      console.warn("[WeeklyReport] Audit trail save warning:", auditErr.message);
    }
  }

  return formatWeeklyReport(report);
};

const triggerWeeklyReportGeneration = async ({
  classId,
  teacherId,
  userRole,
  startDate,
  endDate,
}) => {
  // Always execute synchronous generation to ensure real-time report availability
  return generateWeeklyReportData({
    classId,
    teacherId,
    userRole: userRole || "TEACHER",
    startDate,
    endDate,
  });
};

module.exports = {
  getStudentReport,
  getClassReport,
  getWeeklyReportsByClass,
  getLatestWeeklyReport,
  generateWeeklyReportData,
  triggerWeeklyReportGeneration,
  formatWeeklyReport,
};
