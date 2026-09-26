const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    assignmentScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    quizScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalSubmissions: {
      type: Number,
      default: 0,
      min: 0,
    },

    successfulSubmissions: {
      type: Number,
      default: 0,
      min: 0,
    },

    submissionSuccessRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    submissionSuccess: {
      type: Boolean,
      default: false,
    },

    errorFrequencyFactor: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    practiceFrequencyFactor: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    masteryScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    aiMasteryScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    mistakes: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastPracticedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index(
  {
    studentId: 1,
    language: 1,
    topic: 1,
  },
  {
    unique: true,
  }
);

progressSchema.index({ studentId: 1, masteryScore: 1 });

module.exports = mongoose.model("Progress", progressSchema);
