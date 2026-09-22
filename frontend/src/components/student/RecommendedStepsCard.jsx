import React from "react";
import { Card, Timeline, Tag, Button, Typography } from "antd";
import { CompassOutlined, ArrowRightOutlined, CheckCircleTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

export const RecommendedStepsCard = ({ steps = [], loading = false }) => {
  const navigate = useNavigate();

  return (
    <Card
      className="glass-card"
      bordered={false}
      style={{ height: "100%" }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CompassOutlined style={{ fontSize: 18, color: "var(--primary)" }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Recommended Learning Steps</h3>
        </div>
        <Button
          type="link"
          size="small"
          onClick={() => navigate("/student/learning-path")}
          style={{ padding: 0, fontWeight: 600 }}
        >
          Full Timeline <ArrowRightOutlined />
        </Button>
      </div>

      {(!steps || steps.length === 0) ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <p>No active remediation steps. You're keeping pace with all assigned topics!</p>
        </div>
      ) : (
        <Timeline
          style={{ marginTop: 16 }}
          items={steps.slice(0, 3).map((step, idx) => ({
            dot: idx === 0 ? <CompassOutlined style={{ fontSize: 16, color: "var(--primary)" }} /> : undefined,
            color: idx === 0 ? "blue" : "gray",
            children: (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                    Step {step.step || idx + 1}: {step.topic || "Core Practice"}
                  </span>
                  {step.priority && (
                    <Tag color={step.priority === "HIGH" ? "error" : "warning"} style={{ fontSize: 11, borderRadius: 4 }}>
                      {step.priority}
                    </Tag>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                  {step.objective || step.description || step.recommendation}
                </p>
                {step.suggestedActivity && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    💡 <em>{step.suggestedActivity}</em>
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
};

export default RecommendedStepsCard;
