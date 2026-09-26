import React from "react";
import { HelpCircle, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DailyQuizCard = ({
  todayQuizStatus = null,
  learningLanguage = "C++",
}) => {
  const navigate = useNavigate();

  const isCompleted = todayQuizStatus?.completed;
  const score = todayQuizStatus?.score;

  return (
    <div className="cl-card">
      <div className="cl-card-header" style={{ marginBottom: 12 }}>
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box">
            <HelpCircle size={20} />
          </div>
          <div>
            <h2 className="cl-card-title">Daily AI Quiz</h2>
            <p className="cl-card-subtitle">
              10 AI-generated questions based on your learning progress.
            </p>
          </div>
        </div>

        {isCompleted ? (
          <span className="cl-quiz-badge completed">
            <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
            Completed
          </span>
        ) : (
          <span className="cl-quiz-badge not-completed">
            <AlertCircle size={12} style={{ display: "inline", marginRight: 4 }} />
            Not Completed
          </span>
        )}
      </div>

      <div className="cl-chips-row">
        <div className="cl-chip">
          <div className="cl-chip-title">10</div>
          <div className="cl-chip-subtitle">Questions</div>
        </div>
        <div className="cl-chip">
          <div className="cl-chip-title">{learningLanguage}</div>
          <div className="cl-chip-subtitle">Language</div>
        </div>
        <div className="cl-chip">
          <div className="cl-chip-title">{isCompleted && score !== null ? `${score}%` : "Mixed"}</div>
          <div className="cl-chip-subtitle">{isCompleted ? "Score" : "Topics"}</div>
        </div>
      </div>

      <button
        className="cl-btn-dark-green cl-btn-full"
        onClick={() => navigate("/student/quiz")}
        type="button"
      >
        {isCompleted ? "Review Quiz Result" : "Start Quiz"} <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default DailyQuizCard;
