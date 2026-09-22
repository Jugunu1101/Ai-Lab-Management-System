const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
    },

    selectedAnswer: {
      type: String,
      default: "",
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Performance indexes
quizAttemptSchema.index({ studentId: 1, createdAt: -1 });
quizAttemptSchema.index({ quizId: 1 });
quizAttemptSchema.index({ studentId: 1, quizId: 1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
