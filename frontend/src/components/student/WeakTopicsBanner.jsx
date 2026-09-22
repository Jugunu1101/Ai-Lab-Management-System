import React from "react";
import { Alert, Tag, Button, Space } from "antd";
import { WarningOutlined, CompassOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export const WeakTopicsBanner = ({ weakTopics = [] }) => {
  const navigate = useNavigate();

  if (!weakTopics || weakTopics.length === 0) return null;

  return (
    <Alert
      message={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WarningOutlined style={{ color: "#ef4444", fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Weak Topic Alert: {weakTopics.length} areas need targeted practice
            </span>
          </div>

          <Button
            type="primary"
            size="small"
            icon={<CompassOutlined />}
            onClick={() => navigate("/student/learning-path")}
            style={{ borderRadius: 6, background: "#ef4444", borderColor: "#ef4444" }}
          >
            View AI Study Path
          </Button>
        </div>
      }
      description={
        <div style={{ marginTop: 8 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
            Our hybrid mastery formula detected topics where your current score is below 50%. Review recommended practice steps to strengthen these concepts:
          </p>
          <Space wrap size={[6, 8]}>
            {weakTopics.map((item, index) => {
              const topicName = item.topic || item.name || item;
              const score = item.score !== undefined ? `${Math.round(item.score)}%` : "< 50%";
              return (
                <Tag
                  key={index}
                  color="error"
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {topicName}: {score}
                </Tag>
              );
            })}
          </Space>
        </div>
      }
      type="warning"
      showIcon={false}
      style={{
        borderRadius: 12,
        marginBottom: 24,
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        backdropFilter: "blur(8px)",
      }}
    />
  );
};

export default WeakTopicsBanner;
