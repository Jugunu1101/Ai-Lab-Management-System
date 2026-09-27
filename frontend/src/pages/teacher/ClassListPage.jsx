import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Tag, Typography, Space, Input, Modal, message } from "antd";
import {
  TeamOutlined,
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  CopyOutlined,
  KeyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import CreateClassModal from "../../components/teacher/CreateClassModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import classService from "../../services/class.service";
import { useAuth } from "../../context/AuthContext";

const { Title, Text, Paragraph } = Typography;

export const ClassListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  const openDeleteConfirm = (cls, e) => {
    if (e) e.stopPropagation();
    setClassToDelete(cls);
    setDeleteModalOpen(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await classService.deleteClass(classToDelete._id);
      message.success(`Class "${classToDelete.name}" deleted successfully`);
      setDeleteModalOpen(false);
      setClassToDelete(null);
      fetchClasses();
    } catch (err) {
      message.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          "Failed to delete class"
      );
    } finally {
      setDeleting(false);
    }
  };

  const currentUserId = (user?._id || user?.id || user?.userId)?.toString();

  const cleanTerm = (searchTerm || "").trim().toLowerCase();
  const filtered = classes.filter(
    (c) =>
      !cleanTerm ||
      c.name?.toLowerCase().includes(cleanTerm) ||
      c.code?.toLowerCase().includes(cleanTerm) ||
      c.department?.toLowerCase().includes(cleanTerm) ||
      c.description?.toLowerCase().includes(cleanTerm)
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
          title={cleanTerm ? "No Matching Classrooms" : "No classrooms found"}
          description={
            cleanTerm
              ? `No classrooms matched "${searchTerm.trim()}". Check the name or code and try again.`
              : "Create your first classroom to organize student rosters and publish assignments."
          }
          actionText={cleanTerm ? "Clear Search" : "Create Your First Class"}
          onAction={() => {
            if (cleanTerm) {
              setSearchTerm("");
            } else {
              setCreateModalOpen(true);
            }
          }}
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

                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    block
                    icon={<ArrowRightOutlined />}
                    onClick={() => navigate(`/teacher/classes/${cls._id}`)}
                    style={{ borderRadius: 8 }}
                  >
                    Manage Classroom Roster
                  </Button>
                  {/* Delete button — only shown for classes owned by the current instructor */}
                  {currentUserId &&
                    (cls.teacherId?._id || cls.teacherId)?.toString() === currentUserId && (
                      <Button
                        id={`delete-class-${cls._id}`}
                        danger
                        block
                        icon={<DeleteOutlined />}
                        onClick={(e) => openDeleteConfirm(cls, e)}
                        style={{ borderRadius: 8 }}
                      >
                        Delete Class
                      </Button>
                    )}
                </Space>
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

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Class?"
        open={deleteModalOpen}
        onOk={handleDeleteClass}
        onCancel={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setClassToDelete(null);
          }
        }}
        okText="Delete Class"
        cancelText="Cancel"
        okButtonProps={{
          danger: true,
          loading: deleting,
          id: "confirm-delete-class-btn",
        }}
        cancelButtonProps={{ disabled: deleting }}
        closable={!deleting}
      >
        <p>
          Are you sure you want to delete{" "}
          <strong>"{classToDelete?.name}"</strong>?
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          This will remove the class and its associated assignments, submissions, reports, and analytics. Student accounts will not be deleted.
        </p>
      </Modal>
    </div>
  );
};

export default ClassListPage;
