import React, { useState } from "react";
import { Layout } from "antd";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Sidebar from "../components/shared/Sidebar";

const { Content } = Layout;

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isStudentDashboard = location.pathname === "/student/dashboard";

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--cl-cream, #F8F6EE)" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content
          style={{
            padding: isStudentDashboard ? "20px 48px 56px" : "32px 48px 56px",
            minHeight: "calc(100vh - 64px)",
            overflowY: "auto",
            maxWidth: 1480,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
