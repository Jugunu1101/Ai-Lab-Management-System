import React from "react";
import { Layout, Menu, Divider } from "antd";
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
  FileTextOutlined,
  UsergroupAddOutlined,
  SettingOutlined,
  KeyOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";
import { getInitials } from "../../utils/formatters";
import "./Sidebar.css";

const { Sider } = Layout;

export const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = useAuth();

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
            key: "/student/assignments",
            icon: <CodeOutlined />,
            label: "Assignments",
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
          {
            key: "/student/practice",
            icon: <PlayCircleOutlined />,
            label: "Practice",
          },
          {
            key: "/student/progress",
            icon: <LineChartOutlined />,
            label: "Topic Mastery",
          },
          {
            key: "/student/classes",
            icon: <BookOutlined />,
            label: "My Classes",
          },
          {
            key: "/student/join-class",
            icon: <KeyOutlined />,
            label: "Join Class",
          },
          {
            key: "/student/submissions",
            icon: <HistoryOutlined />,
            label: "Submissions",
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

  const currentPath = location.pathname;
  const items = getMenuItems();
  const selectedKey =
    items.find((item) => currentPath.startsWith(item.key))?.key || currentPath;

  const handleMenuClick = ({ key }) => {
    if (key === "/student/practice") {
      navigate("/student/assignments");
    } else {
      navigate(key);
    }
  };

  const studentName = user?.name || "Student";

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={260}
      collapsedWidth={80}
      className="cl-sidebar"
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 90,
      }}
    >
      <div className="cl-sidebar-inner">
        <div>
          {/* Logo & Platform Name */}
          <div className="cl-sidebar-logo-box">
            <div className="cl-sidebar-logo-icon">
              &lt;/&gt;
            </div>
            {!collapsed && (
              <div className="cl-sidebar-logo-text">
                <span className="cl-sidebar-logo-title">CodeLab AI</span>
                <span className="cl-sidebar-logo-subtitle">Your AI Coding Tutor</span>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items}
            onClick={handleMenuClick}
          />
        </div>

        {/* Bottom Profile Section */}
        {!collapsed && role === ROLES.STUDENT && (
          <div
            className="cl-sidebar-bottom-profile"
            onClick={() => navigate("/student/dashboard")}
            role="button"
            tabIndex={0}
          >
            <div className="cl-sb-profile-left">
              <div className="cl-sb-avatar">
                {getInitials(studentName)}
              </div>
              <div className="cl-sb-profile-info">
                <span className="cl-sb-name">{studentName}</span>
                <span className="cl-sb-role">Student</span>
              </div>
            </div>
            <RightOutlined style={{ fontSize: 12, color: "var(--cl-text-secondary)" }} />
          </div>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;
