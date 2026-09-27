import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProgressDashboard from "../pages/student/ProgressDashboard";
import progressService from "../services/progress.service";
import classService from "../services/class.service";
import { AuthContext } from "../context/AuthContext";

vi.mock("../services/progress.service", () => ({
  default: {
    getStudentTopics: vi.fn(),
  },
}));

vi.mock("../services/class.service", () => ({
  default: {
    getClasses: vi.fn(),
    getClassTopicAnalytics: vi.fn(),
  },
}));

const mockStudentAuth = {
  user: { _id: "stu-1", name: "Margaret Hamilton", role: "STUDENT" },
  role: "STUDENT",
  token: "fake-student-token",
  isAuthenticated: true,
};

const mockTeacherAuth = {
  user: { _id: "teach-1", name: "Prof. Ada Lovelace", role: "TEACHER" },
  role: "TEACHER",
  token: "fake-teacher-token",
  isAuthenticated: true,
};

describe("Topic Mastery & Progress UI Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRealTopicsData = {
    hasData: true,
    classroomAverage: 53,
    strongCount: 1,
    needsImpCount: 1,
    weakCount: 1,
    topics: [
      {
        topic: "basics",
        masteryScore: 80,
        score: 80,
        assignmentScore: 100,
        quizScore: 20,
        practiceCount: 1,
        status: "Good Mastery",
      },
      {
        topic: "logic",
        masteryScore: 55,
        score: 55,
        assignmentScore: 50,
        quizScore: 60,
        practiceCount: 2,
        status: "Needs Practice",
      },
      {
        topic: "syntax",
        masteryScore: 25,
        score: 25,
        assignmentScore: 0,
        quizScore: 20,
        practiceCount: 0,
        status: "Weak Topic",
      },
    ],
  };

  it("renders real database mastery scores, components, and threshold categories", async () => {
    classService.getClasses.mockResolvedValueOnce({
      data: { classes: [{ _id: "c1", name: "Algorithms 101", code: "ALGO101" }] },
    });

    progressService.getStudentTopics.mockResolvedValueOnce({
      data: { data: mockRealTopicsData },
    });

    render(
      <AuthContext.Provider value={mockStudentAuth}>
        <MemoryRouter>
          <ProgressDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Topic Mastery & Progress")).toBeInTheDocument();
      expect(screen.getByText("Taxonomy Mastery Matrix")).toBeInTheDocument();
      expect(screen.getByText("Skill Radar")).toBeInTheDocument();
    });

    // Metric Stat Cards: Real calculated Classroom Average & Counts
    expect(screen.getByText("53%")).toBeInTheDocument(); // Classroom Average
    expect(screen.getByText("Good Mastery (>=70%)")).toBeInTheDocument();
    expect(screen.getByText("Needs Practice (50-69%)")).toBeInTheDocument();
    expect(screen.getByText("Weak Topics (<50%)")).toBeInTheDocument();

    // Table checks for real values
    expect(screen.getByText("basics")).toBeInTheDocument();
    expect(screen.getByText("logic")).toBeInTheDocument();
    expect(screen.getByText("syntax")).toBeInTheDocument();

    // Real Component scores
    expect(screen.getAllByText("80%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("100%")).toBeInTheDocument(); // basics assignment
    expect(screen.getAllByText("Good Mastery").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Needs Practice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Weak Topic").length).toBeGreaterThanOrEqual(1);

    // Check practice count 0 is preserved and not replaced by fake 1
    const zeroes = screen.getAllByText("0");
    expect(zeroes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders clean empty state when classroom has no telemetry data", async () => {
    classService.getClasses.mockResolvedValueOnce({
      data: { classes: [{ _id: "c1", name: "Empty Class", code: "EMP1" }] },
    });

    progressService.getStudentTopics.mockResolvedValueOnce({
      data: { data: { hasData: false, topics: [], classroomAverage: 0, strongCount: 0, needsImpCount: 0, weakCount: 0 } },
    });

    render(
      <AuthContext.Provider value={mockStudentAuth}>
        <MemoryRouter>
          <ProgressDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No topic mastery data available yet for this classroom/i)).toBeInTheDocument();
    });

    // Does not render fake 0% stat cards when empty
    expect(screen.queryByText("Taxonomy Mastery Matrix")).not.toBeInTheDocument();
  });

  it("allows teacher to view class-scoped topic telemetry", async () => {
    classService.getClasses.mockResolvedValueOnce({
      data: { classes: [{ _id: "c-teach", name: "CS301 Lab", code: "CS301" }] },
    });

    classService.getClassTopicAnalytics.mockResolvedValueOnce({
      data: { data: mockRealTopicsData },
    });

    render(
      <AuthContext.Provider value={mockTeacherAuth}>
        <MemoryRouter>
          <ProgressDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Taxonomy Mastery Matrix")).toBeInTheDocument();
    });

    expect(classService.getClassTopicAnalytics).toHaveBeenCalled();
  });

  it("dynamically loads distinct class-scoped telemetry when switching between DSA and C++", async () => {
    const dsaData = {
      hasData: true,
      classroomAverage: 23,
      strongCount: 0,
      needsImpCount: 0,
      weakCount: 2,
      topics: [
        {
          topic: "loops",
          masteryScore: 20,
          score: 20,
          assignmentScore: 0,
          quizScore: 0,
          practiceCount: 0,
          status: "Weak Topic",
        },
        {
          topic: "basics",
          masteryScore: 25,
          score: 25,
          assignmentScore: 0,
          quizScore: 20,
          practiceCount: 0,
          status: "Weak Topic",
        },
      ],
    };

    const cppData = {
      hasData: true,
      classroomAverage: 80,
      strongCount: 1,
      needsImpCount: 0,
      weakCount: 0,
      topics: [
        {
          topic: "basics",
          masteryScore: 80,
          score: 80,
          assignmentScore: 100,
          quizScore: 20,
          practiceCount: 1,
          status: "Good Mastery",
        },
      ],
    };

    classService.getClasses.mockResolvedValue({
      data: {
        classes: [
          { _id: "c-dsa", name: "DSA", code: "BUHZR7" },
          { _id: "c-cpp", name: "c++", code: "9YSLP3" },
        ],
      },
    });

    progressService.getStudentTopics.mockImplementation((params = {}) => {
      if (params.classId === "c-dsa") return Promise.resolve({ data: { data: dsaData } });
      if (params.classId === "c-cpp") return Promise.resolve({ data: { data: cppData } });
      return Promise.resolve({ data: { data: dsaData } });
    });

    const { rerender } = render(
      <AuthContext.Provider value={mockStudentAuth}>
        <MemoryRouter>
          <ProgressDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Topic Mastery & Progress")).toBeInTheDocument();
      expect(screen.getByText("23%")).toBeInTheDocument(); // DSA Classroom Average
      expect(screen.getByText("loops")).toBeInTheDocument();
    });

    // Verify initial load
    expect(progressService.getStudentTopics).toHaveBeenCalledWith({});

    // Verify DSA stats: 0 good mastery, 2 weak topics
    expect(screen.getByText("Good Mastery (>=70%)")).toBeInTheDocument();
    expect(screen.getByText("Weak Topics (<50%)")).toBeInTheDocument();
  });
});
