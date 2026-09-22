import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  Button,
  Space,
  Card,
  message,
} from "antd";
import { PlusOutlined, MinusCircleOutlined, BookOutlined } from "@ant-design/icons";
import assignmentService from "../../services/assignment.service";
import classService from "../../services/class.service";
import { TOPIC_TAXONOMY, PROGRAMMING_LANGUAGES } from "../../utils/constants";

const { Option } = Select;

export const CreateAssignmentModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (open) {
      classService.getClasses()
        .then((res) => {
          const list = res.data?.classes || res.classes || res.data || [];
          setClasses(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        language: values.programmingLanguage,
        difficulty: values.difficulty,
        classId: values.classId,
        topics: values.topics,
        maxAttempts: values.maxAttempts,
        deadline: values.dueDate ? values.dueDate.toISOString() : undefined,
        testCases: values.testCases?.map((tc) => ({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isHidden: !!tc.isHidden,
        })) || [],
      };

      await assignmentService.createAssignment(payload);
      message.success("Assignment created successfully!");
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      const details = err.details;
      if (details && Array.isArray(details)) {
        details.forEach((d) => message.error(d));
      } else {
        message.error(err.message || "Failed to create assignment");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={740}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BookOutlined style={{ color: "var(--primary)" }} />
          <span>Create Programming Assignment</span>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          difficulty: "MEDIUM",
          programmingLanguage: "javascript",
          maxAttempts: 5,
          testCases: [{ input: "", expectedOutput: "", isHidden: false }],
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label="Problem Title"
          name="title"
          rules={[{ required: true, message: "Please enter problem title" }]}
        >
          <Input placeholder="Invert Binary Tree" />
        </Form.Item>

        <Form.Item
          label="Target Classroom"
          name="classId"
          rules={[{ required: true, message: "Please select classroom" }]}
        >
          <Select placeholder="Select classroom to assign">
            {classes.map((cls) => (
              <Option key={cls._id} value={cls._id}>
                {cls.name} ({cls.code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item label="Programming Language" name="programmingLanguage">
            <Select>
              {PROGRAMMING_LANGUAGES.map((l) => (
                <Option key={l.value} value={l.value}>
                  {l.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Difficulty Rating" name="difficulty">
            <Select>
              <Option value="EASY">Easy</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="HARD">Hard</Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item label="Taxonomy Topics (Multi-Select)" name="topics">
          <Select mode="multiple" placeholder="Select algorithmic topics" options={TOPIC_TAXONOMY.map((t) => ({ label: t, value: t }))} />
        </Form.Item>

        <Form.Item
          label="Problem Description & Specifications"
          name="description"
          rules={[{ required: true, message: "Please provide problem description" }]}
        >
          <Input.TextArea rows={4} placeholder="Describe problem inputs, invariants, and constraints..." />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item label="Due Date" name="dueDate">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Maximum Attempts" name="maxAttempts">
            <InputNumber min={1} max={50} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        {/* Dynamic Test Cases List */}
        <Form.Item label="Test Cases (Public & Hidden Verification)">
          <Form.List name="testCases">
            {(fields, { add, remove }) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ background: "var(--bg-tertiary)", borderRadius: 8 }}
                    bodyStyle={{ padding: "12px 16px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Test Case #{index + 1}</span>
                      <Space>
                        <Form.Item {...restField} name={[name, "isHidden"]} valuePropName="checked" noStyle>
                          <Switch checkedChildren="Hidden" unCheckedChildren="Public" />
                        </Form.Item>
                        {fields.length > 1 && (
                          <MinusCircleOutlined onClick={() => remove(name)} style={{ color: "#ef4444" }} />
                        )}
                      </Space>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Form.Item
                        {...restField}
                        name={[name, "input"]}
                        rules={[{ required: true, message: "Input is required" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Standard Input string" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "expectedOutput"]}
                        rules={[{ required: true, message: "Expected output is required" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Expected Output" />
                      </Form.Item>
                    </div>
                  </Card>
                ))}

                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Test Case
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Assignment
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateAssignmentModal;
