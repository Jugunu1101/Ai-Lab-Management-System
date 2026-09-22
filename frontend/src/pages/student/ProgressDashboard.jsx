import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Progress, Row, Col, Typography, Space, Tooltip } from "antd";
import {
  LineChartOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import ChartCard from "../../components/shared/ChartCard";
import StatCard from "../../components/shared/StatCard";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import progressService from "../../services/progress.service";
import { getMasteryStatus, getMasteryColor } from "../../utils/formatters";

const { Title, Text } = Typography;

export const ProgressDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [summary, setSummary] = useState({
    strongCount: 0,
    needsImpCount: 0,
    weakCount: 0,
    avgScore: 0,
  });

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await progressService.getStudentTopics();
      const topics = res.data?.topics || res.topics || res.data || [];

      if (Array.isArray(topics) && topics.length > 0) {
        processTopics(topics);
      } else {
        processTopics([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const processTopics = (topics) => {
    let strong = 0;
    let needsImp = 0;
    let weak = 0;
    let totalScore = 0;

    const list = topics.map((t) => {
      const s = Math.round(t.score || 0);
      totalScore += s;
      if (s >= 70) strong++;
      else if (s >= 50) needsImp++;
      else weak++;
      return {
        ...t,
        score: s,
      };
    });

    setProgressData(list);
    setSummary({
      strongCount: strong,
      needsImpCount: needsImp,
      weakCount: weak,
      avgScore: topics.length ? Math.round(totalScore / topics.length) : 0,
    });
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Loading topic mastery analysis..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchProgress} />;
  }

  const columns = [
    {
      title: "Taxonomy Concept / Topic",
      dataIndex: "topic",
      key: "topic",
      render: (text) => <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{text}</span>,
    },
    {
      title: "Mastery Level",
      dataIndex: "score",
      key: "score",
      sorter: (a, b) => a.score - b.score,
      render: (score) => {
        const color = getMasteryColor(score);
        return (
          <div style={{ width: 160 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color }}>{score}%</span>
            </div>
            <Progress percent={score} strokeColor={color} size="small" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: "Status Category",
      dataIndex: "score",
      key: "status",
      render: (score) => {
        const { label, color } = getMasteryStatus(score);
        return <Tag color={color} style={{ fontWeight: 600, borderRadius: 6 }}>{label}</Tag>;
      },
    },
    {
      title: "Assignments",
      dataIndex: "assignmentScore",
      key: "assignmentScore",
      render: (val) => `${val || 0}%`,
    },
    {
      title: "Daily Quizzes",
      dataIndex: "quizScore",
      key: "quizScore",
      render: (val) => `${val || 0}%`,
    },
    {
      title: "Practice Executions",
      dataIndex: "practiceCount",
      key: "practiceCount",
      render: (val) => val || 1,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LineChartOutlined style={{ fontSize: 24, color: "var(--primary)" }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Topic Mastery & Progress</h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Evaluated via the 5-Factor Hybrid Algorithm (Assignments 35%, Quizzes 25%, Submissions 20%, Errors 10%, Practice 10%)
          </Text>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Classroom Average"
            value={`${summary.avgScore}%`}
            subtitle="Combined hybrid score"
            icon={<TrophyOutlined />}
            iconColor="#6366f1"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Good Mastery (>=70%)"
            value={summary.strongCount}
            subtitle="Solid conceptual retention"
            icon={<CheckCircleOutlined />}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.15)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Needs Practice (50-69%)"
            value={summary.needsImpCount}
            subtitle="Intermediate proficiency"
            icon={<InfoCircleOutlined />}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.15)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Weak Topics (<50%)"
            value={summary.weakCount}
            subtitle="Targeted for daily AI quizzes"
            icon={<WarningOutlined />}
            iconColor="#ef4444"
            iconBg="rgba(239, 68, 68, 0.15)"
          />
        </Col>
      </Row>

      {/* Radar Chart & Details */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <ChartCard title="Skill Radar" subtitle="Multilateral competency mapping" height={320}>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={progressData.slice(0, 6)}>
                <PolarGrid opacity={0.2} />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border-color)" />
                <Radar name="Mastery" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            className="glass-card"
            bordered={false}
            title={<span style={{ fontSize: 16, fontWeight: 700 }}>Taxonomy Mastery Matrix</span>}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={progressData}
              columns={columns}
              rowKey="topic"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProgressDashboard;
