import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Tag,
  Typography,
  Button,
  Alert,
} from "antd";
import {
  LeftOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import StatCard from "../../components/shared/StatCard";
import ChartCard from "../../components/shared/ChartCard";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import api from "../../services/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const { Text } = Typography;

export const StudentProgressView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) {
        setError("No student ID specified");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [profileRes, analyticsRes] = await Promise.allSettled([
          api.get(`/analytics/student/${id}/profile`),
          api.get(`/analytics/student/${id}`)
        ]);

        const userData = profileRes.status === "fulfilled" ? (profileRes.value.data || profileRes.value.user || null) : null;
        const analyticsData = analyticsRes.status === "fulfilled" ? (analyticsRes.value.data || null) : null;

        if (userData && (userData.name || userData.email)) {
          let overallScore = 0;
          let topicScores = [];
          
          if (analyticsData) {
            overallScore = analyticsData.averageMasteryScore || 0;
            // Use allTopics for the chart, but filter weakTopics for interventions
            const sourceTopics = analyticsData.allTopics || analyticsData.weakTopics || [];
            topicScores = sourceTopics.map(t => ({
              topic: t.topic,
              score: t.masteryScore
            }));
          }

          setStudent({
            _id: id,
            name: userData.name || "Student",
            email: userData.email || "",
            collegeId: userData.collegeId || "—",
            department: userData.department || "—",
            overallScore: overallScore,
            status: overallScore < 50 && overallScore > 0 ? "AT_RISK" : "NORMAL",
            interventionsNeeded: topicScores.filter(t => t.score < 50).map(t => `Needs review on ${t.topic}`),
            topicScores: topicScores,
          });
        } else {
          setError("Student record not found");
        }
      } catch (err) {
        setError(err.message || "Failed to load student progress");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner tip="Loading student profile..." />;
  }

  if (error || !student) {
    return (
      <div>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate("/teacher/dashboard")}
          style={{ marginBottom: 16 }}
        >
          Back to Overview
        </Button>
        <ErrorState message={error || "Student record not found"} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate("/teacher/dashboard")}
          style={{ marginBottom: 8 }}
        >
          Back to Overview
        </Button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{student.name}</h1>
              {student.overallScore < 50 && student.overallScore > 0 && (
                <Tag color="error" style={{ fontWeight: 700, borderRadius: 6 }}>AT RISK (&lt; 50%)</Tag>
              )}
            </div>
            <Text style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {[student.email, student.department && student.department !== "—" ? student.department : null]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          </div>
        </div>
      </div>

      {student.interventionsNeeded.length > 0 && (
        <Alert
          message="AI Diagnostic Insights"
          description={
            <div>
              <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                {student.interventionsNeeded.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 10 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            title="Overall Mastery"
            value={`${student.overallScore}%`}
            subtitle="Current aggregate score"
            icon={<WarningOutlined />}
            iconColor={student.overallScore >= 70 ? "#10b981" : "#f59e0b"}
          />
        </Col>

        <Col xs={24} sm={8}>
          <StatCard
            title="Recorded Topics"
            value={`${student.topicScores.length} Topics`}
            subtitle="Evaluated competencies"
            icon={<ThunderboltOutlined />}
            iconColor="#6366f1"
          />
        </Col>

        <Col xs={24} sm={8}>
          <StatCard
            title="Diagnostic Status"
            value={student.overallScore < 50 && student.overallScore > 0 ? "Action Required" : "Satisfactory"}
            subtitle="Based on recent submissions"
            icon={<CheckCircleOutlined />}
            iconColor="#10b981"
          />
        </Col>
      </Row>

      <ChartCard title="Topic Competency Profile" subtitle="Relative performance per topic" height={260}>
        {student.topicScores.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={student.topicScores}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(val) => [`${val}%`, "Mastery"]}
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No topic competency data recorded yet for this student
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default StudentProgressView;
