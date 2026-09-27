import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SubmissionHistory from "./SubmissionHistory";
import submissionService from "../../services/submission.service";

vi.mock("../../services/submission.service", () => ({
  default: {
    getSubmissions: vi.fn(),
    getSubmissionDetails: vi.fn(),
  },
}));

vi.mock("../../components/student/SubmissionResultModal", () => ({
  default: ({ visible, submission }) =>
    visible ? <div data-testid="submission-result-modal">{submission?.status}</div> : null,
}));

describe("SubmissionHistory Security & Rendering Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubmissions = [
    {
      _id: "65f1a2b3c4d5e6f7a8b9c0d1",
      assignmentTitle: "Sum of Two Numbers",
      language: "cpp",
      status: "PASSED",
      passedTestCases: 3,
      totalTestCases: 3,
      executionTime: 45,
      createdAt: "2026-03-20T10:00:00.000Z",
    },
    {
      _id: "65f1a2b3c4d5e6f7a8b9c0d2",
      assignmentTitle: "Reverse a String",
      language: "python",
      status: "FAILED",
      passedTestCases: 1,
      totalTestCases: 3,
      executionTime: 110,
      createdAt: "2026-03-21T11:00:00.000Z",
    },
  ];

  it("renders submission history without leaking raw MongoDB ObjectIds in visible text", async () => {
    submissionService.getSubmissions.mockResolvedValue({
      data: { data: mockSubmissions },
    });

    render(
      <BrowserRouter>
        <SubmissionHistory />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sum of Two Numbers")).toBeInTheDocument();
      expect(screen.getByText("Reverse a String")).toBeInTheDocument();
    });

    // Verify 24-character hexadecimal MongoDB ObjectIds are NOT rendered as text
    expect(screen.queryByText(/65f1a2b3c4d5e6f7a8b9c0d1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/65f1a2b3c4d5e6f7a8b9c0d2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ID:\s*65f1/i)).not.toBeInTheDocument();
  });
});
