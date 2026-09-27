import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SkillRadarCard, { getStatusInfo } from "./SkillRadarCard";

describe("SkillRadarCard - Multilateral Competency & Geometry Fix Suite", () => {
  describe("getStatusInfo helper", () => {
    it("returns correct status, colors, and thresholds", () => {
      expect(getStatusInfo(85).statusText).toBe("Good Mastery");
      expect(getStatusInfo(70).statusText).toBe("Good Mastery");
      expect(getStatusInfo(69).statusText).toBe("Needs Practice");
      expect(getStatusInfo(50).statusText).toBe("Needs Practice");
      expect(getStatusInfo(49).statusText).toBe("Weak Topic");
      expect(getStatusInfo(20).statusText).toBe("Weak Topic");
      expect(getStatusInfo(0).statusText).toBe("Weak Topic");
    });
  });

  describe("0 Topics (Empty State)", () => {
    it("renders clean empty state with explanation when progressData is empty", () => {
      render(<SkillRadarCard progressData={[]} />);

      expect(screen.getByText("Skill Radar")).toBeInTheDocument();
      expect(screen.getByText("0 Topics")).toBeInTheDocument();
      expect(screen.getByText("No topic mastery data available yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Solve coding assignments and quizzes to map your multi-axis competency/i)
      ).toBeInTheDocument();
    });
  });

  describe("1 Topic (Single Topic Radial Gauge)", () => {
    it("renders single topic radial gauge with centered percentage and status badge", () => {
      const data = [{ topic: "basics", score: 85, status: "Good Mastery" }];
      render(<SkillRadarCard progressData={data} />);

      expect(screen.getByText("Skill Radar")).toBeInTheDocument();
      expect(screen.getByText("1 Topic")).toBeInTheDocument();

      // Renders topic, percentage, and status in SVG and summary card
      expect(screen.getAllByText("Basics").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("85%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Good Mastery").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2 Topics (Dual-Axis Radial Competency Comparator - Fix for Degenerate Polygon)", () => {
    const twoTopicsData = [
      { topic: "loops", score: 20, status: "Weak Topic" },
      { topic: "basics", score: 76, status: "Good Mastery" },
    ];

    it("renders opposing dual-axis radial comparator with distinct spatial separation and readable labels", () => {
      render(<SkillRadarCard progressData={twoTopicsData} />);

      expect(screen.getByText("Skill Radar")).toBeInTheDocument();
      expect(screen.getByText("2 Topics")).toBeInTheDocument();

      // Check both topics are rendered with their exact scores and status classifications
      expect(screen.getAllByText("Loops").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("20%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Weak Topic").length).toBeGreaterThanOrEqual(1);

      expect(screen.getAllByText("Basics").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("76%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Good Mastery").length).toBeGreaterThanOrEqual(1);

      // Scale guides are present
      expect(screen.getByText("Closer to outer edge = higher mastery")).toBeInTheDocument();
      expect(screen.getByText("0% ────────── 100%")).toBeInTheDocument();
    });

    it("displays floating tooltip when hovering over topic elements", () => {
      const { container } = render(<SkillRadarCard progressData={twoTopicsData} />);

      // Hover over left topic path/group
      const leftPath = container.querySelector("path");
      expect(leftPath).toBeTruthy();

      fireEvent.mouseEnter(leftPath);
      expect(screen.getByText(/Topic: Loops/i)).toBeInTheDocument();
      expect(screen.getByText(/Mastery: 20%/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: Weak Topic/i)).toBeInTheDocument();

      fireEvent.mouseLeave(leftPath);
    });
  });

  describe("3+ Topics (Polar Radar Chart)", () => {
    const multiTopicsData = [
      { topic: "basics", score: 80, status: "Good Mastery" },
      { topic: "logic", score: 55, status: "Needs Practice" },
      { topic: "syntax", score: 25, status: "Weak Topic" },
      { topic: "arrays", score: 90, status: "Good Mastery" },
    ];

    it("renders radar chart container and summary cards for 4 topics", () => {
      render(<SkillRadarCard progressData={multiTopicsData} />);

      expect(screen.getByText("Skill Radar")).toBeInTheDocument();
      expect(screen.getByText("4 Topics")).toBeInTheDocument();

      // Check summary cards
      expect(screen.getAllByText("Basics").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("80%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Logic").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("55%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Syntax").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("25%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Arrays").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("90%").length).toBeGreaterThanOrEqual(1);
    });
  });
});
