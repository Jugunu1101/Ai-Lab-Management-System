import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Typography, Space, Input, message } from "antd";
import {
  TeamOutlined,
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  CopyOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import CreateClassModal from "../../components/teacher/CreateClassModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import classService from "../../services/class.service";

const { Title, Text, Paragraph } = Typography;

export const ClassListPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await classService.getClasses();
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

  const filtered = classes.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Classroom Management</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Organize student cohorts, distribute laboratory assignments, and review telemetry.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          Create Classroom
        </Button>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 400 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
          placeholder="Filter classes by title or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{ borderRadius: 8 }}
        />
      </div>

      {loading ? (
        <LoadingSpinner tip="Loading classrooms..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchClasses} />
      ) : filtered.length === 0 ? (
        <EmptyState
          description="No classrooms found"
          actionText="Create Your First Class"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((cls) => (
            <Col xs={24} md={12} key={cls._id}>
              <Card
                className="glass-card glass-card-hover"
                bordered={false}
                bodyStyle={{ padding: "24px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tag
                      color="purple"
                      style={{
                        fontWeight: 800,
                        borderRadius: 6,
                        fontSize: 13,
                        letterSpacing: 1.5,
                        fontFamily: "monospace",
                        padding: "2px 8px",
                      }}
                    >
                      <KeyOutlined style={{ marginRight: 4 }} />
                      {cls.code}
                    </Tag>
                    {cls.department && (
                      <Tag style={{ borderRadius: 6, fontSize: 12 }}>{cls.department}</Tag>
                    )}
                  </div>

                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(cls.code);
                      message.success(`Copied code "${cls.code}" to clipboard!`);
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Copy Code
                  </Button>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                  {cls.name}
                </h3>

                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ color: "var(--text-secondary)", fontSize: 13, minHeight: 40 }}
                >
                  {cls.description || "Active laboratory section for automated grading."}
                </Paragraph>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    marginBottom: 16,
                  }}
                >
                  <span>
                    <UserOutlined style={{ marginRight: 6, color: "var(--primary)" }} />
                    <strong>{cls.students?.length || 0}</strong> Students Enrolled
                  </span>
                  <span>
                    <BookOutlined style={{ marginRight: 6, color: "#10b981" }} />
                    <strong>{cls.assignmentsCount || 0}</strong> Assignments
                  </span>
                </div>

                <Button
                  type="primary"
                  block
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate(`/teacher/classes/${cls._id}`)}
                  style={{ borderRadius: 8 }}
                >
                  Manage Classroom Roster
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <CreateClassModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchClasses}
      />
    </div>
  );
};

export default ClassListPage;
