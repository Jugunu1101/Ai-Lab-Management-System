import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import adminService from "../../services/admin.service";
import { ROLES } from "../../utils/constants";

const { Option } = Select;

export const CreateUserModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await adminService.createUser(values);
      message.success("User account created successfully!");
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      const details = err.details;
      if (details && Array.isArray(details)) {
        details.forEach((d) => message.error(d));
      } else {
        message.error(err.message || "Failed to create user");
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
          <UserAddOutlined style={{ color: "var(--primary)" }} />
          <span>Provision New System Account</span>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ role: ROLES.STUDENT }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label="Full Name"
          name="name"
          rules={[{ required: true, message: "Please enter user's name" }]}
        >
          <Input placeholder="Jane Doe" />
        </Form.Item>

        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter valid email" },
          ]}
        >
          <Input placeholder="jane.doe@university.edu" />
        </Form.Item>

        <Form.Item
          label="System Role"
          name="role"
          rules={[{ required: true, message: "Please select role" }]}
        >
          <Select>
            <Option value={ROLES.STUDENT}>Student</Option>
            <Option value={ROLES.TEACHER}>Teacher / Instructor</Option>
            <Option value={ROLES.ADMIN}>System Administrator</Option>
          </Select>
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item label="College / Roll ID" name="collegeId">
            <Input placeholder="ID-2026-X" />
          </Form.Item>

          <Form.Item label="Department" name="department">
            <Input placeholder="Computer Science" />
          </Form.Item>
        </div>

        <Form.Item
          label="Temporary Password"
          name="password"
          rules={[
            { required: true, message: "Please assign a password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create User
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
