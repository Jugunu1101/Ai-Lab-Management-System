import React from "react";
import { Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  CodeOutlined,
  HistoryOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  TeamOutlined,
  BookOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  UsergroupAddOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const { Sider } = Layout;

export const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const getMenuItems = () => {
    switch (role) {
      case ROLES.STUDENT:
        return [
          {
            key: "/student/dashboard",
            icon: <DashboardOutlined />,
            label: "Dashboard",
          },
          {
            key: "/student/classes",
            icon: <BookOutlined />,
            label: "My Classes",
          },
          {
            key: "/student/assignments",
            icon: <CodeOutlined />,
            label: "Assignments",
          },
          {
            key: "/student/submissions",
            icon: <HistoryOutlined />,
            label: "Submissions",
          },
          {
            key: "/student/progress",
            icon: <LineChartOutlined />,
            label: "Topic Mastery",
          },
          {
            key: "/student/quiz",
            icon: <ThunderboltOutlined />,
            label: "Daily AI Quiz",
          },
          {
            key: "/student/learning-path",
            icon: <CompassOutlined />,
            label: "Learning Path",
          },
        ];

      case ROLES.TEACHER:
        return [
          {
            key: "/teacher/dashboard",
            icon: <DashboardOutlined />,
            label: "Overview",
          },
          {
            key: "/teacher/classes",
            icon: <TeamOutlined />,
            label: "My Classes",
          },
          {
            key: "/teacher/assignments",
            icon: <BookOutlined />,
            label: "Assignments",
          },
          {
            key: "/teacher/analytics",
            icon: <LineChartOutlined />,
            label: "Class Analytics",
          },
          {
            key: "/teacher/reports",
            icon: <FileTextOutlined />,
            label: "Weekly AI Reports",
          },
        ];

      case ROLES.ADMIN:
        return [
          {
            key: "/admin/dashboard",
            icon: <DashboardOutlined />,
            label: "System Metrics",
          },
          {
            key: "/admin/users",
            icon: <UsergroupAddOutlined />,
            label: "User Management",
          },
          {
            key: "/admin/classes",
            icon: <SettingOutlined />,
            label: "Class Management",
          },
        ];

      default:
        return [];
    }
  };

  // Find active key matching current pathname
  const currentPath = location.pathname;
  const items = getMenuItems();
  const selectedKey = items.find((item) => currentPath.startsWith(item.key))?.key || currentPath;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240}
      collapsedWidth={80}
      style={{
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border-color)",
        height: "calc(100vh - 64px)",
        position: "sticky",
        top: 64,
        left: 0,
        zIndex: 90,
      }}
    >
      <div style={{ padding: "16px 8px" }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{
            borderRight: "none",
            background: "transparent",
            fontSize: 14,
            fontWeight: 500,
          }}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
