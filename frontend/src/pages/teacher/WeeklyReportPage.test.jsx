import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeeklyReportPage } from "./WeeklyReportPage";
import classService from "../../services/class.service";
import reportService from "../../services/report.service";

vi.mock("../../services/class.service", () => {
  const mock = {
    getClasses: vi.fn(),
  };
  return {
    default: mock,
    classService: mock,
  };
});

vi.mock("../../services/report.service", () => {
  const mock = {
    getWeeklyReports: vi.fn(),
    generateWeeklyReport: vi.fn(),
  };
  return {
    default: mock,
    reportService: mock,
  };
});

describe("WeeklyReportPage Component", () => {
  const mockClasses = [
    { _id: "class1", name: "DSA", students: ["s1", "s2"] },
  ];

  const mockReport = {
    _id: "rep1",
    classId: "class1",
    className: "DSA",
    weekStart: "2026-09-18T00:00:00.000Z",
    weekEnd: "2026-09-25T23:59:59.999Z",
    statistics: {
      totalStudents: 30,
      activeStudents: 24,
      totalSubmissions: 82,
      averageScore: 67,
    },
    strongConcepts: [
      { topic: "Arrays", score: 78 },
    ],
    vulnerableConcepts: [
      { topic: "Recursion", score: 43 },
    ],
    studentsNeedingIntervention: [
      {
        studentId: "s1",
        studentName: "Real Student Alice",
        name: "Real Student Alice",
        reasons: ["Recursion mastery: 38%", "2 failed assignment submissions"],
        score: 35,
      },
    ],
    summary: "Class DSA achieved steady progress with an average score of 67%. Strong performance in Arrays was observed, while Recursion requires targeted focus.",
    recommendations: [
      "Dedicate a targeted lab session to call-stack visualization for Recursion.",
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header and generate button", async () => {
    classService.getClasses.mockResolvedValue({ data: mockClasses });
    reportService.getWeeklyReports.mockResolvedValue({ data: { success: true, data: [] } });

    render(<WeeklyReportPage />);

    expect(screen.getByText("Weekly AI Classroom Reports")).toBeInTheDocument();
    expect(screen.getByText("Generate with AI")).toBeInTheDocument();
  });

  it("displays weekly report data when available", async () => {
    classService.getClasses.mockResolvedValue({ data: mockClasses });
    reportService.getWeeklyReports.mockResolvedValue({ data: { success: true, data: [mockReport] } });

    render(<WeeklyReportPage />);

    await waitFor(
      () => {
        expect(screen.getByText("WEEKLY COHORT DIAGNOSTIC")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(screen.getByText("Executive AI Summary")).toBeInTheDocument();
    expect(screen.getByText(/Class DSA achieved steady progress/)).toBeInTheDocument();
    expect(screen.getByText("Strong Cohort Concepts")).toBeInTheDocument();
    expect(screen.getAllByText(/Arrays/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Vulnerable Concepts (Score < 50%)")).toBeInTheDocument();
    expect(screen.getAllByText(/Recursion/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Real Student Alice")).toBeInTheDocument();
    expect(screen.getByText("Recursion mastery: 38%")).toBeInTheDocument();
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
  });

  it("handles empty state when no report exists", async () => {
    classService.getClasses.mockResolvedValue({ data: mockClasses });
    reportService.getWeeklyReports.mockResolvedValue({ data: { success: true, data: [] } });

    render(<WeeklyReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/No student activity was recorded during this period/i)).toBeInTheDocument();
    });
  });

  it("handles multi-class selection and generates report with correct classId", async () => {
    const multiClasses = [
      { _id: "classA", name: "DSA", students: ["s1", "s2"] },
      { _id: "classB", name: "c++", students: ["s3", "s4"] },
      { _id: "classC", name: "CS101", students: ["s5"] },
      { _id: "classD", name: "Advanced Systems Lab", students: [] },
    ];

    const reportB = {
      _id: "repB",
      classId: "classB",
      className: "c++",
      weekStart: "2026-09-20T00:00:00.000Z",
      weekEnd: "2026-09-27T23:59:59.999Z",
      statistics: {
        totalStudents: 3,
        activeStudents: 3,
        totalSubmissions: 5,
        averageScore: 100,
      },
      strongConcepts: [{ topic: "Recursion & Functions", score: 85 }],
      vulnerableConcepts: [{ topic: "Basics", score: 40 }],
      summary: "Cohort c++ achieved 100% average score with strong performance in Recursion & Functions.",
      recommendations: ["Review basics syntax."],
    };

    classService.getClasses.mockResolvedValue({ data: multiClasses });
    reportService.getWeeklyReports.mockImplementation((id) => {
      if (id === "classA") return Promise.resolve({ data: [mockReport] });
      return Promise.resolve({ data: [] });
    });
    reportService.generateWeeklyReport.mockResolvedValue({ data: reportB });

    render(<WeeklyReportPage />);

    // Initial load displays Class A
    await waitFor(() => {
      expect(screen.getByText("WEEKLY COHORT DIAGNOSTIC")).toBeInTheDocument();
    });
    expect(screen.getByText(/Class DSA achieved steady progress/)).toBeInTheDocument();

    // Generate for Class B
    const generateBtn = screen.getByText("Generate with AI");
    fireEvent.click(generateBtn);

    // Verify reportService was invoked
    await waitFor(() => {
      expect(reportService.generateWeeklyReport).toHaveBeenCalled();
    });
  });

  it("invokes window.print on Export PDF click", async () => {
    classService.getClasses.mockResolvedValue({ data: mockClasses });
    reportService.getWeeklyReports.mockResolvedValue({ data: { success: true, data: [mockReport] } });
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(<WeeklyReportPage />);

    await waitFor(() => {
      expect(screen.getByText("Export PDF")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Export PDF"));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
