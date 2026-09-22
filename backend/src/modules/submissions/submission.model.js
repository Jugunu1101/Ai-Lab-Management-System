const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    testCaseIndex: {
      type: Number,
      required: true,
    },

    passed: {
      type: Boolean,
      required: true,
    },

    actualOutput: {
      type: String,
      default: "",
    },

    expectedOutput: {
      type: String,
      default: "",
    },

    executionTime: {
      type: Number,
      default: 0,
    },

    error: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    code: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "RUNNING",
        "PASSED",
        "FAILED",
        "ERROR",
        "TIMEOUT",
        "COMPLETED",
      ],
      default: "PENDING",
    },

    output: {
      type: String,
      default: "",
    },

    testResults: {
      type: [testResultSchema],
      default: [],
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    testCasesPassed: {
      type: Number,
      default: 0,
    },

    totalTestCases: {
      type: Number,
      default: 0,
    },

    executionTime: {
      type: Number,
      default: 0,
    },

    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIAnalysis",
    },

    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    aiAnalysis: {
      mastery: {
        type: [
          {
            topic: {
              type: String,
              required: true,
            },
            score: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
          },
        ],
        default: [],
      },

      weakTopics: {
        type: [String],
        default: [],
      },

      mistakes: {
        type: [String],
        default: [],
      },

      recommendations: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Submission", submissionSchema);