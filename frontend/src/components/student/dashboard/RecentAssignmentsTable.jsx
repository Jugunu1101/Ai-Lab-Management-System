import React from "react";
import { BookOpen, ArrowRight, Bot, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const RecentAssignmentsTable = ({ assignments = [] }) => {
  const navigate = useNavigate();

  const getDifficultyClass = (diff = "EASY") => {
    const d = String(diff).toUpperCase();
    if (d === "EASY") return "difficulty-easy";
    if (d === "MEDIUM") return "difficulty-medium";
    return "difficulty-hard";
  };

  const getStatusInfo = (status = "NOT_STARTED", score = null) => {
    const s = String(status).toUpperCase();
    if (s === "COMPLETED" || s === "PASSED" || s === "GRADED") {
      return { label: "Graded", className: "graded" };
    }
    if (s === "SUBMITTED") {
      return { label: "Submitted", className: "submitted" };
    }
    if (s === "PENDING" || s === "IN_PROGRESS") {
      return { label: "Pending", className: "pending" };
    }
    return { label: "Not Started", className: "not-started" };
  };

  const displayedAssignments = assignments.slice(0, 5);

  return (
    <div className="cl-card">
      <div className="cl-card-header">
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="cl-card-title">Recent Assignments</h2>
            <p className="cl-card-subtitle">
              Your latest teacher-assigned and AI-generated coding challenges
            </p>
          </div>
        </div>

        <button
          className="cl-view-all-btn"
          onClick={() => navigate("/student/assignments")}
          type="button"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      {displayedAssignments.length > 0 ? (
        <div className="cl-table-wrapper">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Topic</th>
                <th>Source</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Score</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedAssignments.map((item) => {
                const topic =
                  item.topic ||
                  (Array.isArray(item.topics) && item.topics.length > 0
                    ? item.topics[0]
                    : "Programming");
                const isAI = item.source === "AI_AGENT";
                const { label: statusLabel, className: statusClass } =
                  getStatusInfo(item.status, item.score);
                const difficulty = (item.difficulty || "Medium").toLowerCase();
                const difficultyLabel =
                  difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

                return (
                  <tr key={item._id}>
                    <td>
                      <span className="cl-table-title">{item.title}</span>
                    </td>
                    <td>{topic}</td>
                    <td>
                      {isAI ? (
                        <span className="cl-source-badge ai">
                          <Bot size={12} /> AI
                        </span>
                      ) : (
                        <span className="cl-source-badge teacher">
                          <UserCheck size={12} /> Teacher
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`cl-tag-pill ${getDifficultyClass(item.difficulty)}`}>
                        {difficultyLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`cl-status-pill ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      {item.score !== undefined && item.score !== null
                        ? `${item.score}%`
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="cl-table-btn"
                        onClick={() => navigate(`/student/assignments/${item._id}`)}
                        type="button"
                      >
                        {item.status === "COMPLETED" || item.status === "PASSED"
                          ? "Review"
                          : "Solve"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--cl-text-secondary)" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>
            No recent assignments found.
          </p>
          <button
            className="cl-btn-dark-green"
            onClick={() => navigate("/student/assignments")}
            type="button"
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            Explore Assignments
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentAssignmentsTable;
