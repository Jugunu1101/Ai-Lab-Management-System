const AIIntervention = require("./aiIntervention.model");
const Class = require("../classes/class.model");
const Progress = require("../progress/progress.model");
const mongoose = require("mongoose");

/**
 * Record an AI intervention when weakness is detected or recommendation is generated.
 * Includes 24h deduplication for identical student+topic+source events.
 */
const recordIntervention = async ({
  studentId,
  classId = null,
  type = "WEAK_TOPIC",
  topic,
  language = "javascript",
  reason,
  recommendation,
  previousScore = 0,
  source = "ASSIGNMENT_SUBMISSION",
  referenceId = null,
}) => {
  if (!studentId || !topic || !reason || !recommendation) {
    return null;
  }

  const normalizedTopic = String(topic).toLowerCase().trim();
  const normalizedLang = String(language || "javascript").toLowerCase().trim();

  // Deduplication: prevent identical intervention within 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await AIIntervention.findOne({
    studentId,
    topic: normalizedTopic,
    source,
    createdAt: { $gte: oneDayAgo },
  });

  if (existing) {
    return existing;
  }

  const intervention = await AIIntervention.create({
    studentId,
    classId,
    type,
    topic: normalizedTopic,
    language: normalizedLang,
    reason,
    recommendation,
    previousScore: Math.round(previousScore || 0),
    resultingScore: null, // Pending until subsequent student practice
    scoreChange: null,    // Pending until subsequent student practice
    source,
    status: "PENDING",
    referenceId,
  });

  return intervention;
};

/**
 * Retrieve AI intervention history for an instructor.
 * Strictly scopes to students in classes taught by the instructor.
 * Dynamically resolves resulting score based on actual later performance.
 */
const getTeacherInterventions = async ({ teacherId, role, query = {} }) => {
  let filter = {};

  if (role !== "ADMIN") {
    // 1. Instructor Data Scope: Only students enrolled in classes taught by this teacher
    const classes = await Class.find({ teacherId }).select("_id students").lean();
    if (!classes || classes.length === 0) {
      return { interventions: [] };
    }

    const studentIdSet = new Set();
    classes.forEach((c) => {
      (c.students || []).forEach((s) => studentIdSet.add(s.toString()));
    });
    const authorizedStudentIds = Array.from(studentIdSet);

    if (authorizedStudentIds.length === 0) {
      return { interventions: [] };
    }

    if (query.studentId) {
      if (!authorizedStudentIds.includes(query.studentId.toString())) {
        return { interventions: [] }; // Unauthorized student requested
      }
      filter.studentId = query.studentId;
    } else {
      filter.studentId = { $in: authorizedStudentIds };
    }

    if (query.classId) {
      const isClassAuthorized = classes.some((c) => c._id.toString() === query.classId.toString());
      if (isClassAuthorized) {
        filter.classId = query.classId;
      } else {
        return { interventions: [] };
      }
    }
  } else {
    // Admin access
    if (query.studentId) {
      filter.studentId = query.studentId;
    }
    if (query.classId) {
      filter.classId = query.classId;
    }
  }

  if (query.topic) {
    filter.topic = query.topic.toLowerCase().trim();
  }
  if (query.type) {
    filter.type = query.type;
  }

  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  const items = await AIIntervention.find(filter)
    .populate("studentId", "name email collegeId department")
    .sort({ createdAt: -1 })
    .limit(limit);

  if (!items || items.length === 0) {
    return { interventions: [] };
  }

  // 2. Dynamically calculate resulting score from actual later performance
  const enriched = await Promise.all(
    items.map(async (doc) => {
      const studentObj = doc.studentId;
      const sId = studentObj?._id || studentObj || doc.studentId;

      const progress = await Progress.findOne({
        studentId: sId,
        topic: { $regex: new RegExp(`^${doc.topic}$`, "i") },
      }).select("masteryScore lastPracticedAt");

      let currentScore = doc.resultingScore;
      let change = doc.scoreChange;
      let status = doc.status;

      // Only calculate improvement if student had activity AFTER intervention was issued
      if (progress && progress.lastPracticedAt && new Date(progress.lastPracticedAt) > new Date(doc.createdAt)) {
        currentScore = progress.masteryScore;
        change = currentScore - doc.previousScore;
        if (currentScore > doc.previousScore) {
          status = "IMPROVED";
        } else if (currentScore < doc.previousScore) {
          status = "DECLINED";
        } else {
          status = "NO_CHANGE";
        }

        // Persist resolved progress update
        if (doc.resultingScore !== currentScore || doc.status !== status) {
          doc.resultingScore = currentScore;
          doc.scoreChange = change;
          doc.status = status;
          await doc.save().catch(() => {});
        }
      } else {
        currentScore = null;
        change = null;
        status = "PENDING";
      }

      return {
        id: doc._id,
        _id: doc._id,
        studentId: sId,
        studentName: studentObj?.name || "Student",
        studentEmail: studentObj?.email || "",
        collegeId: studentObj?.collegeId || studentObj?.department || "",
        type: doc.type,
        topic: doc.topic,
        language: doc.language,
        reason: doc.reason,
        recommendation: doc.recommendation,
        previousScore: doc.previousScore,
        resultingScore: currentScore,
        scoreChange: change,
        source: doc.source,
        status,
        createdAt: doc.createdAt,
      };
    })
  );

  return { interventions: enriched };
};

module.exports = {
  recordIntervention,
  getTeacherInterventions,
};
