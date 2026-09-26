import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Card,
  Tag,
  Divider,
  Alert,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  RedoOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import assignmentService from "../../services/assignment.service";
import classService from "../../services/class.service";
import { TOPIC_TAXONOMY, PROGRAMMING_LANGUAGES, DIFFICULTY_CONFIG } from "../../utils/constants";

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

export const GenerateAIAssignmentModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [step, setStep] = useState("form"); // "form" | "preview"

  useEffect(() => {
    if (open) {
      classService.getClasses()
        .then((res) => {
          const list = res.data?.classes || res.classes || res.data || [];
          const classArr = Array.isArray(list) ? list : [];
          setClasses(classArr);
          if (classArr.length > 0) {
            form.setFieldsValue({ classId: classArr[0]._id });
          }
        })
        .catch(() => {});
      
      setStep("form");
      setGeneratedResult(null);
    }
  }, [open]);

  const handleGenerate = async (values) => {
    setGenerating(true);
    try {
      setSelectedClassId(values.classId);
      const res = await assignmentService.generateAIAssignment({
        topic: values.topic,
        language: values.language,
        difficulty: values.difficulty,
        questionCount: values.questionCount || 1,
        classId: values.classId,
      });

      const data = res.data || res;
      setGeneratedResult(data);
      setStep("preview");
      message.success("AI Assignment generated successfully!");
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to generate AI assignment";
      message.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAndAssign = async () => {
    if (!generatedResult || !selectedClassId) return;

    setSaving(true);
    try {
      const payload = {
        title: generatedResult.title,
        description: generatedResult.description || generatedResult.problemStatement,
        problemStatement: generatedResult.problemStatement,
        constraints: generatedResult.constraints || [],
        inputFormat: generatedResult.inputFormat || "",
        outputFormat: generatedResult.outputFormat || "",
        examples: generatedResult.examples || [],
        starterCode: generatedResult.starterCode || "",
        hints: generatedResult.hints || [],
        explanation: generatedResult.explanation || "",
        language: generatedResult.language,
        difficulty: (generatedResult.difficulty || "MEDIUM").toUpperCase(),
        topics: generatedResult.topics || [form.getFieldValue("topic")],
        classId: selectedClassId,
        source: "AI_GENERATED",
        testCases: generatedResult.testCases?.map((tc) => ({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isHidden: !!tc.isHidden,
        })) || [],
      };

      await assignmentService.createAssignment(payload);
      message.success("AI Assignment published and assigned to class successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to assign assignment";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={step === "preview" ? 840 : 640}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThunderboltOutlined style={{ color: "var(--primary, #6366f1)", fontSize: 18 }} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 17 }}>
              {step === "preview" ? "Preview AI-Generated Assignment" : "AI Coding Assignment Generator"}
            </span>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>
              Generate complete programming problems with starter code and test suites
            </div>
          </div>
        </div>
      }
    >
      {step === "form" ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{
            difficulty: "MEDIUM",
            language: "cpp",
            topic: "loops",
            questionCount: 1,
          }}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="Target Classroom"
            name="classId"
            rules={[{ required: true, message: "Please select target classroom" }]}
          >
            <Select placeholder="Select classroom to assign this problem">
              {classes.map((cls) => (
                <Option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Algorithmic / Core Topic"
            name="topic"
            rules={[{ required: true, message: "Please select or type a topic" }]}
          >
            <Select
              showSearch
              placeholder="e.g., loops, arrays, recursion, searching"
              options={TOPIC_TAXONOMY.map((t) => ({ label: t.toUpperCase(), value: t }))}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              label="Programming Language"
              name="language"
              rules={[{ required: true, message: "Please select programming language" }]}
            >
              <Select>
                {PROGRAMMING_LANGUAGES.map((l) => (
                  <Option key={l.value} value={l.value}>
                    {l.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Target Difficulty"
              name="difficulty"
              rules={[{ required: true, message: "Please select difficulty" }]}
            >
              <Select>
                <Option value="EASY">Easy (Direct Concept Application)</Option>
                <Option value="MEDIUM">Medium (Multi-Step & Edge Cases)</Option>
                <Option value="HARD">Hard (Algorithmic & Boundary Logic)</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Number of Problem Variations"
            name="questionCount"
          >
            <InputNumber min={1} max={5} style={{ width: "100%" }} />
          </Form.Item>

          <Divider style={{ margin: "16px 0 20px 0" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button onClick={onClose} disabled={generating}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<RobotOutlined />}
              loading={generating}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                border: "none",
                height: 40,
                padding: "0 24px",
              }}
            >
              {generating ? "Synthesizing Problem with AI..." : "Generate Assignment"}
            </Button>
          </div>
        </Form>
      ) : (
        /* Preview Step */
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Review & Validate Generated Coding Problem"
            description="Inspect the problem specification, starter template, and verified test cases below. Click 'Assign to Class' to publish."
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <Card
            className="glass-card"
            style={{ marginBottom: 16, background: "var(--bg-card)" }}
            bodyStyle={{ padding: "20px 24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                  {generatedResult?.title}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {generatedResult?.description}
                </Text>
              </div>
              <Space>
                <Tag color="cyan" style={{ textTransform: "uppercase", fontWeight: 700 }}>
                  {generatedResult?.language}
                </Tag>
                <Tag
                  color={DIFFICULTY_CONFIG[generatedResult?.difficulty]?.color || "blue"}
                  style={{ fontWeight: 700 }}
                >
                  {generatedResult?.difficulty}
                </Tag>
              </Space>
            </div>

            <Tabs
              defaultActiveKey="problem"
              items={[
                {
                  key: "problem",
                  label: "Problem Details",
                  children: (
                    <div>
                      <Paragraph style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.7 }}>
                        {generatedResult?.problemStatement}
                      </Paragraph>

                      {generatedResult?.constraints && generatedResult.constraints.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong style={{ display: "block", marginBottom: 6 }}>Constraints:</Text>
                          <ul style={{ paddingLeft: 20, margin: 0, color: "var(--text-secondary)" }}>
                            {generatedResult.constraints.map((c, i) => (
                              <li key={i}><code>{c}</code></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {generatedResult?.examples && generatedResult.examples.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong style={{ display: "block", marginBottom: 8 }}>Examples:</Text>
                          {generatedResult.examples.map((ex, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "10px 14px",
                                background: "var(--bg-tertiary)",
                                borderRadius: 6,
                                marginBottom: 8,
                                fontSize: 12,
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              <div><strong>Input:</strong> <code>{ex.input}</code></div>
                              <div><strong>Output:</strong> <code>{ex.output}</code></div>
                              {ex.explanation && (
                                <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                                  <em>{ex.explanation}</em>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "starterCode",
                  label: "Starter Code",
                  children: (
                    <pre
                      style={{
                        padding: 14,
                        background: "#0d1117",
                        color: "#c9d1d9",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "var(--font-mono)",
                        margin: 0,
                        overflowX: "auto",
                      }}
                    >
                      {generatedResult?.starterCode || "// No starter code"}
                    </pre>
                  ),
                },
                {
                  key: "testCases",
                  label: `Test Cases (${generatedResult?.testCases?.length || 0})`,
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {generatedResult?.testCases?.map((tc, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            background: "var(--bg-tertiary)",
                            borderRadius: 6,
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>Case #{idx + 1}</span>
                            <Tag color={tc.isHidden ? "default" : "green"} style={{ margin: 0 }}>
                              {tc.isHidden ? "Hidden Case" : "Public Example"}
                            </Tag>
                          </div>
                          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
                            <div><strong>Input:</strong> <code>{tc.input}</code></div>
                            <div><strong>Expected Output:</strong> <code>{tc.expectedOutput}</code></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "hints",
                  label: "Hints & Solution",
                  children: (
                    <div>
                      {generatedResult?.hints && generatedResult.hints.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <BulbOutlined style={{ color: "#eab308" }} /> Hints:
                          </Text>
                          <ul style={{ paddingLeft: 20, marginTop: 6, color: "var(--text-secondary)" }}>
                            {generatedResult.hints.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {generatedResult?.explanation && (
                        <div>
                          <Text strong>Explanation:</Text>
                          <Paragraph style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 13 }}>
                            {generatedResult.explanation}
                          </Paragraph>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setStep("form")}>
              Adjust Parameters
            </Button>
            <Space>
              <Button
                icon={<RedoOutlined />}
                onClick={() => handleGenerate(form.getFieldsValue())}
                loading={generating}
              >
                Regenerate
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleSaveAndAssign}
                loading={saving}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  height: 38,
                  padding: "0 22px",
                }}
              >
                Assign to Class
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GenerateAIAssignmentModal;
