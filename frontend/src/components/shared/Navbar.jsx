import React from "react";
import { Layout, Button, Avatar, Dropdown, Space, Tag, Tooltip } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  LogoutOutlined,
  CodeOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ROLE_LABELS } from "../../utils/constants";
import { getInitials } from "../../utils/formatters";

const { Header } = Layout;

export const Navbar = ({ collapsed, setCollapsed }) => {
  const { user, role, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const roleColorMap = {
    STUDENT: "blue",
    TEACHER: "purple",
    ADMIN: "gold",
  };

  const menuItems = [
    {
      key: "header",
      disabled: true,
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user?.name || "User"}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{user?.email}</div>
        </div>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <Header
      style={{
        padding: "0 24px",
        background: "var(--bg-card)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ fontSize: 16, width: 40, height: 40, color: "var(--text-primary)" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            <CodeOutlined style={{ fontSize: 18 }} />
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: "var(--font-heading)",
              letterSpacing: "-0.02em",
            }}
            className="gradient-text"
          >
            CodeLab AI
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Dark/Light mode toggle */}
        <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <Button
            type="text"
            shape="circle"
            icon={isDarkMode ? <SunOutlined style={{ color: "#f59e0b" }} /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ width: 38, height: 38 }}
          />
        </Tooltip>

        {/* Notifications mock button */}
        <Tooltip title="Notifications">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined />}
            style={{ width: 38, height: 38 }}
          />
        </Tooltip>

        {/* User Role Tag */}
        {role && (
          <Tag color={roleColorMap[role] || "default"} style={{ margin: 0, fontWeight: 600, borderRadius: 6 }}>
            {ROLE_LABELS[role] || role}
          </Tag>
        )}

        {/* User Profile Dropdown */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              style={{
                backgroundColor: "var(--primary)",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px var(--primary-glow)",
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
          </Space>
        </Dropdown>
      </div>
    </Header>
  );
};

export default Navbar;
