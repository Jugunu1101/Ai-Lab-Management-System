import React from "react";
import { Table, Tag, Button, Typography, Space } from "antd";
import { WarningOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

export const AtRiskStudentsTable = ({ students = [] }) => {
  const navigate = useNavigate();

  const columns = [
    {
      title: "Student Name",
      dataIndex: "name",
      key: "name",
      render: (name, rec) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.email || rec.collegeId}</Text>
        </div>
      ),
    },
    {
      title: "Mastery Score",
      dataIndex: "score",
      key: "score",
      render: (score) => (
        <Tag color="error" style={{ fontWeight: 700, borderRadius: 6 }}>
          {score !== undefined ? `${Math.round(score)}%` : "< 50%"}
        </Tag>
      ),
    },
    {
      title: "Vulnerable Topics",
      dataIndex: "weakTopics",
      key: "weakTopics",
      render: (topics) => (
        <Space wrap size={[4, 4]}>
          {(topics || []).map((t, idx) => (
            <Tag key={idx} color="red" style={{ fontSize: 11, borderRadius: 4 }}>
              {t}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason) => (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {reason || "—"}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        const studentId = record._id || record.id;
        if (!studentId) return null;
        return (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/teacher/students/${studentId}`)}
            style={{ borderRadius: 6 }}
          >
            Inspect
          </Button>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={students}
      columns={columns}
      rowKey={(r) => r._id || r.id || r.name}
      pagination={false}
      size="middle"
    />
  );
};

export default AtRiskStudentsTable;
