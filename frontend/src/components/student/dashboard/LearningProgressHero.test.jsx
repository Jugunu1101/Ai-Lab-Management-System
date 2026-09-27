import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LearningProgressHero from "./LearningProgressHero";

describe("LearningProgressHero - Circular Overall Mastery Gauge", () => {
  it("renders 0% correctly centered with OVERALL and MASTERY labels", () => {
    const { container } = render(
      <LearningProgressHero
        overallMastery={0}
        completedQuizzes={0}
        assignmentsSolved={0}
        practiceQuestions={0}
        currentStreak={0}
      />
    );

    const percentEl = screen.getByText("0%");
    expect(percentEl).toBeInTheDocument();
    expect(percentEl).toHaveClass("cl-gauge-percent");
    expect(percentEl).not.toHaveClass("cl-gauge-percent-100");

    expect(screen.getByText("OVERALL")).toBeInTheDocument();
    expect(screen.getByText("MASTERY")).toBeInTheDocument();
  });

  it("renders 10% correctly", () => {
    render(<LearningProgressHero overallMastery={10} />);
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("OVERALL")).toBeInTheDocument();
    expect(screen.getByText("MASTERY")).toBeInTheDocument();
  });

  it("renders 50% correctly", () => {
    render(<LearningProgressHero overallMastery={50} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders 75% correctly with expected structure", () => {
    render(
      <LearningProgressHero
        overallMastery={75}
        completedQuizzes={4}
        assignmentsSolved={6}
        practiceQuestions={12}
        currentStreak={3}
      />
    );

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("OVERALL")).toBeInTheDocument();
    expect(screen.getByText("MASTERY")).toBeInTheDocument();
    expect(screen.getByText("Completed Quizzes")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Assignments Solved")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Current Streak")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("renders 99% correctly", () => {
    render(<LearningProgressHero overallMastery={99} />);
    expect(screen.getByText("99%")).toBeInTheDocument();
    expect(screen.getByText("OVERALL")).toBeInTheDocument();
    expect(screen.getByText("MASTERY")).toBeInTheDocument();
  });

  it("renders 100% case with 3-digit scaling class (cl-gauge-percent-100) and no overflow", () => {
    const { container } = render(
      <LearningProgressHero
        overallMastery={100}
        completedQuizzes={10}
        assignmentsSolved={15}
        practiceQuestions={30}
        currentStreak={7}
      />
    );

    const percentEl = screen.getByText("100%");
    expect(percentEl).toBeInTheDocument();
    expect(percentEl).toHaveClass("cl-gauge-percent");
    expect(percentEl).toHaveClass("cl-gauge-percent-100");

    const overallLabel = screen.getByText("OVERALL");
    const masteryLabel = screen.getByText("MASTERY");
    expect(overallLabel).toBeInTheDocument();
    expect(masteryLabel).toBeInTheDocument();
    expect(overallLabel.parentElement).toHaveClass("cl-gauge-label");

    // Inner content container
    const innerContent = container.querySelector(".cl-gauge-inner-content");
    expect(innerContent).toBeInTheDocument();
    expect(innerContent).toHaveAttribute("aria-label", "Overall Mastery: 100%");
  });

  it("clamps values gracefully between 0 and 100", () => {
    const { rerender } = render(<LearningProgressHero overallMastery={-15} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(<LearningProgressHero overallMastery={150} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calculates dynamic progress correctly for 32% (real student dashboard value)", () => {
    const { container } = render(<LearningProgressHero overallMastery={32} />);
    expect(screen.getByText("32%")).toBeInTheDocument();
    expect(screen.getByText("OVERALL")).toBeInTheDocument();
    expect(screen.getByText("MASTERY")).toBeInTheDocument();

    const fillCircle = container.querySelector(".cl-gauge-fill");
    expect(fillCircle).toBeInTheDocument();
    
    // Circumference = 2 * PI * 68 ≈ 427.2566
    // For 32%, offset = 427.2566 * (1 - 0.32) ≈ 290.534
    const circumference = 2 * Math.PI * 68;
    const expectedOffset = circumference - (32 / 100) * circumference;
    expect(parseFloat(fillCircle.getAttribute("stroke-dashoffset"))).toBeCloseTo(expectedOffset, 1);
    expect(fillCircle).toHaveStyle({ opacity: "1" });
  });

  it("calculates dynamic progress correctly for 80%", () => {
    const { container } = render(<LearningProgressHero overallMastery={80} />);
    expect(screen.getByText("80%")).toBeInTheDocument();

    const fillCircle = container.querySelector(".cl-gauge-fill");
    expect(fillCircle).toBeInTheDocument();

    const circumference = 2 * Math.PI * 68;
    const expectedOffset = circumference - (80 / 100) * circumference;
    expect(parseFloat(fillCircle.getAttribute("stroke-dashoffset"))).toBeCloseTo(expectedOffset, 1);
    expect(fillCircle).toHaveStyle({ opacity: "1" });
  });

  it("renders 0% with no green progress (opacity 0) and full offset", () => {
    const { container } = render(<LearningProgressHero overallMastery={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    const fillCircle = container.querySelector(".cl-gauge-fill");
    expect(fillCircle).toBeInTheDocument();

    const circumference = 2 * Math.PI * 68;
    expect(parseFloat(fillCircle.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference, 1);
    expect(fillCircle).toHaveStyle({ opacity: "0" });
  });

  it("renders 100% with full green progress (offset 0)", () => {
    const { container } = render(<LearningProgressHero overallMastery={100} />);
    expect(screen.getByText("100%")).toBeInTheDocument();

    const fillCircle = container.querySelector(".cl-gauge-fill");
    expect(fillCircle).toBeInTheDocument();
    expect(parseFloat(fillCircle.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 1);
    expect(fillCircle).toHaveStyle({ opacity: "1" });
  });
});
