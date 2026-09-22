const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      index: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    languages: [
      {
        type: String,
        trim: true,
      },
    ],

    semester: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
classSchema.index({ teacherId: 1 });
classSchema.index({ students: 1 });
classSchema.index({ collegeId: 1, teacherId: 1 });

module.exports = mongoose.model("Class", classSchema);