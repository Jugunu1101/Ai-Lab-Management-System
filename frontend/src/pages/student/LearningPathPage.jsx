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
  let currentStepIndex =
    learningPath?.steps?.findIndex((s) => s.status === "IN_PROGRESS");
  if (currentStepIndex === -1 || currentStepIndex === undefined || currentStepIndex === null) {
    const firstPending = learningPath?.steps?.findIndex((s) => s.status !== "COMPLETED");
    if (firstPending !== -1 && firstPending !== undefined) {
      currentStepIndex = firstPending;
    } else {
      currentStepIndex = Math.max(0, (learningPath?.steps?.length || 1) - 1);
    }
  }
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
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: 32,
          marginBottom: 32,
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
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
                color: "var(--text-secondary)",
              }}
            >
              Curriculum Mastery Progress
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
              {overallMastery}%
            </span>
          </div>
          <Progress
            percent={overallMastery}
            showInfo={false}
            strokeColor="var(--cl-success)"
            trailColor="var(--bg-tertiary)"
            strokeWidth={14}
            style={{ margin: 0 }}
          />
        </div>

        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <div
              style={{
                background: "var(--bg-tertiary)",
                borderRadius: 16,
                padding: "20px 24px",
                border: "1px solid var(--border-color)",
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
                  color: "var(--cl-green-forest)",
                  marginBottom: 8,
                }}
              >
                🎯 Current Focus Topic
              </span>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text-primary)",
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
                background: "var(--bg-tertiary)",
                borderRadius: 16,
                padding: "20px 24px",
                border: "1px solid var(--border-color)",
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
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                💡 Why AI Selected This
              </span>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "var(--text-primary)",
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
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: 32,
          border: "1px solid var(--border-color)",
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Compass size={24} color="var(--primary)" /> Learning Roadmap
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
              background: "var(--border-subtle)",
            }}
          />

          {learningPath?.steps?.map((step, index) => {
            let state = "locked";
            if (step.status === "COMPLETED" || (currentStepIndex >= 0 && index < currentStepIndex)) {
              state = "completed";
            } else if (step.status === "IN_PROGRESS" || index === currentStepIndex) {
              state = "current";
            } else {
              state = "locked";
            }

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
                        background: "var(--cl-success)",
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
                        background: "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--cl-yellow)",
                        boxShadow: "0 0 0 4px var(--bg-tertiary)",
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
                        background: "var(--bg-tertiary)",
                        border: "2px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
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
                    background: isCurrent ? "var(--bg-tertiary)" : "var(--bg-card)",
                    border: isCurrent
                      ? "1.5px solid var(--cl-green-forest)"
                      : "1px solid var(--border-color)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: isCurrent
                      ? "var(--shadow-md)"
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
                          ? "var(--text-primary)"
                          : isCompleted
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {index + 1}. {step.topic}
                    </h3>

                    {isCurrent && (
                      <span
                        style={{
                          background: "var(--primary)",
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
                          background: "var(--bg-tertiary)",
                          color: "var(--cl-success)",
                          border: "1px solid var(--border-color)",
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
                          background: "var(--bg-tertiary)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-color)",
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
                        ? "var(--text-primary)"
                        : isCompleted
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
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
                        color: isCurrent ? "var(--cl-green-forest)" : "var(--text-muted)",
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
            background: "var(--bg-card)",
            border: "2px solid var(--cl-green-forest)",
            borderRadius: 20,
            padding: 32,
            boxShadow: "var(--shadow-md)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg-tertiary)",
              padding: "6px 14px",
              borderRadius: 20,
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              border: "1px solid var(--border-color)",
            }}
          >
            <Sparkles size={16} color="var(--cl-green-forest)" /> 🤖 AI Recommended Practice
          </div>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 10px 0",
            }}
          >
            {learningPath.aiRecommendedAssignment.title}
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
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
                background: "var(--bg-tertiary)",
                padding: "14px 18px",
                borderRadius: 12,
                borderLeft: "4px solid var(--cl-green-forest)",
                marginBottom: 24,
                fontSize: 14,
                color: "var(--text-primary)",
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
            background: "var(--bg-card)",
            border: "1.5px solid var(--cl-green-forest)",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "block",
              color: "var(--cl-green-forest)",
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
              color: "var(--text-primary)",
              marginBottom: 12,
            }}
          >
            "{learningPath.nextActivity.title || learningPath.nextActivity.actionText}"
          </h2>
          {learningPath.nextActivity.reason && (
            <p
              style={{
                color: "var(--text-secondary)",
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
