const mongoose = require("mongoose");
const { processAssignmentGeneration } = require("./src/queues/workers/assignment.worker");

const Assignment = require("./src/modules/assignments/assignment.model");
const Class = require("./src/modules/classes/class.model");
const aiService = require("./src/services/ai/ai.service");

jest.mock("./src/modules/assignments/assignment.model");
jest.mock("./src/modules/classes/class.model");
jest.mock("./src/services/ai/ai.service");

describe("Assignment Worker Flow", () => {
  it("should generate and save an AI assignment", async () => {
    // Setup mocks
    Class.findOne.mockResolvedValue({
      _id: "class123",
      teacherId: "teacher123",
      students: ["student456"]
    });

    aiService.generateAssignment.mockResolvedValue({
      title: "Practice Array Iteration",
      description: "A generated practice assignment.",
      language: "javascript",
      difficulty: "easy",
      topics: ["arrays"],
      problemStatement: "Write a function...",
      constraints: ["length >= 0"],
      examples: ["Input: [1]"],
      expectedConcepts: ["iteration"],
      testCases: [{ input: "[]", expectedOutput: "0", isHidden: false }]
    });

    Assignment.create.mockResolvedValue({ _id: "assignment789" });

    // Execute
    const job = { 
      data: { 
        studentId: "student456", 
        targetTopics: ["arrays"], 
        difficulty: "easy", 
        reason: "Needs more array practice" 
      } 
    };
    
    const result = await processAssignmentGeneration(job);

    // Verify
    expect(Class.findOne).toHaveBeenCalledWith({ students: "student456" });
    expect(aiService.generateAssignment).toHaveBeenCalledWith({
      studentId: "student456",
      targetTopics: ["arrays"],
      difficulty: "easy",
      reason: "Needs more array practice"
    });
    
    expect(Assignment.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "[AI Practice] Practice Array Iteration",
      assignedTo: "student456",
      source: "AI_AGENT",
      agentReason: "Needs more array practice"
    }));

    expect(result).toEqual({ assignmentId: "assignment789" });
  });
});
