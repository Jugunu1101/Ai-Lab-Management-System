import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Typography,
  Space,
  Input,
  Empty,
  Badge,
  Tooltip,
  Modal,
  Descriptions,
} from "antd";
import {
  BookOutlined,
  UserOutlined,
  MailOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  CodeOutlined,
  TeamOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import classService from "../../services/class.service";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";

const { Title, Text, Paragraph } = Typography;

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
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            My Enrolled Classes
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            All laboratory and lecture courses you are currently participating in
          </Text>
        </div>

        <Input
          prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
          placeholder="Search by class, code, teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 280, borderRadius: 8 }}
          allowClear
          size="middle"
        />
      </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: "center", padding: "40px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4} style={{ marginBottom: 8 }}>
                  No Enrolled Classes Found
                </Title>
                <Text type="secondary">
                  {searchTerm
                    ? "No classes match your search query."
                    : "You are not enrolled in any classes yet. Your college teacher will add you to their class roster."}
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {filteredClasses.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item._id || item.id}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e8ecf4",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
                bodyStyle={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Top tags */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <Tag color="blue" style={{ fontWeight: 600, borderRadius: 4 }}>
                      {item.code || "COURSE"}
                    </Tag>
                    {item.semester && (
                      <Tag color="purple" style={{ borderRadius: 4 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {item.semester}
                      </Tag>
                    )}
                  </div>

                  {/* Title */}
                  <Title level={4} style={{ marginBottom: 8, fontSize: 18 }}>
                    {item.name}
                  </Title>

                  {/* Department & Description */}
                  {item.department && (
                    <Text type="secondary" style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                      {item.department}
                    </Text>
                  )}

                  {item.description && (
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}
                    >
                      {item.description}
                    </Paragraph>
                  )}

                  {/* Teacher Info Box */}
                  <div
                    style={{
                      background: "var(--bg-secondary, #f8f9fc)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                      <UserOutlined style={{ color: "var(--primary, #1890ff)", marginRight: 8 }} />
                      <Text strong>{item.teacherId?.name || "Instructor"}</Text>
                    </div>
                    {item.teacherId?.email && (
                      <div style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: 12 }}>
                        <MailOutlined style={{ marginRight: 8 }} />
                        <span>{item.teacherId.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Languages Supported */}
                  {item.languages && item.languages.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                        Supported Languages:
                      </Text>
                      <Space size={[4, 4]} wrap>
                        {item.languages.map((lang) => (
                          <Tag key={lang} style={{ borderRadius: 4, textTransform: "capitalize" }}>
                            {lang}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12, marginTop: 8 }}>
                  <Row gutter={8}>
                    <Col span={14}>
                      <Button
                        type="primary"
                        block
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate(`/student/assignments?classId=${item._id || item.id}`)}
                        style={{ borderRadius: 6 }}
                      >
                        Assignments
                      </Button>
                    </Col>
                    <Col span={10}>
                      <Button
                        block
                        icon={<InfoCircleOutlined />}
                        onClick={() => {
                          setSelectedClass(item);
                          setModalOpen(true);
                        }}
                        style={{ borderRadius: 6 }}
                      >
                        Details
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Class Details Modal */}
      <Modal
        title={selectedClass?.name || "Class Details"}
        open={modalOpen}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="assignments"
            type="primary"
            onClick={() => {
              setModalOpen(false);
              navigate(`/student/assignments?classId=${selectedClass?._id || selectedClass?.id}`);
            }}
          >
            Go to Assignments
          </Button>,
        ]}
      >
        {selectedClass && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Course Code">{selectedClass.code || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedClass.department || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Semester">{selectedClass.semester || "Current"}</Descriptions.Item>
            <Descriptions.Item label="Instructor">{selectedClass.teacherId?.name || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Instructor Email">{selectedClass.teacherId?.email || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Description">{selectedClass.description || "No syllabus description provided."}</Descriptions.Item>
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
