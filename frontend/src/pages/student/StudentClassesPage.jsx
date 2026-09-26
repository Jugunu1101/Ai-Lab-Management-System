import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Input,
  Button,
  Typography,
  Space,
  Modal,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import classService from "../../services/class.service";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";

const { Text, Paragraph } = Typography;

export const StudentClassesPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await classService.getClasses();
      const list = res.data?.classes || res.data || res || [];
      setClasses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load enrolled classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const filteredClasses = classes.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(term);
    const codeMatch = c.code?.toLowerCase().includes(term);
    const teacherMatch = c.teacherId?.name?.toLowerCase().includes(term);
    const deptMatch = c.department?.toLowerCase().includes(term);
    return nameMatch || codeMatch || teacherMatch || deptMatch;
  });

  if (loading) return <LoadingSpinner tip="Loading your enrolled classes..." />;
  if (error) return <ErrorState message={error} onRetry={fetchClasses} />;

  return (
    <div className="cl-container" style={{ paddingBottom: 64 }}>
      {/* Header */}
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
          <h1>My Enrolled Classes</h1>
          <p className="cl-page-subtitle">
            All laboratory and lecture courses you are currently participating in.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Input
            prefix={<SearchOutlined style={{ color: "var(--cl-text-muted)", fontSize: 16 }} />}
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 240, height: 46, borderRadius: 12 }}
            allowClear
          />
          <Button
            className="cl-btn-primary"
            icon={<KeyOutlined />}
            onClick={() => navigate("/student/join-class")}
          >
            Join Class
          </Button>
        </div>
      </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          title="No Enrolled Classes Found"
          description={
            searchTerm
              ? "No classes match your search query."
              : "You are not enrolled in any classes yet. Use your instructor's class code to join."
          }
          actionText={searchTerm ? "Reset Search" : "Join with Class Code"}
          onAction={() => {
            if (searchTerm) {
              setSearchTerm("");
            } else {
              navigate("/student/join-class");
            }
          }}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {filteredClasses.map((item) => (
            <Col xs={24} md={12} xl={8} key={item._id || item.id}>
              <div
                className="cl-card cl-card-hover"
                style={{
                  minWidth: 320,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "#FFFFFF",
                  border: "1px solid #DDE5DC",
                  borderRadius: 20,
                  padding: 26,
                  boxShadow: "0 2px 8px rgba(18, 60, 42, 0.04)",
                }}
              >
                <div>
                  {/* Top tags */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        background: "#EDF6EA",
                        color: "#123C2A",
                        border: "1px solid #DCEEDD",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {item.code || "COURSE"}
                    </span>
                    {item.semester && (
                      <span
                        style={{
                          background: "#F8F6EE",
                          color: "#59665E",
                          border: "1px solid #DDE5DC",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CalendarOutlined style={{ fontSize: 12 }} />
                        {item.semester}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: 21,
                      fontWeight: 700,
                      color: "#18231D",
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </h3>

                  {/* Department & Description */}
                  {item.department && (
                    <span
                      style={{
                        display: "block",
                        fontSize: 14,
                        color: "#59665E",
                        fontWeight: 500,
                        marginBottom: 10,
                      }}
                    >
                      {item.department}
                    </span>
                  )}

                  {item.description && (
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{
                        color: "#59665E",
                        fontSize: 14,
                        lineHeight: 1.55,
                        marginBottom: 16,
                      }}
                    >
                      {item.description}
                    </Paragraph>
                  )}

                  {/* Instructor Box */}
                  <div
                    style={{
                      background: "#F8F6EE",
                      border: "1px solid #DDE5DC",
                      padding: "12px 16px",
                      borderRadius: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#18231D",
                      }}
                    >
                      <UserOutlined style={{ color: "#246B45" }} />
                      <span>{item.teacherId?.name || "Instructor"}</span>
                    </div>
                    {item.teacherId?.email && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#59665E",
                          fontSize: 13,
                        }}
                      >
                        <MailOutlined style={{ color: "#748078" }} />
                        <span>{item.teacherId.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Languages Supported */}
                  {item.languages && item.languages.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#748078",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Supported Languages:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {item.languages.map((lang) => (
                          <span
                            key={lang}
                            style={{
                              background: "#EDF6EA",
                              color: "#246B45",
                              border: "1px solid #DCEEDD",
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    borderTop: "1px solid #E8EFE7",
                    paddingTop: 16,
                    marginTop: 8,
                  }}
                >
                  <Row gutter={10}>
                    <Col span={14}>
                      <Button
                        className="cl-btn-primary"
                        style={{ width: "100%", height: 44, fontSize: 14 }}
                        icon={<ArrowRightOutlined />}
                        onClick={() =>
                          navigate(
                            `/student/assignments?classId=${item._id || item.id}`
                          )
                        }
                      >
                        Assignments
                      </Button>
                    </Col>
                    <Col span={10}>
                      <Button
                        className="cl-btn-secondary"
                        style={{ width: "100%", height: 44, fontSize: 14 }}
                        icon={<InfoCircleOutlined />}
                        onClick={() => {
                          setSelectedClass(item);
                          setModalOpen(true);
                        }}
                      >
                        Details
                      </Button>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* Class Details Modal */}
      <Modal
        title={
          <span style={{ fontSize: 20, fontWeight: 700, color: "#18231D" }}>
            {selectedClass?.name || "Class Details"}
          </span>
        }
        open={modalOpen}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button
            key="close"
            className="cl-btn-secondary"
            style={{ height: 40 }}
            onClick={() => setModalOpen(false)}
          >
            Close
          </Button>,
          <Button
            key="assignments"
            className="cl-btn-primary"
            style={{ height: 40 }}
            onClick={() => {
              setModalOpen(false);
              navigate(
                `/student/assignments?classId=${
                  selectedClass?._id || selectedClass?.id
                }`
              );
            }}
          >
            Go to Assignments
          </Button>,
        ]}
      >
        {selectedClass && (
          <Descriptions
            column={1}
            bordered
            size="middle"
            style={{ marginTop: 20, background: "#FFFFFF" }}
          >
            <Descriptions.Item label="Course Code">
              <strong>{selectedClass.code || "N/A"}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedClass.department || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Semester">
              {selectedClass.semester || "Current"}
            </Descriptions.Item>
            <Descriptions.Item label="Instructor">
              {selectedClass.teacherId?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Instructor Email">
              {selectedClass.teacherId?.email || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedClass.description || "No syllabus description provided."}
            </Descriptions.Item>
            <Descriptions.Item label="Languages">
              {selectedClass.languages?.join(", ") || "General"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StudentClassesPage;
