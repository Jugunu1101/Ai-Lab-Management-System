import React from "react";
import { Badge, Tag, Space } from "antd";
import { CheckCircleFilled, SyncOutlined } from "@ant-design/icons";

export const SystemHealthBadge = ({ service, status = "UP" }) => {
  const isUp = status === "UP" || status === "ok";

  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-color)",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Badge status={isUp ? "success" : "error"} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{service}</span>
      <Tag color={isUp ? "success" : "error"} style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
        {status}
      </Tag>
    </div>
  );
};

export default SystemHealthBadge;
