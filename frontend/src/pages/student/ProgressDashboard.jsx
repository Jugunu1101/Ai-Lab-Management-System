import React, { useState, useEffect, useRef } from "react";
import { Card, Table, Tag, Progress, Row, Col, Typography, Space, Tooltip, Select } from "antd";
import {
  LineChartOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BookOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import EmptyState from "../../components/shared/EmptyState";
import SkillRadarCard from "../../components/student/SkillRadarCard";
import progressService from "../../services/progress.service";
import classService from "../../services/class.service";
import { useAuth } from "../../context/AuthContext";

const { Text } = Typography;
const { Option } = Select;

export const ProgressDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [progressData, setProgressData] = useState([]);
  const [summary, setSummary] = useState({
    strongCount: 0,
    needsImpCount: 0,
    weakCount: 0,
    avgScore: 0,
    hasData: false,
  });

  // 1. Fetch available classes (scoped to user role)
  useEffect(() => {
    classService
      .getClasses()
      .then((res) => {
        const list = res.data?.classes || res.classes || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setClasses(list);
        }
      })
      .catch((err) => {
        console.error("Failed to load classes for topic mastery", err);
      });
  }, []);

  const fetchSeqRef = useRef(0);

  // 2. Fetch Topic Progress whenever selectedClassId changes
  const fetchProgress = async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    // Clear old analytics state immediately to prevent stale cross-class telemetry
    setProgressData([]);
    setSummary({
      strongCount: 0,
      needsImpCount: 0,
      weakCount: 0,
      avgScore: 0,
      hasData: false,
    });

    try {
      let topics = [];
      let backendSummary = {};

      if (user?.role === "TEACHER") {
        const res = await classService.getClassTopicAnalytics(selectedClassId);
        if (seq !== fetchSeqRef.current) return;
        const data = res.data?.data || res.data || {};
        topics = data.topics || [];
        backendSummary = data;
      } else {
        const params = {};
        if (selectedClassId && selectedClassId !== "all") {
          params.classId = selectedClassId;
        }
        const res = await progressService.getStudentTopics(params);
        if (seq !== fetchSeqRef.current) return;
        const data = res.data?.data || res.data || {};
        topics = Array.isArray(data) ? data : data.topics || [];
        backendSummary = Array.isArray(data) ? {} : data;
      }

      if (seq !== fetchSeqRef.current) return;

      if (Array.isArray(topics) && topics.length > 0) {
        processTopics(topics, backendSummary);
      } else {
        processTopics([], backendSummary);
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setError(err.response?.data?.message || err.message || "Failed to load progress data");
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const processTopics = (topics, backendSummary = {}) => {
    let strong = 0;
    let needsImp = 0;
    let weak = 0;
    let totalScore = 0;

    const list = topics.map((t) => {
      // Authoritative score lookup: checks masteryScore, score, or averageMasteryScore
      const rawScore = typeof t.masteryScore === "number"
        ? t.masteryScore
        : typeof t.score === "number"
        ? t.score
        : typeof t.averageMasteryScore === "number"
        ? t.averageMasteryScore
        : 0;

      const s = Math.round(rawScore);
      totalScore += s;

      if (s >= 70) {
        strong++;
      } else if (s >= 50) {
        needsImp++;
      } else {
        weak++;
      }

      return {
        ...t,
        score: s,
        assignmentScore: typeof t.assignmentScore === "number" ? Math.round(t.assignmentScore) : 0,
        quizScore: typeof t.quizScore === "number" ? Math.round(t.quizScore) : 0,
        practiceCount: typeof t.practiceCount === "number"
          ? t.practiceCount
          : typeof t.attempts === "number"
          ? t.attempts
          : 0,
      };
    });

    setProgressData(list);

    const calculatedAvg = list.length > 0 ? Math.round(totalScore / list.length) : 0;
    const finalAvg = typeof backendSummary.classroomAverage === "number"
      ? backendSummary.classroomAverage
      : typeof backendSummary.avgScore === "number"
      ? backendSummary.avgScore
      : calculatedAvg;

    setSummary({
      strongCount: typeof backendSummary.strongCount === "number" ? backendSummary.strongCount : strong,
      needsImpCount: typeof backendSummary.needsImpCount === "number" ? backendSummary.needsImpCount : needsImp,
      weakCount: typeof backendSummary.weakCount === "number" ? backendSummary.weakCount : weak,
      avgScore: finalAvg,
      hasData: list.length > 0,
    });
  };

  useEffect(() => {
    fetchProgress();
  }, [selectedClassId]);

  // Compact status badge with threshold preservation (>=70 Good Mastery, 50-69 Needs Practice, <50 Weak Topic)
  const renderStatusBadge = (score) => {
    if (score >= 70) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 12px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 600,
            background: "rgba(47, 125, 74, 0.12)",
            color: "var(--cl-green-deep, #2F7D4A)",
            border: "1px solid rgba(47, 125, 74, 0.28)",
            whiteSpace: "nowrap",
            lineHeight: "18px",
          }}
        >
          Good Mastery
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 12px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 600,
            background: "rgba(217, 154, 0, 0.12)",
            color: "var(--warning, #D99A00)",
            border: "1px solid rgba(217, 154, 0, 0.28)",
            whiteSpace: "nowrap",
            lineHeight: "18px",
          }}
        >
          Needs Practice
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 12px",
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          background: "rgba(200, 60, 60, 0.12)",
          color: "var(--error, #C83C3C)",
          border: "1px solid rgba(200, 60, 60, 0.28)",
          whiteSpace: "nowrap",
          lineHeight: "18px",
        }}
      >
        Weak Topic
      </span>
    );
  };

  // Visually prominent mastery display with numeric percentage and sleek progress bar
  const renderMasteryCell = (score) => {
    const color = score >= 70 ? "#2F7D4A" : score >= 50 ? "#D99A00" : "#C83C3C";
    const trackColor =
      score >= 70
        ? "rgba(47, 125, 74, 0.15)"
        : score >= 50
        ? "rgba(217, 154, 0, 0.15)"
        : "rgba(200, 60, 60, 0.15)";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 140, minWidth: 120 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: color }}>
            {score}%
          </span>
        </div>
        <Progress
          percent={score}
          strokeColor={color}
          railColor={trackColor}
          size={{ strokeWidth: 6 }}
          showInfo={false}
          style={{ margin: 0 }}
        />
      </div>
    );
  };

  const columns = [
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      width: 140,
      render: (text) => (
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Mastery",
      dataIndex: "score",
      key: "score",
      width: 170,
      sorter: (a, b) => a.score - b.score,
      render: (score) => renderMasteryCell(score),
    },
    {
      title: "Status",
      dataIndex: "score",
      key: "status",
      width: 140,
      render: (score) => renderStatusBadge(score),
    },
    {
      title: "Assignments",
      dataIndex: "assignmentScore",
      key: "assignmentScore",
      width: 120,
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {val ?? 0}%
        </span>
      ),
    },
    {
      title: "Daily Quizzes",
      dataIndex: "quizScore",
      key: "quizScore",
      width: 120,
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {val ?? 0}%
        </span>
      ),
    },
    {
      title: "Practice",
      dataIndex: "practiceCount",
      key: "practiceCount",
      width: 100,
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {val ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div className="cl-container" style={{ paddingBottom: 64 }}>
      {/* Header with Classroom Scope Selector */}
      <div
        className="cl-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div style={{ maxWidth: 700 }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}
          >
            Topic Mastery &amp; Progress
          </h1>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-secondary)",
                letterSpacing: "-0.01em",
              }}
            >
              Evaluated via the 5-Factor Hybrid Algorithm
            </span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "6px 8px",
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              <span>Assignments 35%</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Quizzes 25%</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Submissions 20%</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Errors 10%</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Practice 10%</span>
            </div>
          </div>
        </div>

        {classes.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg-card)",
              padding: "6px 14px",
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <BookOutlined style={{ color: "var(--text-secondary)", fontSize: 16 }} />
            <Select
              showSearch
              optionFilterProp="children"
              value={selectedClassId}
              onChange={setSelectedClassId}
              style={{ minWidth: 220 }}
              variant="borderless"
              placeholder="Select classroom scope"
            >
              <Option value="all">
                {user?.role === "TEACHER" ? "All My Classrooms" : "All Enrolled Classes"}
              </Option>
              {classes.map((cls) => (
                <Option key={cls._id} value={cls._id}>
                  {cls.name} {cls.code ? `(${cls.code})` : ""}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}>
          <LoadingSpinner tip="Loading topic mastery analysis..." />
        </div>
      ) : error ? (
        <div style={{ marginTop: 24 }}>
          <ErrorState message={error} onRetry={fetchProgress} />
        </div>
      ) : !summary.hasData ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            description="No topic mastery data available yet for this classroom."
            actionText="Go to Assignments"
            onAction={() =>
              navigate(user?.role === "TEACHER" ? "/teacher/assignments" : "/student/assignments")
            }
          />
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} lg={6}>
              <div
                className="cl-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  minHeight: 120,
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    Classroom Average
                  </span>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.avgScore}%
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    Combined hybrid score
                  </span>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "var(--surface-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--cl-green-deep)",
                    fontSize: 22,
                  }}
                >
                  <TrophyOutlined />
                </div>
              </div>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div
                className="cl-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  minHeight: 120,
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    Good Mastery (&gt;=70%)
                  </span>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      color: "#2F7D4A",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.strongCount}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    Solid conceptual retention
                  </span>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(47, 125, 74, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2F7D4A",
                    fontSize: 22,
                  }}
                >
                  <CheckCircleOutlined />
                </div>
              </div>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div
                className="cl-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  minHeight: 120,
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    Needs Practice (50-69%)
                  </span>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      color: "#D99A00",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.needsImpCount}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    Intermediate proficiency
                  </span>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(217, 154, 0, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8C6200",
                    fontSize: 22,
                  }}
                >
                  <InfoCircleOutlined />
                </div>
              </div>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <div
                className="cl-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: "24px 28px",
                  minHeight: 120,
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    Weak Topics (&lt;50%)
                  </span>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      color: "#C83C3C",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.weakCount}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    Targeted for daily AI quizzes
                  </span>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(200, 60, 60, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C83C3C",
                    fontSize: 22,
                  }}
                >
                  <WarningOutlined />
                </div>
              </div>
            </Col>
          </Row>

          {/* Radar Chart & Taxonomy Matrix */}
          <Row gutter={[24, 24]} align="stretch">
            <Col xs={24} lg={10}>
              <SkillRadarCard progressData={progressData} />
            </Col>

            <Col xs={24} lg={14}>
              <div
                className="cl-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: 0,
                  border: "1px solid var(--border-color)",
                  overflow: "hidden",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "22px 28px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      Taxonomy Mastery Matrix
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                      Breakdown of concept retention across quizzes and programming assignments
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      background: "var(--surface-hover, rgba(0,0,0,0.04))",
                      padding: "4px 10px",
                      borderRadius: 8,
                    }}
                  >
                    {progressData.length} {progressData.length === 1 ? "Topic" : "Topics"} Tracked
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <Table
                    dataSource={progressData}
                    columns={columns}
                    rowKey="topic"
                    pagination={false}
                    scroll={{ x: 680 }}
                    style={{ background: "transparent" }}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ProgressDashboard;
