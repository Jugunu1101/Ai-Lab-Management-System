import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TeacherDashboard from "./TeacherDashboard";
import classService from "../../services/class.service";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../services/class.service", () => ({
  default: {
    getTeacherDashboard: vi.fn(),
    getClasses: vi.fn(),
  },
}));

describe("TeacherDashboard Component - SaaS Redesign", () => {
  const mockDashboardData = {
    totalStudents: 4,
    averageScore: 48,
    submissionRate: 13,
    activeClasses: 2,
    atRiskStudents: [
      {
        _id: "stud1",
        studentId: "stud1",
        name: "DemoStudent",
        className: "DSA",
        score: 32,
        reason: "Mastery is below 45% threshold (32%)",
      },
    ],
    submissionActivity: [
      { day: "Mon", submissions: 12, passes: 10 },
      { day: "Tue", submissions: 15, passes: 13 },
      { day: "Wed", submissions: 8, passes: 6 },
    ],
    activeClassesList: [
      {
        _id: "class1",
        name: "Data Structures & Algorithms",
        code: "BUHZR7",
        studentCount: 2,
        averageMastery: 42,
      },
      {
        _id: "class2",
        name: "C++ Programming",
        code: "9YSLP3",
        studentCount: 2,
        averageMastery: 65,
      },
    ],
    recentSubmissions: [
      {
        _id: "sub1",
        studentName: "DemoStudent",
        assignmentTitle: "Sum of Even Numbers",
        className: "DSA",
        status: "PASSED",
        score: 100,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const mockClassesList = [
    {
      _id: "class1",
      name: "Data Structures & Algorithms",
      code: "BUHZR7",
      students: ["stud1", "stud2"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    classService.getTeacherDashboard.mockResolvedValue({
      data: { data: mockDashboardData },
    });
    classService.getClasses.mockResolvedValue({
      data: { classes: mockClassesList },
    });
  });

  it("renders the dashboard header, title, subtitle, and primary actions", async () => {
    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Instructor Dashboard")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Monitor student execution telemetry, class aggregate mastery/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Assignment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Classroom/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Weekly AI Report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
  });

  it("renders 4 KPI cards with real metrics and uppercase labels without fake trends", async () => {
    const { container } = render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("TOTAL STUDENTS ENROLLED")).toBeInTheDocument();
    });

    expect(screen.getByText("AVERAGE CLASS MASTERY")).toBeInTheDocument();
    expect(screen.getByText("SUBMISSION COMPLETION RATE")).toBeInTheDocument();
    expect(screen.getByText("AT-RISK INTERVENTIONS")).toBeInTheDocument();

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
    expect(screen.getByText("13%")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // Verify no fake trend indicators (+12%, -5%, etc.)
    expect(container.textContent).not.toMatch(/\+12%/);
    expect(container.textContent).not.toMatch(/-5%/);
  });

  it("renders Weekly Code Executions Chart and Active Classes panel", async () => {
    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Weekly Code Executions & Pass Rates")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Active Classes")).toBeInTheDocument();
    expect(screen.getByText("Data Structures & Algorithms")).toBeInTheDocument();
    expect(screen.getByText("BUHZR7")).toBeInTheDocument();
    expect(screen.getByText("C++ Programming")).toBeInTheDocument();
    expect(screen.getByText("9YSLP3")).toBeInTheDocument();
  });

  it("renders Recent Submissions, At-Risk Students, and Quick Actions", async () => {
    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Recent Submissions")).toBeInTheDocument();
    });

    expect(screen.getByText("Students Needing Attention")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();

    // Recent submission entry
    expect(screen.getByText("Sum of Even Numbers · DSA")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();

    // At-Risk entry
    expect(screen.getByText("32%")).toBeInTheDocument();

    // Quick Actions tiles
    expect(screen.getByText("Detailed class insights")).toBeInTheDocument();
    expect(screen.getByText("AI-powered summary & digest")).toBeInTheDocument();
  });

  it("navigates to analytics when clicking View Analytics quick action", async () => {
    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("View Analytics")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("View Analytics"));
    expect(mockNavigate).toHaveBeenCalledWith("/teacher/analytics");
  });
});
