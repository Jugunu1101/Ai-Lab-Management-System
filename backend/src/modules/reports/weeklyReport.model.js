const mongoose = require("mongoose");

const studentNeedingAttentionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    studentName: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    reasons: {
      type: [String],
      default: [],
    },
    score: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const conceptScoreSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const weeklyReportSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    className: {
      type: String,
      default: "",
    },
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    strongTopics: {
      type: [String],
      default: [],
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    strongConcepts: {
      type: [conceptScoreSchema],
      default: [],
    },
    vulnerableConcepts: {
      type: [conceptScoreSchema],
      default: [],
    },
    studentsNeedingAttention: {
      type: [studentNeedingAttentionSchema],
      default: [],
    },
    studentsNeedingIntervention: {
      type: [studentNeedingAttentionSchema],
      default: [],
    },
    statistics: {
      totalStudents: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
      totalSubmissions: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      medianScore: { type: Number, default: 0 },
    },
    recommendations: {
      type: [String],
      default: [],
    },
    diagnostics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    model: {
      type: String,
      default: "gemini-1.5-flash",
    },
    promptVersion: {
      type: String,
      default: "1.0",
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WeeklyReport", weeklyReportSchema, "weekly_reports");
