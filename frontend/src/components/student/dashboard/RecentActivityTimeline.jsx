import React from "react";
import { Clock, ArrowRight, CheckCircle2, FileCode, Bot, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const RecentActivityTimeline = ({
  submissions = [],
  todayQuizStatus = null,
  aiAssignment = null,
}) => {
  const navigate = useNavigate();

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  // Build real activities list from actual data
  const activities = [];

  // 1. Daily quiz completed event if real
  if (todayQuizStatus?.completed) {
    activities.push({
      id: "act-quiz-today",
      type: "quiz",
      title: "Quiz completed",
      desc: "Daily AI Quiz — 10 questions evaluated",
      time: "Today",
      score: todayQuizStatus.score !== null ? `${todayQuizStatus.score}%` : "Completed",
      icon: <CheckCircle2 size={16} />,
    });
  }

  // 2. Real submissions
  if (Array.isArray(submissions) && submissions.length > 0) {
    submissions.slice(0, 3).forEach((sub) => {
      const title = sub.assignmentId?.title || "Coding Challenge";
      const score = sub.score !== undefined && sub.score !== null ? `${sub.score}%` : null;
      activities.push({
        id: `act-sub-${sub._id}`,
        type: "submission",
        title: "Assignment submitted",
        desc: title,
        time: formatTimeAgo(sub.createdAt),
        score,
        icon: <FileCode size={16} />,
      });
    });
  }

  // 3. AI assignment assigned if real
  if (aiAssignment) {
    activities.push({
      id: "act-ai-assigned",
      type: "ai",
      title: "AI practice assigned",
      desc: aiAssignment.title || "Personalized Practice Problem",
      time: "Recent",
      score: "New",
      icon: <Bot size={16} />,
    });
  }

  return (
    <div className="cl-card">
      <div className="cl-card-header">
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="cl-card-title">Recent Activity</h2>
            <p className="cl-card-subtitle">Your latest learning milestones and attempts</p>
          </div>
        </div>

        <button
          className="cl-view-all-btn"
          onClick={() => navigate("/student/submissions")}
          type="button"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      {activities.length > 0 ? (
        <div className="cl-timeline">
          {activities.map((item, idx) => (
            <div key={item.id || idx} className="cl-timeline-item">
              <div className="cl-timeline-dot-wrapper">
                <div className={`cl-timeline-dot ${item.type}`}>
                  {item.icon}
                </div>
                <div className="cl-timeline-line" />
              </div>

              <div className="cl-timeline-content">
                <div>
                  <h4 className="cl-timeline-title">{item.title}</h4>
                  <p className="cl-timeline-desc">{item.desc}</p>
                  <span className="cl-timeline-time">{item.time}</span>
                </div>

                {item.score && (
                  <span className="cl-timeline-score-badge">{item.score}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--cl-text-secondary)" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>
            No recent activity recorded yet.
          </p>
          <button
            className="cl-btn-dark-green"
            onClick={() => navigate("/student/quiz")}
            type="button"
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            Start Today's Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivityTimeline;
