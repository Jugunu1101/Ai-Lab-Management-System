import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Card, Typography, Select, Row, Col, Space } from "antd";
import { HistoryOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import SubmissionResultModal from "../../components/student/SubmissionResultModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import submissionService from "../../services/submission.service";
import { SUBMISSION_STATUS_CONFIG } from "../../utils/constants";
import { formatDate, formatDuration, formatBytes } from "../../utils/formatters";

const { Title, Text } = Typography;
const { Option } = Select;

export const SubmissionHistory = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await submissionService.getSubmissions();
      const data = res.data?.submissions || res.submissions || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setSubmissions(data);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load submission history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const filtered = submissions.filter((sub) => {
    if (statusFilter === "ALL") return true;
    return sub.status === statusFilter;
  });

  const columns = [
    {
      title: "Assignment",
      dataIndex: "assignmentTitle",
      key: "assignmentTitle",
      render: (text, rec) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {text || rec.assignmentId?.title || "Problem Submission"}
          </div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>ID: {rec._id}</Text>
        </div>
      ),
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      render: (lang) => (
        <Tag color="cyan" style={{ textTransform: "uppercase", fontWeight: 600, borderRadius: 6 }}>
          {lang}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, record) => {
        const isPassed = status === "PASSED";
        return (
          <Tag
            color={isPassed ? "success" : "error"}
            icon={isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}
          >
            {status} ({record.passedCount || 0}/{record.totalTests || 0})
          </Tag>
        );
      },
    },
    {
      title: "Runtime",
      dataIndex: "executionTimeMs",
      key: "executionTimeMs",
      render: (time) => formatDuration(time),
    },
    {
      title: "Memory",
      dataIndex: "memoryUsedBytes",
      key: "memoryUsedBytes",
      render: (mem) => formatBytes(mem),
    },
    {
      title: "Submitted At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date, true),
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
          View AI Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Submission History</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Review past sandbox executions, test logs, and automated AI code diagnostics.
          </Text>
        </div>

        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
        >
          <Option value="ALL">All Statuses</Option>
          <Option value="PASSED">Passed Only</Option>
          <Option value="FAILED">Failed Only</Option>
        </Select>
      </div>

      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner tip="Loading submissions..." />
        ) : error ? (
          <div style={{ padding: 24 }}>
            <ErrorState message={error} onRetry={fetchSubmissions} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState description="No submissions match your filter" />
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <SubmissionResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        submission={selectedSubmission}
      />
    </div>
  );
};

export default SubmissionHistory;
