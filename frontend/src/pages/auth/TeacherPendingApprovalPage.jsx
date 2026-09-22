import React from "react";
import { Card, Button, Typography, Result, Space } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  MailOutlined,
  LoginOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

export const TeacherPendingApprovalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state || {};
  const email = stateData.email || "";

  return (
    <div style={{ maxWidth: 540, margin: "40px auto", padding: "0 16px" }}>
      <Card
        style={{
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
          padding: "16px 8px",
        }}
      >
        <Result
          icon={<ClockCircleOutlined style={{ color: "#faad14", fontSize: 56 }} />}
          title={
            <Title level={3} style={{ marginBottom: 8 }}>
              Account Pending College Approval
            </Title>
          }
          subTitle={
            <Paragraph style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
              Thank you for registering as an Instructor. For security and institutional integrity,
              your college administrator must verify your credentials before your account is activated.
            </Paragraph>
          }
          extra={[
            <div
              key="info-box"
              style={{
                background: "var(--bg-secondary, #f8f9fc)",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 24,
                textAlign: "left",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                <Text strong>Registration Received</Text>
              </div>
              {email && (
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8, color: "var(--text-secondary)" }}>
                  <MailOutlined style={{ marginRight: 8 }} />
                  <Text type="secondary">Registered Email: <strong>{email}</strong></Text>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center" }}>
                <ClockCircleOutlined style={{ color: "#faad14", marginRight: 8 }} />
                <Text type="secondary">Status: <strong>Pending Administrator Review</strong></Text>
              </div>
            </div>,
            <Space direction="vertical" size="middle" style={{ width: "100%" }} key="actions">
              <Button
                type="primary"
                size="large"
                block
                icon={<LoginOutlined />}
                onClick={() => navigate("/login")}
                style={{ height: 44, borderRadius: 8 }}
              >
                Return to Login
              </Button>
              <Button
                size="large"
                block
                icon={<HomeOutlined />}
                onClick={() => navigate("/")}
                style={{ height: 44, borderRadius: 8 }}
              >
                Go to Homepage
              </Button>
            </Space>,
          ]}
        />
      </Card>
    </div>
  );
};

export default TeacherPendingApprovalPage;
