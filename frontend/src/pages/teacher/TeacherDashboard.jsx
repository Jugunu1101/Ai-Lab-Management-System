import React, { useState, useEffect, useMemo } from "react";
import { Button, Tag, Typography, Tooltip } from "antd";
import {
  TeamOutlined,
  FileDoneOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  WarningOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RightOutlined,
  LineChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import CreateAssignmentModal from "../../components/teacher/CreateAssignmentModal";
import CreateClassModal from "../../components/teacher/CreateClassModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import classService from "../../services/class.service";
import { formatRelativeTime, getInitials } from "../../utils/formatters";
import "./TeacherDashboard.css";

const { Text } = Typography;

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createAssignOpen, setCreateAssignOpen] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    averageScore: 0,
    submissionRate: 0,
    activeClasses: 0,
    atRiskStudents: [],
    submissionActivity: [],
    activeClassesList: [],
    recentSubmissions: [],
  });

  const [rawClasses, setRawClasses] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, classesRes] = await Promise.allSettled([
        classService.getTeacherDashboard(),
        classService.getClasses(),
      ]);

      let classList = [];
      if (classesRes.status === "fulfilled") {
        classList =
          classesRes.value.data?.classes ||
          classesRes.value.classes ||
          classesRes.value.data ||
          [];
        setRawClasses(Array.isArray(classList) ? classList : []);
      }

      if (dashRes.status === "fulfilled") {
        const d =
          dashRes.value.data?.data ||
          dashRes.value.data ||
          dashRes.value ||
          {};

        setMetrics({
          totalStudents: d.totalStudents ?? 0,
          averageScore: d.averageScore ?? 0,
          submissionRate: d.submissionRate ?? 0,
          activeClasses:
            d.activeClasses ??
            (Array.isArray(classList) ? classList.length : 0),
          atRiskStudents: Array.isArray(d.atRiskStudents)
            ? d.atRiskStudents
            : [],
          submissionActivity: Array.isArray(d.submissionActivity)
            ? d.submissionActivity
            : [],
          activeClassesList: Array.isArray(d.activeClassesList)
            ? d.activeClassesList
            : [],
          recentSubmissions: Array.isArray(d.recentSubmissions)
            ? d.recentSubmissions
            : [],
        });
      } else {
        let totalStudentsCount = 0;
        if (Array.isArray(classList)) {
          classList.forEach((c) => {
            totalStudentsCount += c.students?.length || 0;
          });
        }

        setMetrics((prev) => ({
          ...prev,
          activeClasses: Array.isArray(classList) ? classList.length : 0,
          totalStudents: totalStudentsCount,
          atRiskStudents: [],
          submissionActivity: [],
          activeClassesList: [],
          recentSubmissions: [],
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to load teacher dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Display classes from backend activeClassesList or fallback to rawClasses
  const displayClasses = useMemo(() => {
    if (metrics.activeClassesList && metrics.activeClassesList.length > 0) {
      return metrics.activeClassesList;
    }
    return rawClasses.map((c) => ({
      _id: c._id,
      name: c.name,
      code: c.code || "",
      studentCount: c.students?.length || 0,
      averageMastery: 0,
    }));
  }, [metrics.activeClassesList, rawClasses]);

  const getMasteryColor = (score) => {
    if (score >= 65) return "#10b981";
    if (score >= 45) return "#d97706";
    return "#dc2626";
  };

  const renderStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "PASSED" || s === "COMPLETED") {
      return (
        <Tag
          color="success"
          style={{
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 10.5,
            padding: "0 6px",
            lineHeight: "18px",
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: "rgba(16, 185, 129, 0.08)",
            color: "#059669",
            borderColor: "rgba(16, 185, 129, 0.25)",
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 10 }} /> Passed
        </Tag>
      );
    }
    if (s === "FAILED" || s === "ERROR") {
      return (
        <Tag
          color="error"
          style={{
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 10.5,
            padding: "0 6px",
            lineHeight: "18px",
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: "rgba(220, 38, 38, 0.08)",
            color: "#dc2626",
            borderColor: "rgba(220, 38, 38, 0.25)",
          }}
        >
          <CloseCircleOutlined style={{ fontSize: 10 }} /> Failed
        </Tag>
      );
    }
    return (
      <Tag
        color="warning"
        style={{
          borderRadius: 4,
          fontWeight: 600,
          fontSize: 10.5,
          padding: "0 6px",
          lineHeight: "18px",
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          background: "rgba(245, 158, 11, 0.08)",
          color: "#d97706",
          borderColor: "rgba(245, 158, 11, 0.25)",
        }}
      >
        <ClockCircleOutlined style={{ fontSize: 10 }} /> {status || "Submitted"}
      </Tag>
    );
  };

  if (loading) {
    return <LoadingSpinner tip="Loading instructor overview..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const hasActivityData =
    metrics.submissionActivity &&
    metrics.submissionActivity.some(
      (item) => (item.submissions || 0) > 0 || (item.passes || 0) > 0
    );

  return (
    <div className="teacher-dashboard-page">
      {/* ── 1. Header (Left: Title + Subtitle | Right: Primary Create Assignment + Secondary Actions) ── */}
      <div className="teacher-header">
        <div className="teacher-header-left">
          <h1>Instructor Dashboard</h1>
          <p className="teacher-header-subtitle">
            Monitor student execution telemetry, class aggregate mastery, and AI diagnostics.
          </p>
        </div>

        <div className="teacher-header-actions">
          <Button
            className="teacher-btn-secondary"
            icon={<ReloadOutlined />}
            onClick={fetchDashboardData}
            title="Refresh dashboard data"
          >
            Refresh
          </Button>

          <Button
            className="teacher-btn-secondary"
            icon={<FileTextOutlined />}
            onClick={() => navigate("/teacher/reports")}
          >
            Weekly AI Report
          </Button>

          <Button
            className="teacher-btn-secondary"
            icon={<TeamOutlined />}
            onClick={() => setCreateClassOpen(true)}
          >
            New Classroom
          </Button>

          <Button
            type="primary"
            className="teacher-btn-primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateAssignOpen(true)}
          >
            Create Assignment
          </Button>
        </div>
      </div>

      {/* ── 2. Top KPI Cards (4 equal columns, restrained semantic palette) ── */}
      <div className="teacher-kpi-grid">
        {/* Card 1: Total Students Enrolled */}
        <div
          className="teacher-kpi-card"
          onClick={() => navigate("/teacher/classes")}
          title="Click to view all enrolled classrooms"
        >
          <div className="teacher-kpi-header">
            <span className="teacher-kpi-label">TOTAL STUDENTS ENROLLED</span>
            <div
              className="teacher-kpi-icon-wrap"
              style={{
                background: "rgba(36, 107, 69, 0.08)",
                color: "var(--cl-green-forest, #246B45)",
              }}
            >
              <TeamOutlined />
            </div>
          </div>
          <div>
            <div className="teacher-kpi-value">{metrics.totalStudents}</div>
            <p className="teacher-kpi-subtext">
              Across {metrics.activeClasses} active classroom{metrics.activeClasses === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Card 2: Average Class Mastery */}
        <div
          className="teacher-kpi-card"
          onClick={() => navigate("/teacher/analytics")}
          title="Click to view cohort class analytics"
        >
          <div className="teacher-kpi-header">
            <span className="teacher-kpi-label">AVERAGE CLASS MASTERY</span>
            <div
              className="teacher-kpi-icon-wrap"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                color: "#10b981",
              }}
            >
              <ThunderboltOutlined />
            </div>
          </div>
          <div>
            <div className="teacher-kpi-value">{metrics.averageScore}%</div>
            <p className="teacher-kpi-subtext">Calculated across 5 hybrid factors</p>
          </div>
        </div>

        {/* Card 3: Submission Completion Rate */}
        <div className="teacher-kpi-card">
          <div className="teacher-kpi-header">
            <span className="teacher-kpi-label">SUBMISSION COMPLETION RATE</span>
            <div
              className="teacher-kpi-icon-wrap"
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                color: "#d97706",
              }}
            >
              <FileDoneOutlined />
            </div>
          </div>
          <div>
            <div className="teacher-kpi-value">{metrics.submissionRate}%</div>
            <p className="teacher-kpi-subtext">Overall student submission rate</p>
          </div>
        </div>

        {/* Card 4: At-Risk Interventions */}
        <div
          className="teacher-kpi-card"
          onClick={() => navigate("/teacher/analytics")}
          title="Click to inspect students needing attention"
        >
          <div className="teacher-kpi-header">
            <span className="teacher-kpi-label">AT-RISK INTERVENTIONS</span>
            <div
              className="teacher-kpi-icon-wrap"
              style={{
                background: "rgba(220, 38, 38, 0.08)",
                color: "#dc2626",
              }}
            >
              <WarningOutlined />
            </div>
          </div>
          <div>
            <div className="teacher-kpi-value">{metrics.atRiskStudents.length}</div>
            <p className="teacher-kpi-subtext">Mastery &lt; 45% or flagged</p>
          </div>
        </div>
      </div>

      {/* ── 3. Main Analytics Grid (Chart 2fr + Active Classes 1fr) ── */}
      <div className="teacher-main-grid">
        {/* Weekly Code Executions Chart (Forest Green + Emerald) */}
        <div className="teacher-panel-card teacher-panel-fixed-main">
          <div className="teacher-panel-header">
            <div className="teacher-panel-title-wrap">
              <h3>Weekly Code Executions &amp; Pass Rates</h3>
              <p>Daily automated test runner activity</p>
            </div>
            <div className="teacher-chart-legend">
              <div className="teacher-legend-item">
                <span
                  className="teacher-legend-dot"
                  style={{ background: "#246B45" }}
                />
                <span>Total Executions</span>
              </div>
              <div className="teacher-legend-item">
                <span
                  className="teacher-legend-dot"
                  style={{ background: "#10b981" }}
                />
                <span>Tests Passed</span>
              </div>
            </div>
          </div>

          <div className="teacher-chart-wrapper">
            {hasActivityData ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart
                  data={metrics.submissionActivity}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#246B45" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#246B45" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11.5, fill: "var(--text-secondary)" }}
                    axisLine={{ stroke: "var(--border-color)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11.5, fill: "var(--text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="submissions"
                    stroke="#246B45"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSub)"
                    name="Total Executions"
                  />
                  <Area
                    type="monotone"
                    dataKey="passes"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPass)"
                    name="Tests Passed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="teacher-empty-state">
                <LineChartOutlined className="teacher-empty-icon" />
                <span>No execution activity recorded in the past 7 days</span>
              </div>
            )}
          </div>
        </div>

        {/* Active Classes Panel */}
        <div className="teacher-panel-card teacher-panel-fixed-main">
          <div className="teacher-panel-header">
            <div className="teacher-panel-title-wrap">
              <h3>Active Classes</h3>
              <p>{displayClasses.length} active classroom{displayClasses.length === 1 ? "" : "s"}</p>
            </div>
            <button
              type="button"
              className="teacher-panel-header-action"
              onClick={() => navigate("/teacher/classes")}
            >
              View All <RightOutlined style={{ fontSize: 9 }} />
            </button>
          </div>

          <div className="teacher-classes-list">
            {displayClasses.length > 0 ? (
              displayClasses.slice(0, 4).map((c) => {
                const masteryScore = Math.round(c.averageMastery || 0);
                const masteryColor = getMasteryColor(masteryScore);
                return (
                  <div
                    key={c._id}
                    className="teacher-class-row"
                    onClick={() => navigate(`/teacher/classes/${c._id}`)}
                  >
                    <div className="teacher-class-top">
                      <span className="teacher-class-name" title={c.name}>
                        {c.name}
                      </span>
                      <span
                        className="teacher-class-mastery-score"
                        style={{ color: masteryColor }}
                      >
                        {masteryScore}%
                      </span>
                    </div>

                    <div className="teacher-class-bottom">
                      <div className="teacher-class-meta-group">
                        {c.code && (
                          <span className="teacher-class-code-badge">
                            {c.code}
                          </span>
                        )}
                        <span>· {c.studentCount} student{c.studentCount === 1 ? "" : "s"}</span>
                      </div>

                      <div className="teacher-class-progress-bar">
                        <div
                          className="teacher-class-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, masteryScore))}%`,
                            background: masteryColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="teacher-empty-state">
                <TeamOutlined className="teacher-empty-icon" />
                <span>No active classes found</span>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setCreateClassOpen(true)}
                  style={{ color: "var(--cl-green-forest, #246B45)", fontWeight: 600, padding: 0 }}
                >
                  + Create Classroom
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Grid (Recent Submissions 1/3 + Students Needing Attention 1/3 + Quick Actions 1/3) ── */}
      <div className="teacher-bottom-grid">
        {/* Column 1: Recent Submissions */}
        <div className="teacher-panel-card teacher-panel-fixed-bottom">
          <div className="teacher-panel-header">
            <div className="teacher-panel-title-wrap">
              <h3>Recent Submissions</h3>
              <p>Latest student code runs</p>
            </div>
            <button
              type="button"
              className="teacher-panel-header-action"
              onClick={() => navigate("/teacher/assignments")}
            >
              View All <RightOutlined style={{ fontSize: 9 }} />
            </button>
          </div>

          <div className="teacher-submissions-list">
            {metrics.recentSubmissions && metrics.recentSubmissions.length > 0 ? (
              metrics.recentSubmissions.slice(0, 4).map((sub) => (
                <div key={sub._id} className="teacher-submission-item">
                  <div className="teacher-submission-main">
                    <div className="teacher-avatar-circle">
                      {getInitials(sub.studentName)}
                    </div>
                    <div className="teacher-submission-text">
                      <span className="teacher-submission-student">
                        {sub.studentName}
                      </span>
                      <span className="teacher-submission-details" title={`${sub.assignmentTitle} · ${sub.className}`}>
                        {sub.assignmentTitle} · {sub.className}
                      </span>
                    </div>
                  </div>
                  <div className="teacher-submission-meta">
                    {renderStatusBadge(sub.status)}
                    <span className="teacher-submission-time">
                      {formatRelativeTime(sub.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="teacher-empty-state">
                <FileDoneOutlined className="teacher-empty-icon" />
                <span>No recent submissions</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Students Needing Attention */}
        <div className="teacher-panel-card teacher-panel-fixed-bottom">
          <div className="teacher-panel-header">
            <div className="teacher-panel-title-wrap">
              <h3>Students Needing Attention</h3>
              <p>Mastery &lt; 45% threshold</p>
            </div>
            <button
              type="button"
              className="teacher-panel-header-action"
              onClick={() => navigate("/teacher/analytics")}
            >
              View All <RightOutlined style={{ fontSize: 9 }} />
            </button>
          </div>

          <div className="teacher-atrisk-list">
            {metrics.atRiskStudents && metrics.atRiskStudents.length > 0 ? (
              metrics.atRiskStudents.slice(0, 3).map((student) => {
                const score = Math.round(student.score || student.masteryScore || 0);
                return (
                  <div
                    key={student._id || student.studentId}
                    className="teacher-atrisk-item"
                  >
                    <div className="teacher-atrisk-main">
                      <div
                        className="teacher-avatar-circle"
                        style={{
                          background: "rgba(220, 38, 38, 0.08)",
                          color: "#dc2626",
                        }}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="teacher-atrisk-text">
                        <span className="teacher-atrisk-name">{student.name}</span>
                        <span className="teacher-atrisk-class">
                          {student.className || student.collegeId || "Classroom"}
                        </span>
                      </div>
                    </div>
                    <div className="teacher-atrisk-right">
                      <span className="teacher-atrisk-score-badge">{score}%</span>
                      <Button
                        size="small"
                        className="teacher-atrisk-btn"
                        onClick={() =>
                          navigate(
                            `/teacher/students/${student._id || student.studentId}`
                          )
                        }
                      >
                        View
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="teacher-empty-state">
                <CheckCircleOutlined
                  className="teacher-empty-icon"
                  style={{ color: "#10b981", opacity: 0.8 }}
                />
                <span>All students maintaining &ge; 45% mastery</span>
              </div>
            )}
          </div>

          {metrics.atRiskStudents && metrics.atRiskStudents.length > 0 && (
            <div className="teacher-suggestion-box">
              <BulbOutlined style={{ color: "#d97706", fontSize: 13, flexShrink: 0 }} />
              <span>Target practice assignments recommended for weak topics.</span>
            </div>
          )}
        </div>

        {/* Column 3: Quick Actions */}
        <div className="teacher-panel-card teacher-panel-fixed-bottom">
          <div className="teacher-panel-header">
            <div className="teacher-panel-title-wrap">
              <h3>Quick Actions</h3>
              <p>Frequent instructor tasks</p>
            </div>
          </div>

          <div className="teacher-actions-grid">
            {/* Tile 1: Create Assignment */}
            <div
              className="teacher-action-tile"
              onClick={() => setCreateAssignOpen(true)}
            >
              <div
                className="teacher-action-icon-wrap"
                style={{
                  background: "rgba(36, 107, 69, 0.08)",
                  color: "var(--cl-green-forest, #246B45)",
                }}
              >
                <BookOutlined />
              </div>
              <div className="teacher-action-text">
                <span className="teacher-action-title">Create Assignment</span>
                <span className="teacher-action-desc">
                  Add a new coding assignment
                </span>
              </div>
              <RightOutlined className="teacher-action-arrow" />
            </div>

            {/* Tile 2: New Classroom */}
            <div
              className="teacher-action-tile"
              onClick={() => setCreateClassOpen(true)}
            >
              <div
                className="teacher-action-icon-wrap"
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  color: "#059669",
                }}
              >
                <TeamOutlined />
              </div>
              <div className="teacher-action-text">
                <span className="teacher-action-title">New Classroom</span>
                <span className="teacher-action-desc">
                  Create and manage classes
                </span>
              </div>
              <RightOutlined className="teacher-action-arrow" />
            </div>

            {/* Tile 3: Class Analytics */}
            <div
              className="teacher-action-tile"
              onClick={() => navigate("/teacher/analytics")}
            >
              <div
                className="teacher-action-icon-wrap"
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  color: "#d97706",
                }}
              >
                <LineChartOutlined />
              </div>
              <div className="teacher-action-text">
                <span className="teacher-action-title">View Analytics</span>
                <span className="teacher-action-desc">
                  Detailed class insights
                </span>
              </div>
              <RightOutlined className="teacher-action-arrow" />
            </div>

            {/* Tile 4: Weekly AI Report */}
            <div
              className="teacher-action-tile"
              onClick={() => navigate("/teacher/reports")}
            >
              <div
                className="teacher-action-icon-wrap"
                style={{
                  background: "rgba(36, 107, 69, 0.08)",
                  color: "#1B5138",
                }}
              >
                <FileTextOutlined />
              </div>
              <div className="teacher-action-text">
                <span className="teacher-action-title">Weekly AI Report</span>
                <span className="teacher-action-desc">
                  AI-powered summary &amp; digest
                </span>
              </div>
              <RightOutlined className="teacher-action-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Modals ── */}
      <CreateAssignmentModal
        open={createAssignOpen}
        onClose={() => setCreateAssignOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <CreateClassModal
        open={createClassOpen}
        onClose={() => setCreateClassOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};

export default TeacherDashboard;
