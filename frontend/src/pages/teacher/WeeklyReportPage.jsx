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
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import {
  Sparkles,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Activity,
} from "lucide-react";
import dayjs from "dayjs";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import classService from "../../services/class.service";
import reportService from "../../services/report.service";
import { formatDate } from "../../utils/formatters";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export const WeeklyReportPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    classService
      .getClasses()
      .then((res) => {
        const list =
          res.data?.classes ||
          res.classes ||
          (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0) {
          setClasses(list);
          setSelectedClassId(list[0]._id);
          fetchReports(list[0]._id);
        }
      })
      .catch((err) => {
        console.error("Failed to load classes:", err);
      });
  }, []);

  const fetchReports = async (classId) => {
    if (!classId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await reportService.getWeeklyReports(classId);
      const reports =
        res.data?.reports ||
        res.reports ||
        (Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : []);
      if (Array.isArray(reports) && reports.length > 0) {
        setActiveReport(reports[0]);
      } else {
        setActiveReport(null);
      }
    } catch (err) {
      console.warn("Failed to fetch reports:", err);
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
    setErrorMessage("");
    try {
      message.loading({
        content: "Generating weekly classroom report...",
        key: "ai-rep",
      });

      const payload = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        payload.startDate = dateRange[0].startOf("day").toISOString();
        payload.endDate = dateRange[1].endOf("day").toISOString();
      }

      const res = await reportService.generateWeeklyReport(
        selectedClassId,
        payload
      );
      const report = res.data?.data || res.data?.report || res.data;

      if (report && (report._id || report.summary)) {
        setActiveReport(report);
        message.success({
          content: "Weekly AI Classroom Report generated successfully!",
          key: "ai-rep",
        });
      } else {
        await fetchReports(selectedClassId);
        message.success({
          content: "Weekly AI Classroom Report generated successfully!",
          key: "ai-rep",
        });
      }
    } catch (err) {
      console.error("Failed to generate report:", err);
      const msg =
        err.response?.data?.message || "Unable to generate classroom report.";
      setErrorMessage(msg);
      message.error({
        content: msg,
        key: "ai-rep",
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedClass = classes.find((c) => c._id === selectedClassId);
  const classNameDisplay =
    activeReport?.className || selectedClass?.name || "Classroom Report";

  const strongConcepts =
    activeReport?.strongConcepts && activeReport.strongConcepts.length > 0
      ? activeReport.strongConcepts
      : (activeReport?.strongTopics || []).map((t) =>
          typeof t === "object" ? t : { topic: t, score: null }
        );

  const vulnerableConcepts =
    activeReport?.vulnerableConcepts &&
    activeReport.vulnerableConcepts.length > 0
      ? activeReport.vulnerableConcepts
      : (activeReport?.weakTopics || []).map((t) =>
          typeof t === "object" ? t : { topic: t, score: null }
        );

  const flaggedStudents =
    activeReport?.studentsNeedingIntervention ||
    activeReport?.studentsNeedingAttention ||
    [];

  const statistics = activeReport?.statistics || {
    totalStudents:
      classes.find((c) => c._id === selectedClassId)?.students?.length || 0,
    activeStudents: 0,
    totalSubmissions: 0,
    averageScore: 0,
  };

  return (
    <div className="weekly-report-container" style={{ paddingBottom: 48 }}>
      {/* Header Controls (Hidden on Print) */}
      <div
        className="no-print"
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "rgba(36, 107, 69, 0.15)",
                padding: 8,
                borderRadius: 10,
                border: "1px solid rgba(36, 107, 69, 0.3)",
              }}
            >
              <Sparkles size={24} color="var(--cl-green-forest)" />
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              Weekly AI Classroom Reports
            </h1>
          </div>
          <Text style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Autonomous synthesis of laboratory executions, weak concepts, and
            pedagogical intervention strategies.
          </Text>
        </div>

        <Space wrap size={12}>
          <Select
            showSearch
            optionFilterProp="children"
            value={selectedClassId}
            onChange={(val) => {
              setSelectedClassId(val);
              fetchReports(val);
            }}
            style={{ width: 200, height: 40 }}
            placeholder="Select class"
          >
            {classes.map((c) => (
              <Option key={c._id} value={c._id}>
                {c.name}
              </Option>
            ))}
          </Select>

          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="YYYY-MM-DD"
            style={{
              height: 40,
              borderRadius: 8,
              background: "var(--input-background)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />

          <Button
            type="primary"
            icon={<Sparkles size={16} />}
            loading={generating}
            onClick={handleGenerateReport}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              height: 40,
              background: "var(--cl-green-forest)",
              borderColor: "var(--cl-green-forest)",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(36, 107, 69, 0.25)",
            }}
          >
            Generate with AI
          </Button>
        </Space>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message="Generation Error"
          description={errorMessage}
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {loading || generating ? (
        <div style={{ padding: "80px 0" }}>
          <LoadingSpinner tip="Generating weekly classroom report..." />
        </div>
      ) : activeReport ? (
        <Card
          className="glass-card weekly-report-print-area"
          variant="borderless"
          styles={{ body: { padding: "32px" } }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
          }}
        >
          {/* Report Header Metadata */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 28,
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: 24,
            }}
          >
            <div>
              <Tag
                color="green"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 6,
                  marginBottom: 12,
                  padding: "2px 8px",
                  background: "var(--cl-green-soft)",
                  color: "var(--cl-green-dark)",
                  border: "1px solid var(--cl-green-forest)",
                }}
              >
                WEEKLY COHORT DIAGNOSTIC
              </Tag>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  margin: "0 0 8px 0",
                  color: "var(--text-primary)",
                }}
              >
                {classNameDisplay}
              </h2>
              <Text
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Calendar size={15} color="var(--cl-green-forest)" />
                Period:{" "}
                <strong>
                  {formatDate(activeReport.weekStart || activeReport.period?.start)} -{" "}
                  {formatDate(activeReport.weekEnd || activeReport.period?.end)}
                </strong>
              </Text>
            </div>

            <Button
              className="no-print"
              icon={<DownloadOutlined />}
              onClick={() => window.print()}
              style={{
                borderRadius: 8,
                height: 38,
                fontWeight: 600,
                color: "var(--text-primary)",
                borderColor: "var(--border-color)",
                background: "var(--bg-card)",
              }}
            >
              Export PDF
            </Button>
          </div>

          {/* Aggregate Telemetry Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            <Col xs={12} sm={6}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Total Enrolled
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {statistics.totalStudents || 0}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Active Students
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {statistics.activeStudents || 0}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Submissions
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {statistics.totalSubmissions || 0}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Cohort Average
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--cl-green-forest)",
                  }}
                >
                  {statistics.averageScore !== undefined &&
                  statistics.averageScore !== null
                    ? `${statistics.averageScore}%`
                    : "N/A"}
                </div>
              </div>
            </Col>
          </Row>

          {/* Executive AI Summary */}
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 12,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileText size={20} color="var(--cl-green-forest)" /> Executive AI
              Summary
            </h3>
            {activeReport.summary ? (
              <div
                style={{
                  padding: 22,
                  borderRadius: 12,
                  fontSize: 15,
                  lineHeight: 1.75,
                  border: "1px solid rgba(36, 107, 69, 0.35)",
                  background: "var(--cl-green-light)",
                  color: "var(--cl-text)",
                }}
              >
                {activeReport.summary}
              </div>
            ) : (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                No executive summary available for this period.
              </div>
            )}
          </div>

          {/* Strong vs Vulnerable Concepts Row */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 22,
                  borderRadius: 12,
                  background: "rgba(47, 125, 74, 0.08)",
                  border: "1px solid rgba(47, 125, 74, 0.25)",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle size={20} color="var(--cl-success)" />
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--cl-success)",
                    }}
                  >
                    Strong Cohort Concepts
                  </h4>
                </div>
                {strongConcepts && strongConcepts.length > 0 ? (
                  <Space wrap size={[8, 12]}>
                    {strongConcepts.map((item, i) => (
                      <Tag
                        key={i}
                        color="success"
                        style={{
                          borderRadius: 8,
                          fontSize: 13,
                          padding: "6px 14px",
                          fontWeight: 600,
                          border: "1px solid rgba(47, 125, 74, 0.35)",
                          background: "rgba(47, 125, 74, 0.12)",
                          color: "var(--cl-success)",
                        }}
                      >
                        {item.topic}
                        {item.score !== null && item.score !== undefined && (
                          <span style={{ marginLeft: 6, fontWeight: 700 }}>
                            ({item.score}%)
                          </span>
                        )}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text
                    style={{ color: "var(--text-muted)", fontStyle: "italic" }}
                  >
                    No strong concepts meeting the mastery threshold yet.
                  </Text>
                )}
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div
                style={{
                  padding: 22,
                  borderRadius: 12,
                  background: "rgba(200, 60, 60, 0.08)",
                  border: "1px solid rgba(200, 60, 60, 0.25)",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={20} color="var(--cl-error)" />
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--cl-error)",
                    }}
                  >
                    Vulnerable Concepts (Score &lt; 50%)
                  </h4>
                </div>
                {vulnerableConcepts && vulnerableConcepts.length > 0 ? (
                  <Space wrap size={[8, 12]}>
                    {vulnerableConcepts.map((item, i) => (
                      <Tag
                        key={i}
                        color="error"
                        style={{
                          borderRadius: 8,
                          fontSize: 13,
                          padding: "6px 14px",
                          fontWeight: 600,
                          border: "1px solid rgba(200, 60, 60, 0.35)",
                          background: "rgba(200, 60, 60, 0.12)",
                          color: "var(--cl-error)",
                        }}
                      >
                        {item.topic}
                        {item.score !== null && item.score !== undefined && (
                          <span style={{ marginLeft: 6, fontWeight: 700 }}>
                            ({item.score}%)
                          </span>
                        )}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text
                    style={{ color: "var(--text-muted)", fontStyle: "italic" }}
                  >
                    No concepts currently falling below the 50% vulnerability
                    threshold.
                  </Text>
                )}
              </div>
            </Col>
          </Row>

          {/* Students Flagged for Direct Intervention */}
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Users size={20} color="var(--cl-warning)" /> Students Flagged for
              Direct Intervention
            </h3>
            {flaggedStudents && flaggedStudents.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {flaggedStudents.map((student, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "var(--text-primary)",
                        }}
                      >
                        {student.studentName || student.name}
                      </span>
                      <div style={{ marginTop: 4 }}>
                        {Array.isArray(student.reasons) &&
                        student.reasons.length > 0 ? (
                          <Space wrap size={[6, 6]}>
                            {student.reasons.map((r, rIdx) => (
                              <Tag
                                key={rIdx}
                                color={
                                  r.includes("No submissions")
                                    ? "warning"
                                    : "error"
                                }
                                style={{ borderRadius: 6, fontSize: 13 }}
                              >
                                {r}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          <Text
                            style={{
                              fontSize: 14,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {student.reason || "Flagged for academic review"}
                          </Text>
                        )}
                      </div>
                    </div>
                    {student.score !== undefined && student.score !== null && (
                      <Tag
                        color={student.score < 50 ? "error" : "default"}
                        style={{
                          fontWeight: 700,
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 13,
                        }}
                      >
                        Score: {student.score}%
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                <CheckCircle
                  size={32}
                  style={{ marginBottom: 10, opacity: 0.7 }}
                  color="var(--cl-success)"
                />
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  No students flagged for direct intervention during this period!
                </p>
              </div>
            )}
          </div>

          {/* Actionable Teaching Recommendations */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Lightbulb size={20} color="var(--cl-green-forest)" />
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Actionable Teaching Recommendations
              </h3>
            </div>
            {activeReport.recommendations &&
            activeReport.recommendations.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {activeReport.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "var(--text-primary)",
                    }}
                  >
                    <strong
                      style={{
                        color: "var(--cl-green-forest)",
                        marginRight: 8,
                      }}
                    >
                      {idx + 1}.
                    </strong>
                    {rec}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                No specific recommendations generated.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Activity
            size={48}
            color="var(--text-muted)"
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <h2
            style={{
              fontSize: 20,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            No student activity was recorded during this period
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            Select a class and date range, then click 'Generate with AI' to
            aggregate real student laboratory activity and synthesize a
            diagnostic report.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportPage;
