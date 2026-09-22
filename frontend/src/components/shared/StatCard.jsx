import React from "react";
import { Card, Skeleton } from "antd";

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = "#6366f1",
  iconBg = "rgba(99, 102, 241, 0.12)",
  loading = false,
  trend,
  trendUp = true,
  onClick,
}) => {
  return (
    <Card
      className="glass-card glass-card-hover"
      bordered={false}
      style={{
        cursor: onClick ? "pointer" : "default",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      bodyStyle={{ padding: "20px 24px" }}
      onClick={onClick}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {title}
            </span>
            {icon && (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: iconBg,
                  color: iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: `0 4px 12px ${iconBg}`,
                }}
              >
                {icon}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            {trend && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: trendUp ? "var(--success)" : "var(--error)",
                }}
              >
                {trendUp ? "↑" : "↓"} {trend}
              </span>
            )}
          </div>

          {subtitle && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
