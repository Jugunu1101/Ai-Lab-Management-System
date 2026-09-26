const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
      trim: true,
    },

    expectedOutput: {
      type: String,
      required: true,
      trim: true,
    },

    isHidden: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    problemStatement: {
      type: String,
      trim: true,
    },

    constraints: [
      {
        type: String,
        trim: true,
      },
    ],

    inputFormat: {
      type: String,
      trim: true,
    },

    outputFormat: {
      type: String,
      trim: true,
    },

    examples: [exampleSchema],

    starterCode: {
      type: String,
      trim: true,
    },

    hints: [
      {
        type: String,
        trim: true,
      },
    ],

    explanation: {
      type: String,
      trim: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      required: true,
      enum: ["EASY", "MEDIUM", "HARD"],
    },

    topics: [
      {
        type: String,
        trim: true,
      },
    ],

    testCases: {
      type: [testCaseSchema],
      default: [],
    },

    deadline: {
      type: Date,
      required: false,
    },

    maxAttempts: {
      type: Number,
      required: false,
      min: 1,
      default: null,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    source: {
      type: String,
      default: "TEACHER",
      enum: ["TEACHER", "AI_AGENT", "AI_GENERATED"],
    },

    agentReason: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
assignmentSchema.index({ classId: 1, createdAt: -1 });
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ deadline: 1 });
assignmentSchema.index({ assignedTo: 1, source: 1, createdAt: -1 });

module.exports = mongoose.model("Assignment", assignmentSchema);