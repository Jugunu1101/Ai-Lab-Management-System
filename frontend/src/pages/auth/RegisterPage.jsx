import React, { useState, useEffect } from "react";
import { Form, Input, Button, Alert, Select, Typography, Tag, Card } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  ApartmentOutlined,
  BankOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import collegeService from "../../services/college.service";
import { ROLES } from "../../utils/constants";

const { Text, Title } = Typography;
const { Option } = Select;

export const RegisterPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await collegeService.getPublicColleges();
        const list = res.data || res || [];
        setColleges(list);
        if (list.length > 0) {
          form.setFieldsValue({ collegeId: list[0]._id });
          setSelectedCollege(list[0]);
        }
      } catch (err) {
        console.warn("Failed to fetch public colleges:", err);
      }
    };
    fetchColleges();
  }, [form]);

  const handleCollegeChange = (collegeId) => {
    const found = colleges.find((c) => c._id === collegeId);
    setSelectedCollege(found || null);
  };

  const handleFinish = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await register(values);

      // Check if registration resulted in a pending teacher account
      if (result?.pendingApproval) {
        navigate("/teacher-pending", {
          replace: true,
          state: { email: values.email },
        });
        return;
      }

      // Normal logged in user
      if (result?.role === ROLES.TEACHER) {
        navigate("/teacher/dashboard", { replace: true });
      } else if (result?.role === ROLES.ADMIN) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Registration failed. Please check your information.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>
          Create an Account
        </Title>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Join your college programming lab workspace
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

      {selectedRole === ROLES.TEACHER && (
        <Alert
          message="Teacher Approval Required"
          description="Instructor accounts require verification by your college administrator before you can log in."
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ role: ROLES.STUDENT }}
        requiredMark={false}
      >
        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Select College / Institution</span>}
          name="collegeId"
          rules={[{ required: true, message: "Please select your college" }]}
        >
          <Select
            size="large"
            placeholder="Select your college"
            onChange={handleCollegeChange}
            style={{ borderRadius: 8 }}
          >
            {colleges.map((c) => (
              <Option key={c._id} value={c._id}>
                {c.name} ({c.code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedCollege?.domains && selectedCollege.domains.length > 0 && (
          <div style={{ marginBottom: 16, marginTop: -8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Allowed email domains:{" "}
              {selectedCollege.domains.map((d) => (
                <Tag color="blue" key={d} style={{ marginRight: 4 }}>
                  @{d}
                </Tag>
              ))}
            </Text>
          </div>
        )}

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Account Role</span>}
          name="role"
          rules={[{ required: true, message: "Please select your role" }]}
        >
          <Select
            size="large"
            style={{ borderRadius: 8 }}
            onChange={(val) => setSelectedRole(val)}
          >
            <Option value={ROLES.STUDENT}>Student</Option>
            <Option value={ROLES.TEACHER}>Teacher / Instructor (Requires Admin Approval)</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Full Name</span>}
          name="name"
          rules={[{ required: true, message: "Please enter your name" }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: "var(--text-muted)" }} />}
            placeholder="Jane Doe"
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Official College Email</span>}
          name="email"
          rules={[
            { required: true, message: "Please enter your college email" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
          help={
            selectedCollege?.domains?.length > 0
              ? `Must end with @${selectedCollege.domains[0]}`
              : "Use your institutional email address"
          }
        >
          <Input
            prefix={<MailOutlined style={{ color: "var(--text-muted)" }} />}
            placeholder={
              selectedCollege?.domains?.length > 0
                ? `name@${selectedCollege.domains[0]}`
                : "yourname@college.edu"
            }
            size="large"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Department</span>}
          name="department"
        >
          {selectedCollege?.departments && selectedCollege.departments.length > 0 ? (
            <Select size="large" placeholder="Select Department" style={{ borderRadius: 8 }}>
              {selectedCollege.departments.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </Select>
          ) : (
            <Input
              prefix={<ApartmentOutlined style={{ color: "var(--text-muted)" }} />}
              placeholder="Computer Science"
              size="large"
              style={{ borderRadius: 8 }}
            />
          )}
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Password</span>}
          name="password"
          rules={[
            { required: true, message: "Please create a password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
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
            icon={<UserAddOutlined />}
            loading={loading}
            size="large"
            block
            style={{
              height: 44,
              borderRadius: 8,
              fontSize: 15,
            }}
          >
            {selectedRole === ROLES.TEACHER
              ? "Request Teacher Account"
              : "Register as Student"}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Text style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600, color: "var(--primary)" }}>
            Sign In
          </Link>
        </Text>
      </div>
    </div>
  );
};

export default RegisterPage;
