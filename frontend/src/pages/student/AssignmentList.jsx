import React, { useState } from "react";
import { Row, Col, Card, Input, Select, Tag, Button, Typography, Space } from "antd";
import {
  SearchOutlined,
  CodeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAssignments from "../../hooks/useAssignments";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import { Bot, User, XCircle, CheckCircle2, Play, Sparkles } from "lucide-react";
import { DIFFICULTY_CONFIG, PROGRAMMING_LANGUAGES } from "../../utils/constants";
import { formatDate } from "../../utils/formatters";

const { Text, Paragraph } = Typography;
const { Option } = Select;

export const AssignmentList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { assignments, loading, error, refetch } = useAssignments();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("topic") || searchParams.get("search") || ""
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");

  const displayedAssignments = assignments || [];

  const filtered = displayedAssignments.filter((item) => {
    const matchSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.topics &&
        item.topics.some((t) =>
          t.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    const matchDiff =
      selectedDifficulty === "ALL" || item.difficulty === selectedDifficulty;
    const matchLang =
      selectedLanguage === "ALL" ||
      item.programmingLanguage?.toLowerCase() ===
        selectedLanguage.toLowerCase() ||
      item.language?.toLowerCase() === selectedLanguage.toLowerCase();

    return matchSearch && matchDiff && matchLang;
  });

  const aiAssignments = filtered.filter((a) => a.source === "AI_AGENT");
  const teacherAssignments = filtered.filter((a) => a.source !== "AI_AGENT");

  const getDifficultyBadge = (difficulty) => {
    const diff = (difficulty || "MEDIUM").toUpperCase();
    if (diff === "EASY") {
      return (
        <span
          style={{
            background: "#EDF6EA",
            color: "#2F7D4A",
            border: "1px solid #DCEEDD",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Easy
        </span>
      );
    }
    if (diff === "HARD") {
      return (
        <span
          style={{
            background: "#FDF1F1",
            color: "#C83C3C",
            border: "1px solid #F8D7D7",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Hard
        </span>
      );
    }
    return (
      <span
        style={{
          background: "#FFF3C4",
          color: "#8C6200",
          border: "1px solid #F5E096",
          borderRadius: 6,
          padding: "3px 10px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Medium
      </span>
    );
  };

  const renderAssignmentCard = (assignment) => {
    const isAi = assignment.source === "AI_AGENT";
    const primaryTopic = assignment.topics?.[0] || "Programming";
    const isCompleted = assignment.status === "COMPLETED" || assignment.passed;
    const isFailed = assignment.status === "FAILED";

    return (
      <Col xs={24} md={12} xl={8} key={assignment._id}>
        <div
          className="cl-card cl-card-hover"
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#FFFFFF",
            border: isAi ? "1.5px solid #246B45" : "1px solid #DDE5DC",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 2px 8px rgba(18, 60, 42, 0.04)",
          }}
        >
          <div>
            {/* Top Badges */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              {isAi ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#EDF6EA",
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid #246B45",
                    color: "#123C2A",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Bot size={15} color="#246B45" /> 🤖 AI Recommended
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#F8F6EE",
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid #DDE5DC",
                    color: "#59665E",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <User size={14} color="#59665E" /> Teacher Assignment
                </div>
              )}

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {getDifficultyBadge(assignment.difficulty)}
                <span
                  style={{
                    background: "#EDF6EA",
                    color: "#174832",
                    border: "1px solid #DCEEDD",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {assignment.programmingLanguage ||
                    assignment.language ||
                    "CPP"}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
                color: "#18231D",
                lineHeight: 1.35,
              }}
            >
              {assignment.title}
            </h3>

            {/* AI Specific Reasoning Note */}
            {isAi && (
              <div
                style={{
                  background: "#EDF6EA",
                  border: "1px solid #DCEEDD",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#174832",
                  lineHeight: 1.5,
                }}
              >
                <strong>💡 Why this practice:</strong>{" "}
                {assignment.agentReason ||
                  "Created specifically to build your mastery in this weak topic."}
              </div>
            )}

            {/* Description Preview */}
            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{
                fontSize: 14,
                color: "#59665E",
                marginBottom: 16,
                lineHeight: 1.55,
              }}
            >
              {assignment.description || "Solve coding exercise and test against unit test cases."}
            </Paragraph>

            {/* Metadata tags */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {(assignment.topics || [primaryTopic]).slice(0, 3).map((topic, i) => (
                <span
                  key={i}
                  style={{
                    background: "#F8F6EE",
                    color: "#59665E",
                    border: "1px solid #DDE5DC",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>

          <div>
            {/* Meta Row: Due date & Attempts */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                color: "#748078",
                paddingTop: 12,
                borderTop: "1px solid #E8EFE7",
                marginBottom: 16,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarOutlined style={{ fontSize: 13 }} />
                Due: {assignment.deadline ? formatDate(assignment.deadline) : "Self-paced"}
              </span>
              <span>
                Attempts: {assignment.attempts || 0}
                {assignment.maxAttempts ? ` / ${assignment.maxAttempts}` : ""}
              </span>
            </div>

            {/* Status & CTA Actions */}
            {isCompleted ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#EDF6EA",
                    border: "1px solid #DCEEDD",
                  }}
                >
                  <span
                    style={{
                      color: "#2F7D4A",
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={16} /> Completed
                  </span>
                  <span style={{ fontWeight: 800, color: "#2F7D4A", fontSize: 14 }}>
                    Score: {assignment.score || 100}%
                  </span>
                </div>
                <Button
                  className="cl-btn-secondary"
                  style={{ width: "100%", height: 44 }}
                  onClick={() =>
                    navigate(`/student/assignments/${assignment._id}`)
                  }
                >
                  View Submission
                </Button>
              </div>
            ) : isFailed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#FDF1F1",
                    border: "1px solid #F8D7D7",
                  }}
                >
                  <span
                    style={{
                      color: "#C83C3C",
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <XCircle size={16} /> Needs Practice
                  </span>
                  <span style={{ fontWeight: 800, color: "#C83C3C", fontSize: 14 }}>
                    Score: {assignment.score || 0}%
                  </span>
                </div>
                <Button
                  className={isAi ? "cl-btn-accent" : "cl-btn-primary"}
                  style={{ width: "100%", height: 44 }}
                  onClick={() =>
                    navigate(`/student/assignments/${assignment._id}`)
                  }
                >
                  {isAi ? "Retry AI Practice" : "Retry Problem"}
                </Button>
              </div>
            ) : (
              <Button
                className={isAi ? "cl-btn-accent" : "cl-btn-primary"}
                style={{ width: "100%", height: 46 }}
                onClick={() =>
                  navigate(`/student/assignments/${assignment._id}`)
                }
              >
                {isAi
                  ? assignment.status === "IN_PROGRESS"
                    ? "Continue AI Practice"
                    : "Start AI Practice"
                  : assignment.status === "IN_PROGRESS"
                  ? "Continue Problem"
                  : "Start Problem"}
              </Button>
            )}
          </div>
        </div>
      </Col>
    );
  };

  return (
    <div className="cl-container">
      {/* Page Header */}
      <div className="cl-page-header">
        <h1>Programming Assignments</h1>
        <p className="cl-page-subtitle">
          Explore laboratory problem sets, practice code in sandboxes, and solve autonomous AI practice tasks.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="cl-card"
        style={{
          padding: "18px 24px",
          marginBottom: 32,
          background: "#FFFFFF",
          borderRadius: 16,
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: "var(--cl-text-muted)", fontSize: 16 }} />}
              placeholder="Search problems by name, topic, or concept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{
                height: 46,
                borderRadius: 12,
                fontSize: 15,
                borderColor: "var(--cl-border)",
              }}
            />
          </Col>

          <Col xs={12} md={7}>
            <Select
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              style={{ width: "100%", height: 46 }}
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
              style={{ width: "100%", height: 46 }}
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
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner tip="Loading assignments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description="Try adjusting your search criteria or explore other topics to practice."
          actionText="Reset Filters"
          onAction={() => {
            setSearchTerm("");
            setSelectedDifficulty("ALL");
            setSelectedLanguage("ALL");
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {/* 1. AI Recommended Practice Section */}
          {aiAssignments.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: "#EDF6EA",
                    border: "1px solid #246B45",
                    padding: 8,
                    borderRadius: 12,
                    display: "flex",
                  }}
                >
                  <Bot size={22} color="#123C2A" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      margin: 0,
                      color: "#18231D",
                    }}
                  >
                    🤖 AI Recommended Practice
                  </h2>
                  <p
                    style={{
                      color: "#59665E",
                      fontSize: 14,
                      margin: "4px 0 0 0",
                    }}
                  >
                    Personalized coding problems generated specifically to strengthen your weak topics.
                  </p>
                </div>
              </div>

              <Row gutter={[20, 20]}>
                {aiAssignments.map((assignment) =>
                  renderAssignmentCard(assignment)
                )}
              </Row>
            </div>
          )}

          {/* 2. Classroom Assignments Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: "#F8F6EE",
                  border: "1px solid #DDE5DC",
                  padding: 8,
                  borderRadius: 12,
                  display: "flex",
                }}
              >
                <User size={20} color="#123C2A" />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    margin: 0,
                    color: "#18231D",
                  }}
                >
                  Classroom Assignments
                </h2>
                <p
                  style={{
                    color: "#59665E",
                    fontSize: 14,
                    margin: "4px 0 0 0",
                  }}
                >
                  Coursework and laboratory problem sets assigned by your instructors.
                </p>
              </div>
            </div>

            {teacherAssignments.length > 0 ? (
              <Row gutter={[20, 20]}>
                {teacherAssignments.map((assignment) =>
                  renderAssignmentCard(assignment)
                )}
              </Row>
            ) : (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px dashed #DDE5DC",
                  borderRadius: 16,
                  padding: "36px 24px",
                  textAlign: "center",
                  color: "#59665E",
                  fontSize: 15,
                }}
              >
                No classroom assignments posted yet. Check back soon or explore AI practice!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
