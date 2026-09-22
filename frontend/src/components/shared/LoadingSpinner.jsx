import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export const LoadingSpinner = ({ tip = "Loading...", fullScreen = false, size = 36 }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size, color: "var(--primary)" }} spin />;

  if (fullScreen) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-primary)",
        }}
      >
        <Spin indicator={antIcon} />
        <span style={{ marginTop: 16, color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
          {tip}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        width: "100%",
      }}
    >
      <Spin indicator={antIcon} />
      <span style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
        {tip}
      </span>
    </div>
  );
};

export default LoadingSpinner;
