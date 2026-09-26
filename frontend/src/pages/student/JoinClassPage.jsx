import React, { useState } from "react";
import { Card, Form, Input, Button, Alert, Typography, Space, Result } from "antd";
import { TeamOutlined, KeyOutlined, ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import classService from "../../services/class.service";

const { Title, Text, Paragraph } = Typography;

export const JoinClassPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [joinedClass, setJoinedClass] = useState(null);

  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const code = values.code.toUpperCase().trim();
      const res = await classService.joinClassByCode(code);
      const classData = res.data?.class || res.data || res;
      setJoinedClass(classData);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to join class. Please check the code and try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (joinedClass) {
    return (
      <div className="cl-container" style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px" }}>
        <div
          className="cl-card"
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE5DC",
            borderRadius: 20,
            padding: "44px 36px",
            textAlign: "center",
          }}
        >
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: "#2F7D4A", fontSize: 64 }} />}
            title={
              <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 16, color: "#18231D" }}>
                Successfully Enrolled!
              </h2>
            }
            subTitle={
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 17, color: "#18231D", marginBottom: 8 }}>
                  You have joined <strong>{joinedClass.name}</strong>
                </p>
                {joinedClass.teacherId && (
                  <span style={{ fontSize: 14, color: "#59665E", display: "block" }}>
                    Instructor: {joinedClass.teacherId.name} ({joinedClass.teacherId.email})
                  </span>
                )}
                {joinedClass.department && (
                  <span style={{ fontSize: 14, color: "#748078", display: "block", marginTop: 4 }}>
                    Department: {joinedClass.department}
                  </span>
                )}
              </div>
            }
            extra={[
              <Button
                key="classes"
                className="cl-btn-primary"
                style={{ height: 46, padding: "0 28px", fontSize: 15 }}
                onClick={() => navigate("/student/classes")}
              >
                Go to My Classes
              </Button>,
              <Button
                key="assignments"
                className="cl-btn-secondary"
                style={{ height: 46, padding: "0 24px", fontSize: 15 }}
                onClick={() =>
                  navigate(
                    `/student/assignments?classId=${
                      joinedClass._id || joinedClass.id
                    }`
                  )
                }
              >
                View Assignments
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cl-container" style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/student/classes")}
        style={{
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 600,
          color: "#59665E",
        }}
      >
        Back to My Classes
      </Button>

      <div
        className="cl-card"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDE5DC",
          borderRadius: 20,
          padding: "44px 36px",
          boxShadow: "0 4px 16px rgba(18, 60, 42, 0.05)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#EDF6EA",
              border: "1px solid #DCEEDD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px auto",
            }}
          >
            <KeyOutlined style={{ fontSize: 26, color: "#123C2A" }} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#18231D", marginBottom: 8 }}>
            Join a Classroom
          </h2>
          <p style={{ fontSize: 15, color: "#59665E", margin: 0 }}>
            Enter the 6-character class code provided by your instructor
          </p>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg("")}
            style={{
              marginBottom: 24,
              borderRadius: 12,
              background: "#FDF1F1",
              border: "1px solid #F8D7D7",
            }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="code"
            rules={[
              { required: true, message: "Please enter the class code" },
              { min: 4, message: "Code must be at least 4 characters" },
              { max: 10, message: "Code cannot exceed 10 characters" },
            ]}
          >
            <Input
              placeholder="e.g., K9F2Q8"
              style={{
                borderRadius: 12,
                fontSize: 22,
                textAlign: "center",
                letterSpacing: 6,
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                height: 54,
                borderColor: "#DDE5DC",
                background: "#F8F6EE",
              }}
              maxLength={10}
              autoFocus
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              className="cl-btn-primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<TeamOutlined />}
              style={{
                height: 48,
                fontSize: 16,
                width: "100%",
              }}
            >
              Join Classroom
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            borderTop: "1px solid #E8EFE7",
            paddingTop: 20,
          }}
        >
          <span style={{ fontSize: 13, color: "#748078", lineHeight: 1.5, display: "block" }}>
            Don't have a code? Ask your course teacher or lab instructor to share their classroom code.
          </span>
        </div>
      </div>
    </div>
  );
};

export default JoinClassPage;
