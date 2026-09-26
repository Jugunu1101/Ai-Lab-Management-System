import React from "react";
import { Bot, FileCode2, ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AIRecommendationCard = ({ aiAssignment = null }) => {
  const navigate = useNavigate();

  if (!aiAssignment) {
    return (
      <div className="cl-ai-rec-card">
        <div className="cl-ai-rec-header">
          <div className="cl-card-title-group">
            <div className="cl-card-icon-box" style={{ background: "var(--cl-yellow-soft)", color: "var(--cl-green-primary)" }}>
              <Bot size={22} />
            </div>
            <div>
              <h2 className="cl-card-title">🤖 AI Recommended For You</h2>
              <p className="cl-card-subtitle">
                Personalized practice based on your recent performance.
              </p>
            </div>
          </div>
        </div>
        <div className="cl-ai-empty">
          <Sparkles size={24} style={{ color: "var(--cl-yellow)", marginBottom: 8 }} />
          <p style={{ margin: "0 0 12px 0", fontWeight: 600, color: "var(--cl-text)" }}>
            You're currently all caught up on AI practice assignments!
          </p>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "var(--cl-text-secondary)" }}>
            Complete today's Daily Quiz to get fresh, targeted AI recommendations tailored to your progress.
          </p>
          <button
            className="cl-btn-dark-green"
            onClick={() => navigate("/student/quiz")}
            type="button"
          >
            Take Daily AI Quiz <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const topic = aiAssignment.topic || (Array.isArray(aiAssignment.topics) ? aiAssignment.topics[0] : "Programming");
  const language = aiAssignment.language || "Python";
  const difficulty = (aiAssignment.difficulty || "Medium").toLowerCase();
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <div className="cl-ai-rec-card">
      <div className="cl-ai-rec-header">
        <div className="cl-card-title-group">
          <div className="cl-card-icon-box" style={{ background: "var(--cl-yellow-soft)", color: "var(--cl-green-primary)" }}>
            <Bot size={22} />
          </div>
          <div>
            <h2 className="cl-card-title">🤖 AI Recommended For You</h2>
            <p className="cl-card-subtitle">
              Personalized practice based on your recent performance.
            </p>
          </div>
        </div>
        <span className="cl-ai-badge-new">New</span>
      </div>

      <div className="cl-ai-inner-card">
        <div className="cl-ai-inner-left">
          <div className="cl-ai-icon-large">
            <FileCode2 size={28} />
          </div>

          <div>
            <h3 className="cl-ai-assignment-title">{aiAssignment.title}</h3>

            <div className="cl-tags-row">
              <span className="cl-tag-pill">{topic}</span>
              <span className="cl-tag-pill">{language}</span>
              <span className={`cl-tag-pill difficulty-${difficulty}`}>
                {difficultyLabel}
              </span>
            </div>

            {aiAssignment.agentReason ? (
              <div className="cl-ai-reason-box">
                <Lightbulb size={18} color="var(--cl-yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>AI Reason:</strong> "{aiAssignment.agentReason}"
                </span>
              </div>
            ) : (
              <div className="cl-ai-reason-box">
                <Lightbulb size={18} color="var(--cl-yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>AI Reason:</strong> AI created this targeted exercise to strengthen your core problem-solving fundamentals.
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          className="cl-btn-dark-green"
          onClick={() => navigate(`/student/assignments/${aiAssignment._id}`)}
          type="button"
        >
          Start Assignment <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AIRecommendationCard;
