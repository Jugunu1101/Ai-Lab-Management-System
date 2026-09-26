import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Select,
  Tag,
  Tabs,
  Typography,
  Space,
  Alert,
  message,
  Divider,
} from "antd";
import {
  PlayCircleOutlined,
  SendOutlined,
  UndoOutlined,
  CodeOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  BulbOutlined,
  HistoryOutlined,
  FileTextOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import { Bot } from "lucide-react";
import CodeEditor from "../../components/shared/CodeEditor";
import SubmissionResultModal from "../../components/student/SubmissionResultModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import assignmentService from "../../services/assignment.service";
import submissionService from "../../services/submission.service";
import {
  PROGRAMMING_LANGUAGES,
  CODE_STARTERS,
  DIFFICULTY_CONFIG,
} from "../../utils/constants";
import { formatDate, formatDuration } from "../../utils/formatters";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const AssignmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(CODE_STARTERS.javascript);
  const [runningTests, setRunningTests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [testResults, setTestResults] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState("tests");
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setLatestSubmission(null);
      setTestResults(null);
      try {
        const [assignRes, subRes] = await Promise.allSettled([
          assignmentService.getAssignmentById(id),
          submissionService.getSubmissions({ assignmentId: id })
        ]);

        let data = null;
        if (assignRes.status === "fulfilled") {
          data = assignRes.value.data?.assignment || assignRes.value.assignment || assignRes.value.data || null;
        }

        if (data) {
          setAssignment(data);
          let defaultLang = data.programmingLanguage || data.language || "javascript";
          let defaultCode = "";
          if (typeof data.starterCode === "string" && data.starterCode.trim()) {
            defaultCode = data.starterCode;
          } else if (data.starterCode && typeof data.starterCode === "object") {
            defaultCode = data.starterCode[defaultLang] || CODE_STARTERS[defaultLang] || CODE_STARTERS.javascript;
          } else {
            defaultCode = CODE_STARTERS[defaultLang] || CODE_STARTERS.javascript;
          }

          // If there's a previous submission for this specific assignment, load it
          if (subRes.status === "fulfilled") {
            const rawSubmissions = subRes.value.data?.submissions || subRes.value.submissions || subRes.value.data || [];
            const submissions = (Array.isArray(rawSubmissions) ? rawSubmissions : []).filter((sub) => {
              const subAssignId = (sub.assignmentId?._id || sub.assignmentId || "").toString();
              return subAssignId === id.toString();
            });

            if (submissions.length > 0) {
              const latest = submissions[0]; // Backend sorts by date desc
              setLatestSubmission(latest);
              if (latest.language) defaultLang = latest.language;
              if (latest.code) defaultCode = latest.code;
            } else {
              setLatestSubmission(null);
            }
          } else {
            setLatestSubmission(null);
          }

          setLanguage(defaultLang);
          setCode(defaultCode);
        } else {
          setError("Assignment not found");
        }
      } catch (err) {
        setError(err.message || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (assignment?.starterCode && typeof assignment.starterCode === "object" && assignment.starterCode[newLang]) {
      setCode(assignment.starterCode[newLang]);
    } else if (typeof assignment?.starterCode === "string" && assignment.starterCode.trim() && (assignment.language === newLang || assignment.programmingLanguage === newLang)) {
      setCode(assignment.starterCode);
    } else {
      setCode(CODE_STARTERS[newLang] || "");
    }
  };

  const handleResetCode = () => {
    let resetCode = "";
    if (assignment?.starterCode && typeof assignment.starterCode === "object" && assignment.starterCode[language]) {
      resetCode = assignment.starterCode[language];
    } else if (typeof assignment?.starterCode === "string" && assignment.starterCode.trim() && (assignment.language === language || assignment.programmingLanguage === language)) {
      resetCode = assignment.starterCode;
    } else {
      resetCode = CODE_STARTERS[language] || "";
    }
    setCode(resetCode);
    message.info("Code reset to starter template");
  };

  const unwrapPayload = (response) => {
    if (!response) return null;
    if (response.success && response.data != null) {
      return response.data.submission || response.data;
    }
    return response.submission || response.data || response;
  };

  const waitForGradedSubmission = async (submissionId) => {
    const timeoutMs = 75000;
    const intervalMs = 1500;
    const started = Date.now();
    let latest = null;

    while (Date.now() - started < timeoutMs) {
      const res = await submissionService.getSubmissionById(submissionId);
      latest = unwrapPayload(res);
      const status = latest?.status;
      if (status && !["PENDING", "RUNNING"].includes(status)) {
        return latest;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return latest;
  };

  const handleRunTests = async () => {
    if (!code || code.trim().length === 0) {
      message.warning("Please enter code before running tests");
      return;
    }

    setRunningTests(true);
    try {
      const response = await submissionService.runTests({
        assignmentId: id,
        code,
        language,
      });
      const result = unwrapPayload(response);

      setTestResults({
        passed: !!result?.passed,
        passedCount: result?.passedCount || 0,
        totalCount: result?.totalCount || 0,
        details: result?.details || [],
        status: result?.status,
      });
      setActiveOutputTab("tests");

      if (result?.passed) {
        message.success("Public test cases passed");
      } else if (result?.status === "TIME_LIMIT_EXCEEDED" || result?.status === "TIMEOUT") {
        message.error("Execution timed out. Please check for infinite loops.");
      } else if (result?.status === "ERROR") {
        message.error("Compilation or runtime error. Please check your syntax.");
      } else {
        message.warning(
          `${result?.passedCount || 0} / ${result?.totalCount || 0} public tests passed`
        );
      }
    } catch (err) {
      setTestResults(null);
      message.error(err.message || "Failed to run tests");
    } finally {
      setRunningTests(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!code || code.trim().length === 0) {
      message.warning("Please enter code before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const response = await submissionService.submitCode({
        assignmentId: id,
        code,
        language,
      });
      let submissionData = unwrapPayload(response);
      const submissionId = submissionData?._id || submissionData?.id;

      if (submissionId && ["PENDING", "RUNNING"].includes(submissionData?.status)) {
        message.loading({ content: "Evaluating submission...", key: "submit-eval", duration: 0 });
        const graded = await waitForGradedSubmission(submissionId);
        if (graded) {
          submissionData = graded;
        }
        message.destroy("submit-eval");
      }

      setLatestSubmission(submissionData);
      setModalOpen(true);

      if (submissionData?.status === "PASSED") {
        message.success("Solution passed all test cases");
      } else if (["PENDING", "RUNNING"].includes(submissionData?.status)) {
        message.info("Submission received. Evaluation is still running.");
      } else {
        message.warning(`Submission ${String(submissionData?.status || "FAILED").toLowerCase()}`);
      }
    } catch (err) {
      const details = err.details;
      if (details && Array.isArray(details)) {
        details.forEach((d) => message.error(d));
      } else {
        message.error(err.message || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner tip="Loading problem solver..." fullScreen />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const diffConfig = DIFFICULTY_CONFIG[assignment?.difficulty] || { label: assignment?.difficulty, color: "default" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
          background: "#FFFFFF",
          padding: "14px 20px",
          borderRadius: 16,
          border: "1px solid #DDE5DC",
          boxShadow: "0 1px 4px rgba(18, 60, 42, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate("/student/assignments")}
            style={{ fontWeight: 600, color: "#246B45" }}
          >
            Assignments
          </Button>
          <Divider type="vertical" style={{ borderColor: "#DDE5DC" }} />
          {assignment?.source === "AI_AGENT" ? (
            <Tag
              style={{
                borderRadius: 20,
                fontWeight: 700,
                padding: "4px 14px",
                border: "1px solid #DCEEDD",
                background: "#EDF6EA",
                color: "#174832",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <Bot size={15} color="#2F7D4A" /> 🤖 AI Recommended Practice
            </Tag>
          ) : (
            <Tag
              style={{
                borderRadius: 20,
                fontWeight: 700,
                padding: "4px 14px",
                border: "1px solid #DDE5DC",
                background: "#F8F6EE",
                color: "#18231D",
                fontSize: 13,
              }}
            >
              Classroom Coursework
            </Tag>
          )}
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#18231D" }}>
            {assignment?.title}
          </h2>
          <Tag
            style={{
              fontWeight: 700,
              borderRadius: 8,
              padding: "2px 10px",
              background: "#EDF6EA",
              color: "#2F7D4A",
              border: "1px solid #DCEEDD",
              fontSize: 12,
            }}
          >
            {diffConfig.label || "Intermediate"}
          </Tag>
        </div>

        <Space size={12}>
          <Select
            value={language}
            onChange={handleLanguageChange}
            style={{ width: 140 }}
            options={PROGRAMMING_LANGUAGES.map((l) => ({ label: l.label, value: l.value }))}
            dropdownStyle={{ background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 10 }}
          />
          <Button
            type="text"
            icon={<UndoOutlined />}
            onClick={handleResetCode}
            style={{ color: "#59665E", fontWeight: 600 }}
          >
            Reset
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={handleRunTests}
            loading={runningTests}
            style={{ 
              fontWeight: 600, 
              background: "#FFFFFF", 
              color: "#174832", 
              borderColor: "#DDE5DC",
              height: 42,
              borderRadius: 10,
              padding: "0 18px",
            }}
          >
            Run Tests
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmitSolution}
            loading={submitting}
            style={{ 
              fontWeight: 700,
              background: "#123C2A",
              borderColor: "#123C2A",
              color: "#FFFFFF",
              height: 42,
              borderRadius: 10,
              padding: "0 22px",
              boxShadow: "0 2px 8px rgba(18, 60, 42, 0.15)",
            }}
          >
            Submit Solution
          </Button>
        </Space>
      </div>

      {/* AI Reasoning Banner if AI_AGENT assignment */}
      {assignment?.source === "AI_AGENT" && (
        <div
          style={{
            background: "#EDF6EA",
            border: "1px solid #DCEEDD",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Bot size={22} color="#2F7D4A" />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: "#174832", fontSize: 14 }}>
              Weak Topic Focus: {assignment.topics?.[0] || "Practice"} •{" "}
            </span>
            <span style={{ color: "#59665E", fontSize: 14 }}>
              {assignment.agentReason || "AI generated this personalized problem to help you master this concept."}
            </span>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {latestSubmission &&
        ((latestSubmission.assignmentId?._id || latestSubmission.assignmentId)?.toString() === id.toString()) &&
        (latestSubmission.status === "PASSED" || latestSubmission.status === "COMPLETED") && (
        <Alert
          message="Assignment Completed"
          description={`You have already successfully completed this assignment with a score of ${latestSubmission.score || 100}%. You can review your code or submit again if you'd like to try a different approach.`}
          type="success"
          showIcon
          icon={<CheckCircleFilled />}
          style={{
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid rgba(16, 185, 129, 0.3)",
            background: "rgba(16, 185, 129, 0.1)",
          }}
        />
      )}

      {/* Main Split Screen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left Column: Problem Description & Test Cases */}
        <Card
          bordered={false}
          style={{ height: "100%", overflowY: "auto", background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 16, boxShadow: "0 2px 8px rgba(18, 60, 42, 0.04)" }}
          bodyStyle={{ padding: "20px 24px" }}
        >
          <Tabs
            defaultActiveKey="description"
            items={[
              {
                key: "description",
                label: (
                  <span>
                    <FileTextOutlined /> Problem Statement
                  </span>
                ),
                children: (
                  <div>
                    <Paragraph style={{ whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.7, color: "#18231D" }}>
                      {assignment?.problemStatement || assignment?.description}
                    </Paragraph>

                    {assignment?.inputFormat && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#18231D", marginBottom: 6 }}>
                          Input Format:
                        </h4>
                        <div style={{ color: "#59665E", fontSize: 14, background: "#F8F6EE", border: "1px solid #DDE5DC", padding: "10px 14px", borderRadius: 8 }}>
                          {assignment.inputFormat}
                        </div>
                      </div>
                    )}

                    {assignment?.outputFormat && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#18231D", marginBottom: 6 }}>
                          Output Format:
                        </h4>
                        <div style={{ color: "#59665E", fontSize: 14, background: "#F8F6EE", border: "1px solid #DDE5DC", padding: "10px 14px", borderRadius: 8 }}>
                          {assignment.outputFormat}
                        </div>
                      </div>
                    )}

                    {assignment?.constraints && assignment.constraints.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#18231D", marginBottom: 6 }}>Constraints:</h4>
                        <ul style={{ paddingLeft: 20, color: "#59665E", fontSize: 14, margin: 0 }}>
                          {assignment.constraints.map((c, i) => (
                            <li key={i} style={{ marginBottom: 4 }}><code>{c}</code></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assignment?.examples && assignment.examples.length > 0 && (
                      <div style={{ marginTop: 22 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#18231D", marginBottom: 8 }}>Examples:</h4>
                        {assignment.examples.map((ex, i) => (
                          <div key={i} style={{ background: "#F8F6EE", border: "1px solid #DDE5DC", padding: 14, borderRadius: 10, marginBottom: 10, fontSize: 14 }}>
                            <div><strong>Input:</strong> <code>{ex.input}</code></div>
                            <div style={{ marginTop: 6 }}><strong>Output:</strong> <code>{ex.output}</code></div>
                            {ex.explanation && <div style={{ marginTop: 6, color: "#748078", fontSize: 13 }}><em>Explanation:</em> {ex.explanation}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {assignment?.topics && assignment.topics.length > 0 && (
                      <div style={{ marginTop: 22 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#59665E", marginBottom: 8 }}>
                          Related Topics:
                        </h4>
                        <Space wrap size={[6, 8]}>
                          {assignment.topics.map((t, idx) => (
                            <Tag key={idx} style={{ background: "#EDF6EA", border: "1px solid #DCEEDD", color: "#174832", fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
                              {t}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "testcases",
                label: "Public Test Cases",
                children: (
                  <div>
                    {assignment?.testCases && assignment.testCases.filter((tc) => !tc.isHidden).length > 0 ? (
                      assignment.testCases
                        .filter((tc) => !tc.isHidden)
                        .map((tc, index) => (
                          <div
                            key={index}
                            style={{
                              padding: 14,
                              borderRadius: 8,
                              marginBottom: 12,
                              background: "var(--bg-tertiary)",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                              Example {index + 1}:
                            </div>
                            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                              <div style={{ marginBottom: 4 }}>
                                <strong>Input:</strong> <code>{tc.input}</code>
                              </div>
                              <div>
                                <strong>Expected Output:</strong> <code>{tc.expectedOutput}</code>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p style={{ color: "var(--text-muted)" }}>No public examples available.</p>
                    )}
                  </div>
                ),
              },
              ...(assignment?.hints && assignment.hints.length > 0
                ? [
                    {
                      key: "hints",
                      label: (
                        <span>
                          <BulbOutlined /> Hints
                        </span>
                      ),
                      children: (
                        <div>
                          {assignment.hints.map((hint, i) => (
                            <Alert
                              key={i}
                              message={`Hint ${i + 1}`}
                              description={hint}
                              type="info"
                              showIcon
                              style={{ marginBottom: 12, borderRadius: 8 }}
                            />
                          ))}
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>

        {/* Right Column: Code Editor & Output Console */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12, minHeight: 0 }}>
          {/* Editor Container */}
          <div style={{ flex: 1.4, minHeight: 280 }}>
            <CodeEditor
              value={code}
              onChange={(newCode) => setCode(newCode || "")}
              language={language}
              height="100%"
            />
          </div>

          {/* Test Results / Output Drawer Container */}
          <Card
            bordered={false}
            style={{ 
              flex: 1, 
              minHeight: 180, 
              overflowY: "auto",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 8,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
            }}
            bodyStyle={{ padding: "0" }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "10px 16px",
              background: "#161b22",
              borderBottom: "1px solid #30363d",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Execution Console
              </span>
              {testResults && (
                <Tag color={testResults.passed ? "success" : "error"} style={{ margin: 0, border: "none" }}>
                  {testResults.passedCount} / {testResults.totalCount} Test Cases Passed
                </Tag>
              )}
            </div>

            <div style={{ padding: "12px 16px" }}>
              {testResults ? (
                <div>
                  {testResults.status === "COMPILE_ERROR" && (
                    <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderLeft: "3px solid var(--error)", marginBottom: 12 }}>
                      <div style={{ color: "var(--error)", fontWeight: 700, marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CloseCircleFilled /> COMPILATION ERROR
                      </div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 12, color: "var(--error)" }}>
                        {testResults.details?.[0]?.error || "Failed to compile."}
                      </pre>
                    </div>
                  )}
                  
                  {testResults.status === "INTERNAL_ERROR" && (
                    <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderLeft: "3px solid var(--error)", marginBottom: 12 }}>
                      <div style={{ color: "var(--error)", fontWeight: 700, marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CloseCircleFilled /> SYSTEM ERROR
                      </div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 12, color: "var(--error)" }}>
                        The execution service failed. Please try again.
                      </pre>
                    </div>
                  )}

                  {testResults.details?.filter(r => r.input !== undefined && testResults.status !== "COMPILE_ERROR" && testResults.status !== "INTERNAL_ERROR").map((res) => {
                    let badge = null;
                    let borderLeft = "3px solid rgba(239, 68, 68, 0.5)";
                    
                    if (res.passed) {
                      badge = <span style={{ color: "#10b981", fontWeight: 600 }}>Passed</span>;
                      borderLeft = "3px solid rgba(16, 185, 129, 0.5)";
                    } else if (res.status === "TIME_LIMIT_EXCEEDED") {
                      badge = <span style={{ color: "var(--error)", fontWeight: 600 }}>Time Limit Exceeded</span>;
                    } else if (res.status === "RUNTIME_ERROR") {
                      badge = <span style={{ color: "var(--error)", fontWeight: 600 }}>Runtime Error</span>;
                    } else {
                      badge = <span style={{ color: "var(--error)", fontWeight: 600 }}>Wrong Answer</span>;
                    }

                    return (
                      <div
                        key={res.index}
                        style={{
                          padding: "10px 14px",
                          marginBottom: 10,
                          background: "#0d1117",
                          borderBottom: "1px dashed #30363d",
                          borderLeft,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: "#c9d1d9" }}>
                            Test Case #{res.index} <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>{badge}</span>
                          </span>
                          <span style={{ color: "#8b949e", fontSize: 11 }}>{res.executionTime}ms</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", color: "#8b949e" }}>
                          <div style={{ marginBottom: 6, display: 'flex' }}>
                            <span style={{ width: 70, color: "#6e7681" }}>Input:</span> 
                            <code style={{ color: "#c9d1d9", background: "transparent" }}>{res.input}</code>
                          </div>
                          <div style={{ marginBottom: 6, display: 'flex' }}>
                            <span style={{ width: 70, color: "#6e7681" }}>Expected:</span> 
                            <code style={{ color: "#c9d1d9", background: "transparent" }}>{res.expectedOutput}</code>
                          </div>
                          {res.status !== "TIME_LIMIT_EXCEEDED" && res.status !== "RUNTIME_ERROR" && !res.passed && (
                            <div style={{ marginBottom: 6, display: 'flex' }}>
                              <span style={{ width: 70, color: "#6e7681" }}>Actual:</span> 
                              <code style={{ color: "#ff7b72", background: "transparent" }}>{res.actualOutput || "<none>"}</code>
                            </div>
                          )}
                          {res.error ? (
                            <div style={{ color: "#ff7b72", marginTop: 8, whiteSpace: "pre-wrap", background: "rgba(255,123,114,0.1)", padding: "8px 12px", borderRadius: 4, border: "1px solid rgba(255,123,114,0.2)" }}>
                              {res.error}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#8b949e", fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <CodeOutlined style={{ fontSize: 32, color: "#30363d" }} />
                  <span>Click <strong style={{ color: "#c9d1d9" }}>"Run Tests"</strong> to verify your solution against public cases, or <strong style={{ color: "#c9d1d9" }}>"Submit Solution"</strong> for automated grading.</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Submission Result Modal with AI diagnostic analysis */}
      <SubmissionResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        submission={latestSubmission}
      />
    </div>
  );
};

export default AssignmentDetails;
