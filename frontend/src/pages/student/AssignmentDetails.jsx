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
import { Bot, Sparkles } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
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
  const { isDarkMode } = useTheme();

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
      const publicCases = (assignment?.testCases || []).filter((tc) => !tc.isHidden);
      const response = await submissionService.runTests({
        assignmentId: id,
        code,
        language,
        testCases: publicCases.length > 0 ? publicCases : undefined,
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
      const errMsg =
        err.code === "CODE_EXECUTION_UNAVAILABLE"
          ? "Code execution service is unavailable. Please make sure the execution service is running."
          : err.message || "Failed to run tests";
      message.error(errMsg);
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
        const errorMsg =
          err.code === "DATABASE_UNAVAILABLE" ||
          (err.message && (err.message.includes("database") || err.message.includes("Database") || err.message.includes("mongodb")))
            ? "Submission could not be saved. Please check the local database connection."
            : err.message || "Submission failed";
        message.error(errorMsg);
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
          background: isDarkMode ? "#174832" : "#FFFFFF",
          padding: "14px 20px",
          borderRadius: 16,
          border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`,
          boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 4px rgba(18, 60, 42, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate("/student/assignments")}
            style={{ fontWeight: 600, color: isDarkMode ? "#A7F3D0" : "#246B45" }}
          >
            Assignments
          </Button>
          <Divider type="vertical" style={{ borderColor: isDarkMode ? "#246B45" : "#DDE5DC" }} />
          {assignment?.source === "AI_AGENT" ? (
            <Tag
              style={{
                borderRadius: 20,
                fontWeight: 700,
                padding: "4px 14px",
                border: `1px solid ${isDarkMode ? "#246B45" : "#DCEEDD"}`,
                background: isDarkMode ? "#1C543B" : "#EDF6EA",
                color: isDarkMode ? "#A7F3D0" : "#174832",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <Bot size={15} color={isDarkMode ? "#A7F3D0" : "#2F7D4A"} /> 🤖 AI Practice
            </Tag>
          ) : assignment?.source === "AI_GENERATED" ? (
            <Tag
              style={{
                borderRadius: 20,
                fontWeight: 700,
                padding: "4px 14px",
                border: `1px solid ${isDarkMode ? "#6B21A8" : "#E9D5FF"}`,
                background: isDarkMode ? "rgba(126, 34, 206, 0.25)" : "#F3E8FF",
                color: isDarkMode ? "#E9D5FF" : "#581C87",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <Sparkles size={15} color={isDarkMode ? "#C084FC" : "#7E22CE"} /> ⚡ AI-Generated Assignment
            </Tag>
          ) : (
            <Tag
              style={{
                borderRadius: 20,
                fontWeight: 700,
                padding: "4px 14px",
                border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`,
                background: isDarkMode ? "#1C543B" : "#F8F6EE",
                color: isDarkMode ? "#F8F6EE" : "#18231D",
                fontSize: 13,
              }}
            >
              Classroom Coursework
            </Tag>
          )}
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D" }}>
            {assignment?.title}
          </h2>
          <Tag
            style={{
              fontWeight: 700,
              borderRadius: 8,
              padding: "2px 10px",
              background: isDarkMode ? "#1C543B" : "#EDF6EA",
              color: isDarkMode ? "#A7F3D0" : "#2F7D4A",
              border: `1px solid ${isDarkMode ? "#246B45" : "#DCEEDD"}`,
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
            dropdownStyle={{ 
              background: isDarkMode ? "#174832" : "#FFFFFF", 
              border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`, 
              borderRadius: 10 
            }}
          />
          <Button
            type="text"
            icon={<UndoOutlined />}
            onClick={handleResetCode}
            style={{ color: isDarkMode ? "#9CB5A3" : "#59665E", fontWeight: 600 }}
          >
            Reset
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={handleRunTests}
            loading={runningTests}
            style={{ 
              fontWeight: 600, 
              background: isDarkMode ? "#1C543B" : "#FFFFFF", 
              color: isDarkMode ? "#F8F6EE" : "#174832", 
              borderColor: isDarkMode ? "#246B45" : "#DDE5DC",
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
              background: isDarkMode ? "#2F7D4A" : "#123C2A",
              borderColor: isDarkMode ? "#2F7D4A" : "#123C2A",
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

      {/* AI Reasoning Banner if AI_AGENT or AI_GENERATED assignment */}
      {(assignment?.source === "AI_AGENT" || assignment?.source === "AI_GENERATED") && (
        <div
          style={{
            background: isDarkMode
              ? assignment?.source === "AI_AGENT"
                ? "rgba(47, 125, 74, 0.2)"
                : "rgba(126, 34, 206, 0.2)"
              : assignment?.source === "AI_AGENT"
              ? "#EDF6EA"
              : "#F3E8FF",
            border: `1px solid ${
              isDarkMode
                ? assignment?.source === "AI_AGENT"
                  ? "#246B45"
                  : "#7E22CE"
                : assignment?.source === "AI_AGENT"
                ? "#DCEEDD"
                : "#E9D5FF"
            }`,
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {assignment?.source === "AI_AGENT" ? (
            <Bot size={22} color={isDarkMode ? "#A7F3D0" : "#2F7D4A"} />
          ) : (
            <Sparkles size={22} color={isDarkMode ? "#C084FC" : "#7E22CE"} />
          )}
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontWeight: 700,
                color: isDarkMode
                  ? assignment?.source === "AI_AGENT"
                    ? "#A7F3D0"
                    : "#E9D5FF"
                  : assignment?.source === "AI_AGENT"
                  ? "#174832"
                  : "#581C87",
                fontSize: 14,
              }}
            >
              {assignment?.source === "AI_AGENT"
                ? `Weak Topic Focus: ${assignment.topics?.[0] || "Practice"} • `
                : `AI-Generated Coursework: ${assignment.topics?.[0] || "Programming"} • `}
            </span>
            <span
              style={{
                color: isDarkMode
                  ? assignment?.source === "AI_AGENT"
                    ? "#DCEEDD"
                    : "#D8B4FE"
                  : assignment?.source === "AI_AGENT"
                  ? "#59665E"
                  : "#6B21A8",
                fontSize: 14,
              }}
            >
              {assignment.agentReason ||
                (assignment?.source === "AI_AGENT"
                  ? "AI generated this personalized problem to help you master this concept."
                  : "Problem created via AI assistance to evaluate core algorithm proficiency.")}
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
          style={{ 
            height: "100%", 
            overflowY: "auto", 
            background: isDarkMode ? "#174832" : "#FFFFFF", 
            border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`, 
            borderRadius: 16, 
            boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(18, 60, 42, 0.04)" 
          }}
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
                    <Paragraph style={{ whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.7, color: isDarkMode ? "#F8F6EE" : "#18231D" }}>
                      {assignment?.problemStatement || assignment?.description}
                    </Paragraph>

                    {assignment?.inputFormat && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D", marginBottom: 6 }}>
                          Input Format:
                        </h4>
                        <div style={{ 
                          color: isDarkMode ? "#DCEEDD" : "#59665E", 
                          fontSize: 14, 
                          background: isDarkMode ? "#122E22" : "#F8F6EE", 
                          border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`, 
                          padding: "10px 14px", 
                          borderRadius: 8 
                        }}>
                          {assignment.inputFormat}
                        </div>
                      </div>
                    )}

                    {assignment?.outputFormat && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D", marginBottom: 6 }}>
                          Output Format:
                        </h4>
                        <div style={{ 
                          color: isDarkMode ? "#DCEEDD" : "#59665E", 
                          fontSize: 14, 
                          background: isDarkMode ? "#122E22" : "#F8F6EE", 
                          border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`, 
                          padding: "10px 14px", 
                          borderRadius: 8 
                        }}>
                          {assignment.outputFormat}
                        </div>
                      </div>
                    )}

                    {assignment?.constraints && assignment.constraints.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D", marginBottom: 6 }}>Constraints:</h4>
                        <ul style={{ paddingLeft: 20, color: isDarkMode ? "#DCEEDD" : "#59665E", fontSize: 14, margin: 0 }}>
                          {assignment.constraints.map((c, i) => (
                            <li key={i} style={{ marginBottom: 4 }}><code style={{ color: isDarkMode ? "#A7F3D0" : "#166534" }}>{c}</code></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assignment?.examples && assignment.examples.length > 0 && (
                      <div style={{ marginTop: 22 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D", marginBottom: 8 }}>Examples:</h4>
                        {assignment.examples.map((ex, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              background: isDarkMode ? "#122E22" : "#F8F6EE", 
                              border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`, 
                              padding: 14, 
                              borderRadius: 10, 
                              marginBottom: 10, 
                              fontSize: 14,
                              color: isDarkMode ? "#F8F6EE" : "#18231D"
                            }}
                          >
                            <div><strong>Input:</strong> <code style={{ color: isDarkMode ? "#A7F3D0" : "#166534", whiteSpace: "pre-wrap", display: "inline-block" }}>{ex.input}</code></div>
                            <div style={{ marginTop: 6 }}><strong>Output:</strong> <code style={{ color: isDarkMode ? "#A7F3D0" : "#166534", whiteSpace: "pre-wrap", display: "inline-block" }}>{ex.output}</code></div>
                            {ex.explanation && (
                              <div style={{ marginTop: 6, color: isDarkMode ? "#9CB5A3" : "#748078", fontSize: 13 }}>
                                <em>Explanation:</em> {ex.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {assignment?.topics && assignment.topics.length > 0 && (
                      <div style={{ marginTop: 22 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#9CB5A3" : "#59665E", marginBottom: 8 }}>
                          Related Topics:
                        </h4>
                        <Space wrap size={[6, 8]}>
                          {assignment.topics.map((t, idx) => (
                            <Tag 
                              key={idx} 
                              style={{ 
                                background: isDarkMode ? "#1C543B" : "#EDF6EA", 
                                border: `1px solid ${isDarkMode ? "#246B45" : "#DCEEDD"}`, 
                                color: isDarkMode ? "#A7F3D0" : "#174832", 
                                fontWeight: 600, 
                                borderRadius: 6, 
                                padding: "2px 10px" 
                              }}
                            >
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
                              background: isDarkMode ? "#122E22" : "#F8F6EE",
                              border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`,
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: isDarkMode ? "#F8F6EE" : "#18231D" }}>
                              Example {index + 1}:
                            </div>
                            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: isDarkMode ? "#DCEEDD" : "#59665E" }}>
                              <div style={{ marginBottom: 4 }}>
                                <strong>Input:</strong> <code style={{ whiteSpace: "pre-wrap", display: "inline-block" }}>{tc.input}</code>
                              </div>
                              <div>
                                <strong>Expected Output:</strong> <code style={{ whiteSpace: "pre-wrap", display: "inline-block" }}>{tc.expectedOutput}</code>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p style={{ color: isDarkMode ? "#9CB5A3" : "#748078" }}>No public examples available.</p>
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
              background: isDarkMode ? "#122E22" : "#FFFFFF",
              border: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`,
              borderRadius: 8,
              boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(18, 60, 42, 0.04)"
            }}
            bodyStyle={{ padding: "0" }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "10px 16px",
              background: isDarkMode ? "#174832" : "#F8F6EE",
              borderBottom: `1px solid ${isDarkMode ? "#246B45" : "#DDE5DC"}`,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }}>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 700, 
                color: isDarkMode ? "#9CB5A3" : "#59665E", 
                textTransform: "uppercase", 
                letterSpacing: "0.5px" 
              }}>
                Execution Console
              </span>
              {testResults && (
                <Tag 
                  color={testResults.passed ? "success" : "error"} 
                  style={{ 
                    margin: 0, 
                    fontWeight: 600,
                    borderRadius: 6,
                    padding: "2px 8px"
                  }}
                >
                  {testResults.passedCount} / {testResults.totalCount} Test Cases Passed
                </Tag>
              )}
            </div>

            <div style={{ padding: "12px 16px" }}>
              {testResults ? (
                <div>
                  {testResults.status === "COMPILE_ERROR" && (
                    <div style={{ 
                      padding: "14px 16px", 
                      background: isDarkMode ? "rgba(200, 60, 60, 0.15)" : "#FEF2F2", 
                      borderLeft: "4px solid #C83C3C", 
                      border: isDarkMode ? "1px solid rgba(200, 60, 60, 0.3)" : "1px solid #FEE2E2",
                      borderLeftWidth: "4px",
                      borderRadius: 8,
                      marginBottom: 12 
                    }}>
                      <div style={{ 
                        color: isDarkMode ? "#FF8080" : "#C83C3C", 
                        fontWeight: 700, 
                        marginBottom: 8, 
                        fontSize: 13, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6 
                      }}>
                        <CloseCircleFilled /> COMPILATION ERROR
                      </div>
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: "pre-wrap", 
                        fontFamily: "'JetBrains Mono', Consolas, monospace", 
                        fontSize: 12, 
                        color: isDarkMode ? "#FCA5A5" : "#991B1B",
                        lineHeight: 1.5
                      }}>
                        {testResults.details?.[0]?.error || "Failed to compile."}
                      </pre>
                    </div>
                  )}
                  
                  {testResults.status === "INTERNAL_ERROR" && (
                    <div style={{ 
                      padding: "14px 16px", 
                      background: isDarkMode ? "rgba(200, 60, 60, 0.15)" : "#FEF2F2", 
                      borderLeft: "4px solid #C83C3C", 
                      border: isDarkMode ? "1px solid rgba(200, 60, 60, 0.3)" : "1px solid #FEE2E2",
                      borderLeftWidth: "4px",
                      borderRadius: 8,
                      marginBottom: 12 
                    }}>
                      <div style={{ 
                        color: isDarkMode ? "#FF8080" : "#C83C3C", 
                        fontWeight: 700, 
                        marginBottom: 8, 
                        fontSize: 13, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6 
                      }}>
                        <CloseCircleFilled /> SYSTEM ERROR
                      </div>
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: "pre-wrap", 
                        fontFamily: "'JetBrains Mono', Consolas, monospace", 
                        fontSize: 12, 
                        color: isDarkMode ? "#FCA5A5" : "#991B1B" 
                      }}>
                        The execution service failed. Please try again.
                      </pre>
                    </div>
                  )}

                  {testResults.details?.filter(r => r.input !== undefined && testResults.status !== "COMPILE_ERROR" && testResults.status !== "INTERNAL_ERROR").map((res) => {
                    let badge = null;
                    let borderLeftColor = "#C83C3C";
                    let cardBg = isDarkMode ? "#174832" : "#F8F6EE";
                    let cardBorder = isDarkMode ? "#246B45" : "#DDE5DC";
                    
                    if (res.passed) {
                      badge = <span style={{ color: "#2F7D4A", fontWeight: 700 }}>PASS</span>;
                      borderLeftColor = "#2F7D4A";
                      cardBg = isDarkMode ? "rgba(47, 125, 74, 0.18)" : "#EDF6EA";
                      cardBorder = isDarkMode ? "#246B45" : "#DCEEDD";
                    } else if (res.status === "TIME_LIMIT_EXCEEDED") {
                      badge = <span style={{ color: "#D99A00", fontWeight: 700 }}>TIME LIMIT EXCEEDED</span>;
                      borderLeftColor = "#D99A00";
                    } else if (res.status === "RUNTIME_ERROR") {
                      badge = <span style={{ color: "#C83C3C", fontWeight: 700 }}>RUNTIME ERROR</span>;
                    } else {
                      badge = <span style={{ color: "#C83C3C", fontWeight: 700 }}>WRONG ANSWER</span>;
                    }

                    return (
                      <div
                        key={res.index}
                        style={{
                          padding: "12px 16px",
                          marginBottom: 10,
                          background: cardBg,
                          borderRadius: 8,
                          border: `1px solid ${cardBorder}`,
                          borderLeft: `4px solid ${borderLeftColor}`,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, color: isDarkMode ? "#F8F6EE" : "#18231D", display: "flex", alignItems: "center", gap: 8 }}>
                            Test Case #{res.index} 
                            <span style={{ 
                              fontSize: 11, 
                              padding: "2px 8px", 
                              background: isDarkMode ? "rgba(255,255,255,0.08)" : "#FFFFFF", 
                              border: `1px solid ${cardBorder}`,
                              borderRadius: 4 
                            }}>
                              {badge}
                            </span>
                          </span>
                          <span style={{ color: isDarkMode ? "#9CB5A3" : "#748078", fontSize: 12, fontWeight: 500 }}>{res.executionTime}ms</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 13 }}>
                          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ width: 80, color: isDarkMode ? "#9CB5A3" : "#59665E", fontWeight: 600 }}>Input:</span> 
                            <code style={{ 
                              color: isDarkMode ? "#F8F6EE" : "#18231D", 
                              background: isDarkMode ? "rgba(0,0,0,0.25)" : "#FFFFFF",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: `1px solid ${cardBorder}`,
                              whiteSpace: "pre-wrap",
                              display: "inline-block",
                            }}>
                              {res.input || "<empty>"}
                            </code>
                          </div>
                          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ width: 80, color: isDarkMode ? "#9CB5A3" : "#59665E", fontWeight: 600 }}>Expected:</span> 
                            <code style={{ 
                              color: isDarkMode ? "#A7F3D0" : "#166534", 
                              background: isDarkMode ? "rgba(0,0,0,0.25)" : "#FFFFFF",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: `1px solid ${cardBorder}`,
                              fontWeight: 600,
                              whiteSpace: "pre-wrap",
                              display: "inline-block",
                            }}>
                              {res.expectedOutput}
                            </code>
                          </div>
                          {res.status !== "TIME_LIMIT_EXCEEDED" && res.status !== "RUNTIME_ERROR" && (
                            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline' }}>
                              <span style={{ width: 80, color: isDarkMode ? "#9CB5A3" : "#59665E", fontWeight: 600 }}>Actual:</span> 
                              <code style={{ 
                                color: res.passed 
                                  ? (isDarkMode ? "#A7F3D0" : "#166534") 
                                  : (isDarkMode ? "#FCA5A5" : "#991B1B"), 
                                background: isDarkMode ? "rgba(0,0,0,0.25)" : "#FFFFFF",
                                padding: "2px 8px",
                                borderRadius: 4,
                                border: `1px solid ${cardBorder}`,
                                fontWeight: 600,
                                whiteSpace: "pre-wrap",
                                display: "inline-block",
                              }}>
                                {res.actualOutput || "<empty>"}
                              </code>
                            </div>
                          )}
                          {res.error ? (
                            <div style={{ 
                              color: isDarkMode ? "#FCA5A5" : "#991B1B", 
                              marginTop: 8, 
                              whiteSpace: "pre-wrap", 
                              background: isDarkMode ? "rgba(200,60,60,0.15)" : "#FEE2E2", 
                              padding: "8px 12px", 
                              borderRadius: 6, 
                              border: `1px solid ${isDarkMode ? "rgba(200,60,60,0.3)" : "#FECACA"}` 
                            }}>
                              {res.error}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  padding: "40px 0", 
                  textAlign: "center", 
                  color: isDarkMode ? "#9CB5A3" : "#748078", 
                  fontSize: 14, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 12 
                }}>
                  <CodeOutlined style={{ fontSize: 36, color: isDarkMode ? "#246B45" : "#DDE5DC" }} />
                  <span>Click <strong style={{ color: isDarkMode ? "#F8F6EE" : "#18231D" }}>"Run Tests"</strong> to verify your solution against public cases, or <strong style={{ color: isDarkMode ? "#F8F6EE" : "#18231D" }}>"Submit Solution"</strong> for automated grading.</span>
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
