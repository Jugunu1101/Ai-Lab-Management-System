import React, { useState, useEffect } from "react";
import { Table, Button, Typography, Select, Row, Col, Space } from "antd";
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import SubmissionResultModal from "../../components/student/SubmissionResultModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import submissionService from "../../services/submission.service";
import { formatDate, formatDuration, formatBytes } from "../../utils/formatters";

const { Text } = Typography;
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
          <div style={{ fontWeight: 700, fontSize: 15, color: "#18231D", marginBottom: 2 }}>
            {text || rec.assignmentId?.title || "Problem Submission"}
          </div>
          <span style={{ fontSize: 12, color: "#748078", fontFamily: "var(--font-mono)" }}>
            ID: {rec._id}
          </span>
        </div>
      ),
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      render: (lang) => (
        <span
          style={{
            background: "#EDF6EA",
            color: "#174832",
            border: "1px solid #DCEEDD",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {lang || "CPP"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, record) => {
        const isPassed = status === "PASSED";
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: isPassed ? "#EDF6EA" : "#FDF1F1",
              color: isPassed ? "#2F7D4A" : "#C83C3C",
              border: isPassed ? "1px solid #DCEEDD" : "1px solid #F8D7D7",
              borderRadius: 8,
              padding: "4px 12px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {isPassed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            {status} ({record.testCasesPassed || 0}/{record.totalTestCases || 0})
          </span>
        );
      },
    },
    {
      title: "Runtime",
      dataIndex: "executionTimeMs",
      key: "executionTimeMs",
      render: (time) => (
        <span style={{ fontSize: 14, color: "#59665E" }}>
          {time ? formatDuration(time) : "-"}
        </span>
      ),
    },
    {
      title: "Memory",
      dataIndex: "memoryUsedBytes",
      key: "memoryUsedBytes",
      render: (mem) => (
        <span style={{ fontSize: 14, color: "#59665E" }}>
          {mem ? formatBytes(mem) : "-"}
        </span>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (
        <span style={{ fontSize: 14, color: "#18231D" }}>
          {formatDate(date, true)}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          className="cl-btn-secondary"
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedSubmission(record);
            setModalOpen(true);
          }}
        >
          View AI Details
        </Button>
      ),
    },
  ];

  return (
    <div className="cl-container" style={{ paddingBottom: 64 }}>
      {/* Page Header */}
      <div
        style={{
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div className="cl-page-header" style={{ marginBottom: 0 }}>
          <h1>Submission History</h1>
          <p className="cl-page-subtitle">
            Review past sandbox executions, test logs, and automated AI code diagnostics.
          </p>
        </div>

        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180, height: 46 }}
          suffixIcon={<FilterOutlined style={{ color: "#748078" }} />}
        >
          <Option value="ALL">All Statuses</Option>
          <Option value="PASSED">Passed Only</Option>
          <Option value="FAILED">Failed Only</Option>
        </Select>
      </div>

      {/* Main Table Card */}
      <div
        className="cl-card"
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 0,
          border: "1px solid #DDE5DC",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(18, 60, 42, 0.04)",
        }}
      >
        {loading ? (
          <div style={{ padding: 48 }}>
            <LoadingSpinner tip="Loading submissions..." />
          </div>
        ) : error ? (
          <div style={{ padding: 32 }}>
            <ErrorState message={error} onRetry={fetchSubmissions} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              title="No submissions match your filter"
              description="Solve coding assignments to generate submission records and execution metrics."
              actionText="Explore Assignments"
              onAction={() => window.location.href = "/student/assignments"}
            />
          </div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              style: { padding: "16px 24px", margin: 0 },
            }}
          />
        )}
      </div>

      <SubmissionResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        submission={selectedSubmission}
      />
    </div>
  );
};

export default SubmissionHistory;
