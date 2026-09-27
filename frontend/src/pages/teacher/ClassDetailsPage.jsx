import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Tabs,
  Space,
  Modal,
  Form,
  Input,
  message,
  Divider,
} from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  BookOutlined,
  LineChartOutlined,
  EyeOutlined,
  LeftOutlined,
  CopyOutlined,
  KeyOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import classService from "../../services/class.service";
import assignmentService from "../../services/assignment.service";

const { Title, Text, Paragraph } = Typography;

export const ClassDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addStudentModal, setAddStudentModal] = useState(false);
  const [studentForm] = Form.useForm();
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const fetchClassDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await classService.getClassById(id);
      const data = res.data?.class || res.class || res.data;
      if (data) {
        setCls(data);
      } else {
        setError("Class not found");
      }
    } catch (err) {
      setError(err.message || "Failed to load class details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const handleAddStudent = async (values) => {
    setAddingStudent(true);
    try {
      await classService.addStudentToClass(id, values);
      message.success("Student added to classroom!");
      studentForm.resetFields();
      setAddStudentModal(false);
      fetchClassDetails();
    } catch (err) {
      message.error(err.message || "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(cls?.code || id);
    message.success("Classroom code copied to clipboard!");
  };

  if (loading) {
    return <LoadingSpinner tip="Loading classroom..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchClassDetails} />;
  }

  const studentColumns = [
    {
      title: "Student Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (dept) => <Tag>{dept || "N/A"}</Tag>,
    },
    {
      title: "Overall Mastery",
      dataIndex: "score",
      key: "score",
      render: (score, record) => {
        if (!record.hasMasteryData && score === null) {
          return (
            <Tag style={{ fontWeight: 600, borderRadius: 6, color: "var(--text-muted)", background: "var(--bg-tertiary)" }}>
              No data yet
            </Tag>
          );
        }
        const val = score ?? 0;
        const color = val >= 70 ? "success" : val >= 50 ? "warning" : "error";
        return (
          <Tag color={color} style={{ fontWeight: 700, borderRadius: 6 }}>
            {val}%
          </Tag>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            if (record._id) navigate(`/teacher/students/${record._id}`);
          }}
          style={{ borderRadius: 6 }}
        >
          View Progress
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate("/teacher/classes")}
          style={{ marginBottom: 8 }}
        >
          Back to Classrooms
        </Button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{cls?.name}</h1>
              <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6 }}>{cls?.code}</Tag>
            </div>
            <Text style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {cls?.department} • {cls?.students?.length || 0} enrolled students
            </Text>
          </div>

          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setAddStudentModal(true)}
            >
              Manual Enroll
            </Button>
          </Space>
        </div>
      </div>

      {/* Classroom Join Code Card */}
      <Card
        className="glass-card"
        bordered={false}
        style={{
          marginBottom: 20,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: 12,
        }}
        bodyStyle={{ padding: "18px 24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "var(--primary, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
              }}
            >
              <KeyOutlined />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                  STUDENT JOIN CODE
                </Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 3,
                    fontFamily: "monospace",
                    color: "var(--primary, #6366f1)",
                    background: "rgba(99, 102, 241, 0.1)",
                    padding: "2px 10px",
                    borderRadius: 6,
                  }}
                >
                  {cls?.code || "N/A"}
                </span>
                <Button
                  icon={<CopyOutlined />}
                  onClick={copyInviteCode}
                  style={{ borderRadius: 6, fontWeight: 600 }}
                >
                  Copy Code
                </Button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 360 }}>
            <Text type="secondary" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <InfoCircleOutlined style={{ color: "var(--primary)" }} />
              <span>
                Students can join directly by entering this code on their <strong>Join Class</strong> page.
              </span>
            </Text>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="glass-card" bordered={false} bodyStyle={{ padding: "16px 24px" }}>
        <Tabs
          defaultActiveKey="students"
          items={[
            {
              key: "students",
              label: (
                <span>
                  <TeamOutlined /> Student Roster ({cls?.students?.length || 0})
                </span>
              ),
              children: (() => {
                const cleanStudentSearch = (studentSearch || "").trim().toLowerCase();
                const filteredStudents = (cls?.students || []).filter((s) => {
                  if (!cleanStudentSearch) return true;
                  return (
                    s.name?.toLowerCase().includes(cleanStudentSearch) ||
                    s.email?.toLowerCase().includes(cleanStudentSearch) ||
                    s.department?.toLowerCase().includes(cleanStudentSearch)
                  );
                });
                return (
                  <div>
                    <div style={{ marginBottom: 16, maxWidth: 360 }}>
                      <Input
                        prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
                        placeholder="Search roster by name, email, department..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        allowClear
                        style={{ borderRadius: 8 }}
                      />
                    </div>
                    <Table
                      dataSource={filteredStudents}
                      columns={studentColumns}
                      rowKey="_id"
                      pagination={{ pageSize: 10 }}
                    />
                  </div>
                );
              })(),
            },
            {
              key: "info",
              label: "Curriculum & Syllabus Details",
              children: (
                <div style={{ padding: "12px 0" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Curriculum Description</h4>
                  <Paragraph style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    {cls?.description}
                  </Paragraph>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Add Student Modal */}
      <Modal
        open={addStudentModal}
        onCancel={() => setAddStudentModal(false)}
        footer={null}
        title="Enroll Student in Classroom"
      >
        <Form form={studentForm} layout="vertical" onFinish={handleAddStudent} style={{ marginTop: 16 }}>
          <Form.Item
            label="Student Email Address"
            name="email"
            rules={[
              { required: true, message: "Please enter student's email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input placeholder="student@university.edu" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Button onClick={() => setAddStudentModal(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={addingStudent}>
              Enroll
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassDetailsPage;
