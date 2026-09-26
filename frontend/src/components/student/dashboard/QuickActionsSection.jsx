import React from "react";
import { Zap, HelpCircle, Code2, BookOpen, Compass, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActionsSection = ({
  weakTopic = "Recursion",
  activeAssignmentsCount = 0,
}) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: "daily-quiz",
      title: "Start Daily Quiz",
      subtitle: "10 AI-generated questions",
      icon: <HelpCircle size={22} />,
      iconClass: "green",
      onClick: () => navigate("/student/quiz"),
    },
    {
      id: "practice-weak",
      title: "Practice Weak Topic",
      subtitle: typeof weakTopic === "string" ? `Focus on ${weakTopic}` : "Targeted exercises",
      icon: <Code2 size={22} />,
      iconClass: "green",
      onClick: () => navigate("/student/assignments"),
    },
    {
      id: "view-assignments",
      title: "View Assignments",
      subtitle: `${activeAssignmentsCount} pending`,
      icon: <BookOpen size={22} />,
      iconClass: "yellow",
      onClick: () => navigate("/student/assignments"),
    },
    {
      id: "open-learning-path",
      title: "Open Learning Path",
      subtitle: "Continue progress",
      icon: <Compass size={22} />,
      iconClass: "yellow",
      onClick: () => navigate("/student/learning-path"),
    },
  ];

  return (
    <div>
      <div className="cl-card-header" style={{ marginBottom: 16 }}>
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box" style={{ background: "var(--cl-yellow-soft)", color: "#8A6400" }}>
            <Zap size={20} />
          </div>
          <h2 className="cl-card-title">Quick Actions</h2>
        </div>
      </div>

      <div className="cl-quick-actions-grid">
        {actions.map((act) => (
          <div
            key={act.id}
            className="cl-quick-action-card"
            onClick={act.onClick}
            role="button"
            tabIndex={0}
          >
            <div className="cl-qa-left">
              <div className={`cl-qa-icon-box ${act.iconClass}`}>
                {act.icon}
              </div>
              <div>
                <h3 className="cl-qa-title">{act.title}</h3>
                <p className="cl-qa-subtitle">{act.subtitle}</p>
              </div>
            </div>
            <ChevronRight size={18} className="cl-qa-arrow" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsSection;
