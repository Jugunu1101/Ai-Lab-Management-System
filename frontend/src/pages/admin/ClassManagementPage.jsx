import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Space, Input } from "antd";
import { TeamOutlined, SearchOutlined } from "@ant-design/icons";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import adminService from "../../services/admin.service";
import classService from "../../services/class.service";
import { formatDate } from "../../utils/formatters";

const { Title, Text } = Typography;

export const ClassManagementPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getClasses();
      const list = res.data?.classes || res.classes || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setClasses(list);
      } else {
        setClasses([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const cleanTerm = (searchTerm || "").trim().toLowerCase();
  const filteredClasses = classes.filter((c) => {
    if (!cleanTerm) return true;
    const nameMatch = c.name?.toLowerCase().includes(cleanTerm);
    const codeMatch = c.code?.toLowerCase().includes(cleanTerm);
    const teacherMatch =
      c.teacherName?.toLowerCase().includes(cleanTerm) ||
      c.teacherId?.name?.toLowerCase().includes(cleanTerm);
    const deptMatch = c.department?.toLowerCase().includes(cleanTerm);
    const descMatch = c.description?.toLowerCase().includes(cleanTerm);
    return nameMatch || codeMatch || teacherMatch || deptMatch || descMatch;
  });

  const columns = [
    {
      title: "Class Name & Code",
      dataIndex: "name",
      key: "name",
      render: (name, rec) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>{rec.code}</Tag>
        </div>
      ),
    },
    {
      title: "Instructor",
      dataIndex: "teacherName",
      key: "teacherName",
      render: (teacher, rec) => teacher || rec.teacherId?.name || "Faculty Member",
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (d) => d || "Computer Science",
    },
    {
      title: "Enrollment Count",
      dataIndex: "studentsCount",
      key: "studentsCount",
      render: (count, rec) => (
        <span>
          <TeamOutlined style={{ marginRight: 6, color: "var(--primary)" }} />
          <strong>{count !== undefined ? count : rec.students?.length || 0}</strong> students
        </span>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => formatDate(d),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Institutional Classrooms</h1>
        <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Directory of all classrooms and enrollment rosters across departments.
        </Text>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 420 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
          placeholder="Search classrooms by title, code, instructor, department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{ borderRadius: 8, height: 42 }}
        />
      </div>

      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner tip="Loading classroom directory..." />
        ) : error ? (
          <div style={{ padding: 24 }}>
            <ErrorState message={error} onRetry={fetchClasses} />
          </div>
        ) : (
          <Table
            dataSource={filteredClasses}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ClassManagementPage;
