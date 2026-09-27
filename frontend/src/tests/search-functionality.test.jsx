import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import AssignmentList from "../pages/student/AssignmentList";
import StudentClassesPage from "../pages/student/StudentClassesPage";
import ClassListPage from "../pages/teacher/ClassListPage";
import UserManagementPage from "../pages/admin/UserManagementPage";
import assignmentService from "../services/assignment.service";
import classService from "../services/class.service";
import adminService from "../services/admin.service";
import { AuthContext } from "../context/AuthContext";

vi.mock("../services/assignment.service", () => ({
  default: {
    getAssignments: vi.fn(),
  },
}));

vi.mock("../services/class.service", () => ({
  default: {
    getClasses: vi.fn(),
  },
}));

vi.mock("../services/admin.service", () => ({
  default: {
    getUsers: vi.fn(),
    getPendingTeachers: vi.fn().mockResolvedValue({ data: [] }),
    getCollege: vi.fn().mockResolvedValue({ data: { domains: [] } }),
  },
}));

const mockTeacherAuth = {
  user: { _id: "t1", name: "Prof. Alan Turing", role: "TEACHER" },
  role: "TEACHER",
  token: "fake-token",
  isAuthenticated: true,
};

const mockAdminAuth = {
  user: { _id: "a1", name: "Admin User", role: "ADMIN" },
  role: "ADMIN",
  token: "fake-token",
  isAuthenticated: true,
};

describe("Frontend Search Bars Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AssignmentList Search", () => {
    const mockAssignments = [
      {
        _id: "as-1",
        title: "Binary Search Tree Inversion",
        description: "Invert a binary search tree recursively",
        language: "cpp",
        difficulty: "MEDIUM",
        topics: ["trees", "recursion"],
      },
      {
        _id: "as-2",
        title: "Two Sum Problem",
        description: "Find two numbers in array that add to target",
        language: "python",
        difficulty: "EASY",
        topics: ["arrays", "hash-map"],
      },
      {
        _id: "as-3",
        title: "Dynamic Fibonacci",
        description: "Compute Nth fibonacci with memoization",
        language: "cpp",
        difficulty: "HARD",
        topics: ["dynamic-programming"],
      },
    ];

    it("filters assignments case-insensitively and handles leading/trailing spaces", async () => {
      assignmentService.getAssignments.mockResolvedValueOnce({
        data: { assignments: mockAssignments },
      });

      render(
        <MemoryRouter>
          <AssignmentList />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Binary Search Tree Inversion")).toBeInTheDocument();
        expect(screen.getByText("Two Sum Problem")).toBeInTheDocument();
        expect(screen.getByText("Dynamic Fibonacci")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search problems by name, topic, or concept.../i);

      // 1. Search with uppercase & trailing/leading spaces
      fireEvent.change(searchInput, { target: { value: "  FIBONACCI  " } });

      expect(screen.getByText("Dynamic Fibonacci")).toBeInTheDocument();
      expect(screen.queryByText("Two Sum Problem")).not.toBeInTheDocument();
      expect(screen.queryByText("Binary Search Tree Inversion")).not.toBeInTheDocument();

      // 2. Clear search restores all
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("Binary Search Tree Inversion")).toBeInTheDocument();
      expect(screen.getByText("Two Sum Problem")).toBeInTheDocument();
      expect(screen.getByText("Dynamic Fibonacci")).toBeInTheDocument();
    });

    it("displays empty state when no assignments match and resets filters", async () => {
      assignmentService.getAssignments.mockResolvedValueOnce({
        data: { assignments: mockAssignments },
      });

      render(
        <MemoryRouter>
          <AssignmentList />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Two Sum Problem")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search problems by name, topic, or concept.../i);
      fireEvent.change(searchInput, { target: { value: "nonexistent-topic-xyz" } });

      expect(screen.getByText(/Try adjusting your search criteria/i)).toBeInTheDocument();

      // Reset filters button clears search
      const resetBtn = screen.getByRole("button", { name: /Reset Filters/i });
      fireEvent.click(resetBtn);

      expect(screen.getByText("Two Sum Problem")).toBeInTheDocument();
    });
  });

  describe("ClassListPage Search (Teacher)", () => {
    const mockClasses = [
      {
        _id: "c1",
        name: "Algorithms & Complexity",
        code: "CS301",
        department: "Computer Science",
      },
      {
        _id: "c2",
        name: "Web Systems Lab",
        code: "WEB102",
        department: "Information Technology",
      },
    ];

    it("filters classrooms by name, code, or department with trimming", async () => {
      classService.getClasses.mockResolvedValueOnce({
        data: { classes: mockClasses },
      });

      render(
        <AuthContext.Provider value={mockTeacherAuth}>
          <MemoryRouter>
            <ClassListPage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText("Algorithms & Complexity")).toBeInTheDocument();
        expect(screen.getByText("Web Systems Lab")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Filter classes by title or code.../i);

      // Search by code with spaces
      fireEvent.change(searchInput, { target: { value: "  cs301  " } });
      expect(screen.getByText("Algorithms & Complexity")).toBeInTheDocument();
      expect(screen.queryByText("Web Systems Lab")).not.toBeInTheDocument();

      // Non-matching search shows proper empty state with Clear Search
      fireEvent.change(searchInput, { target: { value: "unknown-class" } });
      expect(screen.getByText(/No classrooms matched/i)).toBeInTheDocument();

      const clearBtn = screen.getByRole("button", { name: /Clear Search/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText("Algorithms & Complexity")).toBeInTheDocument();
      expect(screen.getByText("Web Systems Lab")).toBeInTheDocument();
    });
  });

  describe("StudentClassesPage Search (Student)", () => {
    const mockStudentClasses = [
      {
        _id: "sc1",
        name: "Data Structures",
        code: "DS101",
        teacherId: { name: "Dr. Knuth" },
        department: "Computer Science",
      },
      {
        _id: "sc2",
        name: "Operating Systems",
        code: "OS201",
        teacherId: { name: "Prof. Tanenbaum" },
        department: "Computer Science",
      },
    ];

    it("filters student classes by instructor name and code case-insensitively", async () => {
      classService.getClasses.mockResolvedValueOnce({
        data: { classes: mockStudentClasses },
      });

      render(
        <MemoryRouter>
          <StudentClassesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Data Structures")).toBeInTheDocument();
        expect(screen.getByText("Operating Systems")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search classes.../i);

      // Search by instructor name
      fireEvent.change(searchInput, { target: { value: "KNUTH" } });
      expect(screen.getByText("Data Structures")).toBeInTheDocument();
      expect(screen.queryByText("Operating Systems")).not.toBeInTheDocument();

      // Empty query restores both
      fireEvent.change(searchInput, { target: { value: "   " } });
      expect(screen.getByText("Data Structures")).toBeInTheDocument();
      expect(screen.getByText("Operating Systems")).toBeInTheDocument();
    });
  });

  describe("UserManagementPage Search (Admin)", () => {
    const mockUsers = [
      {
        _id: "u1",
        name: "Ada Lovelace",
        email: "ada@mit.edu",
        role: "STUDENT",
        department: "Mathematics",
      },
      {
        _id: "u2",
        name: "Grace Hopper",
        email: "grace@navy.mil",
        role: "TEACHER",
        department: "Computer Science",
      },
    ];

    it("filters users by name, email, department case-insensitively", async () => {
      adminService.getUsers.mockResolvedValueOnce({
        data: { users: mockUsers },
      });

      render(
        <AuthContext.Provider value={mockAdminAuth}>
          <MemoryRouter>
            <UserManagementPage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by name, email, department.../i);

      // Search by department
      fireEvent.change(searchInput, { target: { value: "mathematics" } });
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

      // Search by email prefix
      fireEvent.change(searchInput, { target: { value: "grace@" } });
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
      expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    });
  });
});
