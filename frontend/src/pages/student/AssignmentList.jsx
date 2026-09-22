import React, { useState } from "react";
import { Row, Col, Card, Input, Select, Tag, Button, Typography, Space, Badge } from "antd";
import {
  SearchOutlined,
  CodeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import useAssignments from "../../hooks/useAssignments";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import { DIFFICULTY_CONFIG, PROGRAMMING_LANGUAGES } from "../../utils/constants";
import { formatDate } from "../../utils/formatters";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const AssignmentList = () => {
  const navigate = useNavigate();
  const { assignments, loading, error, refetch } = useAssignments();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");

  const displayedAssignments = assignments || [];

  const filtered = displayedAssignments.filter((item) => {
    const matchSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.topics && item.topics.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchDiff = selectedDifficulty === "ALL" || item.difficulty === selectedDifficulty;
    const matchLang = selectedLanguage === "ALL" ||
      item.programmingLanguage?.toLowerCase() === selectedLanguage.toLowerCase() ||
      item.language?.toLowerCase() === selectedLanguage.toLowerCase();

    return matchSearch && matchDiff && matchLang;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Programming Assignments</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Explore laboratory problem sets, execute code in sandboxes, and receive AI evaluations.
          </Text>
        </div>
      </div>

      {/* Filter Bar */}
      <Card
        className="glass-card"
        bordered={false}
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
              placeholder="Search problems by name, topic, or concept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>

          <Col xs={12} md={7}>
            <Select
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              style={{ width: "100%", borderRadius: 8 }}
            >
              <Option value="ALL">All Difficulties</Option>
              <Option value="EASY">Easy</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="HARD">Hard</Option>
            </Select>
          </Col>

          <Col xs={12} md={7}>
            <Select
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              style={{ width: "100%", borderRadius: 8 }}
            >
              <Option value="ALL">All Languages</Option>
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <Option key={lang.value} value={lang.value}>
                  {lang.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingSpinner tip="Loading assignments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          description="No assignments matched your search filters"
          actionText="Reset Filters"
          onAction={() => {
            setSearchTerm("");
            setSelectedDifficulty("ALL");
            setSelectedLanguage("ALL");
          }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((assignment) => {
            const diffConfig = DIFFICULTY_CONFIG[assignment.difficulty] || { label: assignment.difficulty, color: "default" };
            return (
              <Col xs={24} md={12} xl={8} key={assignment._id}>
                <Card
                  className="glass-card glass-card-hover"
                  bordered={false}
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    padding: "24px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <Tag color={diffConfig.color} style={{ fontWeight: 700, borderRadius: 6 }}>
                        {diffConfig.label}
                      </Tag>
                      <Tag color="cyan" style={{ borderRadius: 6, textTransform: "uppercase", fontSize: 11 }}>
                        {assignment.programmingLanguage || assignment.language || "Multi-Lang"}
                      </Tag>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                      {assignment.title}
                    </h3>

                    <Paragraph
                      ellipsis={{ rows: 3 }}
                      style={{ color: "var(--text-secondary)", fontSize: 13, minHeight: 60 }}
                    >
                      {assignment.description}
                    </Paragraph>

                    {assignment.topics && assignment.topics.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <Space wrap size={[4, 6]}>
                          {assignment.topics.map((t, idx) => (
                            <Tag key={idx} color="purple" style={{ borderRadius: 4, fontSize: 11 }}>
                              {t}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderTop: "1px solid var(--border-subtle)",
                        marginBottom: 16,
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      <span>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        Due: {formatDate(assignment.dueDate)}
                      </span>
                      <span>
                        Attempts: {assignment.maxAttempts ? `${assignment.maxAttempts} max` : "Unlimited"}
                      </span>
                    </div>

                    <Button
                      type="primary"
                      icon={<CodeOutlined />}
                      block
                      onClick={() => navigate(`/student/assignments/${assignment._id}`)}
                      style={{ borderRadius: 8, height: 40 }}
                    >
                      Solve Problem
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default AssignmentList;
