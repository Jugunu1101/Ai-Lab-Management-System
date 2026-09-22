import React, { useState } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Sidebar from "../components/shared/Sidebar";

const { Content } = Layout;

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <Sidebar collapsed={collapsed} />
        <Content
          style={{
            padding: "24px 32px",
            minHeight: "calc(100vh - 64px)",
            overflowY: "auto",
            maxWidth: 1600,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
