const { Worker } = require("bullmq");
const { createRedisConnection } = require("../../config/redis");
const { QUEUE_NAMES } = require("../queue.config");

const Assignment = require("../../modules/assignments/assignment.model");
const Class = require("../../modules/classes/class.model");
const User = require("../../modules/users/user.model");
const { generateAssignment } = require("../../services/ai/ai.service");

const processAssignmentGeneration = async (job) => {
  const { studentId, targetTopics, language = "cpp", difficulty, reason } = job.data;
  console.log(`[AssignmentWorker] Generating AI assignment for student: ${studentId}`);

  // Fetch student's class to attach the assignment
  const studentClass = await Class.findOne({ students: studentId });
  if (!studentClass) {
    throw new Error(`Student ${studentId} does not belong to any class.`);
  }

  // Get a teacher or system user for 'createdBy'
  const teacherId = studentClass.teacherId;

  // Retrieve existing assignments for the student / class to prevent duplicates
  const existingAssignments = await Assignment.find({
    $or: [{ assignedTo: studentId }, { classId: studentClass._id }],
  }).select("title");
  const excludedTitles = existingAssignments.map((a) =>
    a.title.replace(/^\[AI Practice\]\s*/i, "").trim()
  );

  const aiResult = await generateAssignment({
    studentId,
    targetTopics,
    language,
    difficulty,
    reason,
    excludedTitles,
  });

  if (!aiResult || !aiResult.problemStatement) {
    throw new Error("Invalid AI response for assignment generation");
  }

  // Create Assignment
  const assignmentDoc = await Assignment.create({
    title: aiResult.title.startsWith("[AI Practice]") ? aiResult.title : `[AI Practice] ${aiResult.title}`,
    description: aiResult.description || aiResult.problemStatement,
    problemStatement: aiResult.problemStatement,
    constraints: aiResult.constraints || [],
    inputFormat: aiResult.inputFormat || "",
    outputFormat: aiResult.outputFormat || "",
    examples: aiResult.examples || [],
    starterCode: aiResult.starterCode || "",
    hints: aiResult.hints || [],
    explanation: aiResult.explanation || "",
    language: aiResult.language || language || "cpp",
    difficulty: (aiResult.difficulty || difficulty || "MEDIUM").toUpperCase(),
    topics: aiResult.topics || targetTopics,
    testCases: aiResult.testCases || [],
    classId: studentClass._id,
    createdBy: teacherId,
    assignedTo: studentId,
    source: "AI_AGENT",
    agentReason: reason,
  });

  console.log(`[AssignmentWorker] Successfully created AI assignment: ${assignmentDoc._id} for student: ${studentId}`);

  return { assignmentId: assignmentDoc._id.toString() };
};

const startAssignmentWorker = () => {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.ASSIGNMENT_GENERATION,
    processAssignmentGeneration,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[AssignmentWorker] Job ${job.id} completed. Assignment: ${result.assignmentId}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[AssignmentWorker] Job ${job.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[AssignmentWorker] Worker error:", error.message);
  });

  console.log("[AssignmentWorker] Started.");

  return worker;
};

module.exports = {
  startAssignmentWorker,
  processAssignmentGeneration
};
