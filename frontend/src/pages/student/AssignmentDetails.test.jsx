import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AssignmentDetails from "./AssignmentDetails";
import assignmentService from "../../services/assignment.service";
import submissionService from "../../services/submission.service";

// Mock Monaco Editor component
vi.mock("../../components/shared/CodeEditor", () => ({
  default: ({ value, language }) => (
    <div data-testid="code-editor" data-language={language}>
      {value}
    </div>
  ),
}));

// Mock SubmissionResultModal
vi.mock("../../components/student/SubmissionResultModal", () => ({
  default: () => <div data-testid="submission-result-modal" />,
}));

vi.mock("../../services/assignment.service", () => ({
  default: {
    getAssignmentById: vi.fn(),
  },
}));

vi.mock("../../services/submission.service", () => ({
  default: {
    getSubmissions: vi.fn(),
    submitCode: vi.fn(),
    runTests: vi.fn(),
  },
}));

describe("AssignmentDetails - Assignment Submission & Code Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const factorialAssignment = {
    _id: "factorial-id-123",
    title: "Create a factorial program",
    language: "cpp",
    programmingLanguage: "cpp",
    description: "Write a program to calculate factorial",
    starterCode: "// Default C++ factorial starter",
    testCases: [{ input: "5", expectedOutput: "120", isHidden: false }],
  };

  const binaryAssignment = {
    _id: "binary-id-456",
    title: "binary",
    language: "cpp",
    programmingLanguage: "cpp",
    description: "Write a program to implement binary search",
    starterCode: "// Default C++ binary search starter",
    testCases: [{ input: "1 2 3\n2", expectedOutput: "1", isHidden: false }],
  };

  const factorialSubmission = {
    _id: "sub-fact-999",
    assignmentId: { _id: "factorial-id-123", title: "Create a factorial program" },
    status: "PASSED",
    score: 100,
    language: "cpp",
    code: "#include <iostream>\n// FACTORIAL COMPLETED SOLUTION\nint fact(int n){ return n<=1?1:n*fact(n-1); }",
  };

  it("displays completed state and previous code when viewing factorial assignment", async () => {
    assignmentService.getAssignmentById.mockResolvedValueOnce({
      data: factorialAssignment,
    });
    submissionService.getSubmissions.mockResolvedValueOnce({
      data: [factorialSubmission],
    });

    render(
      <MemoryRouter initialEntries={["/student/assignments/factorial-id-123"]}>
        <Routes>
          <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify assignment title
    await waitFor(() => {
      expect(screen.getByText("Create a factorial program")).toBeInTheDocument();
    });

    // Verify completion banner
    expect(screen.getByText("Assignment Completed")).toBeInTheDocument();
    expect(screen.getByText(/successfully completed this assignment with a score of 100%/)).toBeInTheDocument();

    // Verify editor contains factorial solution
    const editor = screen.getByTestId("code-editor");
    expect(editor.textContent).toContain("// FACTORIAL COMPLETED SOLUTION");
  });

  it("strictly isolates binary assignment: no completion banner, no factorial score, no factorial code", async () => {
    assignmentService.getAssignmentById.mockResolvedValueOnce({
      data: binaryAssignment,
    });
    // Backend correctly returns empty array for binary assignment
    submissionService.getSubmissions.mockResolvedValueOnce({
      data: [],
    });

    render(
      <MemoryRouter initialEntries={["/student/assignments/binary-id-456"]}>
        <Routes>
          <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify assignment title
    await waitFor(() => {
      expect(screen.getByText("binary")).toBeInTheDocument();
    });

    // Verify NO completion banner
    expect(screen.queryByText("Assignment Completed")).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();

    // Verify editor contains binary starter code, NEVER factorial code
    const editor = screen.getByTestId("code-editor");
    expect(editor.textContent).toContain("// Default C++ binary search starter");
    expect(editor.textContent).not.toContain("FACTORIAL");
  });

  it("defensively ignores cross-assignment submissions if accidentally returned by API", async () => {
    assignmentService.getAssignmentById.mockResolvedValueOnce({
      data: binaryAssignment,
    });
    // Simulate backend returning a submission belonging to another assignment (factorial)
    submissionService.getSubmissions.mockResolvedValueOnce({
      data: [factorialSubmission],
    });

    render(
      <MemoryRouter initialEntries={["/student/assignments/binary-id-456"]}>
        <Routes>
          <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("binary")).toBeInTheDocument();
    });

    // Frontend defensive filtering MUST drop the factorial submission
    expect(screen.queryByText("Assignment Completed")).not.toBeInTheDocument();
    const editor = screen.getByTestId("code-editor");
    expect(editor.textContent).toContain("// Default C++ binary search starter");
    expect(editor.textContent).not.toContain("FACTORIAL");
  });
});
