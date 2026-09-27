import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Modal,
  Tabs,
  Alert,
  Divider,
  Input,
} from "antd";
import {
  LeftOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  BulbOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import SubmissionResultModal from "../../components/student/SubmissionResultModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import submissionService from "../../services/submission.service";
import assignmentService from "../../services/assignment.service";
import { formatDate, formatDuration, formatBytes } from "../../utils/formatters";

const { Title, Text, Paragraph } = Typography;

export const SubmissionReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadReviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assignRes, subRes] = await Promise.allSettled([
          assignmentService.getAssignmentById(id),
          assignmentService.getAssignmentResults(id),
        ]);

        if (assignRes.status === "fulfilled") {
          const a = assignRes.value.data?.assignment || assignRes.value.assignment || assignRes.value.data;
          setAssignment(a);
        }

        let list = [];
        if (subRes.status === "fulfilled") {
          list = subRes.value.data?.results || subRes.value.results || subRes.value.data || [];
        }

        if (Array.isArray(list) && list.length > 0) {
          setSubmissions(list);
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        setError(err.message || "Failed to load review data");
      } finally {
        setLoading(false);
      }
    };

    loadReviewData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner tip="Loading submissions..." />;
  }

  const columns = [
    {
      title: "Student",
      dataIndex: "studentName",
      key: "studentName",
      render: (_, rec) => (
        <div>
          <div style={{ fontWeight: 600 }}>{rec.student?.name || "Student"}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.student?.email}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "latestStatus",
      key: "latestStatus",
      render: (status) => {
        if (status === "NOT_SUBMITTED") {
          return <Tag style={{ fontWeight: 700, borderRadius: 6, color: "var(--text-muted)", background: "var(--bg-tertiary)" }}>Pending</Tag>;
        }
        const isPassed = status === "PASSED" || status === "COMPLETED";
        return (
          <Tag color={isPassed ? "success" : "error"} style={{ fontWeight: 700, borderRadius: 6 }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Attempts",
      dataIndex: "attempts",
      key: "attempts",
      render: (attempts) => attempts || 0,
    },
    {
      title: "Best Score",
      dataIndex: "bestScore",
      key: "bestScore",
      render: (score) => (
        <Tag color={score >= 70 ? "success" : score >= 40 ? "warning" : "default"}>
          {score || 0}%
        </Tag>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "latestSubmissionAt",
      key: "latestSubmissionAt",
      render: (d) => d ? formatDate(d, true) : "—",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        if (record.attempts === 0) return null;
        return (
          <Space>
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={() => {
                setSelectedSubmission(record.latestSubmission);
                setModalOpen(true);
              }}
              style={{ borderRadius: 6, color: "var(--primary)", borderColor: "var(--primary)" }}
            >
              Code
            </Button>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/teacher/students/${record.student?._id}`)}
              style={{ borderRadius: 6 }}
            >
              Progress
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate("/teacher/assignments")}
          style={{ marginBottom: 8 }}
        >
          Back to Assignments
        </Button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
              Review: {assignment?.title || "Problem Submissions"}
            </h1>
            <Text style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Total submissions evaluated: {submissions.length}
            </Text>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 380 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
          placeholder="Search student by name, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{ borderRadius: 8 }}
        />
      </div>

      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={(() => {
            const cleanTerm = (searchTerm || "").trim().toLowerCase();
            return submissions.filter((rec) => {
              if (!cleanTerm) return true;
              const name = (rec.student?.name || "").toLowerCase();
              const email = (rec.student?.email || "").toLowerCase();
              const status = (rec.latestStatus || "").toLowerCase();
              return name.includes(cleanTerm) || email.includes(cleanTerm) || status.includes(cleanTerm);
            });
          })()}
          columns={columns}
          rowKey={(record) => record.student?._id || Math.random().toString()}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <SubmissionResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        submission={selectedSubmission}
      />
    </div>
  );
};

export default SubmissionReviewPage;
