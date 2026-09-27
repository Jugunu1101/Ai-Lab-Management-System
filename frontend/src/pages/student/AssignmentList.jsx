import React, { useState, useEffect } from "react";
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
import classService from "../../services/class.service";
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
  const [selectedClassId, setSelectedClassId] = useState(
    searchParams.get("classId") || "ALL"
  );
  const [enrolledClasses, setEnrolledClasses] = useState([]);

  useEffect(() => {
    const query = searchParams.get("topic") || searchParams.get("search");
    if (query !== null) {
      setSearchTerm(query);
    }
    const classIdFromUrl = searchParams.get("classId");
    if (classIdFromUrl !== null) {
      setSelectedClassId(classIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve(classService.getClasses ? classService.getClasses() : [])
      .then((res) => {
        if (!isMounted) return;
        const list = res?.data?.classes || res?.data || res || [];
        setEnrolledClasses(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const displayedAssignments = assignments || [];

  const cleanSearch = (searchTerm || "").trim().toLowerCase();

  const filtered = displayedAssignments.filter((item) => {
    const matchSearch =
      !cleanSearch ||
      item.title?.toLowerCase().includes(cleanSearch) ||
      item.description?.toLowerCase().includes(cleanSearch) ||
      item.problemStatement?.toLowerCase().includes(cleanSearch) ||
      (Array.isArray(item.topics) &&
        item.topics.some((t) => t?.toLowerCase().includes(cleanSearch))) ||
      (typeof item.topic === "string" &&
        item.topic.toLowerCase().includes(cleanSearch)) ||
      item.programmingLanguage?.toLowerCase().includes(cleanSearch) ||
      item.language?.toLowerCase().includes(cleanSearch);

    const matchDiff =
      selectedDifficulty === "ALL" || item.difficulty === selectedDifficulty;
    const matchLang =
      selectedLanguage === "ALL" ||
      item.programmingLanguage?.toLowerCase() === selectedLanguage.toLowerCase() ||
      item.language?.toLowerCase() === selectedLanguage.toLowerCase();

    const itemClassId = item.classId?._id || item.classId?.id || item.classId;
    const matchClass =
      selectedClassId === "ALL" ||
      (itemClassId && itemClassId.toString() === selectedClassId.toString());

    return matchSearch && matchDiff && matchLang && matchClass;
  });

  const isAiAssignment = (a) => a.source === "AI_AGENT" || a.source === "AI_GENERATED";
  const aiAssignments = filtered.filter(isAiAssignment);
  const teacherAssignments = filtered.filter((a) => !isAiAssignment(a));

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
    const isAi = isAiAssignment(assignment);
    const isAiAgent = assignment.source === "AI_AGENT";
    const isAiGenerated = assignment.source === "AI_GENERATED";
    const primaryTopic = assignment.topics?.[0] || "Programming";
    const isCompleted = assignment.status === "COMPLETED" || assignment.passed;
    const isFailed = assignment.status === "FAILED";

    return (
      <div
        key={assignment._id}
        className="assignment-card-grid-item"
      >
        <div
          className="cl-card cl-card-hover assignment-card"
          style={{
            border: isAiAgent
              ? "1.5px solid var(--cl-green-forest)"
              : isAiGenerated
              ? "1.5px solid #9333EA"
              : "1px solid var(--border-color)",
          }}
        >
          {/* Card Content Top */}
          <div className="assignment-card-content">
            {/* Header Badges */}
            <div className="assignment-card-header">
              {isAiAgent ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--cl-green-light)",
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid var(--cl-green-forest)",
                    color: "var(--cl-green-dark)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Bot size={15} color="var(--cl-green-forest)" /> 🤖 AI Practice
                </div>
              ) : isAiGenerated ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(147, 51, 234, 0.15)",
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid #9333EA",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={15} color="#A855F7" /> ⚡ AI-Generated Assignment
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--bg-tertiary)",
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <User size={14} color="var(--text-secondary)" />{" "}
                  {assignment.classId?.name
                    ? `${assignment.classId.name}${
                        assignment.classId.code
                          ? ` (${assignment.classId.code})`
                          : ""
                      }`
                    : "Teacher Assignment"}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {getDifficultyBadge(assignment.difficulty)}
                <span
                  style={{
                    background: "var(--cl-green-light)",
                    color: "var(--cl-green-dark)",
                    border: "1px solid var(--border-subtle)",
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

            {/* Title Area */}
            <div className="assignment-card-title-box">
              <h3 title={assignment.title}>
                {assignment.title}
              </h3>
            </div>

            {/* AI Specific Reasoning Note */}
            {isAi && (
              <div
                className="assignment-card-ai-context"
                style={{
                  background: isAiAgent ? "var(--cl-green-light)" : "rgba(147, 51, 234, 0.12)",
                  border: isAiAgent ? "1px solid var(--border-subtle)" : "1px solid rgba(147, 51, 234, 0.28)",
                  color: isAiAgent ? "var(--cl-green-dark)" : "var(--text-primary)",
                }}
              >
                <span className="assignment-card-ai-icon" aria-hidden="true">
                  {isAiAgent ? "💡" : "⚡"}
                </span>
                <div
                  className="assignment-card-ai-text"
                  title={
                    assignment.agentReason ||
                    (isAiAgent
                      ? "Created specifically to build your mastery in this weak topic."
                      : "AI-generated problem curated to strengthen programming concepts.")
                  }
                >
                  <strong>{isAiAgent ? "Why this practice:" : "AI Practice:"}</strong>{" "}
                  <span>
                    {assignment.agentReason ||
                      (isAiAgent
                        ? "Created specifically to build your mastery in this weak topic."
                        : "AI-generated problem curated to strengthen programming concepts.")}
                  </span>
                </div>
              </div>
            )}

            {/* Description Preview */}
            <div className="assignment-card-desc-box">
              <p title={assignment.description}>
                {assignment.description || "Solve coding exercise and test against unit test cases."}
              </p>
            </div>

            {/* Metadata tags */}
            <div className="assignment-card-topics-box">
              {(assignment.topics || [primaryTopic]).slice(0, 3).map((topic, i) => (
                <span
                  key={i}
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    height: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>

          {/* Spacer */}
          <div className="assignment-card-spacer" />

          {/* Bottom Section */}
          <div className="assignment-card-bottom">
            {/* Meta Row: Due date & Attempts */}
            <div className="assignment-card-meta-row">
              <span style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <CalendarOutlined style={{ fontSize: 12 }} />
                Due: {assignment.deadline ? formatDate(assignment.deadline) : "Self-paced"}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>
                Attempts: {assignment.attempts || 0}
                {assignment.maxAttempts ? ` / ${assignment.maxAttempts}` : ""}
              </span>
            </div>

            {/* Status Area (Consistent reserved slot) */}
            <div className="assignment-card-status-box">
              {isCompleted ? (
                <div
                  className="assignment-status-completed"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 12px",
                    borderRadius: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <CheckCircle2 size={14} /> Completed
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>
                    Score: {assignment.score || 100}%
                  </span>
                </div>
              ) : isFailed ? (
                <div
                  className="assignment-status-failed"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 12px",
                    borderRadius: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <XCircle size={14} /> Needs Practice
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>
                    Score: {assignment.score || 0}%
                  </span>
                </div>
              ) : (
                /* Reserved empty status slot for incomplete assignments */
                <div style={{ width: "100%", height: "100%" }} aria-hidden="true" />
              )}
            </div>

            {/* Action Button */}
            <div className="assignment-card-action-box">
              {isCompleted ? (
                <Button
                  className="cl-btn-secondary"
                  onClick={() =>
                    navigate(`/student/assignments/${assignment._id}`)
                  }
                >
                  View Submission
                </Button>
              ) : isFailed ? (
                <Button
                  className={isAi ? "cl-btn-accent" : "cl-btn-primary"}
                  style={{
                    background: isAiGenerated ? "#7E22CE" : undefined,
                    borderColor: isAiGenerated ? "#7E22CE" : undefined,
                  }}
                  onClick={() =>
                    navigate(`/student/assignments/${assignment._id}`)
                  }
                >
                  {isAi ? "Retry AI Practice" : "Retry Problem"}
                </Button>
              ) : (
                <Button
                  className={isAi ? "cl-btn-accent" : "cl-btn-primary"}
                  style={{
                    background: isAiGenerated ? "#7E22CE" : undefined,
                    borderColor: isAiGenerated ? "#7E22CE" : undefined,
                  }}
                  onClick={() =>
                    navigate(`/student/assignments/${assignment._id}`)
                  }
                >
                  {isAi
                    ? assignment.status === "IN_PROGRESS"
                      ? (isAiAgent ? "Continue AI Practice" : "Continue AI Assignment")
                      : (isAiAgent ? "Start AI Practice" : "Start AI Assignment")
                    : assignment.status === "IN_PROGRESS"
                    ? "Continue Problem"
                    : "Start Problem"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
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
          background: "var(--bg-card)",
          borderRadius: 16,
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={8}>
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

          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedClassId}
              onChange={setSelectedClassId}
              style={{ width: "100%", height: 46 }}
              placeholder="All Enrolled Classes"
            >
              <Option value="ALL">All Enrolled Classes</Option>
              {enrolledClasses.map((c) => (
                <Option key={c._id || c.id} value={c._id || c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={12} sm={6} md={5}>
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

          <Col xs={12} sm={6} md={5}>
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
            setSelectedClassId("ALL");
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {/* 1. AI Practice & Generated Assignments Section */}
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
                    background: "var(--cl-green-light)",
                    border: "1px solid var(--cl-green-forest)",
                    padding: 8,
                    borderRadius: 12,
                    display: "flex",
                  }}
                >
                  <Bot size={22} color="var(--cl-green-forest)" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      margin: 0,
                      color: "var(--text-primary)",
                    }}
                  >
                    🤖 AI Practice & Generated Assignments
                  </h2>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      margin: "4px 0 0 0",
                    }}
                  >
                    Personalized practice tasks and AI-generated assignments tailored to build concept mastery.
                  </p>
                </div>
              </div>

              <div className="classroom-assignments-grid">
                {aiAssignments.map((assignment) =>
                  renderAssignmentCard(assignment)
                )}
              </div>
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
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  padding: 8,
                  borderRadius: 12,
                  display: "flex",
                }}
              >
                <User size={20} color="var(--cl-green-forest)" />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Classroom Assignments
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    margin: "4px 0 0 0",
                  }}
                >
                  Coursework and laboratory problem sets assigned by your instructors.
                </p>
              </div>
            </div>

            {teacherAssignments.length > 0 ? (
              <div className="classroom-assignments-grid">
                {teacherAssignments.map((assignment) =>
                  renderAssignmentCard(assignment)
                )}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px dashed var(--border-color)",
                  borderRadius: 16,
                  padding: "36px 24px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
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
