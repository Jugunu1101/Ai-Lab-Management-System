const mongoose = require("mongoose");

const studentNeedingAttentionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
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
    studentsNeedingAttention: {
      type: [studentNeedingAttentionSchema],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
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
