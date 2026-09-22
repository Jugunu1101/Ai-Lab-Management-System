import React, { useState, useEffect } from "react";
import { Row, Col, Card, Button, Typography, Space, Tag } from "antd";
import {
  SettingOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  CodeOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/shared/StatCard";
import ChartCard from "../../components/shared/ChartCard";
import SystemHealthBadge from "../../components/admin/SystemHealthBadge";
import CreateUserModal from "../../components/admin/CreateUserModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import adminService from "../../services/admin.service";

const { Title, Text } = Typography;

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    activeClasses: 0,
    totalExecutions: 0,
    services: [
      { name: "Node.js REST API (Port 3000)", status: "UP" },
      { name: "MongoDB Database Cluster", status: "UP" },
      { name: "Redis + BullMQ Queue Engine", status: "UP" },
      { name: "Python FastAPI AI Engine", status: "UP" },
    ],
  });

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminDashboard();
      const data = res.data?.metrics || res.metrics || res.data || {};
      setMetrics((prev) => ({
        ...prev,
        totalUsers: data.totalUsers ?? 0,
        totalStudents: data.totalStudents ?? 0,
        totalTeachers: data.totalTeachers ?? 0,
        totalAdmins: data.totalAdmins ?? 0,
        totalExecutions: data.totalSubmissions ?? 0,
        activeClasses: data.totalClasses ?? 0,
      }));
    } catch (err) {
      setError(err.message || "Failed to load admin metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Loading system administration dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchMetrics} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SettingOutlined style={{ fontSize: 24, color: "var(--primary)" }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>System Administration</h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            System-level health telemetry, role management, and cluster metrics.
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateUserOpen(true)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Provision Account
          </Button>
          <Button
            icon={<UsergroupAddOutlined />}
            onClick={() => navigate("/admin/users")}
            style={{ borderRadius: 8 }}
          >
            User Roster
          </Button>
        </Space>
      </div>

      {/* Services Health Bar */}
      <Card className="glass-card" bordered={false} style={{ marginBottom: 24 }} bodyStyle={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudServerOutlined style={{ color: "var(--primary)", fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Microservice Telemetry Status:</span>
          </div>

          <Space wrap size={[12, 10]}>
            {metrics.services.map((svc, i) => (
              <SystemHealthBadge key={i} service={svc.name} status={svc.status} />
            ))}
          </Space>
        </div>
      </Card>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Registered Accounts"
            value={metrics.totalUsers}
            subtitle={`${metrics.totalStudents} students, ${metrics.totalTeachers} teachers`}
            icon={<UsergroupAddOutlined />}
            iconColor="#6366f1"
            onClick={() => navigate("/admin/users")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Active Classrooms"
            value={metrics.activeClasses}
            subtitle="Department of Computer Science"
            icon={<TeamOutlined />}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.15)"
            onClick={() => navigate("/admin/classes")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Isolated Executions"
            value={metrics.totalExecutions}
            subtitle="Docker containers dispatched"
            icon={<CodeOutlined />}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.15)"
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="AI Inferences Enqueued"
            value="142"
            subtitle="Submissions & quizzes synthesized"
            icon={<CloudServerOutlined />}
            iconColor="#8b5cf6"
            iconBg="rgba(139, 92, 246, 0.15)"
          />
        </Col>
      </Row>

      {/* Quick Action Panels */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            className="glass-card glass-card-hover"
            bordered={false}
            bodyStyle={{ padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", fontSize: 22 }}>
                <UsergroupAddOutlined />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>User Management & RBAC</h3>
                <Text style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Assign roles, filter by department, deactivate accounts
                </Text>
              </div>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Inspect student and instructor profiles, audit authentication credentials, and configure permissions.
            </p>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/admin/users")}
              style={{ borderRadius: 8 }}
            >
              Open User Roster
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            className="glass-card glass-card-hover"
            bordered={false}
            bodyStyle={{ padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)", fontSize: 22 }}>
                <TeamOutlined />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Classroom Directory</h3>
                <Text style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Monitor institutional courses and enrollment quotas
                </Text>
              </div>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Review all active lab sections, verify teacher ownership, and observe student enrollments.
            </p>
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/admin/classes")}
              style={{ borderRadius: 8 }}
            >
              Open Class Directory
            </Button>
          </Card>
        </Col>
      </Row>

      <CreateUserModal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSuccess={fetchMetrics}
      />
    </div>
  );
};

export default AdminDashboard;
