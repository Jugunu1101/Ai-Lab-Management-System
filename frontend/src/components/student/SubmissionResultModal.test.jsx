import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SubmissionResultModal } from "./SubmissionResultModal";
import submissionService from "../../services/submission.service";

vi.mock("../../services/submission.service", () => ({
  default: {
    getSubmissionById: vi.fn(),
  },
}));

describe("SubmissionResultModal - AI Evaluation & Feedback Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders PASSED submission with real AI concept mastery and recommendations", () => {
    const passedSubmission = {
      _id: "sub-123",
      status: "PASSED",
      language: "cpp",
      testCasesPassed: 3,
      totalTestCases: 3,
      executionTime: 45,
      code: "#include <iostream>\nint main() { return 0; }",
      aiAnalysis: {
        mastery: [
          { topic: "loops", score: 92 },
          { topic: "arrays", score: 88 },
        ],
        weakTopics: [],
        mistakes: [],
        recommendations: [
          "Optimal implementation in CPP. Solution successfully passed all automated test cases.",
          "Demonstrated strong mastery of loops. Consider exploring additional edge cases.",
        ],
      },
      testResults: [
        { testCaseIndex: 0, passed: true, input: "5", expectedOutput: "120", actualOutput: "120" },
      ],
    };

    render(
      <SubmissionResultModal
        open={true}
        onClose={() => {}}
        submission={passedSubmission}
      />
    );

    expect(screen.getByText(/Submission Details: PASSED/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated AI Code Assessment: PASSED/i)).toBeInTheDocument();
    expect(screen.getByText(/Concept Mastery/i)).toBeInTheDocument();
    expect(screen.getByText("loops")).toBeInTheDocument();
    expect(screen.getByText("arrays")).toBeInTheDocument();
    expect(screen.getByText(/Optimal implementation in CPP/i)).toBeInTheDocument();
    expect(screen.getByText(/Demonstrated strong mastery of loops/i)).toBeInTheDocument();
  });

  it("renders FAILED submission with mistakes, weak topics, and debugging recommendations", () => {
    const failedSubmission = {
      _id: "sub-456",
      status: "FAILED",
      language: "python",
      testCasesPassed: 1,
      totalTestCases: 3,
      executionTime: 85,
      code: "def solve(): return -1",
      aiAnalysis: {
        mastery: [
          { topic: "recursion", score: 35 },
        ],
        weakTopics: ["recursion"],
        mistakes: [
          "Logic or boundary check discrepancy detected during python test runner execution.",
          "Failed 2 automated test cases. Check loop invariants or return types.",
        ],
        recommendations: [
          "Step through your recursion logic with boundary inputs.",
          "Review recursion fundamentals and base cases.",
        ],
      },
    };

    render(
      <SubmissionResultModal
        open={true}
        onClose={() => {}}
        submission={failedSubmission}
      />
    );

    expect(screen.getByText(/Submission Details: FAILED/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated AI Diagnostic: NEEDS ATTENTION/i)).toBeInTheDocument();
    expect(screen.getAllByText("recursion").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Detected Issues & Mistakes:/i)).toBeInTheDocument();
    expect(screen.getByText(/Logic or boundary check discrepancy/i)).toBeInTheDocument();
    expect(screen.getByText(/Step through your recursion logic/i)).toBeInTheDocument();
  });

  it("fetches full submission and shows loading state when AI analysis is missing on open", async () => {
    const incompleteSubmission = {
      _id: "sub-789",
      status: "PASSED",
      language: "cpp",
      testCasesPassed: 1,
      totalTestCases: 1,
    };

    const fullSubmissionData = {
      _id: "sub-789",
      status: "PASSED",
      language: "cpp",
      testCasesPassed: 1,
      totalTestCases: 1,
      aiAnalysis: {
        mastery: [{ topic: "math", score: 95 }],
        weakTopics: [],
        mistakes: [],
        recommendations: ["Clean factorial solution."],
      },
    };

    submissionService.getSubmissionById.mockResolvedValueOnce({
      data: { submission: fullSubmissionData },
    });

    render(
      <SubmissionResultModal
        open={true}
        onClose={() => {}}
        submission={incompleteSubmission}
      />
    );

    expect(submissionService.getSubmissionById).toHaveBeenCalledWith("sub-789");

    await waitFor(() => {
      expect(screen.getByText("math")).toBeInTheDocument();
      expect(screen.getByText("Clean factorial solution.")).toBeInTheDocument();
    });
  });

  it("renders appropriate empty state when AI evaluation is genuinely unavailable", () => {
    const submissionWithoutAI = {
      status: "COMPLETED",
      language: "java",
      testCasesPassed: 0,
      totalTestCases: 0,
    };

    render(
      <SubmissionResultModal
        open={true}
        onClose={() => {}}
        submission={submissionWithoutAI}
      />
    );

    expect(
      screen.getByText(/AI evaluation is not available for this submission yet/i)
    ).toBeInTheDocument();
  });
});
