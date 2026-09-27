import React from "react";
import { Alert, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

const sanitizeDisplayMessage = (msg) => {
  if (!msg || typeof msg !== "string") return "An error occurred while loading this section.";
  if (
    msg.includes("mongodb.net") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("MongoServerSelectionError") ||
    msg.includes("MongoNetworkError") ||
    msg.includes("buffering timed out") ||
    msg.includes("DATABASE_UNAVAILABLE")
  ) {
    return "Database is unavailable. Please start the local database or check your connection.";
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("Network Error")) {
    return "Unable to connect to the backend server. Please verify the backend is running.";
  }
  return msg;
};

export const ErrorState = ({
  title = "Something went wrong",
  message = "An error occurred while loading this section.",
  onRetry,
  type = "error",
}) => {
  const displayMessage = sanitizeDisplayMessage(message);

  return (
    <div style={{ margin: "16px 0", width: "100%" }}>
      <Alert
        message={<span style={{ fontWeight: 600 }}>{title}</span>}
        description={
          <div>
            <p style={{ margin: "4px 0 12px 0", color: "var(--text-secondary)" }}>{displayMessage}</p>

            {onRetry && (
              <Button
                type="primary"
                danger={type === "error"}
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
          </div>
        }
        type={type}
        showIcon
        style={{
          borderRadius: 12,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}
      />
    </div>
  );
};

export default ErrorState;
