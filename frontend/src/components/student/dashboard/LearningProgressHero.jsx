import React from "react";
import { BarChart3, Trophy, FileText, Code2, Flame } from "lucide-react";

export const LearningProgressHero = ({
  overallMastery = 0,
  completedQuizzes = 0,
  assignmentsSolved = 0,
  practiceQuestions = 0,
  currentStreak = 0,
}) => {
  // SVG Circular Gauge calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.min(100, Math.max(0, Math.round(overallMastery)));
  const strokeDashoffset = circumference - (validPercent / 100) * circumference;

  return (
    <div className="cl-progress-hero-card">
      <div className="cl-card-header" style={{ marginBottom: 12 }}>
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="cl-card-title">Your Learning Progress</h2>
            <p className="cl-card-subtitle">
              Overall mastery across your programming topics
            </p>
          </div>
        </div>
      </div>

      <div className="cl-progress-hero-body">
        {/* Large Circular Gauge */}
        <div className="cl-gauge-wrapper">
          <svg width="170" height="170" className="cl-gauge-svg">
            <circle
              cx="85"
              cy="85"
              r={radius}
              className="cl-gauge-bg"
              strokeWidth="14"
              fill="transparent"
            />
            <circle
              cx="85"
              cy="85"
              r={radius}
              className="cl-gauge-fill"
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="cl-gauge-inner-content">
            <span className="cl-gauge-percent">{validPercent}%</span>
            <span className="cl-gauge-label">Overall Mastery</span>
          </div>
        </div>

        {/* 4 Real Metric Chips */}
        <div className="cl-metrics-list">
          <div className="cl-metric-item">
            <div className="cl-metric-left">
              <div className="cl-metric-icon-box">
                <Trophy size={16} />
              </div>
              <span className="cl-metric-title">Completed Quizzes</span>
            </div>
            <span className="cl-metric-value">{completedQuizzes}</span>
          </div>

          <div className="cl-metric-item">
            <div className="cl-metric-left">
              <div className="cl-metric-icon-box">
                <FileText size={16} />
              </div>
              <span className="cl-metric-title">Assignments Solved</span>
            </div>
            <span className="cl-metric-value">{assignmentsSolved}</span>
          </div>

          <div className="cl-metric-item">
            <div className="cl-metric-left">
              <div className="cl-metric-icon-box">
                <Code2 size={16} />
              </div>
              <span className="cl-metric-title">Practice Questions</span>
            </div>
            <span className="cl-metric-value">{practiceQuestions}</span>
          </div>

          <div className="cl-metric-item">
            <div className="cl-metric-left">
              <div className="cl-metric-icon-box flame">
                <Flame size={16} />
              </div>
              <span className="cl-metric-title">Current Streak</span>
            </div>
            <span className="cl-metric-value">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningProgressHero;
