import React from "react";
import { Empty, Button } from "antd";

export const EmptyState = ({
  description = "No data found",
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>
            {description}
          </span>
        }
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction} style={{ marginTop: 8 }}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
