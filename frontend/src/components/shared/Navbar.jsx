import React from "react";
import { Layout, Button, Avatar, Dropdown, Space, Tag, Tooltip } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
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

  const getRoleTagStyle = (r) => {
    switch (r) {
      case "STUDENT":
        return {
          background: "#EDF6EA",
          color: "#1B5138",
          border: "1px solid #DDE5DC",
          fontWeight: 700,
        };
      case "TEACHER":
        return {
          background: "#FFF3C4",
          color: "#8C6600",
          border: "1px solid #F4C542",
          fontWeight: 700,
        };
      case "ADMIN":
        return {
          background: "#123C2A",
          color: "#FFFFFF",
          border: "none",
          fontWeight: 700,
        };
      default:
        return {};
    }
  };

  const menuItems = [
    {
      key: "header",
      disabled: true,
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {user?.name || "User"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {user?.email}
          </div>
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
          style={{
            fontSize: 16,
            width: 40,
            height: 40,
            color: "var(--text-primary)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #123C2A 0%, #246B45 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F4C542",
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
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
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
            icon={
              isDarkMode ? (
                <SunOutlined style={{ color: "#F4C542" }} />
              ) : (
                <MoonOutlined style={{ color: "var(--primary)" }} />
              )
            }
            onClick={toggleTheme}
            style={{ width: 38, height: 38 }}
          />
        </Tooltip>

        {/* Notifications button */}
        <Tooltip title="Notifications">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined style={{ color: "var(--text-primary)" }} />}
            style={{ width: 38, height: 38 }}
          />
        </Tooltip>

        {/* User Role Tag */}
        {role && (
          <Tag style={{ margin: 0, borderRadius: 6, ...getRoleTagStyle(role) }}>
            {ROLE_LABELS[role] || role}
          </Tag>
        )}

        {/* User Profile Dropdown */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              style={{
                backgroundColor: "var(--primary)",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(18, 60, 42, 0.2)",
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
