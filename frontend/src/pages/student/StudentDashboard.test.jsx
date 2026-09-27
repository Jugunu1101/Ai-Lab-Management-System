import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StudentDashboard from "./StudentDashboard";
import progressService from "../../services/progress.service";
import assignmentService from "../../services/assignment.service";
import * as AuthContext from "../../context/AuthContext";

vi.mock("../../services/progress.service", () => ({
  default: {
    getStudentDashboard: vi.fn(),
    getStudentLearningPath: vi.fn(),
    getStudentProgress: vi.fn(),
  },
}));

vi.mock("../../services/assignment.service", () => ({
  default: {
    getAssignments: vi.fn(),
  },
}));

describe("StudentDashboard Component (Complete Redesign)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      role: "STUDENT",
      user: { name: "Rahul Sharma", email: "rahul@lab.edu" },
      logout: vi.fn(),
    });
  });

  it("renders all sections of the redesigned dashboard with real data", async () => {
    progressService.getStudentDashboard.mockResolvedValueOnce({
      data: {
        averageScore: 68,
        activeAssignmentsCount: 3,
        totalSubmissions: 8,
        todayQuizStatus: {
          available: true,
          completed: false,
          score: null,
        },
        weakTopics: [
          { topic: "Recursion", language: "C++", masteryScore: 35 },
          { topic: "Loops", language: "C++", masteryScore: 48 },
        ],
        recentSubmissions: [
          {
            _id: "sub-1",
            assignmentId: { title: "Array Frequency Counter" },
            score: 90,
            status: "PASSED",
            createdAt: new Date().toISOString(),
          },
        ],
        aiRecommendedAssignment: {
          _id: "ai-1",
          title: "Recursive Factorial Practice",
          topic: "Recursion",
          language: "C++",
          difficulty: "MEDIUM",
          agentReason:
            "AI detected that Recursion is your weakest topic (35% mastery).",
        },
      },
    });

    progressService.getStudentLearningPath.mockResolvedValueOnce({
      data: {
        targetFocus: ["Recursion"],
        steps: [
          { step: 1, topic: "Loops", status: "COMPLETED" },
          { step: 2, topic: "Arrays", status: "COMPLETED" },
          { step: 3, topic: "Recursion", status: "IN_PROGRESS" },
        ],
        nextActivity: {
          title: "Recursive Factorial Practice",
          reason: "Strengthen base and recursive case logic.",
          targetUrl: "/student/assignments/ai-1",
        },
      },
    });

    progressService.getStudentProgress.mockResolvedValueOnce({
      data: {
        languages: [
          {
            language: "C++",
            topics: [
              { topic: "Recursion", masteryScore: 35, attempts: 12 },
              { topic: "Loops", masteryScore: 48, attempts: 8 },
              { topic: "Arrays", masteryScore: 62, attempts: 15 },
              { topic: "Searching", masteryScore: 78, attempts: 20 },
              { topic: "Sorting", masteryScore: 81, attempts: 22 },
            ],
          },
        ],
      },
    });

    assignmentService.getAssignments.mockResolvedValueOnce({
      data: {
        assignments: [
          {
            _id: "assign-1",
            title: "Recursive Factorial Practice",
            topic: "Recursion",
            source: "AI_AGENT",
            difficulty: "MEDIUM",
            status: "NOT_STARTED",
          },
          {
            _id: "assign-2",
            title: "Array Frequency Counter",
            topic: "Arrays",
            source: "TEACHER",
            difficulty: "EASY",
            status: "PASSED",
            score: 90,
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <StudentDashboard />
      </MemoryRouter>
    );

    // Verify loading spinner first
    expect(screen.getByText("Loading your learning hub...")).toBeInTheDocument();

    // Wait for header to appear first
    expect((await screen.findAllByText(/Rahul/)).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Search assignment name...")).toBeInTheDocument();

    expect(screen.getByText("Your Learning Progress")).toBeInTheDocument();
    expect(screen.getByText(/68%/)).toBeInTheDocument();
    expect(screen.getByText("Completed Quizzes")).toBeInTheDocument();
    expect(screen.getByText("CURRENT FOCUS")).toBeInTheDocument();
    expect(screen.getAllByText(/Recursion/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Needs Practice/).length).toBeGreaterThan(0);
    expect(screen.getByText("🤖 AI Recommended For You")).toBeInTheDocument();
    expect(screen.getAllByText(/Recursive Factorial Practice/).length).toBeGreaterThan(0);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Start Daily Quiz")).toBeInTheDocument();
    expect(screen.getByText("Topics to Improve")).toBeInTheDocument();
    expect(screen.getByText("Daily AI Quiz")).toBeInTheDocument();
    expect(screen.getByText(/Not Completed/)).toBeInTheDocument();
    expect(screen.getByText("Your Learning Path")).toBeInTheDocument();
    expect(screen.getByText("Recent Assignments")).toBeInTheDocument();
    expect(screen.getAllByText(/Array Frequency Counter/).length).toBeGreaterThan(0);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Keep Going!")).toBeInTheDocument();
  });

  it("renders clean fallback empty state when no AI recommendation exists", async () => {
    progressService.getStudentDashboard.mockResolvedValueOnce({
      data: {
        averageScore: 0,
        activeAssignmentsCount: 0,
        totalSubmissions: 0,
        todayQuizStatus: { available: true, completed: false },
        weakTopics: [],
        recentSubmissions: [],
        aiRecommendedAssignment: null,
      },
    });

    progressService.getStudentLearningPath.mockResolvedValueOnce({
      data: { steps: [], targetFocus: [] },
    });

    progressService.getStudentProgress.mockResolvedValueOnce({
      data: { languages: [] },
    });

    assignmentService.getAssignments.mockResolvedValueOnce({
      data: { assignments: [] },
    });

    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Your Learning Progress")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("You're currently all caught up on AI practice assignments!")).toBeInTheDocument();
    });
  });
});
