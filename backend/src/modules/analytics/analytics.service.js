const Submission = require("../submissions/submission.model");
const QuizAttempt = require("../quizzes/quizAttempt.model");
const Progress = require("../progress/progress.model");
const Assignment = require("../assignments/assignment.model");
const Class = require("../classes/class.model");

const getStudentAnalytics = async ({ studentId }) => {
  const [submissions, quizAttempts, progress] = await Promise.all([
    Submission.find({ userId: studentId }).select("score status"),

    QuizAttempt.find({ studentId }).select("score"),

    Progress.find({ studentId }).select(
      "language topic masteryScore assignmentScore quizScore",
    ),
  ]);

  const totalAssignments = submissions.length;

  const averageAssignmentScore =
    totalAssignments > 0
      ? Math.round(
          submissions.reduce((sum, submission) => sum + submission.score, 0) /
            totalAssignments,
        )
      : 0;

  const totalQuizzes = quizAttempts.length;

  const averageQuizScore =
    totalQuizzes > 0
      ? Math.round(
          quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            totalQuizzes,
        )
      : 0;

  const averageMasteryScore =
    progress.length > 0
      ? Math.round(
          progress.reduce((sum, item) => sum + item.masteryScore, 0) /
            progress.length,
        )
      : 0;

  const weakTopics = progress
    .filter((item) => item.masteryScore < 50)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map((item) => ({
      language: item.language,
      topic: item.topic,
      masteryScore: item.masteryScore,
    }));

  const allTopics = progress
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .map((item) => ({
      language: item.language,
      topic: item.topic,
      masteryScore: item.masteryScore,
    }));

  return {
    totalAssignments,
    averageAssignmentScore,
    totalQuizzes,
    averageQuizScore,
    averageMasteryScore,
    weakTopics,
    allTopics,
  };
};

const getClassAnalytics = async ({ classId, teacherId, role }) => {
  let classIds = [];
  let enrolledStudentIds = [];
  let className = "";
  let studentCount = 0;

  if (classId === "all") {
    const classQuery = role === "ADMIN" ? {} : { teacherId };
    const classes = await Class.find(classQuery).select("_id name students languages").lean();
    classIds = classes.map((c) => c._id);
    className = "All Classrooms Combined";
    const studentIdSet = new Set();
    classes.forEach((c) => {
      (c.students || []).forEach((s) => {
        studentIdSet.add(s.toString());
      });
    });
    enrolledStudentIds = Array.from(studentIdSet);
    studentCount = enrolledStudentIds.length;
  } else {
    const classData = await Class.findById(classId).lean();

    if (!classData) {
      const error = new Error("Class not found");
      error.statusCode = 404;
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }

    const ownerId = classData.teacherId ? classData.teacherId.toString() : null;
    if (role !== "ADMIN" && (!ownerId || ownerId !== (teacherId ? teacherId.toString() : ""))) {
      const error = new Error(
        "You do not have access to analytics for this class",
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    classIds = [classData._id];
    className = classData.name;
    enrolledStudentIds = (classData.students || []).map((s) => s.toString());
    studentCount = enrolledStudentIds.length;
  }

  // Find all assignments belonging to the specified class(es)
  const assignments = await Assignment.find({
    classId: { $in: classIds },
  }).select("_id title topics language").lean();

  const assignmentIds = assignments.map((a) => a._id);

  // Valid evaluated submission statuses (exclude PENDING, RUNNING, DRAFT)
  const validStatuses = ["PASSED", "FAILED", "ERROR", "TIMEOUT", "COMPLETED"];

  const submissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
    userId: { $in: enrolledStudentIds },
    status: { $in: validStatuses },
  }).select("userId assignmentId score status createdAt").lean();

  const submissionCount = submissions.length;

  // 1. Fetch real progress/mastery records for enrolled students
  const progressRecords = await Progress.find({
    studentId: { $in: enrolledStudentIds },
  }).select("studentId language topic masteryScore").lean();

  // Group progress records by student to calculate each student's overall concept mastery
  const studentMasteryMap = new Map();
  for (const p of progressRecords) {
    const sid = p.studentId.toString();
    if (!studentMasteryMap.has(sid)) {
      studentMasteryMap.set(sid, { total: 0, count: 0 });
    }
    const entry = studentMasteryMap.get(sid);
    entry.total += (p.masteryScore || 0);
    entry.count += 1;
  }

  // Group submissions by student
  const studentSubmissionsMap = new Map();
  for (const sub of submissions) {
    const sid = sub.userId.toString();
    if (!studentSubmissionsMap.has(sid)) {
      studentSubmissionsMap.set(sid, []);
    }
    studentSubmissionsMap.get(sid).push(sub);
  }

  // Calculate each participating student's aggregate mastery score (falling back to submission scores if no progress records exist)
  const studentScores = [];
  
  // Combine all student IDs from progress or submissions
  const activeStudentIds = Array.from(new Set([
    ...Array.from(studentMasteryMap.keys()),
    ...Array.from(studentSubmissionsMap.keys())
  ]));

  for (const sid of activeStudentIds) {
    const masteryEntry = studentMasteryMap.get(sid);
    if (masteryEntry && masteryEntry.count > 0) {
      const avgMastery = masteryEntry.total / masteryEntry.count;
      studentScores.push(Math.round(avgMastery * 10) / 10);
    } else {
      const subs = studentSubmissionsMap.get(sid) || [];
      const assignmentBestScores = new Map();
      for (const sub of subs) {
        const aid = sub.assignmentId.toString();
        const currentScore = sub.score !== undefined && sub.score !== null ? Number(sub.score) : 0;
        if (!assignmentBestScores.has(aid) || currentScore > assignmentBestScores.get(aid)) {
          assignmentBestScores.set(aid, currentScore);
        }
      }
      const scores = Array.from(assignmentBestScores.values());
      if (scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        studentScores.push(Math.round(avg * 10) / 10);
      }
    }
  }

  // Determine hasData state
  const hasData = studentScores.length > 0;

  let classAverage = null;
  let medianStudentScore = null;
  let scoreDistribution = [];

  if (hasData) {
    // Class Average = Sum of student scores / number of participating students
    const totalScoreSum = studentScores.reduce((sum, score) => sum + score, 0);
    classAverage = Math.round((totalScoreSum / studentScores.length) * 10) / 10;

    // Median Student Score = Cohort median of student aggregate scores
    const sortedScores = [...studentScores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    if (sortedScores.length % 2 === 0) {
      medianStudentScore = Math.round(((sortedScores[mid - 1] + sortedScores[mid]) / 2) * 10) / 10;
    } else {
      medianStudentScore = sortedScores[mid];
    }

    // Cohort Grade Distribution Histogram
    const buckets = [
      { range: "< 50%", count: 0 },
      { range: "50-59%", count: 0 },
      { range: "60-69%", count: 0 },
      { range: "70-79%", count: 0 },
      { range: "80-89%", count: 0 },
      { range: "90-100%", count: 0 },
    ];
    for (const score of studentScores) {
      if (score < 50) buckets[0].count++;
      else if (score < 60) buckets[1].count++;
      else if (score < 70) buckets[2].count++;
      else if (score < 80) buckets[3].count++;
      else if (score < 90) buckets[4].count++;
      else buckets[5].count++;
    }
    scoreDistribution = buckets;
  }

  // 2. Topic Mastery and Weak Topic Hotspots (< 50% class topic score)
  const topicStudentScores = new Map();

  // Populate from Progress records
  for (const p of progressRecords) {
    if (!p.topic) continue;
    const cleanTopic = p.topic.trim();
    const formattedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
    if (!topicStudentScores.has(formattedTopic)) {
      topicStudentScores.set(formattedTopic, new Map());
    }
    const sMap = topicStudentScores.get(formattedTopic);
    const sid = p.studentId.toString();
    if (!sMap.has(sid)) {
      sMap.set(sid, []);
    }
    sMap.get(sid).push(p.masteryScore || 0);
  }

  // Also supplement from assignments with topic tags ONLY if no Progress records exist for that topic
  for (const a of assignments) {
    if (!a.topics || a.topics.length === 0) continue;
    for (const t of a.topics) {
      if (!t) continue;
      const cleanTopic = t.trim();
      const formattedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
      if (topicStudentScores.has(formattedTopic)) continue;

      topicStudentScores.set(formattedTopic, new Map());
      const sMap = topicStudentScores.get(formattedTopic);
      for (const sub of submissions) {
        if (sub.assignmentId.toString() === a._id.toString()) {
          const sid = sub.userId.toString();
          if (!sMap.has(sid)) {
            sMap.set(sid, []);
          }
          sMap.get(sid).push(sub.score || 0);
        }
      }
    }
  }

  const topicMasteryComparison = [];
  const weakTopicHotspots = [];

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
      topicMasteryComparison.push({
        topic,
        classAvg: roundedScore,
      });

      // Weak Topic Rule: Strictly < 50%
      // 49% -> weak, 50% -> NOT weak
      if (classTopicAvg < 50) {
        weakTopicHotspots.push({
          topic,
          score: roundedScore,
        });
      }
    }
  }

  topicMasteryComparison.sort((a, b) => a.classAvg - b.classAvg);
  weakTopicHotspots.sort((a, b) => a.score - b.score);
  const weakTopicCount = weakTopicHotspots.length;

  // Completion rate and backward-compatible metrics for reports
  const completedSubmissions = submissions.filter(
    (s) => s.status === "COMPLETED" || s.status === "PASSED" || (s.score && s.score >= 60)
  ).length;

  const totalPossible = studentCount * Math.max(1, assignmentIds.length);
  const completionRate =
    studentCount > 0 && assignmentIds.length > 0
      ? Math.min(100, Math.round((completedSubmissions / totalPossible) * 100))
      : 0;

  const averageScore = classAverage !== null ? Math.round(classAverage) : 0;

  return {
    hasData,
    classId,
    className,
    classAverage,
    classAvg: classAverage,
    medianStudentScore,
    medianScore: medianStudentScore,
    weakTopicCount,
    weakTopicsCount: weakTopicCount,
    weakTopicHotspots,
    scoreDistribution,
    topicMasteryComparison,
    studentCount,
    assignmentCount: assignmentIds.length,
    submissionCount,
    averageScore,
    completionRate,
  };
};

const getClassTopicAnalytics = async ({ classId, teacherId, role }) => {
  const { syncStudentProgressFromDatabase } = require("../progress/progress.service");
  let studentIds = [];
  let classData = null;

  if (classId === "all") {
    const classQuery = role === "ADMIN" ? {} : { teacherId };
    const classes = await Class.find(classQuery).select("students").lean();
    const studentIdSet = new Set();
    classes.forEach((c) => (c.students || []).forEach((s) => studentIdSet.add(s.toString())));
    studentIds = Array.from(studentIdSet);
  } else {
    classData = await Class.findById(classId);

    if (!classData) {
      const error = new Error("Class not found");
      error.statusCode = 404;
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }

    const ownerId = classData.teacherId ? classData.teacherId.toString() : null;
    if (role !== "ADMIN" && (!ownerId || ownerId !== (teacherId ? teacherId.toString() : ""))) {
      const error = new Error(
        "You do not have access to analytics for this class",
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
    studentIds = (classData.students || []).map((s) => s.toString());
  }

  // Sync progress from database for all enrolled students in this class scope
  let studentResults = [];
  if (studentIds.length > 0) {
    studentResults = await Promise.all(
      studentIds.map((sid) =>
        syncStudentProgressFromDatabase({
          studentId: sid,
          classId: classId === "all" ? undefined : classId,
        }).catch(() => null)
      )
    );
  }

  const topicMap = {};

  for (const sResult of studentResults) {
    if (!sResult || !Array.isArray(sResult.topics)) continue;
    for (const item of sResult.topics) {
      const key = `${item.topic}`.toLowerCase().trim();

      if (!topicMap[key]) {
        topicMap[key] = {
          language: item.language || "cpp",
          topic: item.topic,
          totalMastery: 0,
          totalAssignmentScore: 0,
          totalQuizScore: 0,
          totalSubmissions: 0,
          totalSuccessfulSubmissions: 0,
          totalPracticeCount: 0,
          totalStudents: 0,
        };
      }

      topicMap[key].totalMastery += (item.masteryScore || item.score || 0);
      topicMap[key].totalAssignmentScore += (item.assignmentScore || 0);
      topicMap[key].totalQuizScore += (item.quizScore || 0);
      topicMap[key].totalSubmissions += (item.totalSubmissions || 0);
      topicMap[key].totalSuccessfulSubmissions += (item.successfulSubmissions || 0);
      topicMap[key].totalPracticeCount += (item.practiceCount || item.attempts || 0);
      topicMap[key].totalStudents += 1;
    }
  }

  const topics = Object.values(topicMap)
    .map((item) => {
      const averageMasteryScore =
        item.totalStudents > 0
          ? Math.round(item.totalMastery / item.totalStudents)
          : 0;
      const assignmentScore =
        item.totalStudents > 0
          ? Math.round(item.totalAssignmentScore / item.totalStudents)
          : 0;
      const quizScore =
        item.totalStudents > 0
          ? Math.round(item.totalQuizScore / item.totalStudents)
          : 0;
      const submissionSuccessRate =
        item.totalSubmissions > 0
          ? Math.round((item.totalSuccessfulSubmissions / item.totalSubmissions) * 100)
          : 0;

      const statusCategory =
        averageMasteryScore >= 70
          ? "Good Mastery"
          : averageMasteryScore >= 50
          ? "Needs Practice"
          : "Weak Topic";

      return {
        language: item.language,
        topic: item.topic,
        masteryScore: averageMasteryScore,
        score: averageMasteryScore,
        averageMasteryScore,
        assignmentScore,
        quizScore,
        submissionSuccessRate,
        practiceCount: item.totalPracticeCount,
        attempts: item.totalPracticeCount,
        status: statusCategory,
      };
    })
    .sort((a, b) => a.masteryScore - b.masteryScore);

  const totalScore = topics.reduce((acc, t) => acc + t.masteryScore, 0);
  const classroomAverage = topics.length > 0 ? Math.round(totalScore / topics.length) : 0;
  const strongCount = topics.filter((t) => t.masteryScore >= 70).length;
  const needsImpCount = topics.filter((t) => t.masteryScore >= 50 && t.masteryScore < 70).length;
  const weakCount = topics.filter((t) => t.masteryScore < 50).length;

  return {
    classId,
    className: classData?.name || "All Classrooms Combined",
    classroomAverage,
    avgScore: classroomAverage,
    strongCount,
    needsImpCount,
    weakCount,
    topics,
    weakTopics: topics.filter((t) => t.masteryScore < 50),
    hasData: topics.length > 0,
  };
};

const getStudentAnalyticsById = async ({ studentId, teacherId }) => {
  // Verify teacher has access to this student (student must be in one of teacher's classes)
  const classes = await Class.find({
    teacherId,
    students: studentId,
  }).select("_id");

  if (classes.length === 0) {
    const error = new Error(
      "Student not found in any of your classes"
    );
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  // Reuse the existing analytics function
  return getStudentAnalytics({ studentId });
};

const getStudentProfileById = async ({ studentId, teacherId, role }) => {
  // If not admin, verify teacher has access to this student
  if (role !== "ADMIN") {
    const classes = await Class.find({
      teacherId,
      students: studentId,
    }).select("_id");

    if (classes.length === 0) {
      const error = new Error("Student not found in any of your classes");
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }
  }

  const User = require("../users/user.model");
  const student = await User.findById(studentId).select("name email collegeId department role");
  if (!student) {
      const error = new Error("Student not found");
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
  }
  return student;
};

const getTeacherDashboard = async ({ teacherId, role }) => {
  const User = require("../users/user.model");

  // Verify and scope classes to this teacher (or all classes if ADMIN)
  let classQuery = {};
  if (role !== "ADMIN") {
    classQuery = { teacherId };
  }
  const classes = await Class.find(classQuery).select("_id name code students languages").lean();
  const classIds = classes.map((c) => c._id);

  // Collect unique students enrolled in the teacher's classes
  const studentIdSet = new Set();
  classes.forEach((c) => {
    (c.students || []).forEach((s) => {
      studentIdSet.add(s.toString());
    });
  });
  const studentIds = Array.from(studentIdSet);

  if (classes.length === 0 || studentIds.length === 0) {
    return {
      totalStudents: 0,
      activeClasses: classes.length,
      averageScore: 0,
      submissionRate: 0,
      atRiskStudents: [],
      submissionActivity: [],
      activeClassesList: classes.map((c) => ({
        _id: c._id,
        name: c.name,
        code: c.code || "",
        studentCount: (c.students || []).length,
        averageMastery: 0,
      })),
      recentSubmissions: [],
    };
  }

  // Load student records
  const students = await User.find({ _id: { $in: studentIds } })
    .select("_id name email collegeId department")
    .lean();
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  // Find all assignments belonging to the teacher's classes
  const assignments = await Assignment.find({ classId: { $in: classIds } })
    .select("_id title topics language classId")
    .lean();
  const assignmentIds = assignments.map((a) => a._id);

  // Fetch submissions for these assignments by enrolled students
  const submissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
    userId: { $in: studentIds },
  })
    .select("userId assignmentId score status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  // Fetch progress records for these students
  const progressRecords = await Progress.find({
    studentId: { $in: studentIds },
  })
    .select("studentId topic language masteryScore assignmentScore quizScore")
    .lean();

  // Group progress by student
  const progressByStudent = new Map();
  for (const p of progressRecords) {
    const sid = p.studentId.toString();
    if (!progressByStudent.has(sid)) {
      progressByStudent.set(sid, []);
    }
    progressByStudent.get(sid).push(p);
  }

  // Group submissions by student
  const submissionsByStudent = new Map();
  for (const s of submissions) {
    const sid = s.userId.toString();
    if (!submissionsByStudent.has(sid)) {
      submissionsByStudent.set(sid, []);
    }
    submissionsByStudent.get(sid).push(s);
  }

  let totalStudentMasterySum = 0;
  const atRiskStudents = [];
  const studentMasteryMap = new Map();

  for (const sid of studentIds) {
    const studentDoc = studentMap.get(sid) || {
      _id: sid,
      name: "Student",
      email: "",
    };
    const sProgress = progressByStudent.get(sid) || [];
    const sSubmissions = submissionsByStudent.get(sid) || [];

    // Authoritative Mastery Calculation:
    // Uses unrounded float for precise threshold boundary comparisons
    let overallMastery = 0;
    if (sProgress.length > 0) {
      const sum = sProgress.reduce((acc, p) => acc + (p.masteryScore || 0), 0);
      overallMastery = sum / sProgress.length;
    } else if (sSubmissions.length > 0) {
      const sum = sSubmissions.reduce((acc, s) => acc + (s.score || 0), 0);
      overallMastery = sum / sSubmissions.length;
    } else {
      overallMastery = 0;
    }

    studentMasteryMap.set(sid, overallMastery);
    totalStudentMasterySum += overallMastery;

    // Vulnerable Topics: topics where mastery < 45
    const vulnerableTopics = sProgress
      .filter((p) => (p.masteryScore || 0) < 45)
      .map((p) => p.topic);

    // Business Rules for Attention:
    let needsAttention = false;
    let reason = "";

    // 1. PRIMARY RULE: Mastery < 45% (strictly < 45, NOT <= 45)
    // 44% -> true, 44.9% -> true, 45% -> false, 46% -> false
    if (overallMastery < 45) {
      needsAttention = true;
      reason = `Mastery is below the 45% attention threshold (${Math.round(overallMastery)}%)`;
    } else {
      // 2. ADDITIONAL SIGNALS when mastery >= 45:
      // Repeated consecutive failed submissions
      const recentSubs = sSubmissions.slice(0, 5);
      const passedIdx = recentSubs.findIndex(
        (s) => s.status === "PASSED" || s.status === "COMPLETED"
      );
      const consecutiveFailures =
        passedIdx === -1
          ? recentSubs.filter((s) => s.status === "FAILED" || s.status === "ERROR").length
          : passedIdx;

      if (consecutiveFailures >= 3) {
        needsAttention = true;
        reason = `Repeated failed submissions (${consecutiveFailures} consecutive failures)`;
      }
    }

    if (needsAttention) {
      const studentClasses = classes.filter((c) =>
        (c.students || []).some((s) => s.toString() === sid)
      );
      const className =
        studentClasses.map((c) => c.name).join(", ") ||
        studentDoc.department ||
        studentDoc.collegeId ||
        "Classroom";

      atRiskStudents.push({
        _id: studentDoc._id,
        studentId: studentDoc._id,
        name: studentDoc.name || "Student",
        email: studentDoc.email || "",
        collegeId: studentDoc.collegeId || studentDoc.department || "",
        className,
        score: Math.round(overallMastery * 10) / 10,
        masteryScore: Math.round(overallMastery * 10) / 10,
        weakTopics: vulnerableTopics.length > 0 ? vulnerableTopics : ["General"],
        vulnerableTopics: vulnerableTopics.length > 0 ? vulnerableTopics : ["General"],
        reason,
        needsAttention: true,
      });
    }
  }

  // Sort at-risk students by lowest score first
  atRiskStudents.sort((a, b) => a.score - b.score);

  // Average class mastery across all enrolled students
  const averageScore =
    studentIds.length > 0
      ? Math.round(totalStudentMasterySum / studentIds.length)
      : 0;

  // Submission completion rate:
  // Count of students who completed assignments vs total possible
  const completedCount = submissions.filter(
    (s) => s.status === "PASSED" || s.status === "COMPLETED" || (s.score && s.score >= 60)
  ).length;
  const totalPossible = studentIds.length * Math.max(1, assignmentIds.length);
  const submissionRate = Math.min(
    100,
    Math.round((completedCount / totalPossible) * 100)
  );

  // Daily execution telemetry for last 7 days
  const now = new Date();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activityMap = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayName = dayLabels[d.getDay()];
    activityMap.set(dayName, { day: dayName, submissions: 0, passes: 0 });
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  submissions.forEach((s) => {
    if (s.createdAt && new Date(s.createdAt) >= sevenDaysAgo) {
      const dayName = dayLabels[new Date(s.createdAt).getDay()];
      if (activityMap.has(dayName)) {
        const item = activityMap.get(dayName);
        item.submissions++;
        if (s.status === "PASSED" || s.status === "COMPLETED") {
          item.passes++;
        }
      }
    }
  });
  const submissionActivity = Array.from(activityMap.values());

  // Active Classes list with calculated mastery and student count
  const activeClassesList = classes.map((c) => {
    const classStudentIds = (c.students || []).map((s) => s.toString());
    let classMasterySum = 0;
    let classMasteryCount = 0;
    for (const csId of classStudentIds) {
      if (studentMasteryMap.has(csId)) {
        classMasterySum += studentMasteryMap.get(csId);
        classMasteryCount++;
      }
    }
    return {
      _id: c._id,
      name: c.name,
      code: c.code || "",
      studentCount: classStudentIds.length,
      averageMastery: classMasteryCount > 0 ? Math.round(classMasterySum / classMasteryCount) : 0,
    };
  });

  // Recent Submissions with student and assignment titles
  const assignmentMap = new Map(assignments.map((a) => [a._id.toString(), a]));
  const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

  const recentSubmissions = submissions.slice(0, 6).map((s) => {
    const student = studentMap.get(s.userId?.toString());
    const assignment = assignmentMap.get(s.assignmentId?.toString());
    const classObj = assignment?.classId ? classMap.get(assignment.classId.toString()) : null;
    return {
      _id: s._id,
      studentName: student?.name || "Student",
      assignmentTitle: assignment?.title || "Assignment",
      className: classObj?.name || "Classroom",
      status: s.status,
      score: s.score,
      createdAt: s.createdAt,
    };
  });

  return {
    totalStudents: studentIds.length,
    activeClasses: classes.length,
    averageScore,
    submissionRate,
    atRiskStudents,
    submissionActivity,
    activeClassesList,
    recentSubmissions,
  };
};

module.exports = {
  getStudentAnalytics,
  getClassAnalytics,
  getClassTopicAnalytics,
  getStudentAnalyticsById,
  getStudentProfileById,
  getTeacherDashboard,
};

