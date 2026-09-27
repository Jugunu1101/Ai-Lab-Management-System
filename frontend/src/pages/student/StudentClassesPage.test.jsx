import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StudentClassesPage from "./StudentClassesPage";
import classService from "../../services/class.service";

vi.mock("../../services/class.service", () => ({
  default: {
    getClasses: vi.fn(),
  },
}));

describe("StudentClassesPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    classService.getClasses.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <StudentClassesPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading your enrolled classes.../i)).toBeInTheDocument();
  });

  it("renders all enrolled classes returned by backend (3 classes)", async () => {
    const mockClasses = [
      {
        _id: "c1",
        name: "Data Structures & Algorithms",
        code: "BUHZR7",
        department: "Computer Science",
        semester: "Fall 2026",
        teacherId: { name: "Prof. Uday", email: "uday@mit.edu" },
        languages: ["cpp", "python"],
      },
      {
        _id: "c2",
        name: "C++ Programming",
        code: "9YSLP3",
        department: "Computer Science",
        semester: "Fall 2026",
        teacherId: { name: "Prof. Uday", email: "uday@mit.edu" },
        languages: ["cpp"],
      },
      {
        _id: "c3",
        name: "C Lab",
        code: "8UXM82",
        department: "Computer Science",
        semester: "Fall 2026",
        teacherId: { name: "Prof. Davis", email: "davis@mit.edu" },
        languages: ["c"],
      },
    ];

    classService.getClasses.mockResolvedValue({ data: mockClasses });

    render(
      <MemoryRouter>
        <StudentClassesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Data Structures & Algorithms")).toBeInTheDocument();
      expect(screen.getByText("C++ Programming")).toBeInTheDocument();
      expect(screen.getByText("C Lab")).toBeInTheDocument();
    });

    expect(screen.getByText("BUHZR7")).toBeInTheDocument();
    expect(screen.getByText("9YSLP3")).toBeInTheDocument();
    expect(screen.getByText("8UXM82")).toBeInTheDocument();
  });

  it("renders empty state when student has 0 enrolled classes", async () => {
    classService.getClasses.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <StudentClassesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You are not enrolled in any classes yet/i)).toBeInTheDocument();
    });
  });
});
