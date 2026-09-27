import React, { useState, useEffect } from "react";
import { Row, Col, Card, Select, Typography, Tag, Space, Button, Alert } from "antd";
import {
  LineChartOutlined,
  TrophyOutlined,
  BarChartOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import ChartCard from "../../components/shared/ChartCard";
import StatCard from "../../components/shared/StatCard";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import classService from "../../services/class.service";

const { Title, Text } = Typography;
const { Option } = Select;

export const ClassAnalyticsPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // 1. Fetch Teacher's Classes
  useEffect(() => {
    setLoadingClasses(true);
    classService
      .getClasses()
      .then((res) => {
        const list = res.data?.classes || res.classes || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setClasses(list);
          setSelectedClassId(list[0]._id);
        } else {
          setSelectedClassId("all");
        }
      })
      .catch((err) => {
        console.error("Failed to load classes", err);
        setSelectedClassId("all");
      })
      .finally(() => {
        setLoadingClasses(false);
      });
  }, []);

  // 2. Fetch Class Analytics when selectedClassId changes
  const fetchAnalytics = async (classId) => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await classService.getClassAnalytics(classId);
      const data = res.data?.data || res.data || null;
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch class analytics", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load class analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchAnalytics(selectedClassId);
    }
  }, [selectedClassId]);

  const getTopicColor = (val) => {
    if (val >= 70) return "#10b981"; // good
    if (val >= 50) return "#f59e0b"; // needs improvement
    return "#ef4444"; // weak (< 50%)
  };

  const hasData = Boolean(analytics?.hasData);

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LineChartOutlined style={{ fontSize: 24, color: "var(--primary)" }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              Class Analytics & Telemetry
            </h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Aggregated cohort performance, grade distribution, and concept mastery benchmarks.
          </Text>
        </div>

        <Space wrap>
          <Select
            showSearch
            optionFilterProp="children"
            value={selectedClassId || "all"}
            onChange={setSelectedClassId}
            style={{ width: 260 }}
            placeholder="Filter by classroom"
            loading={loadingClasses}
          >
            <Option value="all">All Classrooms Combined</Option>
            {classes.map((c) => (
              <Option key={c._id} value={c._id}>
                {c.name}
              </Option>
            ))}
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchAnalytics(selectedClassId)}
            loading={loading}
            style={{ borderRadius: 6 }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <LoadingSpinner tip="Loading class analytics & telemetry..." />
        </div>
      ) : error ? (
        <div style={{ padding: "40px 0" }}>
          <ErrorState
            message={error}
            onRetry={() => fetchAnalytics(selectedClassId)}
          />
        </div>
      ) : (
        <>
          {/* Top KPI Stat Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <StatCard
                title="Class Average"
                value={
                  hasData && analytics?.classAverage !== null
                    ? `${analytics.classAverage}%`
                    : "—"
                }
                subtitle={
                  hasData && analytics?.classAverage !== null
                    ? "Calculated from real submissions"
                    : "No submission data yet"
                }
                icon={<TrophyOutlined />}
                iconColor="#10b981"
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard
                title="Median Student Score"
                value={
                  hasData && analytics?.medianStudentScore !== null
                    ? `${analytics.medianStudentScore}%`
                    : "—"
                }
                subtitle={
                  hasData && analytics?.medianStudentScore !== null
                    ? "Cohort median"
                    : "No cohort scores yet"
                }
                icon={<BarChartOutlined />}
                iconColor="#6366f1"
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard
                title="Weak Topic Hotspots"
                value={
                  hasData
                    ? `${analytics?.weakTopicCount ?? 0} Areas`
                    : "0 Areas"
                }
                subtitle={
                  hasData
                    ? "Topics scoring < 50%"
                    : "No topic performance data yet"
                }
                icon={<LineChartOutlined />}
                iconColor="#ef4444"
              />
            </Col>
          </Row>

          {/* Identified Weak Topic Badges */}
          {hasData &&
            analytics?.weakTopicHotspots &&
            analytics.weakTopicHotspots.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Card
                  size="small"
                  className="glass-card"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                  }}
                >
                  <Space wrap size={[8, 8]} align="center">
                    <Text strong style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                      <WarningOutlined /> Identified Weak Topic Hotspots (&lt; 50%):
                    </Text>
                    {analytics.weakTopicHotspots.map((item, idx) => (
                      <Tag
                        key={idx}
                        color="error"
                        style={{ fontWeight: 600, borderRadius: 4, padding: "2px 8px" }}
                      >
                        {item.topic}: {item.score}%
                      </Tag>
                    ))}
                  </Space>
                </Card>
              </div>
            )}

          {/* Charts Row */}
          <Row gutter={[16, 16]}>
            {/* Score Distribution Histogram */}
            <Col xs={24} lg={10}>
              <ChartCard
                title="Cohort Grade Distribution"
                subtitle="Student count per mastery bracket"
                height={320}
              >
                {hasData &&
                analytics?.scoreDistribution &&
                analytics.scoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analytics.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val) => [`${val} students`, "Count"]}
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]}>
                        {analytics.scoreDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.range === "< 50%"
                                ? "#ef4444"
                                : entry.range === "50-59%"
                                ? "#f59e0b"
                                : "#6366f1"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: 320,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      fontSize: 14,
                    }}
                  >
                    No score distribution data recorded yet
                  </div>
                )}
              </ChartCard>
            </Col>

            {/* Topic Mastery Bar Chart with Thresholds */}
            <Col xs={24} lg={14}>
              <ChartCard
                title="Topic Mastery vs Standards Threshold"
                subtitle="Green >= 70% (Good), Yellow 50-69% (Needs Practice), Red < 50% (Weak)"
                height={320}
              >
                {analytics?.topicMasteryComparison &&
                analytics.topicMasteryComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={analytics.topicMasteryComparison}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        opacity={0.15}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="topic"
                        type="category"
                        tick={{ fontSize: 12, fontWeight: 500 }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(val) => [`${val}%`, "Class Average"]}
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                        }}
                      />
                      <ReferenceLine
                        x={70}
                        stroke="#10b981"
                        strokeDasharray="3 3"
                        label={{
                          value: "Target (70%)",
                          fill: "#10b981",
                          fontSize: 10,
                        }}
                      />
                      <ReferenceLine
                        x={50}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        label={{
                          value: "At-Risk (50%)",
                          fill: "#ef4444",
                          fontSize: 10,
                        }}
                      />
                      <Bar dataKey="classAvg" radius={[0, 6, 6, 0]}>
                        {analytics.topicMasteryComparison.map(
                          (entry, index) => (
                            <Cell
                              key={`bar-${index}`}
                              fill={getTopicColor(entry.classAvg)}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: 320,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      fontSize: 14,
                    }}
                  >
                    No topic mastery data recorded yet
                  </div>
                )}
              </ChartCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ClassAnalyticsPage;
