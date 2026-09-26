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
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import progressService from "../../services/progress.service";

const { Text } = Typography;

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
      render: (text) => (
        <span style={{ fontWeight: 700, fontSize: 15, color: "#18231D" }}>
          {text}
        </span>
      ),
    },
    {
      title: "Mastery Level",
      dataIndex: "score",
      key: "score",
      sorter: (a, b) => a.score - b.score,
      render: (score) => {
        const color = score >= 70 ? "#2F7D4A" : score >= 50 ? "#D99A00" : "#C83C3C";
        const trackColor = score >= 70 ? "#EDF6EA" : score >= 50 ? "#FFF3C4" : "#FDF1F1";
        return (
          <div style={{ width: 170 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontWeight: 700,
                color: color,
                marginBottom: 4,
              }}
            >
              <span>{score}%</span>
            </div>
            <Progress
              percent={score}
              strokeColor={color}
              trailColor={trackColor}
              strokeWidth={8}
              showInfo={false}
            />
          </div>
        );
      },
    },
    {
      title: "Status Category",
      dataIndex: "score",
      key: "status",
      render: (score) => {
        if (score >= 70) {
          return (
            <span
              style={{
                background: "#EDF6EA",
                color: "#2F7D4A",
                border: "1px solid #DCEEDD",
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
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
                background: "#FFF3C4",
                color: "#8C6200",
                border: "1px solid #F5E096",
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Needs Practice
            </span>
          );
        }
        return (
          <span
            style={{
              background: "#FDF1F1",
              color: "#C83C3C",
              border: "1px solid #F8D7D7",
              padding: "4px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Weak Topic
          </span>
        );
      },
    },
    {
      title: "Assignments",
      dataIndex: "assignmentScore",
      key: "assignmentScore",
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#18231D" }}>
          {val || 0}%
        </span>
      ),
    },
    {
      title: "Daily Quizzes",
      dataIndex: "quizScore",
      key: "quizScore",
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#18231D" }}>
          {val || 0}%
        </span>
      ),
    },
    {
      title: "Practice Executions",
      dataIndex: "practiceCount",
      key: "practiceCount",
      render: (val) => (
        <span style={{ fontSize: 14, fontWeight: 600, color: "#18231D" }}>
          {val || 1}
        </span>
      ),
    },
  ];

  return (
    <div className="cl-container" style={{ paddingBottom: 64 }}>
      {/* Header */}
      <div className="cl-page-header">
        <h1>Topic Mastery & Progress</h1>
        <p className="cl-page-subtitle">
          Evaluated via the 5-Factor Hybrid Algorithm (Assignments 35%, Quizzes 25%, Submissions 20%, Errors 10%, Practice 10%)
        </p>
      </div>

      {/* Metric Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <div
            className="cl-card"
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "24px 28px",
              minHeight: 120,
              border: "1px solid #DDE5DC",
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
                  color: "#59665E",
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
                  color: "#123C2A",
                  lineHeight: 1.1,
                }}
              >
                {summary.avgScore}%
              </div>
              <span style={{ fontSize: 13, color: "#748078", marginTop: 4, display: "block" }}>
                Combined hybrid score
              </span>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#EDF6EA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#123C2A",
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
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "24px 28px",
              minHeight: 120,
              border: "1px solid #DDE5DC",
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
                  color: "#59665E",
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
              <span style={{ fontSize: 13, color: "#748078", marginTop: 4, display: "block" }}>
                Solid conceptual retention
              </span>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#EDF6EA",
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
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "24px 28px",
              minHeight: 120,
              border: "1px solid #DDE5DC",
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
                  color: "#59665E",
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
              <span style={{ fontSize: 13, color: "#748078", marginTop: 4, display: "block" }}>
                Intermediate proficiency
              </span>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#FFF3C4",
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
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "24px 28px",
              minHeight: 120,
              border: "1px solid #DDE5DC",
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
                  color: "#59665E",
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
              <span style={{ fontSize: 13, color: "#748078", marginTop: 4, display: "block" }}>
                Targeted for daily AI quizzes
              </span>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#FDF1F1",
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
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <div
            className="cl-card"
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 28,
              border: "1px solid #DDE5DC",
              height: "100%",
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#18231D", margin: 0 }}>
              Skill Radar
            </h3>
            <p style={{ fontSize: 14, color: "#59665E", margin: "4px 0 20px 0" }}>
              Multilateral competency mapping across languages
            </p>
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={progressData.slice(0, 6)}>
                <PolarGrid stroke="#DDE5DC" />
                <PolarAngleAxis
                  dataKey="topic"
                  tick={{ fontSize: 14, fill: "#18231D", fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  stroke="#DDE5DC"
                  tick={{ fill: "#748078", fontSize: 12 }}
                />
                <Radar
                  name="Mastery"
                  dataKey="score"
                  stroke="#2F7D4A"
                  strokeWidth={2}
                  fill="#DCEEDD"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        <Col xs={24} lg={14}>
          <div
            className="cl-card"
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 0,
              border: "1px solid #DDE5DC",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #E8EFE7" }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#18231D", margin: 0 }}>
                Taxonomy Mastery Matrix
              </h3>
              <p style={{ fontSize: 14, color: "#59665E", margin: "4px 0 0 0" }}>
                Breakdown of concept retention across quizzes and programming assignments
              </p>
            </div>
            <Table
              dataSource={progressData}
              columns={columns}
              rowKey="topic"
              pagination={false}
              style={{ background: "#FFFFFF" }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ProgressDashboard;
