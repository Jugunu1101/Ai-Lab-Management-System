import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import classService from "../../services/class.service";

const { Option } = Select;

export const CreateClassModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await classService.createClass(values);
      message.success("Classroom created successfully!");
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      const details = err.details;
      if (details && Array.isArray(details)) {
        details.forEach((d) => message.error(d));
      } else {
        message.error(err.message || "Failed to create class");
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
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamOutlined style={{ color: "var(--primary)" }} />
          <span>Create New Classroom</span>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          languages: ["python", "javascript", "cpp", "java"],
          semester: "Fall 2026",
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label="Class Name"
          name="name"
          rules={[{ required: true, message: "Please enter class name" }]}
        >
          <Input placeholder="Data Structures & Algorithms - Fall 2026" />
        </Form.Item>

        <Form.Item
          label="Course / Class Code"
          name="code"
          help="Optional. Leave blank to auto-generate a 6-character student join code (e.g. K9F2Q8)."
        >
          <Input
            placeholder="e.g. CS201 (or leave blank to auto-generate)"
            style={{ textTransform: "uppercase" }}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item label="Department" name="department">
            <Input placeholder="Computer Science & Engineering" />
          </Form.Item>

          <Form.Item label="Semester / Term" name="semester">
            <Input placeholder="Fall 2026" />
          </Form.Item>
        </div>

        <Form.Item
          label="Supported Programming Languages"
          name="languages"
        >
          <Select mode="multiple" placeholder="Select programming languages">
            <Option value="python">Python</Option>
            <Option value="javascript">JavaScript</Option>
            <Option value="cpp">C++</Option>
            <Option value="java">Java</Option>
            <Option value="c">C</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} placeholder="Lab curriculum covering trees, graphs, dynamic programming..." />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Class
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateClassModal;
