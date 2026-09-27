const mongoose = require("mongoose");

const aiInterventionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "WEAK_TOPIC",
        "FAILED_ASSIGNMENT",
        "QUIZ_DEFICIT",
        "LEARNING_PATH",
        "CODE_ANALYSIS",
      ],
      required: true,
      default: "WEAK_TOPIC",
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: "javascript",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    recommendation: {
      type: String,
      required: true,
      trim: true,
    },
    previousScore: {
      type: Number,
      required: true,
      default: 0,
    },
    resultingScore: {
      type: Number,
      default: null, // null indicates pending until student practices later
    },
    scoreChange: {
      type: Number,
      default: null, // null indicates pending
    },
    source: {
      type: String,
      enum: ["ASSIGNMENT_SUBMISSION", "QUIZ", "LEARNING_PATH", "AI_AGENT"],
      required: true,
      default: "ASSIGNMENT_SUBMISSION",
    },
    status: {
      type: String,
      enum: ["PENDING", "IMPROVED", "DECLINED", "NO_CHANGE"],
      default: "PENDING",
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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

// Compound indexes for fast teacher queries and deduplication checks
aiInterventionSchema.index({ studentId: 1, createdAt: -1 });
aiInterventionSchema.index({ studentId: 1, topic: 1, source: 1, createdAt: -1 });

module.exports = mongoose.model(
  "AIIntervention",
  aiInterventionSchema,
  "ai_interventions"
);
