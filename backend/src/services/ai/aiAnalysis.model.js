const mongoose = require("mongoose");

const aiAnalysisSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "CODE_ANALYSIS",
        "QUIZ_GENERATION",
        "LEARNING_PATH",
        "WEEKLY_REPORT",
      ],
      required: true,
      index: true,
    },
    inputReference: {
      type: String,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    model: {
      type: String,
      required: true,
      default: "gemini-1.5-flash",
    },
    promptVersion: {
      type: String,
      required: true,
      default: "1.0",
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

aiAnalysisSchema.index({ studentId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("AIAnalysis", aiAnalysisSchema, "ai_analyses");
