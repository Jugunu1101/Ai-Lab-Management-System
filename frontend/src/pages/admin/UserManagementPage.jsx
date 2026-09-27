import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  Input,
  Select,
  Row,
  Col,
  Space,
  Popconfirm,
  message,
  Typography,
  Tabs,
  Badge,
  Alert,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  UserAddOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import CreateUserModal from "../../components/admin/CreateUserModal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import adminService from "../../services/admin.service";
import { ROLES, ROLE_LABELS } from "../../utils/constants";
import { formatDate } from "../../utils/formatters";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState("directory");
  const [users, setUsers] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [domains, setDomains] = useState([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, pendingRes, collegeRes] = await Promise.allSettled([
        adminService.getUsers({ limit: 500 }),
        adminService.getPendingTeachers(),
        adminService.getCollege(),
      ]);

      if (usersRes.status === "fulfilled") {
        const list = usersRes.value.data?.users || usersRes.value.users || usersRes.value.data || [];
        setUsers(Array.isArray(list) ? list : []);
      }

      if (pendingRes.status === "fulfilled") {
        const plist = pendingRes.value.data || pendingRes.value || [];
        setPendingTeachers(Array.isArray(plist) ? plist : []);
      }

      if (collegeRes.status === "fulfilled") {
        const cData = collegeRes.value.data || collegeRes.value || null;
        setCollegeInfo(cData);
        if (cData?.domains) {
          setDomains(cData.domains);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveTeacher = async (teacherId) => {
    setActionLoading(true);
    try {
      await adminService.approveTeacher(teacherId);
      message.success("Teacher approved successfully! They can now log in.");
      fetchData();
    } catch (err) {
      message.error(err.message || "Failed to approve teacher");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    setActionLoading(true);
    try {
      await adminService.rejectTeacher(teacherId);
      message.info("Teacher registration rejected.");
      fetchData();
    } catch (err) {
      message.error(err.message || "Failed to reject teacher");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminService.deleteUser(id);
      message.success("User account removed");
      fetchData();
    } catch (err) {
      message.error(err.message || "Failed to delete user");
    }
  };

  const handleAddDomain = () => {
    const trimmed = newDomainInput.trim().toLowerCase().replace(/^@/, "");
    if (!trimmed) return;
    if (domains.includes(trimmed)) {
      message.warning("Domain already added");
      return;
    }
    setDomains([...domains, trimmed]);
    setNewDomainInput("");
  };

  const handleRemoveDomain = (domainToRemove) => {
    setDomains(domains.filter((d) => d !== domainToRemove));
  };

  const handleSaveDomains = async () => {
    try {
      await adminService.updateCollegeDomains(domains);
      message.success("Authorized email domains updated successfully");
    } catch (err) {
      message.error(err.message || "Failed to update email domains");
    }
  };

  const cleanTerm = (searchTerm || "").trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !cleanTerm ||
      u.name?.toLowerCase().includes(cleanTerm) ||
      u.email?.toLowerCase().includes(cleanTerm) ||
      u.department?.toLowerCase().includes(cleanTerm) ||
      u.role?.toLowerCase().includes(cleanTerm);

    const matchRole = selectedRole === "ALL" || u.role === selectedRole;
    return matchSearch && matchRole;
  });

  const directoryColumns = [
    {
      title: "Name & Email",
      dataIndex: "name",
      key: "name",
      render: (name, rec) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.email}</Text>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const color = role === "ADMIN" ? "gold" : role === "TEACHER" ? "purple" : "blue";
        return <Tag color={color} style={{ fontWeight: 600, borderRadius: 6 }}>{ROLE_LABELS[role] || role}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => {
        if (!status || status === "APPROVED") {
          return <Tag color="green">Active</Tag>;
        }
        if (status === "PENDING") {
          return <Tag color="orange"><ClockCircleOutlined /> Pending</Tag>;
        }
        return <Tag color="red"><CloseCircleOutlined /> Rejected</Tag>;
      },
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (dept) => dept || "General",
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => formatDate(d),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete this user?"
            description="Are you sure you want to permanently delete this user account?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pendingColumns = [
    {
      title: "Applicant",
      dataIndex: "name",
      key: "name",
      render: (name, rec) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
          <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.email}</Text>
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (dept) => dept || "General",
    },
    {
      title: "Requested Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => formatDate(d),
    },
    {
      title: "Authorization Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={actionLoading}
            onClick={() => handleApproveTeacher(record._id)}
            style={{ borderRadius: 6, background: "#10b981", borderColor: "#10b981" }}
          >
            Approve Access
          </Button>
          <Popconfirm
            title="Reject Teacher Registration?"
            description="The teacher will not be granted access to create classes or review labs."
            onConfirm={() => handleRejectTeacher(record._id)}
          >
            <Button size="small" danger icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
              Reject
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            College Administration & Access Control
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Manage instructors, authenticate students, and enforce institutional email domain security.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={() => setCreateModalOpen(true)}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          Provision User Directly
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: "directory",
            label: "User Directory",
            children: (
              <>
                <Card className="glass-card" bordered={false} style={{ marginBottom: 20 }} bodyStyle={{ padding: "16px 20px" }}>
                  <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} md={14}>
                      <Input
                        prefix={<SearchOutlined style={{ color: "var(--text-muted)" }} />}
                        placeholder="Search by name, email, department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                        style={{ borderRadius: 8 }}
                      />
                    </Col>
                    <Col xs={24} md={10}>
                      <Select
                        value={selectedRole}
                        onChange={setSelectedRole}
                        style={{ width: "100%", borderRadius: 8 }}
                      >
                        <Option value="ALL">All Roles</Option>
                        <Option value={ROLES.STUDENT}>Students</Option>
                        <Option value={ROLES.TEACHER}>Teachers</Option>
                        <Option value={ROLES.ADMIN}>Admins</Option>
                      </Select>
                    </Col>
                  </Row>
                </Card>

                <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
                  {loading ? (
                    <LoadingSpinner tip="Loading user directory..." />
                  ) : error ? (
                    <div style={{ padding: 24 }}>
                      <ErrorState message={error} onRetry={fetchData} />
                    </div>
                  ) : (
                    <Table
                      dataSource={filteredUsers}
                      columns={directoryColumns}
                      rowKey="_id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Card>
              </>
            ),
          },
          {
            key: "pending",
            label: (
              <span>
                Pending Teacher Approvals{" "}
                {pendingTeachers.length > 0 && (
                  <Badge count={pendingTeachers.length} style={{ backgroundColor: "#f59e0b" }} />
                )}
              </span>
            ),
            children: (
              <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
                  <Alert
                    message="Instructor Gating Policy"
                    description="Teachers who self-register cannot log in or manage classes until approved by a college administrator. Review applicants below."
                    type="info"
                    showIcon
                    style={{ borderRadius: 8 }}
                  />
                </div>
                {loading ? (
                  <LoadingSpinner tip="Checking pending teacher approvals..." />
                ) : (
                  <Table
                    dataSource={pendingTeachers}
                    columns={pendingColumns}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: "No teacher registrations currently pending approval." }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "domains",
            label: "Institutional Domains & Security",
            children: (
              <Card className="glass-card" bordered={false}>
                <div style={{ marginBottom: 20 }}>
                  <Title level={4} style={{ marginBottom: 4 }}>
                    <SafetyCertificateOutlined style={{ color: "#10b981", marginRight: 8 }} />
                    Whitelisted Email Domains
                  </Title>
                  <Paragraph type="secondary">
                    Only users registering with email addresses matching these verified institutional domains
                    will be permitted to sign up. All outsider registrations (e.g. Gmail, Yahoo) are blocked.
                  </Paragraph>
                </div>

                {collegeInfo && (
                  <div style={{ background: "var(--bg-secondary, #f8f9fc)", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      <BankOutlined style={{ marginRight: 6 }} />
                      Institution: {collegeInfo.name} ({collegeInfo.code})
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Departments: {collegeInfo.departments?.join(", ") || "General Engineering"}
                    </Text>
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Current Allowed Domains:
                  </Text>
                  <Space wrap size={[8, 8]}>
                    {domains.map((d) => (
                      <Tag
                        key={d}
                        color="blue"
                        closable
                        onClose={() => handleRemoveDomain(d)}
                        style={{ padding: "4px 10px", fontSize: 14, borderRadius: 6 }}
                      >
                        @{d}
                      </Tag>
                    ))}
                  </Space>
                </div>

                <div style={{ maxWidth: 440, marginBottom: 24 }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      placeholder="e.g. mit.edu or alumni.mit.edu"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      onPressEnter={handleAddDomain}
                      style={{ borderRadius: "8px 0 0 8px" }}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddDomain}
                      style={{ borderRadius: "0 8px 8px 0" }}
                    >
                      Add Domain
                    </Button>
                  </Space.Compact>
                </div>

                <Button
                  type="primary"
                  onClick={handleSaveDomains}
                  style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                >
                  Save Domain Security Rules
                </Button>
              </Card>
            ),
          },
        ]}
      />

      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default UserManagementPage;
