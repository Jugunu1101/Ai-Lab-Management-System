import React, { useState, useEffect } from "react";
import { Modal, Tag, Descriptions, Tabs, Alert, Space, Typography, Progress, Spin } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ThunderboltFilled,
  BulbOutlined,
  CodeOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  LoadingOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import { formatDuration, formatBytes } from "../../utils/formatters";
import submissionService from "../../services/submission.service";

const { Text, Title, Paragraph } = Typography;

export const SubmissionResultModal = ({ open, onClose, submission: initialSubmission }) => {
  const [submission, setSubmission] = useState(initialSubmission);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    setSubmission(initialSubmission);
    setAiError(null);

    // If modal is opened and submission lacks detailed aiAnalysis, fetch full submission
    if (open && initialSubmission?._id) {
      const hasAi = initialSubmission.aiAnalysis?.mastery?.length ||
        initialSubmission.aiAnalysis?.recommendations?.length ||
        initialSubmission.aiAnalysis?.mistakes?.length;

      if (!hasAi && ["PASSED", "FAILED", "COMPLETED"].includes(initialSubmission.status)) {
        setLoadingAI(true);
        submissionService.getSubmissionById(initialSubmission._id)
          .then((res) => {
            const data = res.data?.submission || res.data || res;
            if (data && data._id) {
              setSubmission(data);
            }
          })
          .catch((err) => {
            console.warn("Could not fetch detailed AI evaluation:", err);
            setAiError("Unable to retrieve AI evaluation. Please try again.");
          })
          .finally(() => {
            setLoadingAI(false);
          });
      }
    }
  }, [open, initialSubmission]);

  if (!submission) return null;

  const isPassed = submission.status === "PASSED";
  const isPending = ["PENDING", "RUNNING"].includes(submission.status);
  const passedCount = submission.testCasesPassed ?? submission.passedCount ?? 0;
  const totalTests = submission.totalTestCases ?? submission.totalTests ?? 0;
  const passRate = totalTests
    ? Math.round((passedCount / totalTests) * 100)
    : isPassed
    ? 100
    : 0;

  const aiAnalysis = submission.aiAnalysis || submission.analysis || null;
  const hasAnalysisContent = Boolean(
    aiAnalysis &&
      (
        (Array.isArray(aiAnalysis.mastery) && aiAnalysis.mastery.length > 0) ||
        (Array.isArray(aiAnalysis.weakTopics) && aiAnalysis.weakTopics.length > 0) ||
        (Array.isArray(aiAnalysis.mistakes) && aiAnalysis.mistakes.length > 0) ||
        (Array.isArray(aiAnalysis.recommendations) && aiAnalysis.recommendations.length > 0) ||
        aiAnalysis.summary
      )
  );

  const averageMastery = Array.isArray(aiAnalysis?.mastery) && aiAnalysis.mastery.length > 0
    ? Math.round(
        aiAnalysis.mastery.reduce((acc, m) => acc + (m.score || 0), 0) /
          aiAnalysis.mastery.length
      )
    : isPassed
    ? 90
    : 40;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      style={{ top: 20 }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isPassed ? (
            <CheckCircleFilled style={{ color: "var(--success)", fontSize: 24 }} />
          ) : isPending ? (
            <ThunderboltFilled style={{ color: "var(--primary)", fontSize: 24 }} />
          ) : (
            <CloseCircleFilled style={{ color: "var(--error)", fontSize: 24 }} />
          )}
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            Submission Details: {submission.status}
          </span>
        </div>
      }
    >
      <div style={{ marginTop: 16 }}>
        {/* Score and Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            className="glass-card"
            style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-card)" }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Test Cases</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {passedCount} / {totalTests}
            </div>
            <Progress
              percent={passRate}
              size="small"
              status={isPassed ? "success" : isPending ? "active" : "exception"}
              showInfo={false}
            />
          </div>

          <div
            className="glass-card"
            style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-card)" }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Execution Time</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--info)" }}>
              {formatDuration(submission.executionTime || submission.executionTimeMs || submission.runtime)}
            </div>
          </div>

          <div
            className="glass-card"
            style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-card)" }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Memory Used</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--warning)" }}>
              {formatBytes(submission.memoryUsedBytes || submission.memory)}
            </div>
          </div>

          <div
            className="glass-card"
            style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-card)" }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Language</div>
            <Tag color="cyan" style={{ fontSize: 13, padding: "2px 8px", marginTop: 2 }}>
              {submission.language?.toUpperCase()}
            </Tag>
          </div>
        </div>

        {/* AI Analysis Tab and Test Details */}
        <Tabs
          defaultActiveKey="ai"
          items={[
            {
              key: "ai",
              label: (
                <span>
                  <BulbOutlined /> AI Evaluation & Feedback
                </span>
              ),
              children: (
                <div style={{ minHeight: 220 }}>
                  {loadingAI ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: "var(--cl-green-forest, #246B45)" }} spin />} />
                      <p style={{ marginTop: 14, fontSize: 14, fontWeight: 600 }}>Generating AI evaluation...</p>
                    </div>
                  ) : aiError ? (
                    <div style={{ textAlign: "center", padding: "30px 20px" }}>
                      <Alert
                        message="AI Evaluation Unavailable"
                        description={aiError || "Unable to generate AI evaluation. Please try again."}
                        type="warning"
                        showIcon
                        style={{ borderRadius: 10 }}
                      />
                    </div>
                  ) : hasAnalysisContent ? (
                    <div>
                      {/* Summary Banner */}
                      <Alert
                        message={
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700 }}>
                              {isPassed ? "Automated AI Code Assessment: PASSED" : "Automated AI Diagnostic: NEEDS ATTENTION"}
                            </span>
                            <Tag color={isPassed ? "success" : "warning"} style={{ margin: 0, fontWeight: 700 }}>
                              {isPassed ? "High Mastery" : "Review Recommended"}
                            </Tag>
                          </div>
                        }
                        description={
                          aiAnalysis.summary ||
                          (isPassed
                            ? "All automated test cases completed successfully. Your solution shows clean logic and adheres to language standards."
                            : "One or more automated test cases failed or produced incorrect output. Review the algorithmic mistakes and recommendations below.")
                        }
                        type={isPassed ? "success" : "warning"}
                        showIcon
                        style={{ marginBottom: 18, borderRadius: 10 }}
                      />

                      {/* Topic Mastery Scores */}
                      {Array.isArray(aiAnalysis.mastery) && aiAnalysis.mastery.length > 0 && (
                        <div
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 10,
                            padding: "14px 18px",
                            marginBottom: 16,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                              <SafetyCertificateOutlined style={{ color: "var(--cl-green-forest, #246B45)" }} /> Concept Mastery
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isPassed ? "var(--success)" : "var(--warning)" }}>
                              Overall: {averageMastery}%
                            </span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {aiAnalysis.mastery.map((m, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                                  {m.topic}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <Progress
                                    percent={m.score}
                                    size="small"
                                    strokeColor={m.score >= 70 ? "#10b981" : m.score >= 50 ? "#d97706" : "#dc2626"}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weak Topics */}
                      {Array.isArray(aiAnalysis.weakTopics) && aiAnalysis.weakTopics.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--error)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <WarningOutlined /> Weak Topics:
                          </h4>
                          <Space wrap size={[6, 8]}>
                            {aiAnalysis.weakTopics.map((topic, i) => (
                              <Tag key={i} color="volcano" style={{ fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
                                {topic}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {/* Identified Errors & Algorithmic Flaws */}
                      {Array.isArray(aiAnalysis.mistakes) && aiAnalysis.mistakes.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--error)", marginBottom: 8 }}>
                            Detected Issues &amp; Mistakes:
                          </h4>
                          <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                            {aiAnalysis.mistakes.map((mistake, i) => (
                              <li key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Constructive Recommendations */}
                      {Array.isArray(aiAnalysis.recommendations) && aiAnalysis.recommendations.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--cl-green-forest, #246B45)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <CompassOutlined /> Recommendations:
                          </h4>
                          <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                            {aiAnalysis.recommendations.map((rec, i) => (
                              <li key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : isPending ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                      <ThunderboltFilled style={{ fontSize: 28, marginBottom: 10, color: "var(--primary)" }} />
                      <p style={{ fontSize: 14 }}>Submission is running. Automated AI diagnostics will be ready shortly.</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                      <BulbOutlined style={{ fontSize: 28, marginBottom: 10, color: "var(--text-muted)" }} />
                      <p style={{ fontSize: 14 }}>AI evaluation is not available for this submission yet.</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "code",
              label: (
                <span>
                  <CodeOutlined /> Submitted Code
                </span>
              ),
              children: (
                <pre
                  style={{
                    background: "var(--bg-tertiary)",
                    padding: 16,
                    borderRadius: 8,
                    maxHeight: 350,
                    overflowY: "auto",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <code>{submission.code || "// No code available"}</code>
                </pre>
              ),
            },
            {
              key: "tests",
              label: "Test Execution Logs",
              children: (
                <div>
                  {submission.testResults && submission.testResults.length > 0 ? (
                    <div>
                      {submission.testResults.map((test, index) => (
                        <div
                          key={index}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 10,
                            background: test.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                            border: `1px solid ${test.passed ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              Test Case #{index + 1} {test.isHidden && <Tag color="default">Hidden</Tag>}
                            </span>
                            <Tag color={test.passed ? "success" : "error"}>
                              {test.passed ? "PASSED" : "FAILED"}
                            </Tag>
                          </div>
                          {!test.isHidden && (
                            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                              <div><strong>Input:</strong> {test.input || "<none>"}</div>
                              <div><strong>Expected:</strong> {test.expectedOutput}</div>
                              <div><strong>Actual:</strong> {test.actualOutput || "<none>"}</div>
                              {test.error ? (
                                <div style={{ color: "var(--error)", marginTop: 4, whiteSpace: "pre-wrap" }}>
                                  {test.error}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                      No detailed per-test log recorded for this run.
                    </p>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default SubmissionResultModal;
