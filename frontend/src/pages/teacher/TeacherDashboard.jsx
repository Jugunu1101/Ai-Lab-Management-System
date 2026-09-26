import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Typography, Space, Tag } from "antd";
import {
  TeamOutlined,
  BookOutlined,
  FileDoneOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  WarningOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import StatCard from "../../components/shared/StatCard";
import ChartCard from "../../components/shared/ChartCard";
import CreateAssignmentModal from "../../components/teacher/CreateAssignmentModal";
import CreateClassModal from "../../components/teacher/CreateClassModal";
import AtRiskStudentsTable from "../../components/teacher/AtRiskStudentsTable";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import classService from "../../services/class.service";
import assignmentService from "../../services/assignment.service";

const { Title, Text } = Typography;

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
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, assignRes] = await Promise.allSettled([
        classService.getClasses(),
        assignmentService.getAssignments(),
      ]);

      let classList = [];
      if (classesRes.status === "fulfilled") {
        classList = classesRes.value.data?.classes || classesRes.value.classes || classesRes.value.data || [];
      }

      let totalStudentsCount = 0;
      if (Array.isArray(classList)) {
        classList.forEach((c) => {
          totalStudentsCount += (c.students?.length || 0);
        });
      }

      setMetrics((prev) => ({
        ...prev,
        activeClasses: Array.isArray(classList) ? classList.length : 0,
        totalStudents: totalStudentsCount,
        atRiskStudents: [],
        submissionActivity: [],
      }));
    } catch (err) {
      setError(err.message || "Failed to load teacher dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Loading teacher overview..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div>
      {/* Header with Quick Actions */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Instructor Dashboard</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Monitor student execution telemetry, class aggregate mastery, and AI diagnostics.
          </Text>
        </div>

        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateAssignOpen(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Create Assignment
          </Button>
          <Button
            icon={<TeamOutlined />}
            onClick={() => setCreateClassOpen(true)}
            style={{ borderRadius: 8 }}
          >
            New Classroom
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate("/teacher/reports")}
            style={{ borderRadius: 8 }}
          >
            Weekly AI Report
          </Button>
        </Space>
      </div>

      {/* Aggregate Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Students Enrolled"
            value={metrics.totalStudents}
            subtitle={`Across ${metrics.activeClasses} active classrooms`}
            icon={<TeamOutlined />}
            iconColor="#6366f1"
            iconBg="rgba(99, 102, 241, 0.15)"
            onClick={() => navigate("/teacher/classes")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Average Class Mastery"
            value={`${metrics.averageScore}%`}
            subtitle="Calculated across 5 hybrid factors"
            icon={<ThunderboltOutlined />}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.15)"
            onClick={() => navigate("/teacher/analytics")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Submission Completion Rate"
            value={`${metrics.submissionRate}%`}
            subtitle="Overall student submission rate"
            icon={<FileDoneOutlined />}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.15)"
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="At-Risk Interventions"
            value={metrics.atRiskStudents.length}
            subtitle="Score < 50% or missed labs"
            icon={<WarningOutlined />}
            iconColor="#ef4444"
            iconBg="rgba(239, 68, 68, 0.15)"
          />
        </Col>
      </Row>

      {/* Activity Chart & At-risk widget */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <ChartCard
            title="Weekly Code Executions & Pass Rates"
            subtitle="Daily automated test runner activity"
            height={260}
          >
            {metrics.submissionActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={metrics.submissionActivity}>
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                    }}
                  />
                  <Area type="monotone" dataKey="submissions" stroke="#6366f1" fillOpacity={1} fill="url(#colorSub)" name="Total Executions" />
                  <Area type="monotone" dataKey="passes" stroke="#10b981" fillOpacity={1} fill="url(#colorPass)" name="Tests Passed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                No execution activity recorded yet
              </div>
            )}
          </ChartCard>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="glass-card"
            bordered={false}
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--error)" }}>
                  <WarningOutlined style={{ marginRight: 6 }} /> Students Needing Attention
                </span>
                <Tag color="error" style={{ borderRadius: 6 }}>Action Required</Tag>
              </div>
            }
            bodyStyle={{ padding: 0 }}
          >
            <AtRiskStudentsTable students={metrics.atRiskStudents} />
          </Card>
        </Col>
      </Row>

      {/* AI Interventions Section (Phase 7 Request) */}
      <Card
        className="glass-card"
        bordered={false}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#a855f7" }}>
              <ThunderboltOutlined style={{ marginRight: 6 }} /> AI Learning Interventions
            </span>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <WarningOutlined style={{ fontSize: 32, color: "#f59e0b", marginBottom: 16 }} />
          <h3 style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>Intervention History Unavailable</h3>
          <p style={{ color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            The backend API currently does not expose an endpoint to retrieve the historical AI interventions and their resulting score changes for each student. This section cannot be populated with real data until the <code>/api/ai/interventions</code> endpoint is implemented in the backend architecture.
          </p>
        </div>
      </Card>

      {/* Modals */}
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
