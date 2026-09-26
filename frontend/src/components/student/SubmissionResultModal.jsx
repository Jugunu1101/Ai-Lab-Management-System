import React from "react";
import { Modal, Tag, Descriptions, Tabs, Alert, Space, Typography, Progress } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ThunderboltFilled,
  BulbOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { formatDuration, formatBytes } from "../../utils/formatters";

const { Text, Title, Paragraph } = Typography;

export const SubmissionResultModal = ({ open, onClose, submission }) => {
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

  const aiAnalysis = submission.analysis || submission.aiAnalysis || null;

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
                <div>
                  {aiAnalysis ? (
                    <div>
                      {aiAnalysis.summary && (
                        <Alert
                          message="Executive AI Assessment"
                          description={aiAnalysis.summary}
                          type={isPassed ? "success" : "info"}
                          showIcon
                          style={{ marginBottom: 16, borderRadius: 8 }}
                        />
                      )}

                      {aiAnalysis.mistakes && aiAnalysis.mistakes.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--error)", marginBottom: 8 }}>
                            Identified Errors & Algorithmic Flaws:
                          </h4>
                          <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13 }}>
                            {aiAnalysis.mistakes.map((mistake, i) => (
                              <li key={i} style={{ marginBottom: 4 }}>{mistake}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>
                            Constructive Recommendations:
                          </h4>
                          <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13 }}>
                            {aiAnalysis.recommendations.map((rec, i) => (
                              <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAnalysis.topicsIdentified && aiAnalysis.topicsIdentified.length > 0 && (
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                            Related Topics:
                          </span>{" "}
                          <Space wrap size={[4, 6]} style={{ marginTop: 4 }}>
                            {aiAnalysis.topicsIdentified.map((topic, i) => (
                              <Tag key={i} color="purple">{topic}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                      <ThunderboltFilled style={{ fontSize: 24, marginBottom: 8, color: "var(--primary)" }} />
                      <p>AI Submission Analysis is currently being processed in background queues.</p>
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
                  <code>{submission.code}</code>
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
