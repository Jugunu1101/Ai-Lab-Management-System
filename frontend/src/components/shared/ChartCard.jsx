import React from "react";
import { Card, Skeleton } from "antd";

export const ChartCard = ({
  title,
  subtitle,
  extra,
  children,
  loading = false,
  height = 320,
}) => {
  return (
    <Card
      className="glass-card"
      bordered={false}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      bodyStyle={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: subtitle ? 2 : 0,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {subtitle}
            </span>
          )}
        </div>
        {extra && <div>{extra}</div>}
      </div>

      <div style={{ flex: 1, minHeight: height, width: "100%", position: "relative" }}>
        {loading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
};

export default ChartCard;
