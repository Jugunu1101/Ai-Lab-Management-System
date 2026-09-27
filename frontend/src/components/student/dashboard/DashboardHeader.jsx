import React, { useState } from "react";
import { Search, Bell, ChevronDown, X } from "lucide-react";
import { Dropdown } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getInitials } from "../../../utils/formatters";

export const DashboardHeader = ({ user, onSearch }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm("");
    if (onSearch) onSearch("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/student/assignments?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const studentName = user?.name || "Student";
  const firstName = studentName.split(" ")[0] || "Student";

  const menuItems = [
    {
      key: "profile",
      label: (
        <div>
          <div style={{ fontWeight: 700, color: "var(--cl-text)" }}>{studentName}</div>
          <div style={{ fontSize: 12, color: "var(--cl-text-secondary)" }}>{user?.email}</div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "signout",
      label: <span style={{ color: "var(--cl-error)", fontWeight: 600 }}>Sign Out</span>,
      onClick: logout,
    },
  ];

  return (
    <div className="cl-header-bar">
      <div className="cl-header-greeting">
        <h1>{`${getGreeting()}, ${firstName}! 👋`}</h1>
        <p className="cl-header-subtitle">
          Keep learning. Small steps make big progress.
        </p>
      </div>

      <div className="cl-header-actions">
        <div className="cl-search-wrapper" style={{ position: "relative" }}>
          <Search size={18} className="cl-search-icon" />
          <input
            type="text"
            className="cl-search-input"
            placeholder="Search assignment name..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            aria-label="Search dashboard"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                color: "var(--cl-text-muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          className="cl-icon-btn"
          title="Notifications"
          aria-label="Notifications"
          type="button"
        >
          <Bell size={20} />
          <span className="cl-notification-dot" />
        </button>

        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
          <div className="cl-user-badge" role="button" tabIndex={0}>
            <div className="cl-avatar-circle">
              {getInitials(studentName)}
            </div>
            <div className="cl-user-info">
              <span className="cl-user-name">{studentName}</span>
              <span className="cl-user-role">Student</span>
            </div>
            <ChevronDown size={16} color="var(--cl-text-secondary)" />
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default DashboardHeader;
