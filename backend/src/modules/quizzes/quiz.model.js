const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    topic: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      default: "medium",
    },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    targetDate: {
      type: Date,
      index: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

quizSchema.index({ studentId: 1, language: 1, createdAt: -1 });

module.exports = mongoose.model("Quiz", quizSchema);
