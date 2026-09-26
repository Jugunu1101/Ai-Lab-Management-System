import React from "react";
import { Compass, ArrowRight, Play, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LearningPathSummaryCard = ({ learningPath = null }) => {
  const navigate = useNavigate();

  const steps = learningPath?.steps || [];
  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const totalSteps = steps.length || 8;
  const currentStep = steps.find((s) => s.status === "IN_PROGRESS") || steps[0];
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const currentTopic =
    currentStep?.topic ||
    (Array.isArray(learningPath?.targetFocus) ? learningPath.targetFocus[0] : "Recursion");

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const nextActivityTitle =
    learningPath?.nextActivity?.title ||
    currentStep?.suggestedActivity ||
    `Practice ${capitalize(currentTopic)}`;

  return (
    <div className="cl-card">
      <div className="cl-card-header" style={{ marginBottom: 16 }}>
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <Compass size={20} />
          </div>
          <div>
            <h2 className="cl-card-title">Your Learning Path</h2>
            <p className="cl-card-subtitle">Guided step-by-step personalized curriculum</p>
          </div>
        </div>

        <button
          className="cl-view-all-btn"
          onClick={() => navigate("/student/learning-path")}
          type="button"
        >
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="cl-path-focus-bar">
        <span className="cl-path-label">
          Current Focus: <strong className="cl-path-value">{capitalize(currentTopic)}</strong>
        </span>
        <span className="cl-path-label">
          {completedSteps} / {totalSteps} steps ({progressPercent}%)
        </span>
      </div>

      <div className="cl-path-progress-bar">
        <div
          className="cl-path-progress-fill"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      <div className="cl-next-act-card">
        <div className="cl-next-act-left">
          <div className="cl-next-act-icon">
            <Play size={18} />
          </div>
          <div>
            <h3 className="cl-next-act-title">{nextActivityTitle}</h3>
            <p className="cl-next-act-sub">
              {learningPath?.nextActivity?.reason || `Recommended next step to boost ${capitalize(currentTopic)} mastery.`}
            </p>
          </div>
        </div>
      </div>

      <button
        className="cl-btn-dark-green cl-btn-full"
        onClick={() => {
          if (learningPath?.nextActivity?.targetUrl) {
            navigate(learningPath.nextActivity.targetUrl);
          } else {
            navigate("/student/learning-path");
          }
        }}
        type="button"
      >
        Continue Learning <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default LearningPathSummaryCard;
