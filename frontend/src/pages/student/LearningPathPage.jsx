import React, { useState, useEffect } from "react";
import { Card, Button, Typography, Space, Progress, Tag, Row, Col } from "antd";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Activity,
  Play,
  Lock,
  Compass,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import progressService from "../../services/progress.service";

const { Text, Paragraph } = Typography;

export const LearningPathPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [overallMastery, setOverallMastery] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pathRes, dashboardRes] = await Promise.allSettled([
        progressService.getStudentLearningPath(),
        progressService.getStudentDashboard(),
      ]);

      if (pathRes.status === "fulfilled") {
        const pathData =
          pathRes.value.data?.learningPath ||
          pathRes.value.learningPath ||
          pathRes.value.data ||
          pathRes.value;
        if (pathData && pathData.steps && pathData.steps.length > 0) {
          setLearningPath(pathData);
        } else {
          setError(
            "No learning path available yet. Complete some assignments and quizzes to generate your personalized path."
          );
        }
      } else {
        throw new Error(pathRes.reason?.message || "Failed to load learning path");
      }

      if (dashboardRes.status === "fulfilled") {
        const dData = dashboardRes.value.data || dashboardRes.value;
        setOverallMastery(dData?.averageScore || 0);
      }
    } catch (err) {
      setError(err.message || "Failed to load learning path");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Generating your AI personalized learning path..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  // Find the first IN_PROGRESS step to be the "Current" step
  const currentStepIndex =
    learningPath?.steps?.findIndex((s) => s.status === "IN_PROGRESS") ?? 0;
  const currentStep = learningPath?.steps?.[currentStepIndex];

  return (
    <div className="cl-container" style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 64 }}>
      {/* Page Header */}
      <div className="cl-page-header">
        <h1>Personalized AI Learning Path</h1>
        <p className="cl-page-subtitle">
          Guided step-by-step curriculum customized to your concept mastery, test execution results, and coding diagnostics.
        </p>
      </div>

      {/* Progress & Focus Hero Card */}
      <div
        className="cl-card"
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 32,
          marginBottom: 32,
          border: "1px solid #DDE5DC",
          boxShadow: "0 2px 10px rgba(18, 60, 42, 0.04)",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
                color: "#59665E",
              }}
            >
              Curriculum Mastery Progress
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#123C2A" }}>
              {overallMastery}%
            </span>
          </div>
          <Progress
            percent={overallMastery}
            showInfo={false}
            strokeColor="#2F7D4A"
            trailColor="#EDF6EA"
            strokeWidth={14}
            style={{ margin: 0 }}
          />
        </div>

        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <div
              style={{
                background: "#EDF6EA",
                borderRadius: 16,
                padding: "20px 24px",
                border: "1px solid #DCEEDD",
                height: "100%",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 700,
                  color: "#246B45",
                  marginBottom: 8,
                }}
              >
                🎯 Current Focus Topic
              </span>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#123C2A",
                  lineHeight: 1.3,
                }}
              >
                {learningPath?.targetFocus?.join(" & ") || "Programming Fundamentals"}
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div
              style={{
                background: "#F8F6EE",
                borderRadius: 16,
                padding: "20px 24px",
                border: "1px solid #DDE5DC",
                height: "100%",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 700,
                  color: "#59665E",
                  marginBottom: 8,
                }}
              >
                💡 Why AI Selected This
              </span>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "#18231D",
                  margin: 0,
                }}
              >
                {learningPath?.summary ||
                  "Targeted roadmap focusing on identified areas to boost your code quality and test pass rates."}
              </p>
            </div>
          </Col>
        </Row>
      </div>

      {/* Path Steps Card */}
      <div
        className="cl-card"
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 32,
          border: "1px solid #DDE5DC",
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#18231D",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Compass size={24} color="#123C2A" /> Learning Roadmap
        </h2>

        <div style={{ position: "relative", paddingLeft: 8 }}>
          {/* Vertical connecting line */}
          <div
            style={{
              position: "absolute",
              left: 21,
              top: 24,
              bottom: 24,
              width: 3,
              background: "#E8EFE7",
            }}
          />

          {learningPath?.steps?.map((step, index) => {
            let state = "locked";
            if (index < currentStepIndex) state = "completed";
            if (index === currentStepIndex) state = "current";

            const isCurrent = state === "current";
            const isCompleted = state === "completed";

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom:
                    index === learningPath.steps.length - 1 ? 0 : 28,
                  position: "relative",
                }}
              >
                {/* Step Icon */}
                <div style={{ position: "relative", zIndex: 2, marginTop: 4 }}>
                  {isCompleted ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#2F7D4A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                  ) : isCurrent ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#123C2A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F4C542",
                        boxShadow: "0 0 0 4px #EDF6EA",
                      }}
                    >
                      <ArrowRight size={16} strokeWidth={3} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#F8F6EE",
                        border: "2px solid #DDE5DC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#748078",
                      }}
                    >
                      <Lock size={14} />
                    </div>
                  )}
                </div>

                {/* Step Details Box */}
                <div
                  style={{
                    flex: 1,
                    background: isCurrent ? "#EDF6EA" : "#FFFFFF",
                    border: isCurrent
                      ? "1.5px solid #246B45"
                      : "1px solid #E8EFE7",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: isCurrent
                      ? "0 4px 12px rgba(36, 107, 69, 0.08)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 19,
                        fontWeight: 700,
                        color: isCurrent
                          ? "#123C2A"
                          : isCompleted
                          ? "#18231D"
                          : "#59665E",
                      }}
                    >
                      {index + 1}. {step.topic}
                    </h3>

                    {isCurrent && (
                      <span
                        style={{
                          background: "#123C2A",
                          color: "#FFFFFF",
                          padding: "3px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Current Step
                      </span>
                    )}
                    {isCompleted && (
                      <span
                        style={{
                          background: "#EDF6EA",
                          color: "#2F7D4A",
                          border: "1px solid #DCEEDD",
                          padding: "3px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Completed
                      </span>
                    )}
                    {state === "locked" && (
                      <span
                        style={{
                          background: "#F8F6EE",
                          color: "#748078",
                          border: "1px solid #DDE5DC",
                          padding: "3px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Locked
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      color: isCurrent
                        ? "#18231D"
                        : isCompleted
                        ? "#59665E"
                        : "#748078",
                      fontSize: 15,
                      lineHeight: 1.55,
                      margin: "6px 0 12px 0",
                    }}
                  >
                    {step.objective ||
                      `Master core programming constructs and common algorithms for ${step.topic}.`}
                  </p>

                  {step.suggestedActivity && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: isCurrent ? "#246B45" : "#748078",
                        fontSize: 14,
                        fontWeight: isCurrent ? 600 : 500,
                      }}
                    >
                      <Activity size={16} />
                      <span>Activity: {step.suggestedActivity}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommended Practice Section */}
      {learningPath?.aiRecommendedAssignment && (
        <div
          className="cl-card"
          style={{
            background: "#FFFFFF",
            border: "2px solid #246B45",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 6px 20px rgba(36, 107, 69, 0.08)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#EDF6EA",
              padding: "6px 14px",
              borderRadius: 20,
              color: "#123C2A",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              border: "1px solid #DCEEDD",
            }}
          >
            <Sparkles size={16} color="#246B45" /> 🤖 AI Recommended Practice
          </div>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#18231D",
              margin: "0 0 10px 0",
            }}
          >
            {learningPath.aiRecommendedAssignment.title}
          </h2>

          <p
            style={{
              color: "#59665E",
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {`AI detected an improvement opportunity in ${learningPath.aiRecommendedAssignment.topic} and created a tailored coding practice assignment for you.`}
          </p>

          {learningPath.aiRecommendedAssignment.agentReason && (
            <div
              style={{
                background: "#EDF6EA",
                padding: "14px 18px",
                borderRadius: 12,
                borderLeft: "4px solid #246B45",
                marginBottom: 24,
                fontSize: 14,
                color: "#123C2A",
                lineHeight: 1.5,
              }}
            >
              <strong>💡 Tutor Insight: </strong>
              {learningPath.aiRecommendedAssignment.agentReason}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Button
              className="cl-btn-accent"
              style={{ height: 48, padding: "0 28px", fontSize: 15 }}
              icon={<Play size={18} fill="currentColor" />}
              onClick={() =>
                navigate(
                  `/student/assignments/${learningPath.aiRecommendedAssignment._id}`
                )
              }
            >
              Start AI Practice
            </Button>
            <Button
              className="cl-btn-secondary"
              style={{ height: 48, padding: "0 24px", fontSize: 15 }}
              onClick={() => navigate("/student/assignments")}
            >
              View All Assignments
            </Button>
          </div>
        </div>
      )}

      {/* Recommended Next Activity (Alternative) */}
      {learningPath?.nextActivity && !learningPath?.aiRecommendedAssignment && (
        <div
          className="cl-card"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid #246B45",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "block",
              color: "#246B45",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Recommended Next Step
          </span>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#18231D",
              marginBottom: 12,
            }}
          >
            "{learningPath.nextActivity.title || learningPath.nextActivity.actionText}"
          </h2>
          {learningPath.nextActivity.reason && (
            <p
              style={{
                color: "#59665E",
                fontSize: 15,
                maxWidth: 640,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              {learningPath.nextActivity.reason}
            </p>
          )}
          <Space size="middle" wrap style={{ justifyContent: "center" }}>
            <Button
              className="cl-btn-primary"
              style={{ height: 48, padding: "0 28px", fontSize: 15 }}
              icon={<Play size={18} fill="currentColor" />}
              onClick={() => {
                if (learningPath.nextActivity.targetUrl) {
                  navigate(learningPath.nextActivity.targetUrl);
                } else {
                  navigate("/student/quiz");
                }
              }}
            >
              {learningPath.nextActivity.actionText || "Start Activity"}
            </Button>
            <Button
              className="cl-btn-secondary"
              style={{ height: 48, padding: "0 24px", fontSize: 15 }}
              onClick={() =>
                navigate(
                  `/student/assignments?topic=${encodeURIComponent(
                    learningPath.nextActivity.topic || currentStep?.topic || ""
                  )}`
                )
              }
            >
              Explore Problem Sets
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default LearningPathPage;
