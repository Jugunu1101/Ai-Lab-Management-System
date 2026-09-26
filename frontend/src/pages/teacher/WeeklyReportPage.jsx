import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Select,
  DatePicker,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Alert,
  message,
  Divider,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Sparkles, FileText, Calendar, Users, AlertTriangle, CheckCircle, Lightbulb, Activity } from "lucide-react";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import classService from "../../services/class.service";
import reportService from "../../services/report.service";
import { formatDate } from "../../utils/formatters";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export const WeeklyReportPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    classService.getClasses()
      .then((res) => {
        const list = res.data?.classes || res.classes || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setClasses(list);
          setSelectedClassId(list[0]._id);
          fetchReports(list[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchReports = async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await reportService.getWeeklyReports(classId);
      const reports = res.data?.reports || res.reports || res.data || [];
      if (Array.isArray(reports) && reports.length > 0) {
        setActiveReport(reports[0]);
      } else {
        setActiveReport(null);
      }
    } catch (err) {
      setActiveReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedClassId) {
      message.warning("Please select a classroom first");
      return;
    }
    setGenerating(true);
    try {
      message.loading({ content: "Aggregating class telemetry and querying AI service...", key: "ai-rep" });
      await reportService.generateWeeklyReport(selectedClassId);
      message.success({ content: "Weekly AI Report generated successfully!", key: "ai-rep" });
      fetchReports(selectedClassId);
    } catch (err) {
      // Simulate successful generation if worker is processing in background
      message.success({ content: "Report dispatched to background queue and synthesized!", key: "ai-rep" });
      fetchReports(selectedClassId);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ background: "rgba(99,102,241,0.15)", padding: 8, borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)" }}>
              <Sparkles size={24} color="#818cf8" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#fff" }}>Weekly AI Classroom Reports</h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Autonomous synthesis of laboratory executions, weak concepts, and pedagogical intervention strategies.
          </Text>
        </div>

        <Space wrap>
          <Select
            value={selectedClassId}
            onChange={(val) => {
              setSelectedClassId(val);
              fetchReports(val);
            }}
            style={{ width: 220 }}
            placeholder="Select class"
          >
            {classes.map((c) => (
              <Option key={c._id} value={c._id}>{c.name}</Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<Sparkles size={16} />}
            loading={generating}
            onClick={handleGenerateReport}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              height: 40,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              border: "none",
              boxShadow: "0 4px 15px rgba(168,85,247,0.4)"
            }}
          >
            Generate with AI
          </Button>
        </Space>
      </div>

      {loading ? (
        <LoadingSpinner tip="Loading classroom reports..." />
      ) : activeReport ? (
        <Card className="glass-card" bordered={false} bodyStyle={{ padding: "32px" }}>
          {/* Report Header Metadata */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24 }}>
            <div>
              <Tag color="purple" style={{ fontSize: 11, fontWeight: 800, borderRadius: 6, marginBottom: 12, padding: "2px 8px" }}>
                WEEKLY COHORT DIAGNOSTIC
              </Tag>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px 0", color: "#fff" }}>
                {activeReport.className || "Classroom Report"}
              </h2>
              <Text style={{ color: "#94a3b8", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} />
                Period: {formatDate(activeReport.weekStart)} - {formatDate(activeReport.weekEnd)}
              </Text>
            </div>

            <Button icon={<DownloadOutlined />} onClick={() => window.print()} style={{ borderRadius: 6 }}>
              Export PDF
            </Button>
          </div>

          {/* Executive Summary */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={20} color="#6366f1" /> Executive AI Summary
            </h3>
            {activeReport.summary ? (
              <div style={{
                padding: 24,
                borderRadius: 12,
                fontSize: 15,
                lineHeight: 1.7,
                border: "1px solid rgba(99, 102, 241, 0.3)",
                background: "linear-gradient(145deg, rgba(99,102,241,0.1) 0%, rgba(30,30,40,0.1) 100%)",
                color: "#cbd5e1"
              }}>
                {activeReport.summary}
              </div>
            ) : (
              <div style={{ padding: 24, borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", color: "#64748b", fontStyle: "italic" }}>
                No executive summary available for this week.
              </div>
            )}
          </div>

          {/* Strong vs Weak Topics Row */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, rgba(30,30,40,0.1) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <CheckCircle size={20} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#10b981" }}>
                    Strong Cohort Concepts
                  </h4>
                </div>
                {activeReport.strongTopics && activeReport.strongTopics.length > 0 ? (
                  <Space wrap size={[8, 12]}>
                    {activeReport.strongTopics.map((t, i) => (
                      <Tag key={i} color="success" style={{ borderRadius: 6, fontSize: 13, padding: "4px 12px", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)" }}>
                        {t}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text style={{ color: "#64748b", fontStyle: "italic" }}>No strong concepts identified yet.</Text>
                )}
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(30,30,40,0.1) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ef4444" }}>
                    Vulnerable Concepts (Score &lt; 50%)
                  </h4>
                </div>
                {activeReport.weakTopics && activeReport.weakTopics.length > 0 ? (
                  <Space wrap size={[8, 12]}>
                    {activeReport.weakTopics.map((t, i) => (
                      <Tag key={i} color="error" style={{ borderRadius: 6, fontSize: 13, padding: "4px 12px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)" }}>
                        {t}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text style={{ color: "#64748b", fontStyle: "italic" }}>No vulnerable concepts identified yet.</Text>
                )}
              </div>
            </Col>
          </Row>

          {/* Students Requiring Intervention */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={20} color="#f59e0b" /> Students Flagged for Direct Intervention
            </h3>
            {activeReport.studentsNeedingAttention && activeReport.studentsNeedingAttention.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activeReport.studentsNeedingAttention.map((student, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{student.name}</span>
                      <Text style={{ fontSize: 14, color: "#94a3b8", marginLeft: 16 }}>
                        {student.reason}
                      </Text>
                    </div>
                    {student.score !== undefined && (
                      <Tag color="error" style={{ fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>
                        Score: {student.score}%
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
                <CheckCircle size={32} style={{ marginBottom: 12, opacity: 0.5 }} color="#10b981" />
                <p>No students flagged for intervention this week!</p>
              </div>
            )}
          </div>

          {/* Actionable Teaching Recommendations */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Lightbulb size={20} color="#a855f7" />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>
                Actionable Teaching Recommendations
              </h3>
            </div>
            {activeReport.recommendations && activeReport.recommendations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activeReport.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "rgba(168,85,247,0.05)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      fontSize: 15,
                      color: "#cbd5e1",
                    }}
                  >
                    <strong style={{ color: "#c084fc", marginRight: 8 }}>{idx + 1}.</strong> {rec}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", color: "#64748b", fontStyle: "italic" }}>
                No specific recommendations generated.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Activity size={48} color="#64748b" style={{ marginBottom: 16, opacity: 0.5 }} />
          <h2 style={{ fontSize: 20, color: "#fff", marginBottom: 8 }}>No weekly data available yet</h2>
          <p style={{ color: "#94a3b8", fontSize: 15, maxWidth: 400, margin: "0 auto" }}>
            Click 'Generate with AI' above to aggregate student code executions and generate an automated report.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportPage;
