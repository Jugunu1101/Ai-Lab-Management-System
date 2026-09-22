import React, { useState, useEffect } from "react";
import { Row, Col, Card, Select, Typography, Tag, Space } from "antd";
import { LineChartOutlined, TrophyOutlined, BarChartOutlined } from "@ant-design/icons";
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
import classService from "../../services/class.service";

const { Title, Text } = Typography;
const { Option } = Select;

export const ClassAnalyticsPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("all");

  useEffect(() => {
    classService.getClasses()
      .then((res) => {
        const list = res.data?.classes || res.classes || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setClasses(list);
          setSelectedClassId(list[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    classAvg: 0,
    medianScore: 0,
    weakTopicsCount: 0,
    scoreDistribution: [],
    topicMasteryComparison: [],
  });

  const getTopicColor = (val) => {
    if (val >= 70) return "#10b981"; // good
    if (val >= 50) return "#f59e0b"; // needs improvement
    return "#ef4444"; // weak
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LineChartOutlined style={{ fontSize: 24, color: "var(--primary)" }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Class Analytics & Telemetry</h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Aggregated cohort performance, grade distribution, and concept mastery benchmarks.
          </Text>
        </div>

        <Select
          value={selectedClassId}
          onChange={setSelectedClassId}
          style={{ width: 260 }}
          placeholder="Filter by classroom"
        >
          <Option value="all">All Classrooms Combined</Option>
          {classes.map((c) => (
            <Option key={c._id} value={c._id}>{c.name}</Option>
          ))}
        </Select>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            title="Class Average"
            value={`${analytics.classAvg}%`}
            subtitle="Calculated from real submissions"
            icon={<TrophyOutlined />}
            iconColor="#10b981"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="Median Student Score"
            value={`${analytics.medianScore}%`}
            subtitle="Cohort median"
            icon={<BarChartOutlined />}
            iconColor="#6366f1"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="Weak Topic Hotspots"
            value={`${analytics.weakTopicsCount} Areas`}
            subtitle="Topics scoring < 50%"
            icon={<LineChartOutlined />}
            iconColor="#ef4444"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Score Distribution Histogram */}
        <Col xs={24} lg={10}>
          <ChartCard
            title="Cohort Grade Distribution"
            subtitle="Student count per mastery bracket"
            height={320}
          >
            {analytics.scoreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
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
                        fill={entry.range === "< 50%" ? "#ef4444" : entry.range === "50-59%" ? "#f59e0b" : "#6366f1"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
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
            {analytics.topicMasteryComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={analytics.topicMasteryComparison}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="topic" type="category" tick={{ fontSize: 12, fontWeight: 500 }} width={120} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, "Class Average"]}
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                    }}
                  />
                  <ReferenceLine x={70} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Target (70%)", fill: "#10b981", fontSize: 10 }} />
                  <ReferenceLine x={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "At-Risk (50%)", fill: "#ef4444", fontSize: 10 }} />
                  <Bar dataKey="classAvg" radius={[0, 6, 6, 0]}>
                    {analytics.topicMasteryComparison.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={getTopicColor(entry.classAvg)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                No topic mastery data recorded yet
              </div>
            )}
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};

export default ClassAnalyticsPage;
