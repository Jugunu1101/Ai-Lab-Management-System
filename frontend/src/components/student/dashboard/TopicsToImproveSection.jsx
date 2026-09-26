import React from "react";
import { BarChart2, ArrowRight, Code, Cpu, Layers, Search, ListOrdered, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TopicsToImproveSection = ({ topicMastery = [] }) => {
  const navigate = useNavigate();

  // Helper to pick contextual icons for popular programming topics
  const getTopicIcon = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("recur")) return <GitBranch size={16} />;
    if (lower.includes("loop")) return <Layers size={16} />;
    if (lower.includes("array") || lower.includes("list")) return <ListOrdered size={16} />;
    if (lower.includes("search")) return <Search size={16} />;
    if (lower.includes("sort")) return <ListOrdered size={16} />;
    return <Code size={16} />;
  };

  const getStatusInfo = (score = 0) => {
    if (score < 50) {
      return {
        label: "Needs Practice",
        className: "status-needs-practice",
      };
    }
    if (score < 75) {
      return {
        label: "Improving",
        className: "status-improving",
      };
    }
    return {
      label: "Good",
      className: "status-good",
    };
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const displayedTopics = topicMastery.slice(0, 5);

  return (
    <div className="cl-card">
      <div className="cl-card-header">
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 className="cl-card-title">Topics to Improve</h2>
            <p className="cl-card-subtitle">
              Mastery levels tracked across your coding exercises
            </p>
          </div>
        </div>

        <button
          className="cl-view-all-btn"
          onClick={() => navigate("/student/progress")}
          type="button"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      {displayedTopics.length > 0 ? (
        <div className="cl-topics-list">
          {displayedTopics.map((topicItem, idx) => {
            const topicName = capitalize(topicItem.topic || "Topic");
            const score = Math.round(topicItem.masteryScore ?? 0);
            const { label, className } = getStatusInfo(score);

            return (
              <div key={topicItem._id || idx} className="cl-topic-row">
                <div className="cl-topic-left">
                  <div className="cl-topic-icon">
                    {getTopicIcon(topicItem.topic)}
                  </div>
                  <span className="cl-topic-name">{topicName}</span>
                </div>

                <div className="cl-topic-bar-wrapper">
                  <div className="cl-topic-progress-bar">
                    <div
                      className={`cl-topic-progress-fill ${className}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="cl-topic-percent">{score}%</span>
                </div>

                <div className={`cl-topic-badge ${className}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--cl-text-secondary)" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>
            No topic data recorded yet.
          </p>
          <button
            className="cl-btn-dark-green"
            onClick={() => navigate("/student/assignments")}
            type="button"
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            Solve First Practice Problem
          </button>
        </div>
      )}
    </div>
  );
};

export default TopicsToImproveSection;
