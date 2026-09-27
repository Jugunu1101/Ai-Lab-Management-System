import React, { useState, useEffect } from "react";
import { Card, Tag, Button, Typography, Space, Tooltip, Row, Col, Badge } from "antd";
import {
  ThunderboltOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  BookOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import aiService from "../../services/ai.service";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorState from "../shared/ErrorState";

const { Text, Paragraph } = Typography;

export const AIInterventionsSection = ({ classId = null }) => {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInterventions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (classId) params.classId = classId;
      const res = await aiService.getInterventions(params);
      const data = res.data?.data?.interventions || res.data?.interventions || res.data?.data || res.data || [];
      setInterventions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load AI learning interventions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [classId]);

  const getSourceBadge = (source) => {
    switch (source) {
      case "ASSIGNMENT_SUBMISSION":
        return <Tag color="blue" icon={<FileDoneOutlined />}>Assignment</Tag>;
      case "QUIZ":
        return <Tag color="purple" icon={<BookOutlined />}>AI Quiz</Tag>;
      case "LEARNING_PATH":
        return <Tag color="cyan" icon={<ThunderboltOutlined />}>Learning Path</Tag>;
      default:
        return <Tag color="default">{source || "AI System"}</Tag>;
    }
  };

  const renderImprovement = (item) => {
    if (item.resultingScore === null || item.resultingScore === undefined) {
      return (
        <Tag color="default" style={{ borderRadius: 6, fontWeight: 600 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} /> Pending Practice
        </Tag>
      );
    }

    const change = item.scoreChange;
    if (change > 0) {
      return (
        <Tag color="success" style={{ borderRadius: 6, fontWeight: 700 }}>
          <ArrowUpOutlined style={{ marginRight: 4 }} /> +{change}%
        </Tag>
      );
    } else if (change < 0) {
      return (
        <Tag color="error" style={{ borderRadius: 6, fontWeight: 700 }}>
          <ArrowDownOutlined style={{ marginRight: 4 }} /> {change}%
        </Tag>
      );
    } else {
      return (
        <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600 }}>
          <MinusOutlined style={{ marginRight: 4 }} /> 0% (No change)
        </Tag>
      );
    }
  };

  return (
    <Card
      className="glass-card"
      bordered={false}
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>
            <ThunderboltOutlined style={{ marginRight: 8 }} /> AI Learning Interventions
          </span>
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchInterventions}
              style={{ borderRadius: 6 }}
            >
              Refresh
            </Button>
          </Space>
        </div>
      }
      style={{ marginBottom: 24 }}
    >
      {loading ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <LoadingSpinner tip="Loading AI learning interventions..." />
        </div>
      ) : error ? (
        <div style={{ padding: "30px 20px" }}>
          <ErrorState
            message="Unable to load AI learning interventions. Please try again."
            onRetry={fetchInterventions}
          />
        </div>
      ) : interventions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <CheckCircleOutlined style={{ fontSize: 36, color: "var(--cl-green-forest, #059669)", marginBottom: 12 }} />
          <h3 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            No AI learning interventions yet.
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 440, margin: "0 auto" }}>
            When the AI diagnostic engine detects vulnerable topics or repeated assignment difficulties, personalized interventions and recommendations will appear here automatically.
          </p>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {interventions.map((item) => {
            const hasResult = item.resultingScore !== null && item.resultingScore !== undefined;
            return (
              <Col xs={24} md={12} xl={8} key={item.id || item._id}>
                <div
                  style={{
                    backgroundColor: "var(--bg-primary, rgba(0,0,0,0.02))",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 16,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  {/* Top Bar: Student & Source */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                          {item.studentName}
                        </div>
                        {item.studentEmail && (
                          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {item.studentEmail}
                          </Text>
                        )}
                      </div>
                      {getSourceBadge(item.source)}
                    </div>

                    {/* Topic Badge & Reason */}
                    <div style={{ marginBottom: 10 }}>
                      <Tag color="geekblue" style={{ fontWeight: 600, textTransform: "uppercase", fontSize: 11, borderRadius: 4 }}>
                        {item.topic}
                      </Tag>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
                        Why AI Intervened:
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {item.reason}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "var(--bg-card, #ffffff)",
                        border: "1px solid var(--border-color, #e5e7eb)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", marginBottom: 4, display: "flex", alignItems: "center" }}>
                        <ThunderboltOutlined style={{ marginRight: 4 }} /> AI Recommendation:
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.45 }}>
                        {item.recommendation}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats: Previous vs Resulting Score */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color, #e5e7eb)",
                      paddingTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Previous Mastery</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.previousScore}%
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Current Mastery</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: hasResult ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {hasResult ? `${item.resultingScore}%` : "Pending"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Improvement</div>
                      {renderImprovement(item)}
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </Card>
  );
};

export default AIInterventionsSection;
