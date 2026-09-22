import React, { useState } from "react";
import { Form, Input, Button, Alert, Divider, Space, Typography } from "antd";
import { MailOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const { Text } = Typography;

export const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleFinish = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await login(values);
      // Redirect based on role or previous location
      const from = location.state?.from?.pathname;
      if (from && from !== "/login") {
        navigate(from, { replace: true });
        return;
      }

      if (user.role === ROLES.TEACHER) {
        navigate("/teacher/dashboard", { replace: true });
      } else if (user.role === ROLES.ADMIN) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      if (errorCode === "TEACHER_APPROVAL_PENDING") {
        navigate("/teacher-pending", {
          replace: true,
          state: { email: values.email },
        });
        return;
      }
      const msg = err.response?.data?.error?.message || err.message || "Failed to sign in. Please check your credentials.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Enter your institutional credentials to access your portal
        </p>
      </div>

      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg("")}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ email: "", password: "" }}
        requiredMark={false}
      >
        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Email Address</span>}
          name="email"
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: "var(--text-muted)" }} />}
            placeholder="student@university.edu"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Password</span>}
          name="password"
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "var(--text-muted)" }} />}
            placeholder="••••••••"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<LoginOutlined />}
            loading={loading}
            size="large"
            block
            style={{
              height: 44,
              borderRadius: 8,
              fontSize: 15,
            }}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Text style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 600, color: "var(--primary)" }}>
            Create Account
          </Link>
        </Text>
      </div>

    </div>
  );
};

export default LoginPage;
