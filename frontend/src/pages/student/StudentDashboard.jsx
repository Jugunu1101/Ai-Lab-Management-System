import React, { useState, useEffect } from "react";
import { Row, Col, Card, Table, Tag, Button, Progress, Typography, Space } from "antd";
import {
  CodeOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import StatCard from "../../components/shared/StatCard";
import ChartCard from "../../components/shared/ChartCard";
import WeakTopicsBanner from "../../components/student/WeakTopicsBanner";
import DailyQuizWidget from "../../components/student/DailyQuizWidget";
import RecommendedStepsCard from "../../components/student/RecommendedStepsCard";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import progressService from "../../services/progress.service";
import assignmentService from "../../services/assignment.service";
import quizService from "../../services/quiz.service";
import classService from "../../services/class.service";
import { DIFFICULTY_CONFIG } from "../../utils/constants";
import { formatDate } from "../../utils/formatters";
import { BookOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    overallMastery: 0,
    assignmentsCompleted: 0,
    assignmentsPending: 0,
    quizzesCompleted: 0,
    streakDays: 0,
    weakTopics: [],
    recentAssignments: [],
    languageMastery: [],
    recommendedSteps: [],
    todayQuiz: null,
    todayQuizCompleted: false,
    todayQuizScore: null,
    enrolledClasses: [],
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel requests with fallback handling
      const [dashRes, assignRes, quizRes, classRes] = await Promise.allSettled([
        progressService.getStudentDashboard(),
        assignmentService.getAssignments({ limit: 5 }),
        quizService.getTodayQuiz(),
        classService.getClasses(),
      ]);

      let dData = {};
      if (dashRes.status === "fulfilled") {
        dData = dashRes.value.data || dashRes.value || {};
      }

      let assignments = [];
      if (assignRes.status === "fulfilled") {
        const aData = assignRes.value.data?.assignments || assignRes.value.assignments || assignRes.value.data || [];
        assignments = Array.isArray(aData) ? aData : [];
      }

      let quiz = null;
      if (quizRes.status === "fulfilled") {
        quiz = quizRes.value.data?.quiz || quizRes.value.quiz || quizRes.value.data || null;
      }

      let classes = [];
      if (classRes.status === "fulfilled") {
        const cData = classRes.value.data?.classes || classRes.value.data || classRes.value || [];
        classes = Array.isArray(cData) ? cData : [];
      }

      // Check quiz attempts
      let isQuizDone = false;
      let qScore = null;
      if (quiz?._id) {
        try {
          const attemptsRes = await quizService.getQuizAttempts(quiz._id);
          const attempts = attemptsRes.data?.attempts || attemptsRes.attempts || [];
          if (attempts.length > 0) {
            isQuizDone = true;
            qScore = attempts[0].score;
          }
        } catch {}
      }

      setDashboardData((prev) => ({
        ...prev,
        overallMastery: dData.overallMastery ?? prev.overallMastery,
        assignmentsCompleted: dData.assignmentsCompleted ?? 0,
        assignmentsPending: dData.assignmentsPending ?? assignments.length,
        quizzesCompleted: dData.quizzesCompleted ?? 0,
        streakDays: dData.streakDays ?? 0,
        weakTopics: dData.weakTopics || [],
        recentAssignments: assignments,
        languageMastery: dData.languageMastery || [],
        recommendedSteps: dData.recommendedSteps || [],
        todayQuiz: quiz,
        todayQuizCompleted: isQuizDone,
        todayQuizScore: qScore,
        enrolledClasses: classes,
      }));
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Loading student dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const assignmentColumns = [
    {
      title: "Problem Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{text}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Lang: {record.programmingLanguage || record.language || "Any"}
          </Text>
        </div>
      ),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (diff) => {
        const config = DIFFICULTY_CONFIG[diff] || { label: diff, color: "default" };
        return <Tag color={config.color} style={{ fontWeight: 600, borderRadius: 6 }}>{config.label}</Tag>;
      },
    },
    {
      title: "Deadline",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date) => formatDate(date, true),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<CodeOutlined />}
          onClick={() => navigate(`/student/assignments/${record._id}`)}
          style={{ borderRadius: 6 }}
        >
          Solve Problem
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header greeting */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Student Learning Hub</h1>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Track your coding assignments, AI daily quizzes, and topic mastery.
          </Text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag
            icon={<FireOutlined style={{ color: "#f59e0b" }} />}
            color="warning"
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}
          >
            {dashboardData.streakDays} Day Practice Streak
          </Tag>
        </div>
      </div>

      {/* Weak Topics Warning Banner */}
      <WeakTopicsBanner weakTopics={dashboardData.weakTopics} />

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card" bordered={false} bodyStyle={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  Overall Mastery
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
                  {dashboardData.overallMastery}%
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  5-factor hybrid algorithm
                </div>
              </div>
              <Progress
                type="circle"
                percent={dashboardData.overallMastery}
                width={64}
                strokeColor={{ "0%": "#6366f1", "100%": "#10b981" }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Completed Assignments"
            value={dashboardData.assignmentsCompleted}
            subtitle={`${dashboardData.assignmentsPending} pending submissions`}
            icon={<CheckCircleOutlined />}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.15)"
            onClick={() => navigate("/student/assignments")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="AI Quizzes Completed"
            value={dashboardData.quizzesCompleted}
            subtitle="Targeting weak concepts"
            icon={<ThunderboltOutlined />}
            iconColor="#f59e0b"
            iconBg="rgba(245, 158, 11, 0.15)"
            onClick={() => navigate("/student/quiz")}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Learning Mastery Rank"
            value={dashboardData.overallMastery >= 70 ? "Strong" : dashboardData.overallMastery >= 50 ? "Growing" : "Getting Started"}
            subtitle="Class percentile ranking"
            icon={<TrophyOutlined />}
            iconColor="#8b5cf6"
            iconBg="rgba(139, 92, 246, 0.15)"
            onClick={() => navigate("/student/progress")}
          />
        </Col>
      </Row>

      {/* Middle row: Daily Quiz & Language Mastery Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <DailyQuizWidget
            quiz={dashboardData.todayQuiz}
            completed={dashboardData.todayQuizCompleted}
            score={dashboardData.todayQuizScore}
          />
        </Col>

        <Col xs={24} lg={16}>
          <ChartCard
            title="Language Proficiency Breakdown"
            subtitle="Mastery score calculated across test pass rates and execution frequency"
            height={220}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={dashboardData.languageMastery}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <YAxis dataKey="language" type="category" tick={{ fontSize: 13, fontWeight: 600 }} width={80} />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Mastery"]}
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                  }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {dashboardData.languageMastery.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* Enrolled Classes Quick Grid */}
      <Card
        className="glass-card"
        bordered={false}
        style={{ marginBottom: 24 }}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              <BookOutlined style={{ marginRight: 8, color: "var(--primary, #1890ff)" }} />
              My Enrolled Classes
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/student/classes")}
              style={{ padding: 0, fontWeight: 600 }}
            >
              View All Classes ({dashboardData.enrolledClasses.length}) <ArrowRightOutlined />
            </Button>
          </div>
        }
      >
        {dashboardData.enrolledClasses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <Text type="secondary">
              You have not been added to any lab classes yet. When your instructors add you, your classes will appear here.
            </Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {dashboardData.enrolledClasses.slice(0, 3).map((cls) => (
              <Col xs={24} sm={8} key={cls._id || cls.id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => navigate(`/student/assignments?classId=${cls._id || cls.id}`)}
                  style={{
                    borderRadius: 8,
                    background: "var(--bg-secondary, #f8f9fc)",
                    border: "1px solid #e8ecf4",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Tag color="blue">{cls.code || "COURSE"}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{cls.department || ""}</Text>
                  </div>
                  <Text strong style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
                    {cls.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    Instructor: {cls.teacherId?.name || "Teacher"}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Bottom row: Recommended steps & Active assignments */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <RecommendedStepsCard steps={dashboardData.recommendedSteps} />
        </Col>

        <Col xs={24} lg={14}>
          <Card
            className="glass-card"
            bordered={false}
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Pending & Active Assignments</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/student/assignments")}
                  style={{ padding: 0, fontWeight: 600 }}
                >
                  View All <ArrowRightOutlined />
                </Button>
              </div>
            }
            bodyStyle={{ padding: "0 16px 16px 16px" }}
          >
            <Table
              dataSource={dashboardData.recentAssignments}
              columns={assignmentColumns}
              rowKey="_id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
