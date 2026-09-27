import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AssignmentList from "../pages/student/AssignmentList";
import assignmentService from "../services/assignment.service";

vi.mock("../services/assignment.service", () => ({
  default: {
    getAssignments: vi.fn(),
  },
}));

describe("AssignmentList - AI Practice & Card Internal Layout Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAiAndTeacherAssignments = [
    {
      _id: "ai-assign-1",
      title: "Nested Number Triangle Pattern with Extreme Title Length and Complexity",
      description: "Generate a right-angled numerical pattern using nested loops in CPP with detailed edge cases and constraints.",
      topics: ["loops", "nested-logic", "patterns"],
      source: "AI_GENERATED",
      difficulty: "MEDIUM",
      programmingLanguage: "CPP",
      status: "NOT_STARTED",
      deadline: "2026-10-15T23:59:59.000Z",
      attempts: 0,
      maxAttempts: 3,
      agentReason: "AI-generated problem curated to strengthen programming concepts and loop iteration logic with deep nesting.",
    },
    {
      _id: "teacher-assign-1",
      title: "Create a factorial program",
      description: "Make a program to print the factorial of the given number recursively.",
      topics: ["recursion", "basics"],
      source: "TEACHER",
      difficulty: "EASY",
      programmingLanguage: "CPP",
      status: "COMPLETED",
      score: 100,
      deadline: "2026-09-29T23:59:59.000Z",
      attempts: 1,
      maxAttempts: 5,
    },
  ];

  it("renders AI Practice context box with icon and wrapping text structure without overflow", async () => {
    assignmentService.getAssignments.mockResolvedValueOnce({
      data: { assignments: mockAiAndTeacherAssignments },
    });

    const { container } = render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/AI Practice & Generated Assignments/i)).toBeInTheDocument();
      expect(screen.getByText(/Classroom Assignments/i)).toBeInTheDocument();
    });

    // Verify AI Practice context box exists
    const aiContext = container.querySelector(".assignment-card-ai-context");
    expect(aiContext).toBeInTheDocument();

    // Verify icon exists and text container exists
    const aiIcon = container.querySelector(".assignment-card-ai-icon");
    expect(aiIcon).toBeInTheDocument();
    expect(aiIcon).toHaveTextContent("⚡");

    const aiText = container.querySelector(".assignment-card-ai-text");
    expect(aiText).toBeInTheDocument();
    expect(aiText).toHaveTextContent("AI Practice:");
    expect(aiText).toHaveTextContent("AI-generated problem curated to strengthen programming concepts");

    // Verify title and desc
    expect(screen.getByText(/Nested Number Triangle Pattern/)).toBeInTheDocument();
    expect(screen.getByText(/Generate a right-angled numerical pattern/)).toBeInTheDocument();

    // Verify topic tags
    expect(screen.getByText("#loops")).toBeInTheDocument();

    // Verify action button
    const aiBtn = screen.getByRole("button", { name: /Start AI Assignment/i });
    expect(aiBtn).toBeInTheDocument();

    // Verify teacher card
    expect(screen.getByText("Create a factorial program")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Score: 100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View Submission/i })).toBeInTheDocument();
  });

  it("handles AI agent practice assignments with custom reasons cleanly", async () => {
    const aiAgentAssignment = [
      {
        _id: "ai-agent-1",
        title: "Dynamic Array Rotation",
        description: "Rotate an array to the right by k steps in-place.",
        topics: ["arrays"],
        source: "AI_AGENT",
        difficulty: "HARD",
        programmingLanguage: "CPP",
        status: "IN_PROGRESS",
        agentReason: "Created specifically to build your mastery in this weak topic.",
      },
    ];

    assignmentService.getAssignments.mockResolvedValueOnce({
      data: { assignments: aiAgentAssignment },
    });

    const { container } = render(
      <MemoryRouter>
        <AssignmentList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dynamic Array Rotation")).toBeInTheDocument();
    });

    const aiIcon = container.querySelector(".assignment-card-ai-icon");
    expect(aiIcon).toHaveTextContent("💡");

    const aiText = container.querySelector(".assignment-card-ai-text");
    expect(aiText).toHaveTextContent("Why this practice:");
    expect(aiText).toHaveTextContent("Created specifically to build your mastery in this weak topic.");

    const continueBtn = screen.getByRole("button", { name: /Continue AI Practice/i });
    expect(continueBtn).toBeInTheDocument();
  });
});
