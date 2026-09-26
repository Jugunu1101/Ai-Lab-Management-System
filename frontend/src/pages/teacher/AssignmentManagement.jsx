import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Card, Typography, Space, Popconfirm, message } from "antd";
import {
  BookOutlined,
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileDoneOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import CreateAssignmentModal from "../../components/teacher/CreateAssignmentModal";
import GenerateAIAssignmentModal from "../../components/teacher/GenerateAIAssignmentModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import assignmentService from "../../services/assignment.service";
import { DIFFICULTY_CONFIG } from "../../utils/constants";
import { formatDate } from "../../utils/formatters";

const { Title, Text } = Typography;

export const AssignmentManagement = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getAssignments();
      const list = res.data?.assignments || res.assignments || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setAssignments(list);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDelete = async (id) => {
    try {
      await assignmentService.deleteAssignment(id);
      message.success("Assignment deleted");
      fetchAssignments();
    } catch (err) {
      message.error(err.message || "Failed to delete assignment");
    }
  };

  const columns = [
    {
      title: "Assignment Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{text}</span>
          {record.source === "AI_GENERATED" && (
            <Tag color="purple" style={{ marginLeft: 8, fontSize: 11, borderRadius: 4 }}>
              AI Generated
            </Tag>
          )}
          {record.source === "AI_AGENT" && (
            <Tag color="volcano" style={{ marginLeft: 8, fontSize: 11, borderRadius: 4 }}>
              AI Practice
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      render: (lang, record) => {
        const val = lang || record.programmingLanguage || "Multi-Lang";
        return (
          <Tag color="cyan" style={{ textTransform: "uppercase", borderRadius: 6 }}>
            {val}
          </Tag>
        );
      },
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (diff) => {
        const config = DIFFICULTY_CONFIG[diff] || { label: diff, color: "default" };
        return <Tag color={config.color} style={{ fontWeight: 600, borderRadius: 6 }}>{config.label}</Tag>;
      },
    },
    {
      title: "Submissions",
      key: "submissions",
      render: (_, rec) => (
        <span>
          <strong>{rec.submissionsCount || 0}</strong> turned in
          {rec.passedCount !== undefined && (
            <span style={{ color: "var(--success)", marginLeft: 6, fontSize: 12 }}>
              ({rec.passedCount} passed)
            </span>
          )}
        </span>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "deadline",
      key: "deadline",
      render: (date, record) => formatDate(date || record.dueDate, true),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<FileDoneOutlined />}
            onClick={() => navigate(`/teacher/submissions/${record._id}`)}
            style={{ borderRadius: 6 }}
          >
            Review Submissions
          </Button>
          <Popconfirm
            title="Delete this assignment?"
            description="Are you sure you want to delete this assignment and its test cases?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Assignment Management</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Create problem statements, test case suites, and inspect student code solutions.
          </Text>
        </div>

        <Space>
          <Button
            icon={<ThunderboltOutlined style={{ color: "#6366f1" }} />}
            onClick={() => setAiModalOpen(true)}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              background: "rgba(99, 102, 241, 0.1)",
              borderColor: "rgba(99, 102, 241, 0.4)",
              color: "var(--primary, #6366f1)",
            }}
          >
            AI Generate Assignment
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Create New Assignment
          </Button>
        </Space>
      </div>

      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner tip="Loading assignments..." />
        ) : error ? (
          <div style={{ padding: 24 }}>
            <ErrorState message={error} onRetry={fetchAssignments} />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            description="No assignments created yet"
            actionText="Create Problem"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <Table
            dataSource={assignments}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <CreateAssignmentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchAssignments}
      />

      <GenerateAIAssignmentModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSuccess={fetchAssignments}
      />
    </div>
  );
};

export default AssignmentManagement;
