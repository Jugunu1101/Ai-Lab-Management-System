const mongoose = require("mongoose");
const { processAgentDecision } = require("./src/queues/workers/agent.worker");

// Mock Models
const Progress = require("./src/modules/progress/progress.model");
const Submission = require("./src/modules/submissions/submission.model");
const QuizAttempt = require("./src/modules/quizzes/quizAttempt.model");
const aiService = require("./src/services/ai/ai.service");
const aiQueue = require("./src/queues/ai.queue");

jest.mock("./src/modules/progress/progress.model");
jest.mock("./src/modules/submissions/submission.model");
jest.mock("./src/modules/quizzes/quizAttempt.model");
jest.mock("./src/services/ai/ai.service");
jest.mock("./src/queues/ai.queue");

describe("Agent Worker Flow", () => {
  it("should analyze student data and enqueue quiz generation", async () => {
    // Setup mocks
    Progress.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { topic: "loops", masteryScore: 42, attempts: 3, language: "python" }
      ])
    });

    Submission.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            assignmentId: "assign1",
            score: 0,
            status: "COMPLETED",
            aiAnalysis: { mistakes: ["Loop boundary is incorrect"] }
          }
        ])
      })
    });

    QuizAttempt.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([]) // No recent quizzes
        })
      })
    });

    aiService.agentDecide.mockResolvedValue({
      action: "GENERATE_QUIZ",
      targetTopics: ["loops"],
      difficulty: "easy",
      questionCount: 3,
      reason: "Student has made repeated boundary errors in loops",
      confidence: 0.90
    });

    aiQueue.enqueueQuizGeneration.mockResolvedValue({ id: "job1" });

    // Execute
    const job = { data: { studentId: "student123", triggerSource: "SUBMISSION_COMPLETED" } };
    await processAgentDecision(job);

    // Verify
    expect(aiService.agentDecide).toHaveBeenCalledWith({
      studentId: "student123",
      mastery: [{ topic: "loops", score: 42, trend: "stable", attempts: 3 }],
      recentMistakes: ["Loop boundary is incorrect"],
      recentQuizResults: [],
      recentAssignments: [{ assignmentId: "assign1", score: 0, status: "COMPLETED" }]
    });

    expect(aiQueue.enqueueQuizGeneration).toHaveBeenCalledWith({
      studentId: "student123",
      language: "python",
      topics: ["loops"],
      questionCount: 3,
      difficulty: "easy"
    });
  });

  it("should handle ASSIGN_PRACTICE action", async () => {
    // Setup mocks
    const Progress = require("./src/modules/progress/progress.model");
    Progress.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { topic: "arrays", masteryScore: 78, attempts: 2, language: "python" }
      ])
    });

    const aiService = require("./src/services/ai/ai.service");
    aiService.agentDecide.mockResolvedValue({
      action: "ASSIGN_PRACTICE",
      targetTopics: ["arrays"],
      difficulty: "easy",
      reason: "Needs more array practice",
      confidence: 0.85
    });

    const job = { data: { studentId: "student456", triggerSource: "SUBMISSION_COMPLETED" } };
    const { processAgentDecision } = require("./src/queues/workers/agent.worker");
    
    const aiQueue = require("./src/queues/ai.queue");
    aiQueue.enqueueQuizGeneration.mockClear();

    const assignmentQueue = require("./src/queues/assignment.queue");
    assignmentQueue.enqueueAssignmentGeneration = jest.fn().mockResolvedValue({ id: "job2" });

    await processAgentDecision(job);

    expect(aiService.agentDecide).toHaveBeenCalled();
    expect(aiQueue.enqueueQuizGeneration).not.toHaveBeenCalled();
    expect(assignmentQueue.enqueueAssignmentGeneration).toHaveBeenCalledWith({
      studentId: "student456",
      targetTopics: ["arrays"],
      difficulty: "easy",
      reason: "Needs more array practice"
    });
  });
});
