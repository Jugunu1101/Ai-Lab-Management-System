import React, { useState, useEffect } from "react";
import { Card, Timeline, Tag, Button, Typography, Row, Col, Space } from "antd";
import {
  CompassOutlined,
  CheckCircleTwoTone,
  ArrowRightOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import progressService from "../../services/progress.service";

const { Title, Text, Paragraph } = Typography;

export const LearningPathPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [learningPath, setLearningPath] = useState(null);

  const fetchLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await progressService.getStudentLearningPath();
      const pathData = res.data?.learningPath || res.learningPath || res.data || null;

      if (pathData && pathData.steps && pathData.steps.length > 0) {
        setLearningPath(pathData);
      } else {
        setError("No learning path available yet. Complete some assignments and quizzes to generate your personalized path.");
      }
    } catch (err) {
      setError(err.message || "Failed to load learning path");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPath();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Generating your AI personalized learning path..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchLearningPath} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <CompassOutlined style={{ fontSize: 24, color: "var(--primary)" }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
            {learningPath?.title || "AI Learning Path"}
          </h1>
        </div>
        <Text style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
          {learningPath?.summary}
        </Text>
      </div>

      {/* Target Focus Tags */}
      {learningPath?.targetFocus && (
        <Card className="glass-card" bordered={false} style={{ marginBottom: 24 }} bodyStyle={{ padding: "16px 20px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginRight: 12 }}>
            Focus Topics:
          </span>
          <Space wrap size={[6, 8]}>
            {learningPath.targetFocus.map((f, i) => (
              <Tag key={i} color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>
                {f}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Timeline Steps */}
      <Card className="glass-card" bordered={false} bodyStyle={{ padding: "32px" }}>
        <Timeline
          items={learningPath?.steps?.map((step) => {
            const isCurrent = step.status === "IN_PROGRESS";
            const priorityColor = step.priority === "HIGH" ? "error" : step.priority === "MEDIUM" ? "warning" : "default";

            return {
              dot: isCurrent ? (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {step.step}
                </div>
              ) : (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {step.step}
                </div>
              ),
              color: isCurrent ? "blue" : "gray",
              children: (
                <div
                  style={{
                    marginBottom: 28,
                    padding: "16px 20px",
                    borderRadius: 10,
                    background: isCurrent ? "var(--primary-light)" : "var(--bg-tertiary)",
                    border: isCurrent ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                        {step.topic}
                      </span>
                      <Tag color={priorityColor} style={{ borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {step.priority} PRIORITY
                      </Tag>
                    </div>
                    {step.estimatedTime && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                        Est: {step.estimatedTime}
                      </span>
                    )}
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 12 }}>
                    {step.objective}
                  </p>

                  {step.suggestedActivity && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "var(--text-primary)",
                      }}
                    >
                      💡 <strong>Actionable Activity:</strong> {step.suggestedActivity}
                    </div>
                  )}

                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CodeOutlined />}
                      onClick={() => navigate("/student/assignments")}
                      style={{ borderRadius: 6 }}
                    >
                      Practice in Lab
                    </Button>
                    <Button
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => navigate("/student/quiz")}
                      style={{ borderRadius: 6 }}
                    >
                      Take Concept Quiz
                    </Button>
                  </Space>
                </div>
              ),
            };
          })}
        />
      </Card>
    </div>
  );
};

export default LearningPathPage;
