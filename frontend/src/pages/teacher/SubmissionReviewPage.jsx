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
} from "antd";
import {
  LeftOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  BulbOutlined,
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

  useEffect(() => {
    const loadReviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assignRes, subRes] = await Promise.allSettled([
          assignmentService.getAssignmentById(id),
          submissionService.getAssignmentSubmissions(id),
        ]);

        if (assignRes.status === "fulfilled") {
          const a = assignRes.value.data?.assignment || assignRes.value.assignment || assignRes.value.data;
          setAssignment(a);
        }

        let list = [];
        if (subRes.status === "fulfilled") {
          list = subRes.value.data?.submissions || subRes.value.submissions || subRes.value.data || [];
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
      render: (name, rec) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name || rec.studentId?.name || "Student"}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.studentEmail || rec.studentId?.email}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, rec) => {
        const isPassed = status === "PASSED";
        return (
          <Tag color={isPassed ? "success" : "error"} style={{ fontWeight: 700, borderRadius: 6 }}>
            {status} ({rec.passedCount || 0}/{rec.totalTests || 0})
          </Tag>
        );
      },
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      render: (l) => <Tag color="cyan" style={{ textTransform: "uppercase" }}>{l}</Tag>,
    },
    {
      title: "Execution Time",
      dataIndex: "executionTimeMs",
      key: "executionTimeMs",
      render: (t) => formatDuration(t),
    },
    {
      title: "Memory",
      dataIndex: "memoryUsedBytes",
      key: "memoryUsedBytes",
      render: (m) => formatBytes(m),
    },
    {
      title: "Submitted",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => formatDate(d, true),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedSubmission(record);
            setModalOpen(true);
          }}
          style={{ borderRadius: 6 }}
        >
          Inspect Code & AI Diagnostics
        </Button>
      ),
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

      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={submissions}
          columns={columns}
          rowKey="_id"
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
